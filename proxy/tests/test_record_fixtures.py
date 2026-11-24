"""scripts/record_fixtures.py (Story 1.13): recording shape, failed calls, promotion and the no-key path.

Every model here is a StubModel; no test reaches a provider.
"""

import asyncio
import json
from pathlib import Path

import pytest
from pydantic_ai.exceptions import ModelHTTPError

from app import llm
from app.config import PROMPT_VERSION
from app.schemas import Passage
from scripts import record_fixtures
from study_set_data import MARKER, StubModel, draft

MODEL = "vendor/model-x"
SLUG = "vendor__model-x"
HASH_A = "a" * 64
HASH_B = "b" * 64
FIXTURE_KEYS = {"studySet", "simpler", "model", "promptVersion"}


def _notes() -> list[dict]:
    return [
        {"note": "a.md", "noteHash": HASH_A, "passages": [{"id": "p1", "text": f"Første {MARKER}."}]},
        {"note": "b.md", "noteHash": HASH_B, "passages": [{"id": "p1", "text": "Andre notat."}]},
    ]


@pytest.fixture
def recordings(tmp_path: Path) -> Path:
    directory = tmp_path / "recordings"
    directory.mkdir()
    (directory / "passages.json").write_text(json.dumps(_notes()), encoding="utf-8")
    return directory


def _record(stub: StubModel, recordings: Path) -> int:
    agent = llm.build_agent(stub.model)
    return asyncio.run(record_fixtures.record(MODEL, agent, recordings_dir=recordings, timeout=5))


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_slug_replaces_slashes():
    assert record_fixtures.slug("anthropic/claude-haiku-5.5") == "anthropic__claude-haiku-5.5"


def test_recording_shape_and_live_setup(recordings, capsys):
    stub = StubModel(draft())
    assert _record(stub, recordings) == 0

    assert stub.calls == 2  # one attempt per note
    for entry in _notes():
        recording = _read(recordings / SLUG / f"{entry['noteHash']}.json")
        assert set(recording) == FIXTURE_KEYS | {"generationMs", "validated"}
        assert recording["studySet"] == draft()  # the raw draft, camelCase
        assert recording["simpler"] == {}
        assert recording["model"] == MODEL
        assert recording["promptVersion"] == PROMPT_VERSION
        assert isinstance(recording["generationMs"], int)
        assert recording["validated"]["model"] == MODEL
        assert recording["validated"]["promptVersion"] == PROMPT_VERSION

    # Same user message and routing as the live Proxy.
    first_prompt = stub.messages[0][0].parts[-1].content
    passages = [Passage.model_validate(p) for p in _notes()[0]["passages"]]
    assert first_prompt == llm.render_passages(passages)
    assert stub.infos[0].model_settings["openrouter_provider"] == llm.ROUTING

    # Only counts and timings are printed, never Note text.
    assert MARKER not in capsys.readouterr().out


def test_draft_rejected_by_rules_is_recorded_with_validated_null(recordings):
    stub = StubModel(draft(concepts=3))
    assert _record(stub, recordings) == 0
    recording = _read(recordings / SLUG / f"{HASH_A}.json")
    assert recording["studySet"] == draft(concepts=3)
    assert recording["validated"] is None


def test_failed_call_is_recorded_and_the_run_continues(recordings, capsys):
    stub = StubModel(ModelHTTPError(500, "stub", body={"error": MARKER}), draft())
    assert _record(stub, recordings) == 1

    failed = _read(recordings / SLUG / f"{HASH_A}.json")
    assert failed["studySet"] is None
    assert failed["validated"] is None
    assert failed["error"] == "ModelHTTPError"
    ok = _read(recordings / SLUG / f"{HASH_B}.json")
    assert ok["studySet"] == draft()
    assert MARKER not in capsys.readouterr().out
    assert MARKER not in json.dumps(failed)


def test_main_exits_non_zero_when_a_call_fails(recordings, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-not-real")
    stub = StubModel(ModelHTTPError(503, "stub"), draft())
    code = record_fixtures.main(
        ["--model", MODEL], recordings_dir=recordings, agent=llm.build_agent(stub.model)
    )
    assert code == 1
    assert stub.calls == 2


def test_no_key_prints_one_line_and_makes_no_call_or_file(recordings, tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    stub = StubModel(draft())
    code = record_fixtures.main(
        ["--model", MODEL], recordings_dir=recordings, agent=llm.build_agent(stub.model)
    )
    assert code == 1
    assert stub.calls == 0
    assert not (recordings / SLUG).exists()
    assert len(capsys.readouterr().out.strip().splitlines()) == 1


def test_promote_writes_fixture_shape_only(recordings, tmp_path):
    _record(StubModel(draft()), recordings)
    fixtures = tmp_path / "fixtures"
    fixtures.mkdir()
    (fixtures / "stale.json").write_text("{}", encoding="utf-8")
    (fixtures / ".gitkeep").write_text("", encoding="utf-8")

    assert record_fixtures.main(
        ["--promote", SLUG], recordings_dir=recordings, fixtures_dir=fixtures
    ) == 0

    assert sorted(p.name for p in fixtures.glob("*.json")) == [f"{HASH_A}.json", f"{HASH_B}.json"]
    assert (fixtures / ".gitkeep").exists()
    fixture = _read(fixtures / f"{HASH_A}.json")
    assert set(fixture) == FIXTURE_KEYS
    assert fixture["studySet"] == draft()
    assert fixture["simpler"] == {}


@pytest.mark.parametrize(
    "stub",
    [
        pytest.param(lambda: StubModel(ModelHTTPError(500, "stub"), draft()), id="failed-call"),
        pytest.param(lambda: StubModel(draft(), draft(concepts=3)), id="validated-null"),
    ],
)
def test_promote_refuses_and_writes_nothing(recordings, tmp_path, stub):
    _record(stub(), recordings)
    fixtures = tmp_path / "fixtures"
    code = record_fixtures.promote(SLUG, recordings_dir=recordings, fixtures_dir=fixtures)
    assert code == 1
    assert not fixtures.exists() or not list(fixtures.glob("*.json"))


def test_promote_refuses_a_missing_recording(recordings, tmp_path):
    _record(StubModel(draft()), recordings)
    (recordings / SLUG / f"{HASH_B}.json").unlink()
    fixtures = tmp_path / "fixtures"
    assert record_fixtures.promote(SLUG, recordings_dir=recordings, fixtures_dir=fixtures) == 1
    assert not fixtures.exists()


def test_refused_promote_leaves_existing_fixtures_untouched(recordings, tmp_path):
    _record(StubModel(ModelHTTPError(500, "stub"), draft()), recordings)
    fixtures = tmp_path / "fixtures"
    fixtures.mkdir()
    existing = fixtures / f"{'c' * 64}.json"
    existing.write_text('{"keep": true}\n', encoding="utf-8")

    assert record_fixtures.promote(SLUG, recordings_dir=recordings, fixtures_dir=fixtures) == 1
    assert sorted(p.name for p in fixtures.iterdir()) == [existing.name]
    assert existing.read_text(encoding="utf-8") == '{"keep": true}\n'


def test_promote_refuses_a_wrong_prompt_version(recordings, tmp_path, capsys):
    _record(StubModel(draft()), recordings)
    path = recordings / SLUG / f"{HASH_B}.json"
    recording = _read(path)
    recording["promptVersion"] = f"{PROMPT_VERSION}-old"
    path.write_text(json.dumps(recording), encoding="utf-8")
    fixtures = tmp_path / "fixtures"

    assert record_fixtures.promote(SLUG, recordings_dir=recordings, fixtures_dir=fixtures) == 1
    assert not fixtures.exists()
    assert "promptVersion" in capsys.readouterr().out
