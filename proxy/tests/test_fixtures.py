"""Every committed Fixture in proxy/fixtures/ (Story 1.13, AD-12).

The Fixtures are committed, so an empty folder fails. web/extract/fixtures.test.ts checks that the
file names match the reference notes' Note Hashes one-to-one and that each passes the Quote Check.
"""

import json
import re
from pathlib import Path

from app.config import DEFAULT_MODEL, PROMPT_VERSION
from app.rules import validate_study_set
from app.schemas import StudySetDraft

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"
FIXTURE_KEYS = {"studySet", "simpler", "model", "promptVersion"}


def _fixtures() -> list[tuple[str, dict]]:
    return [
        (path.name, json.loads(path.read_text(encoding="utf-8")))
        for path in sorted(FIXTURES_DIR.iterdir())
        if path.is_file() and path.name != ".gitkeep"
    ]


def test_fixtures_are_committed():
    assert _fixtures(), f"no Fixtures in {FIXTURES_DIR}"


def test_file_names_are_note_hashes():
    for name, _ in _fixtures():
        assert re.fullmatch(r"[0-9a-f]{64}\.json", name), name


def test_fixture_shape():
    for name, fixture in _fixtures():
        assert set(fixture) == FIXTURE_KEYS, name
        assert fixture["simpler"] == {}, name  # until Story 3.6 adds Simpler (D-15)


def test_study_set_parses_and_passes_the_count_rules():
    for name, fixture in _fixtures():
        StudySetDraft.model_validate(fixture["studySet"])
        validated = validate_study_set(
            fixture["studySet"], model=fixture["model"], prompt_version=fixture["promptVersion"]
        )
        assert validated is not None, name


def test_prompt_version_and_model_are_current():
    for name, fixture in _fixtures():
        assert fixture["promptVersion"] == PROMPT_VERSION, name
        assert fixture["model"] == DEFAULT_MODEL, name
