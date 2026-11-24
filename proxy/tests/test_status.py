import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import llm
from app.config import PROMPT_VERSION
from app.main import app

MARKER = "SECRET-MARKER-7f3a"


@pytest.fixture
def client():
    llm.get_provider.cache_clear()
    return TestClient(app)


@pytest.fixture
def error_routes():
    """Throwaway routes that reach the validation and catch-all handlers."""

    def needs_int(n: int) -> dict:
        return {"n": n}

    def raises() -> dict:
        raise RuntimeError(MARKER)

    before = list(app.router.routes)
    app.add_api_route("/api/_test/needs-int", needs_int, methods=["GET"])
    app.add_api_route("/api/_test/raises", raises, methods=["GET"])
    yield
    app.router.routes[:] = before


def test_boots_and_reports_no_key(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    res = client.get("/api/status")
    assert res.status_code == 200
    assert res.json() == {
        "keyConfigured": False,
        "model": "anthropic/claude-haiku-5.5",
        "provider": "OpenRouter",
        "promptVersion": PROMPT_VERSION,
    }


def test_reports_key_without_calling_provider(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-not-real")
    monkeypatch.setenv("OPENROUTER_MODEL", "some/model")
    res = client.get("/api/status")
    body = res.json()
    assert body["keyConfigured"] is True
    assert body["model"] == "some/model"
    assert llm.get_provider.cache_info().currsize == 0


def test_validation_error_returns_code_without_echoing_input(client, error_routes, caplog):
    res = client.get(f"/api/_test/needs-int?n={MARKER}")
    assert res.status_code == 400
    assert res.json() == {"code": "err.generation"}
    assert MARKER not in res.text
    assert MARKER not in caplog.text


def test_unhandled_error_returns_code_and_logs_without_input(client, error_routes, caplog):
    res = client.get(f"/api/_test/raises?q={MARKER}")
    assert res.status_code == 500
    assert res.json() == {"code": "err.generation"}
    assert MARKER not in res.text
    logged = caplog.text
    assert "GET /api/_test/raises 500" in logged
    assert MARKER not in logged


LAZY_CHECK = """
import sys
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
    res = client.get("/api/status")
    assert res.status_code == 200 and res.json()["keyConfigured"] is True, res.status_code
loaded = sorted(m for m in sys.modules if "openrouter" in m or m == "openai" or m.startswith("openai."))
assert not loaded, loaded
print("lazy-ok")
"""


def test_provider_and_model_modules_not_imported_at_boot():
    """A fresh interpreter with a key: boot, lifespan and /api/status never import OpenRouter."""
    env = {**os.environ, "OPENROUTER_API_KEY": "sk-test-not-real"}
    proc = subprocess.run(
        [sys.executable, "-c", LAZY_CHECK],
        cwd=Path(__file__).resolve().parent.parent,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode == 0, proc.stderr[-2000:]
    assert "lazy-ok" in proc.stdout
