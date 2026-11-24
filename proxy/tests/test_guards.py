"""Story 1.7 guards: origin allow-list, body cap and live-POST rate limit (the I/O matrix)."""

import json
import logging

import pytest
from fastapi.testclient import TestClient

from app import llm
from app.config import MAX_BODY_BYTES, load_settings
from app.guards import WINDOW_S, RateLimiter, is_counted, origin_allowed
from app.main import app
from study_set_data import ORIGIN, StubModel, draft, request_body

OTHER_ORIGIN = "http://127.0.0.1:3000"
FOREIGN = "http://evil.example"


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def clock():
    fake = FakeClock()
    original = app.state.rate_limiter
    app.state.rate_limiter = RateLimiter(fake)
    yield fake
    app.state.rate_limiter = original


@pytest.fixture
def client(monkeypatch):
    """Keyless: a live POST that passes the guard answers 503 `err.noKey` (route ran, no model)."""
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("RATE_LIMIT_PER_MIN", raising=False)
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    return TestClient(app)


@pytest.fixture
def logs(caplog):
    proxy_logger = logging.getLogger("proxy")
    proxy_logger.addHandler(caplog.handler)
    caplog.set_level(logging.DEBUG)
    yield caplog
    proxy_logger.removeHandler(caplog.handler)


def live(client: TestClient, origin: str | None = ORIGIN, **kwargs):
    headers = {"Origin": origin} if origin is not None else {}
    return client.post("/api/study-set", json=request_body(), headers=headers, **kwargs)


def demo(client: TestClient, origin: str = ORIGIN):
    return client.post("/api/study-set", json=request_body(mode="demo"), headers={"Origin": origin})


def assert_rejected(res, status: int) -> None:
    assert res.status_code == status
    assert res.json() == {"code": "err.generation"}


# --- Origin ---------------------------------------------------------------------


@pytest.mark.parametrize("origin", [ORIGIN, OTHER_ORIGIN])
def test_post_from_allowed_origin_reaches_the_route(client, origin):
    res = live(client, origin)
    assert res.status_code == 503
    assert res.json() == {"code": "err.noKey"}


@pytest.mark.parametrize("origin", [FOREIGN, "null", "", "http://localhost:3001", "http://localhost:3000/"])
def test_post_from_other_origin_is_403(client, origin, logs):
    res = live(client, origin)
    assert_rejected(res, 403)
    assert "POST /api/study-set 403" in logs.text and "err.generation" in logs.text
    assert "err.noKey" not in logs.text  # route not run


def test_post_without_origin_is_403(client):
    assert_rejected(live(client, None), 403)


def test_status_without_or_with_allowed_origin_is_200_foreign_is_403(client):
    assert client.get("/api/status").status_code == 200
    assert client.get("/api/status", headers={"Origin": ORIGIN}).status_code == 200
    assert_rejected(client.get("/api/status", headers={"Origin": FOREIGN}), 403)


def test_allowed_origins_entries_are_normalised(client, monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "HTTP://LOCALHOST:3000/")
    assert load_settings().allowed_origins == ["http://localhost:3000"]
    assert live(client, ORIGIN).status_code == 503
    assert_rejected(live(client, OTHER_ORIGIN), 403)


def test_origin_allowed_unit():
    allowed = [ORIGIN]
    assert origin_allowed("GET", None, allowed)
    assert origin_allowed("OPTIONS", None, allowed)
    assert not origin_allowed("POST", None, allowed)
    for method in ("PUT", "PATCH", "DELETE"):
        assert not origin_allowed(method, None, allowed)
    assert not origin_allowed("GET", FOREIGN, allowed)
    assert not origin_allowed("POST", "HTTP://LOCALHOST:3000", allowed)  # header compared exactly


# --- Rate limit -----------------------------------------------------------------


def test_eleventh_live_post_within_60s_is_429_and_model_not_called(monkeypatch, clock, logs):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-not-real")
    monkeypatch.delenv("RATE_LIMIT_PER_MIN", raising=False)
    client = TestClient(app)
    stub = StubModel(draft())
    with llm.get_agent().override(model=stub.model):
        for _ in range(10):
            assert live(client).status_code == 200
            clock.now += 5
        res = live(client)
    assert_rejected(res, 429)
    assert stub.calls == 10
    assert "POST /api/study-set 429" in logs.text


def test_window_slides_after_60s(client, clock):
    for _ in range(10):
        assert live(client).status_code == 503
    assert_rejected(live(client), 429)
    clock.now += WINDOW_S - 0.001
    assert_rejected(live(client), 429)
    clock.now += 0.001  # exactly 60.0 s after the first
    assert live(client).status_code == 503


def test_limit_is_per_origin(client, clock):
    for _ in range(10):
        live(client, ORIGIN)
    assert_rejected(live(client, ORIGIN), 429)
    assert live(client, OTHER_ORIGIN).status_code == 503


def test_demo_posts_and_status_are_never_counted(client, clock):
    for _ in range(25):
        res = demo(client)
        assert res.status_code == 404 and res.json() == {"code": "err.demoOnly"}
        assert client.get("/api/status", headers={"Origin": ORIGIN}).status_code == 200
    assert live(client).status_code == 503


def test_rejections_are_not_recorded(client, clock):
    for _ in range(10):
        live(client)
    for _ in range(5):
        assert_rejected(live(client), 429)
    clock.now += WINDOW_S
    for _ in range(10):  # the five 429s did not extend the window
        assert live(client).status_code == 503


def test_malformed_live_posts_count(client, clock):
    for _ in range(10):
        res = client.post(
            "/api/study-set", content=b"not json", headers={"Origin": ORIGIN, "content-type": "application/json"}
        )
        assert res.status_code == 400
    assert_rejected(live(client), 429)


def test_duplicate_mode_keys_count_and_never_call_the_model(monkeypatch, clock):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-not-real")
    monkeypatch.setenv("RATE_LIMIT_PER_MIN", "1")
    client = TestClient(app)
    body = json.dumps(request_body(mode="demo"))
    tricky = body.replace('"mode": "demo"', '"mode": "demo", "mode": "live"').encode()
    assert not is_counted(body.encode())
    assert is_counted(tricky)
    stub = StubModel(draft())
    with llm.get_agent().override(model=stub.model):
        live(client)  # uses the single allowed slot
        res = client.post(
            "/api/study-set", content=tricky, headers={"Origin": ORIGIN, "content-type": "application/json"}
        )
    assert_rejected(res, 429)
    assert stub.calls == 1


@pytest.mark.parametrize(
    "body",
    [b"[]", b'"demo"', b'{"mode": 1}', b'{"mode": "Demo"}', '{"mode": "demo"}'.encode("utf-16"), b"\xff\xfe"],
)
def test_is_counted_for_anything_but_a_demo_object(body):
    assert is_counted(body)


def test_deeply_nested_json_counts():
    assert is_counted(b"[" * 200_000)


def test_rate_limit_from_env(client, clock, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MIN", "3")
    for _ in range(3):
        assert live(client).status_code == 503
    assert_rejected(live(client), 429)


@pytest.mark.parametrize("value", ["0", "-1", "abc"])
def test_invalid_rate_limit_falls_back_to_10(client, clock, monkeypatch, value):
    monkeypatch.setenv("RATE_LIMIT_PER_MIN", value)
    assert load_settings().rate_limit_per_min == 10
    assert client.get("/api/status").status_code == 200
    for _ in range(10):
        assert live(client).status_code == 503
    assert_rejected(live(client), 429)


# --- Body cap -------------------------------------------------------------------


def _sized_body(size: int) -> bytes:
    prefix = b'{"mode": "demo", "pad": "'
    suffix = b'"}'
    return prefix + b"x" * (size - len(prefix) - len(suffix)) + suffix


def _post_raw(client: TestClient, content, **headers):
    return client.post(
        "/api/study-set", content=content, headers={"Origin": ORIGIN, "content-type": "application/json", **headers}
    )


def test_body_at_cap_passes_and_one_byte_more_is_413(client, logs):
    at_cap = _sized_body(MAX_BODY_BYTES)
    assert len(at_cap) == 8_388_608
    res = _post_raw(client, at_cap)
    assert res.status_code == 400  # past the cap; the route rejects the shape
    assert_rejected(_post_raw(client, _sized_body(MAX_BODY_BYTES + 1)), 413)
    assert "POST /api/study-set 413" in logs.text


def _chunked(body: bytes):
    """A generator body: sent chunked, without Content-Length."""
    for start in range(0, len(body), 1 << 20):
        yield body[start : start + (1 << 20)]


def test_streamed_body_at_cap_passes_and_one_byte_more_is_413(client):
    assert _post_raw(client, _chunked(_sized_body(MAX_BODY_BYTES))).status_code == 400
    assert_rejected(_post_raw(client, _chunked(_sized_body(MAX_BODY_BYTES + 1))), 413)


def test_streamed_body_under_cap_reaches_the_route(client):
    body = json.dumps(request_body(mode="demo")).encode()

    def chunks():
        yield body[:10]
        yield body[10:]

    res = _post_raw(client, chunks())
    assert res.status_code == 404 and res.json() == {"code": "err.demoOnly"}
