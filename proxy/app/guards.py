"""Request guards (AD-5, NFR-3): origin allow-list, live-POST rate limit, body cap helpers.

Pure helpers; `main.log_request` wires them in the order origin -> body cap -> rate limit.
"""

import json
import time
from collections import deque
from collections.abc import Callable

WINDOW_S = 60.0
SAFE_METHODS = ("GET", "HEAD", "OPTIONS")


def origin_allowed(method: str, origin: str | None, allowed: list[str]) -> bool:
    """A present `Origin` must be on the list (any method); only safe methods may omit it.

    `allowed` is already normalised by `load_settings()`; the header is compared exactly,
    so `null`, an empty value or a different port are rejected.
    """
    if origin is None:
        return method in SAFE_METHODS
    return origin in allowed


class _DuplicateKey(ValueError):
    pass


def _no_duplicates(pairs: list[tuple[str, object]]) -> dict:
    keys = [key for key, _ in pairs]
    if len(keys) != len(set(keys)):
        raise _DuplicateKey
    return dict(pairs)


def is_counted(body: bytes) -> bool:
    """Every POST counts except a JSON object with `mode == "demo"`.

    Anything the route could read differently (malformed JSON, non-UTF-8, duplicate keys)
    counts, so an uncounted request can only be a demo request.
    """
    try:
        data = json.loads(body.decode("utf-8"), object_pairs_hook=_no_duplicates)
    except (ValueError, RecursionError):  # also UnicodeDecodeError, JSONDecodeError, _DuplicateKey
        return True
    return not (isinstance(data, dict) and data.get("mode") == "demo")


class RateLimiter:
    """Sliding 60 s window per origin, in memory only (one uvicorn worker assumed)."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}

    def hit(self, origin: str, limit: int) -> bool:
        """Record and allow the request if `origin` is under `limit`; refuse otherwise (not recorded)."""
        now = self._clock()
        hits = self._hits.setdefault(origin, deque())
        while hits and now - hits[0] >= WINDOW_S:
            hits.popleft()
        if len(hits) >= limit:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()
