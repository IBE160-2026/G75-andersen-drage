"""Demo Mode on POST /api/study-set (Story 1.14, FR-23, AD-12): Fixtures, never a model or key."""

import json
import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import llm, main
from app.main import app
from app.rules import validate_study_set
from study_set_data import NOTE_HASH, ORIGIN, request_body

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"


def _fixture_files() -> list[Path]:
    return sorted(p for p in FIXTURES_DIR.glob("*.json") if p.is_file())


@pytest.fixture
def client(monkeypatch):
    """Keyless and with the default rate limit: Demo needs neither."""
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("RATE_LIMIT_PER_MIN", raising=False)
    return TestClient(app, headers={"Origin": ORIGIN})


@pytest.fixture
def logs(caplog):
    proxy_logger = logging.getLogger("proxy")
    proxy_logger.addHandler(caplog.handler)
    caplog.set_level(logging.DEBUG)
    yield caplog
    proxy_logger.removeHandler(caplog.handler)


def demo(client: TestClient, note_hash: str):
    return client.post("/api/study-set", json=request_body(mode="demo", noteHash=note_hash))


def assert_no_model_built():
    assert llm.get_provider.cache_info().currsize == 0
    assert llm.get_agent.cache_info().currsize == 0


def test_there_are_fixtures():
    assert len(_fixture_files()) == 3


@pytest.mark.parametrize("path", _fixture_files(), ids=lambda p: p.stem[:8])
def test_every_fixture_is_served_validated_with_no_key(client, path):
    fixture = json.loads(path.read_text(encoding="utf-8"))
    expected = validate_study_set(
        fixture["studySet"], model=fixture["model"], prompt_version=fixture["promptVersion"]
    )
    assert expected is not None
    res = demo(client, path.stem)
    assert res.status_code == 200
    assert res.json() == expected.model_dump(by_alias=True)
    assert res.json()["model"] == fixture["model"]
    assert res.json()["promptVersion"] == fixture["promptVersion"]
    assert_no_model_built()


def test_served_with_a_key_too_and_still_no_model(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-not-real")
    res = demo(client, _fixture_files()[0].stem)
    assert res.status_code == 200
    assert_no_model_built()


def test_unknown_note_hash_is_404_demo_only(client, logs):
    res = demo(client, NOTE_HASH)
    assert res.status_code == 404
    assert res.json() == {"code": "err.demoOnly"}
    assert "POST /api/study-set 404 " in logs.text and "err.demoOnly" in logs.text
    assert_no_model_built()


@pytest.mark.parametrize(
    "content",
    [
        "{not json",
        "[]",
        json.dumps({"studySet": {"concepts": []}, "model": "m", "promptVersion": "2", "simpler": {}}),
        json.dumps({"model": "m", "promptVersion": "2"}),
    ],
    ids=["not-json", "not-object", "fails-count-rules", "no-study-set"],
)
def test_invalid_fixture_is_502_generation(client, monkeypatch, tmp_path, logs, content):
    (tmp_path / f"{NOTE_HASH}.json").write_text(content, encoding="utf-8")
    monkeypatch.setattr(main, "FIXTURES_DIR", tmp_path)
    res = demo(client, NOTE_HASH)
    assert res.status_code == 502
    assert res.json() == {"code": "err.generation"}
    assert "SECRET" not in logs.text and "not json" not in logs.text
    assert_no_model_built()


def test_demo_posts_are_not_rate_limited(client):
    sample = _fixture_files()[0].stem
    for _ in range(25):
        assert demo(client, sample).status_code == 200
    # The live budget is untouched: the first live POST reaches the route (503, no key), not 429.
    assert client.post("/api/study-set", json=request_body()).status_code == 503
