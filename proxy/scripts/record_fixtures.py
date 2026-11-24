"""Record candidate Fixtures for one model, or promote one model's recordings to proxy/fixtures/ (Story 1.13).

Step 2 of the recording (AD-12). Step 1 is `npm run export-passages` in web/, which writes
proxy/recordings/passages.json with the real extraction pipeline; this script never splits or
normalizes Note text.

    uv run --frozen python scripts/record_fixtures.py --model anthropic/claude-haiku-5.5
    uv run --frozen python scripts/record_fixtures.py --promote anthropic__claude-haiku-5.5

Recording uses the live agent setup (`build_agent`, `render_passages`, the routing in
`model_settings`); only the model name differs. One attempt per note, `GENERATION_TIMEOUT_S`.
The key is read only from OPENROUTER_API_KEY. Only counts, timings and error types are printed
(leak guard as in app.generation: never the exception text, which can carry Note text).
"""

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

# Only counts and timings on the console: no pydantic-ai banner.
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import PROMPT_VERSION, load_settings  # noqa: E402
from app.llm import build_agent, get_provider, render_passages, run_once  # noqa: E402
from app.rules import validate_study_set  # noqa: E402
from app.schemas import Passage  # noqa: E402

if TYPE_CHECKING:
    from pydantic_ai import Agent

PROXY_ROOT = Path(__file__).resolve().parent.parent
RECORDINGS_DIR = PROXY_ROOT / "recordings"
FIXTURES_DIR = PROXY_ROOT / "fixtures"
PASSAGES_FILE = "passages.json"
FIXTURE_KEYS = ("studySet", "simpler", "model", "promptVersion")


def slug(model: str) -> str:
    return model.replace("/", "__")


def load_notes(recordings_dir: Path) -> list[dict[str, Any]]:
    """The exported notes: [{note, noteHash, passages}]."""
    return json.loads((recordings_dir / PASSAGES_FILE).read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def live_agent(model: str) -> "Agent":
    """The live agent for `model`: same as `llm.get_agent()`, only the model name differs."""
    from pydantic_ai.models.openrouter import OpenRouterModel

    return build_agent(OpenRouterModel(model, provider=get_provider()))


def _counts(study_set: dict[str, Any]) -> str:
    concepts = study_set["concepts"]
    flashcards = sum(len(c["flashcards"]) for c in concepts)
    quiz = sum(len(c["quizQuestions"]) for c in concepts)
    return (
        f"{len(concepts)} concepts, {flashcards} flashcards, {quiz} quiz, "
        f"{len(study_set['summaryPoints'])} summary points"
    )


async def record(
    model: str, agent: "Agent", *, recordings_dir: Path, timeout: float
) -> int:
    """Record one attempt per exported note into recordings/<slug>/{noteHash}.json.

    Returns the number of failed calls; a failure is recorded as `studySet: null` + `error`.
    """
    out_dir = recordings_dir / slug(model)
    failures = 0
    for entry in load_notes(recordings_dir):
        note_hash = entry["noteHash"]
        passages = [Passage.model_validate(p) for p in entry["passages"]]
        prompt = render_passages(passages)
        recording: dict[str, Any] = {
            "studySet": None,
            "simpler": {},
            "model": model,
            "promptVersion": PROMPT_VERSION,
        }
        start = time.perf_counter()
        try:
            draft = await run_once(agent, prompt, timeout=timeout)
        except Exception as exc:  # noqa: BLE001 -- recorded by type only, never its text
            elapsed = round((time.perf_counter() - start) * 1000)
            failures += 1
            recording.update(generationMs=elapsed, validated=None, error=type(exc).__name__)
            print(f"{note_hash[:12]}: failed ({type(exc).__name__}) after {elapsed} ms")
        else:
            elapsed = round((time.perf_counter() - start) * 1000)
            validated = validate_study_set(draft, model=model, prompt_version=PROMPT_VERSION)
            recording["studySet"] = draft.model_dump(mode="json", by_alias=True)
            recording["generationMs"] = elapsed
            recording["validated"] = (
                None if validated is None else validated.model_dump(mode="json", by_alias=True)
            )
            state = "validated" if validated is not None else "rejected by rules.py"
            print(f"{note_hash[:12]}: {_counts(recording['studySet'])}, {elapsed} ms, {state}")
        write_json(out_dir / f"{note_hash}.json", recording)
    return failures


def promote(model_slug: str, *, recordings_dir: Path, fixtures_dir: Path) -> int:
    """Copy one model's recordings to fixtures/ in the Fixture shape. Writes nothing on refusal."""
    source = recordings_dir / model_slug
    fixtures: dict[str, dict[str, Any]] = {}
    problems: list[str] = []
    for entry in load_notes(recordings_dir):
        note_hash = entry["noteHash"]
        path = source / f"{note_hash}.json"
        if not path.is_file():
            problems.append(f"{note_hash[:12]}: no recording")
            continue
        recording = json.loads(path.read_text(encoding="utf-8"))
        if recording.get("studySet") is None or "error" in recording:
            problems.append(f"{note_hash[:12]}: recording failed")
        elif recording.get("validated") is None:
            problems.append(f"{note_hash[:12]}: not validated by rules.py")
        elif recording.get("promptVersion") != PROMPT_VERSION:
            problems.append(f"{note_hash[:12]}: promptVersion is not {PROMPT_VERSION}")
        else:
            fixtures[note_hash] = {key: recording[key] for key in FIXTURE_KEYS}
    if problems or not fixtures:
        for problem in problems or ["no notes exported"]:
            print(f"refused: {problem}")
        return 1

    fixtures_dir.mkdir(parents=True, exist_ok=True)
    for stale in fixtures_dir.glob("*.json"):  # Fixtures match the reference notes one-to-one
        stale.unlink()
    for note_hash, fixture in fixtures.items():
        write_json(fixtures_dir / f"{note_hash}.json", fixture)
    print(f"promoted {len(fixtures)} Fixtures from {model_slug}")
    return 0


def main(
    argv: list[str] | None = None,
    *,
    recordings_dir: Path = RECORDINGS_DIR,
    fixtures_dir: Path = FIXTURES_DIR,
    agent: "Agent | None" = None,
) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--model", help="OpenRouter model name to record, e.g. openai/gpt-6-luna")
    group.add_argument("--promote", metavar="SLUG", help="recordings/<slug> to copy to fixtures/")
    args = parser.parse_args(argv)

    if args.promote:
        return promote(args.promote, recordings_dir=recordings_dir, fixtures_dir=fixtures_dir)

    settings = load_settings()
    if not settings.key_configured:
        print("OPENROUTER_API_KEY is not set: nothing recorded.")
        return 1
    if not (recordings_dir / PASSAGES_FILE).is_file():
        print(f"{PASSAGES_FILE} is missing: run `npm run export-passages` in web/ first.")
        return 1
    if agent is None:
        agent = live_agent(args.model)
    failures = asyncio.run(
        record(args.model, agent, recordings_dir=recordings_dir, timeout=settings.generation_timeout_s)
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
