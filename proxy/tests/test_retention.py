"""NFR-2 no data retention (Story 1.7): the marker never reaches a log, a body or a file,
and no telemetry SDK, exporter or instrumentation is present (D-7)."""

import builtins
import importlib.util
import io
import logging
import os
from contextlib import contextmanager
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic_ai import Agent
from pydantic_ai.exceptions import ModelHTTPError

from app import llm
from app.main import app
from study_set_data import MARKER, ORIGIN, StubModel, draft, request_body

ROOT = Path(__file__).resolve().parents[2]

_WRITE_FLAGS = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_APPEND | os.O_TRUNC


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-not-real")
    return TestClient(app, headers={"Origin": ORIGIN})


@pytest.fixture
def logs(caplog):
    proxy_logger = logging.getLogger("proxy")
    proxy_logger.addHandler(caplog.handler)
    caplog.set_level(logging.DEBUG)
    yield caplog
    proxy_logger.removeHandler(caplog.handler)


@contextmanager
def recording_write_opens(monkeypatch):
    """Record every open for writing (builtins/io `open` and `os.open`) inside the block."""
    seen: list[str] = []
    real_open, real_os_open = builtins.open, os.open

    def recording_open(file, mode="r", *args, **kwargs):
        if any(flag in mode for flag in "wax+"):
            seen.append(f"open({file!r}, {mode!r})")
        return real_open(file, mode, *args, **kwargs)

    def recording_os_open(path, flags, *args, **kwargs):
        if flags & _WRITE_FLAGS:
            seen.append(f"os.open({path!r}, {flags})")
        return real_os_open(path, flags, *args, **kwargs)

    with monkeypatch.context() as patch:
        patch.setattr(builtins, "open", recording_open)
        patch.setattr(io, "open", recording_open)
        patch.setattr(os, "open", recording_os_open)
        yield seen


def test_marker_never_reaches_a_log_a_body_or_a_file(client, logs, capfd, monkeypatch):
    provider_error = ModelHTTPError(500, "stub", body={"error": MARKER})
    valid, failing = StubModel(draft()), StubModel(provider_error, provider_error)
    agent = llm.get_agent()  # built (and its modules imported) before recording starts
    with agent.override(model=valid.model):
        client.post("/api/study-set", json=request_body())  # warm-up: lazy imports happen here
    responses = []
    with recording_write_opens(monkeypatch) as write_opens:
        with agent.override(model=valid.model):
            responses.append(client.post("/api/study-set", json=request_body(text=f"Notat med {MARKER} inni.")))
        responses.append(
            client.post(
                "/api/study-set", json=request_body(noteHash=MARKER, passages=[{"id": MARKER, "text": MARKER}])
            )
        )
        with agent.override(model=failing.model):
            responses.append(client.post("/api/study-set", json=request_body(text=f"Feil med {MARKER}.")))
        # Guard rejections must not echo the body either.
        responses.append(
            client.post("/api/study-set", json=request_body(text=MARKER), headers={"Origin": "http://evil.example"})
        )

    assert [r.status_code for r in responses] == [200, 400, 502, 403]
    out, err = capfd.readouterr()
    for res in responses:
        assert MARKER not in res.text
    assert MARKER not in logs.text
    assert MARKER not in out and MARKER not in err
    assert write_opens == []


def test_no_telemetry_sdk_exporter_or_instrumentation(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-not-real")
    for module in ("logfire", "opentelemetry.sdk", "opentelemetry.exporter"):
        assert importlib.util.find_spec(module) is None, module
    assert Agent._instrument_default is False
    assert llm.get_agent().instrument is None


def test_uvicorn_access_log_is_off_in_every_command():
    dockerfile = (ROOT / "proxy" / "Dockerfile").read_text(encoding="utf-8")
    cmd = [line for line in dockerfile.splitlines() if line.startswith("CMD ")]
    assert cmd and "--no-access-log" in cmd[0]
    compose = (ROOT / "compose.yaml").read_text(encoding="utf-8").splitlines()
    commands = [line for line in compose if "uvicorn" in line and "command:" in line]
    assert commands, "proxy-dev overrides the command"
    for line in commands:
        assert "--no-access-log" in line, line
