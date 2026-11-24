"""FastAPI entry point for the Proxy (AD-5, AD-6, AD-14)."""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import llm
from .config import MAX_BODY_BYTES, PROMPT_VERSION, PROVIDER_NAME, load_settings
from .generation import GENERATION_ERROR, GenerationError, generate
from .guards import RateLimiter, is_counted, origin_allowed
from .schemas import ErrorBody, Status, StudySet, StudySetRequest

for _name in ("httpx", "httpx2", "httpcore", "httpcore2", "openai", "pydantic_ai", "uvicorn.access"):
    logging.getLogger(_name).setLevel(logging.WARNING)

logger = logging.getLogger("proxy")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_handler)
logger.setLevel(logging.INFO)
logger.propagate = False

app = FastAPI(title="Torsa Proxy", version="0.1.0")
app.state.rate_limiter = RateLimiter()


class _BodyTooLarge(Exception):
    pass


async def _read_capped_body(request: Request) -> bytes:
    """Read the body with the cap, declared or streamed, and cache it for the route.

    Setting `request._body` makes Starlette's `BaseHTTPMiddleware` replay it downstream;
    a body read only via `stream()` would reach the route empty.
    """
    declared = request.headers.get("content-length")
    if declared is not None and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
        raise _BodyTooLarge
    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_BODY_BYTES:
            raise _BodyTooLarge
        chunks.append(chunk)
    body = b"".join(chunks)
    request._body = body
    return body


async def _guard(request: Request) -> JSONResponse | None:
    """Origin -> body cap -> rate limit (Story 1.7). Returns the rejection, or None to pass."""
    settings = load_settings()
    origin = request.headers.get("origin")
    if not origin_allowed(request.method, origin, settings.allowed_origins):
        return _error(request, 403, GENERATION_ERROR)
    try:
        body = await _read_capped_body(request)
    except _BodyTooLarge:
        return _error(request, 413, GENERATION_ERROR)
    if request.method == "POST" and is_counted(body):
        limiter: RateLimiter = request.app.state.rate_limiter
        if not limiter.hit(origin, settings.rate_limit_per_min):
            return _error(request, 429, GENERATION_ERROR)
    return None


@app.middleware("http")
async def log_request(request: Request, call_next):
    """The only log line: method, path, status, duration and error code (AD-14).

    No bodies, no queries, no exception text. Handlers put the `{code}` they answered
    with in `request.state.error_code`.

    Unhandled exceptions are caught here so they still get a log line and never
    reach uvicorn's traceback logger (which could print exception text). The Story 1.7
    guards run first; a rejection gets the same log line with its code.
    """
    started = time.perf_counter()
    try:
        response = await _guard(request) or await call_next(request)
    except Exception:
        response = _error(request, 500, GENERATION_ERROR)
    duration_ms = (time.perf_counter() - started) * 1000
    code = getattr(request.state, "error_code", None)
    logger.info(
        "%s %s %s %.0fms%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        f" {code}" if code else "",
    )
    return response


def _error(request: Request, status: int, code: str) -> JSONResponse:
    """`{code}` error body (a Microcopy key). Never echoes input."""
    request.state.error_code = code
    return JSONResponse(status_code=status, content={"code": code})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, _exc: RequestValidationError):
    return _error(request, 400, GENERATION_ERROR)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, _exc: Exception):
    return _error(request, 500, GENERATION_ERROR)


@app.get("/api/status", response_model=Status, response_model_by_alias=True)
def get_status() -> Status:
    settings = load_settings()
    return Status(
        key_configured=settings.key_configured,
        model=settings.openrouter_model,
        provider=PROVIDER_NAME,
        prompt_version=PROMPT_VERSION,
    )


_ERRORS = {status: {"model": ErrorBody} for status in (400, 404, 502, 503, 504)}


@app.post(
    "/api/study-set",
    response_model=StudySet,
    response_model_by_alias=True,
    responses=_ERRORS,
)
async def post_study_set(body: StudySetRequest, request: Request):
    """Generate a Study Set from the Passages (FR-6, FR-7, FR-8). Demo Mode arrives in 1.13/1.14."""
    if body.mode == "demo":
        return _error(request, 404, "err.demoOnly")
    settings = load_settings()
    if not settings.key_configured:
        return _error(request, 503, "err.noKey")
    try:
        agent = llm.get_agent()
    except Exception:  # noqa: BLE001 -- never logged; text could hold settings
        return _error(request, 502, GENERATION_ERROR)
    result = await generate(body, settings, agent=agent)
    if isinstance(result, GenerationError):
        return _error(request, result.status, result.code)
    return result
