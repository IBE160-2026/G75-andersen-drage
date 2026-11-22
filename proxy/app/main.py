"""FastAPI entry point for the Proxy (AD-5, AD-6, AD-14)."""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import PROMPT_VERSION, PROVIDER_NAME, load_settings
from .schemas import Status

for _name in ("httpx", "openai", "pydantic_ai", "uvicorn.access"):
    logging.getLogger(_name).setLevel(logging.WARNING)

logger = logging.getLogger("proxy")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_handler)
logger.setLevel(logging.INFO)
logger.propagate = False

app = FastAPI(title="Torsa Proxy", version="0.1.0")


@app.middleware("http")
async def log_request(request: Request, call_next):
    """The only log line: method, path, status, duration (AD-14). No bodies, no queries.

    Unhandled exceptions are caught here so they still get a log line and never
    reach uvicorn's traceback logger (which could print exception text).
    """
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        response = JSONResponse(status_code=500, content={"code": "err.generation"})
    duration_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "%s %s %s %.0fms", request.method, request.url.path, response.status_code, duration_ms
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, _exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"code": "err.generation"})


@app.exception_handler(Exception)
async def unhandled_error(_request: Request, _exc: Exception):
    return JSONResponse(status_code=500, content={"code": "err.generation"})


@app.get("/api/status", response_model=Status, response_model_by_alias=True)
def get_status() -> Status:
    settings = load_settings()
    return Status(
        key_configured=settings.key_configured,
        model=settings.openrouter_model,
        provider=PROVIDER_NAME,
        prompt_version=PROMPT_VERSION,
    )
