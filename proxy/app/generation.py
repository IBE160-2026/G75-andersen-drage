"""One Study Set generation: at most 2 model calls within the AD-7 budget.

Leak guard (NFR-5): exceptions are classified by type only. Never `str(exc)`,
`logger.exception` or `exc_info` here; exception text can carry Note text or model output.
"""

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING

from pydantic_ai.exceptions import (
    ModelConnectionError,
    ModelHTTPError,
    ModelRequestTimeout,
    ModelTimeoutError,
    RunTimedOut,
    UnexpectedModelBehavior,
)

from .config import PROMPT_VERSION, Settings
from .llm import render_passages, run_once
from .rules import validate_study_set
from .schemas import StudySet, StudySetRequest

if TYPE_CHECKING:
    from pydantic_ai import Agent

MAX_ATTEMPTS = 2
GENERATION_ERROR = "err.generation"


@dataclass(frozen=True)
class GenerationError:
    status: int
    code: str = GENERATION_ERROR


def _classify(exc: Exception) -> tuple[bool, int]:
    """(retry?, HTTP status if this is the last failure)."""
    # TimeoutError also covers asyncio.TimeoutError from a lower layer.
    if isinstance(exc, (RunTimedOut, ModelRequestTimeout, ModelTimeoutError, TimeoutError)):
        return True, 504
    if isinstance(exc, ModelHTTPError):
        return exc.status_code == 429 or exc.status_code >= 500, 502
    if isinstance(exc, ModelConnectionError):
        return True, 502
    if isinstance(exc, UnexpectedModelBehavior):  # incl. ContentFilterError, OutputTokenLimitExceeded
        return True, 502
    return False, 502  # other 4xx-like errors, UserError, anything else


async def generate(
    request: StudySetRequest,
    settings: Settings,
    *,
    agent: "Agent",
    clock: Callable[[], float] = time.monotonic,
) -> StudySet | GenerationError:
    deadline = clock() + settings.generation_deadline_s
    prompt = render_passages(request.passages)
    status = 502
    for attempt in range(MAX_ATTEMPTS):
        remaining = deadline - clock()
        if attempt > 0 and remaining < settings.generation_timeout_s:
            break
        try:
            raw = await run_once(
                agent, prompt, timeout=min(settings.generation_timeout_s, remaining)
            )
        except Exception as exc:  # noqa: BLE001 -- classified by type, never logged
            retry, status = _classify(exc)
            if not retry:
                return GenerationError(status)
            continue
        study_set = validate_study_set(
            raw, model=settings.openrouter_model, prompt_version=PROMPT_VERSION
        )
        if study_set is not None:
            return study_set
        status = 502
    return GenerationError(status)
