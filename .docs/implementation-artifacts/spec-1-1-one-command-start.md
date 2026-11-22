---
title: 'Story 1.1: One-command start with an empty app and a green test run'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_commit: 'ee9ac8de7c22dcfde76e20307873f7937ef85e81'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-G75-andersen-drage-2026-11-18/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has planning docs and reference notes but no runnable code, so the examiner cannot start or test anything (DR-1, DR-2).

**Approach:** Hand-build the skeleton per AD-1/AD-2 and the Structural Seed: `web` + `proxy` via `docker compose up`, a `test` profile with one smoke test per suite, a generated contract, and CI running the same command plus a contract-diff check. Refs: AD-1, AD-2, AD-4, AD-5, AD-14, AD-18 · NFR-1, NFR-3 · DR-1, DR-2, DR-6.

## Boundaries & Constraints

**Always:** pin versions per the spine Stack table (Playwright npm = Docker image version); if a pin is unavailable, use the nearest and note it. Only `web` is published, on `127.0.0.1:3000`. Browser uses relative `/api/*` only. Proxy boots without a key (lazy provider). All variables but `OPENROUTER_API_KEY` defaulted in `compose.yaml`; `env_file` optional, proxy only.

**Never:** no study features, UI shell, tokens or i18n (Story 1.2); no origin guard or rate limit (Story 1.7); no Tailwind, database, auth or `NEXT_PUBLIC_*` vars; no key in repo; no Note content in logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Boot, no key | clean clone, no `.env` | `docker compose up` starts both; web waits for proxy healthcheck | — |
| Status | `GET /api/status` via web | `{keyConfigured:false, model, provider:"OpenRouter", promptVersion}` | — |
| Boot, key set | `.env` with `OPENROUTER_API_KEY` | `keyConfigured:true`; no provider call at boot | — |
| Tests | `docker compose run --rm test` | Vitest, pytest, Playwright each ≥1 passing smoke test, no key | non-zero exit on any failure |
| Contract drift | `schemas.py` changed, `schema.d.ts` not | CI contract-diff step fails | — |

**Decisions (2026-11-22, Tor):** README stays Norwegian. Spec kept whole (one goal; CI split would leave a PR without green CI).

</frozen-after-approval>

## Code Map

- `README.md` -- Norwegian; "Medlemmer" still lists Lasse S Drage — fix (DR-1).
- `.gitignore` -- already covers deps, builds, caches, `.env*` (`!.env.example`); extend only if needed.
- `reference-notes/`, `_bmad/`, `.claude/`, `.docs/`, `.logs/` -- do not touch.
- No application code exists; all else is new.

## Tasks & Acceptance

**Execution:**
- [x] `compose.yaml` -- `web`, `proxy`; profiles `dev` and `test` per AD-2; proxy healthcheck on `/api/status`; variable defaults per spine Config row.
- [x] `.env.example` -- every Proxy variable, no values -- NFR-1.
- [x] `proxy/` (`pyproject.toml`, `uv.lock`, `Dockerfile`, `app/main.py`, `app/schemas.py`, `app/config.py`, `app/llm.py`) -- `GET /api/status` (Pydantic `Status`, camelCase aliases), `PROMPT_VERSION`, lazy provider, logging per AD-14.
- [x] `proxy/tests/test_status.py` -- status with/without key; boots with no key.
- [x] `web/` (`package.json` + lockfile, `Dockerfile`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`) -- minimal page; `/api/*` rewrite + `proxyTimeout` per AD-5; empty Structural Seed folders with `.gitkeep`.
- [x] `web/api/schema.d.ts` + `web/package.json` script `gen:api` -- generated from proxy OpenAPI, committed.
- [x] `web/core/smoke.test.ts`, `web/vitest.config.ts` -- one Vitest smoke test.
- [x] `e2e/` (`package.json`, `playwright.config.ts`, `smoke.spec.ts`, `Dockerfile` from `mcr.microsoft.com/playwright:v1.65.0`) -- loads `/`, asserts `/api/status` via web.
- [x] `scripts/test.sh` -- runs all three suites in the `test` service; non-zero on failure.
- [x] `.github/workflows/ci.yml` -- PR + push to `main`: test command, then regenerate `schema.d.ts` + `git diff --exit-code`.
- [x] `README.md` -- prerequisites, commands, config, folder overview, team status (solo; Lasse S. Drage dropped out before the brief, Sept 2026).

**Acceptance Criteria:**
- Given the running app, when the browser calls `/api/status`, then Next.js proxies it to `proxy:8000` and no Proxy URL appears in browser code.
- Given the repository, when inspected, then folders follow the Structural Seed and no stray root files exist.
- Given a PR, when CI fails, then merge is blocked (branch protection on `main` documented in README as a manual GitHub setting).

## Implementation Notes

- Version pins match the spine Stack table at its own granularity (`node:26-slim`, `python:3.14-slim`, `uv:0.13`); no substitutions.
- Review patches (iteration 0): Proxy middleware now catches unhandled exceptions, logs `METHOD path 500 ms` and returns `{code}` (no uvicorn traceback). `web` has a healthcheck and `test` waits for `service_healthy`. The e2e smoke asserts `keyConfigured` is a boolean, so a developer `.env` key does not break the test command (pytest covers both values). `.gitattributes` forces LF for `*.sh`. README dev command limited to `proxy-dev web-dev`; contract command runs in the test image.

## Spec Change Log

## Review Triage Log

| # | Finding (source) | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | No-echo test hits an unknown route, never the handlers (VG, BH, EC) | medium | `/api/status-unknown` → Starlette 404; neither handler ran | patch: throwaway routes assert 400/500 `{code}`, no marker in body or log |
| 2 | Lazy-provider test cannot see a build during import/lifespan (VG) | low | `cache_clear()` runs after import, lifespan never entered; only call site is lazy today | defer (Story 1.6 reworks `llm.py`) |
| 3 | Test command fails with a real key in `.env` (BH, EC, VG) | medium | `proxy` reads `.env`; e2e hard-asserted `keyConfigured:false` | patch: e2e asserts boolean |
| 4 | No-key pytest breaks when `OPENROUTER_MODEL` is set (BH, EC) | low | asserted default model without clearing env | patch: `delenv` |
| 5 | `test` waits for `web` started, not ready (BH, EC, VG) | medium | no web healthcheck; `retries: 0` in Playwright | patch: web healthcheck + `service_healthy` |
| 6 | Unhandled exceptions skip the request log line and reach uvicorn's traceback logger (BH, EC×2) | medium | `call_next` raises past `logger.info`; ServerErrorMiddleware re-raises | patch: catch in middleware, log, return `{code}` |
| 7 | 404/405 return `{detail}` not `{code}` (EC) | low | real, but browser calls only defined routes; fix adds a handler | reject |
| 8 | `scripts/test.sh` checked out CRLF on Windows (`core.autocrlf=true`) (EC) | high | bash fails on `\r`; examiner may clone on Windows | patch: `.gitattributes *.sh eol=lf` |
| 9 | `--profile dev up` also starts prod `web`/`proxy` (BH, EC) | low | default services have no profile | patch: README names `proxy-dev web-dev` |
| 10 | README "only Docker" contradicted by host `uv`/`npm` contract commands (BH) | low | commands needed host tools, no `--frozen` | patch: containerised command |
| 11 | Image tags float (BH) | false | tags match Stack table (Node 26, Python 3.14, uv 0.13) | reject |
| 12 | `typecheck` never run (BH) | low | `next build` type-checks `web/` in the image; e2e is two tests | reject |
| 13 | No axe in e2e (BH) | low | page is an empty placeholder until 1.2; adds a dependency | reject |
| 14 | Service `.dockerignore` misses `.env`, `openapi.json`, `tests/` (BH) | false | `.env` lives at root outside `./web`/`./proxy` contexts; proxy image copies only `app`/`fixtures` | reject |
| 15 | Prod web image ships devDeps; images run as root (BH) | low | real, no user-facing harm locally; fix restructures images | reject |
| 16 | `read_only` proxy has no `/tmp` (BH) | maybe-false | nothing writes today; would only be low | reject |
| 17 | CI has no `permissions:` (BH) | low | default token scopes | patch: `contents: read` |
| 18 | CI has no build cache (BH) | low | slower CI only | reject |
| 19 | Bad numeric env values fail per request (BH, EC) | low | healthcheck fails, web never starts; needs validation code | reject |
| 20 | Zero/negative timeouts accepted (EC) | low | values unused until 1.6/1.7 | reject |
| 21 | Key whitespace: status strips, provider does not (EC) | low | `key_configured` stripped, `api_key` raw | patch: strip in `load_settings` |
| 22 | Contract diff misses a deleted/untracked `schema.d.ts` (EC) | low | `git diff` ignores untracked files | patch: `git status --porcelain` check |
| 23 | e2e JSON parse hides real status on non-JSON body (EC) | low | cosmetic failure message | reject |
| 24 | Host port 3000 taken breaks test run (EC) | low | environmental | reject |
| 25 | Root `.dockerignore`, `scripts/test.sh` not in Structural Seed (EC) | false | `scripts/test.sh` is a spec task; `.dockerignore` serves the root test build context | reject |
| 26 | README lists `ALLOWED_ORIGINS`/`RATE_LIMIT_PER_MIN` as active (BH) | low | not enforced until 1.7 | patch: README note |
| 27 | Item ID scheme in `epic-1-context.md` lacks concept prefix (BH) | low | spine: `{keyConceptId}.fc{n}` | patch: context file corrected |

## Design Notes

One `test` image (Playwright base + uv/Python) runs all suites against `web`/`proxy` on the Compose network (`BASE_URL=http://web:3000`). `gen:api` reads a dumped `app.openapi()`, so no running server is needed.

## Verification

**Commands:**
- `docker compose up -d --build && curl -s http://127.0.0.1:3000/api/status` -- expected: JSON with `keyConfigured:false`
- `docker compose run --rm test` -- expected: exit 0, three suites pass
- `docker compose down` -- expected: clean shutdown
