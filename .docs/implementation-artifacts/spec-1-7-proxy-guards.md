---
title: 'Story 1.7: Proxy guards: origin, rate limit and no data retention'
type: 'feature'
created: '2026-11-24'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Proxy answers any caller, any number of times, so anyone who reaches it can spend the key; no-retention (NFR-2) is only partly tested.

**Approach:** One guard in the request middleware: `Origin` allow-list (403), body cap (413), per-origin in-memory limit on live `POST`s (429); tests prove the marker never reaches a log, a body or a file. The `test` profile gets its own Proxy + web pair with a raised limit, so e2e never trips the guard. Refs: NFR-1–3 · AD-5, AD-14.

## Boundaries & Constraints

**Always:** order origin → body cap → rate limit → route; every rejection is `{code: "err.generation"}` with the normal log line. `ALLOWED_ORIGINS` and `RATE_LIMIT_PER_MIN` are read per request via `load_settings()`; origins normalised (strip trailing `/`, lowercase), header compared exactly; invalid or < 1 limit → 10. Sliding 60 s window, injectable monotonic clock; only requests that pass all guards are recorded; limiter reset between tests.

**Decisions (2026-11-24):**
- Counted = every `POST` except a JSON object body with `mode == "demo"` (malformed and keyless live POSTs count, per AD-5). Invariant: uncounted ⇒ the route answers 404 `err.demoOnly` with no model call; if guard and route could parse differently, count it.
- Body cap 8 MiB (from 1.6 review EC5). Foreign `Origin` → 403 for every method; `POST` without `Origin` → 403.
- D-7 (Tor): the `logfire-api` / `opentelemetry-api` shims from `pydantic-ai-slim` stay; "no telemetry" means no SDK, exporter or instrumentation, asserted by a test.

**Never:** CORS or preflight handling; limiter persistence; changes to generation, schemas or `schema.d.ts`; a Next.js `proxy.ts`.

## I/O & Edge-Case Matrix

| Input / State | Result |
|---------------|--------|
| `POST`, `Origin` `http://localhost:3000` or `http://127.0.0.1:3000` | route runs |
| `POST`, other `Origin`, `null` or none | 403, route not run |
| `GET /api/status`: no / allowed / foreign `Origin` | 200 / 200 / 403 |
| 11th live POST from one origin within 60 s | 429, model not called |
| same, ≥ 60.0 s after the 1st, or from the other origin | passes |
| demo POSTs, `GET /api/status` | never counted |
| `{"mode":"demo","mode":"live"}` | counted, or 404 `err.demoOnly` without model call |
| body 8 388 608 bytes / +1 byte (declared or streamed) | passes / 413 |
| `RATE_LIMIT_PER_MIN=3` | 4th live POST → 429 |
| `RATE_LIMIT_PER_MIN` `0`, `-1`, `abc` | limit 10, status still 200 |
| `ALLOWED_ORIGINS` entry `HTTP://LOCALHOST:3000/` | matches `http://localhost:3000` |

</frozen-after-approval>

## Code Map

- `proxy/app/main.py` -- `log_request` (L29-53) is the only log line; `_error` sets `request.state.error_code`. Guard goes before `call_next`; handlers unchanged.
- `proxy/app/config.py` -- add `MAX_BODY_BYTES`, origin normalisation, limit fallback (today `int("abc")` raises on every request).
- `compose.yaml` -- the `web` image bakes the rewrite to `http://proxy:8000`, so the test Proxy must answer as `proxy` on its own network.
- `proxy/tests/conftest.py` (autouse fixture: add limiter reset); `test_study_set.py`, `test_generation.py`, `study_set_data.py` -- POSTs lack `Origin`.
- `e2e/smoke.spec.ts` -- browser `fetch` pattern. `README.md` L28, L40-43, L69-78; `.docs/deviations.md` (next D-7).

## Tasks & Acceptance

**Execution:**
- [ ] `proxy/app/guards.py` -- `origin_allowed(method, origin, allowed)`, `RateLimiter(clock)` with `hit(origin, limit) -> bool` and `reset()`, `is_counted(body: bytes)`.
- [ ] `proxy/app/main.py` -- guard in `log_request`; limiter on `app.state`; capped body read, replayed to the route.
- [ ] `proxy/tests/test_guards.py` -- every matrix row, fake clock; `is_counted` counts a JSON list, string, non-UTF-8 and non-string `mode`.
- [ ] `proxy/tests/test_retention.py` -- marker in a valid, a malformed and a provider-error request: absent from `caplog`, `capfd` and bodies; no file opened for writing (record `builtins.open`/`os.open` write modes); `logfire`, `opentelemetry.sdk`, `opentelemetry.exporter*` not importable, pydantic-ai instrumentation off; `--no-access-log` in `proxy/Dockerfile` and `proxy-dev`.
- [ ] `proxy/tests/*` -- `Origin: http://localhost:3000` on existing POST clients.
- [ ] `compose.yaml` -- `test` network with `proxy-test` (same build, `*proxy-healthcheck`, `read_only`, `RATE_LIMIT_PER_MIN: 1000`, origins + `http://web-test:3000`, alias `proxy`) and `web-test` (`./web`); `test` depends on `web-test`, `BASE_URL=http://web-test:3000`.
- [ ] `e2e/guards.spec.ts` -- browser `fetch` demo POST → 404 `err.demoOnly` (Origin survives the rewrite); `request.post` without `Origin` → 403.
- [ ] `README.md`, `.docs/deviations.md` -- guards, 403/413/429, test services; D-7.

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` without a key, when run, then all three suites pass and nothing reaches the network.
- Given `docker compose up`, when used from `http://localhost:3000`, then status and POSTs work as before.
- Given any guard rejection, when logged, then the line is `METHOD path status ms err.generation` only.

## Design Notes

Threat model: ports bind to `127.0.0.1`, so the threat is other pages in the user's browser. `Origin` is not authentication (`curl` can set it); it blocks cross-site and DNS-rebinding POSTs. Accepted risk: a rebinding page's same-origin `GET /api/status` sends no `Origin` and reads model and `keyConfigured`. Origin before limiter keeps limiter keys bounded; one uvicorn worker is assumed.

Starlette 1.10 replays a body read in `BaseHTTPMiddleware`; read via `request.stream()` so the cap holds for chunked bodies.

## Verification

- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
- `docker compose up -d && curl -s -o /dev/null -w "%{http_code}" -X POST -H "Origin: http://evil.example" http://127.0.0.1:3000/api/study-set` -- `403`.
