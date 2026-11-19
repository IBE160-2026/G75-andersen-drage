---
review: verify (reality check of committed technology decisions)
target: ../ARCHITECTURE-SPINE.md (+ ../.memlog.md version entries)
date: 2026-11-19
verdict: PASS WITH FIXES - every named version exists and is current, but three wiring/tooling facts are wrong or missing and will break the build or the live path if not fixed before epics
---

# Verify review: Architecture Spine, Torsas læringsassistent v1

Method: every Stack row and every technology-specific claim in AD-1 to AD-18 was re-checked on 2026-11-19 against live registries (npm, PyPI, nodejs.org, Docker Hub, MCR, GitHub releases, OpenRouter public API), against the shipped source of `next@16.4.6` and `pydantic-ai-slim@2.71.0`, and against the WHATWG Fetch spec. Two claims were tested hands-on (npm peer resolution; openapi-typescript on TS 6). Commands are listed per finding so they can be re-run.

Severity: **High** = breaks build, a test command or a core user path as specified. **Medium** = likely runtime failure or a gap an implementer must guess at. **Low** = stale or imprecise, easy fix. **Info** = confirmed, no action.

## Summary

| # | Severity | Area | Finding |
| --- | --- | --- | --- |
| H1 | High | AD-5, AD-7 | Next.js rewrite proxy times out at 30 s by default; generation is allowed 60 s + retry |
| H2 | High | AD-5 | Browsers send no `Origin` on same-origin GET, so `GET /api/status` fails the Origin check |
| H3 | High | AD-4, Stack | `openapi-typescript@7.13.0` peer-requires `typescript ^5.x`; `npm install` with TS 6.0.3 fails (ERESOLVE) |
| M1 | Medium | AD-13 | One of Haiku 5.5's two ZDR endpoints (Bedrock) lacks structured outputs and forced tool choice; routing rule lacks `require_parameters` |
| M2 | Medium | AD-8 | `mammoth.convertToHtml` returns an HTML string; Web Workers have no `DOMParser`, so "walked to lines" needs a named parser |
| M3 | Medium | AD-12, FR-23/24 | `OpenRouterProvider` raises at construction when `OPENROUTER_API_KEY` is empty; a no-key Proxy must build it lazily |
| L1 | Low | Stack | Docker/Compose versions on the dev machine read 29.8.0 / v5.5.1, not 29.9 / v5.7 |
| L2 | Low | Stack | uv 0.12 is stale; current is 0.13.9 |
| L3 | Low | AD-18 | `@playwright/test` 1.65.1 has no matching `mcr.microsoft.com/playwright` image (only v1.65.0) |
| L4 | Low | AD-13 | Haiku 5.5 and gpt-6-luna do not accept `temperature`; do not send sampling settings |
| L5 | Low | Naming | Next.js 16 file convention `proxy.ts` collides with the glossary term "Proxy" |
| L6 | Low | AD-8 | unpdf line structure for header/footer rule not specified; add size/page guards |
| I1-I9 | Info | all | Versions, Python 3.14 fit, Node 26 LTS, TS 6 rationale, pydantic-ai OpenRouter + `zdr`/`data_collection`, model IDs, Radix, idb, Vitest confirmed |

---

## High

### H1. Next.js rewrites cut proxied requests at 30 s (AD-5 vs AD-7)

- **Fact:** `next@16.4.6` proxies external rewrites through `proxyRequest()`, which sets `proxyTimeout: proxyTimeout === null ? undefined : proxyTimeout || 30000` ("we limit proxy requests to 30s by default"). The value comes from `config.experimental.proxyTimeout` (zod: `number().gte(0).optional()`). On timeout/error Next answers `500` with the plain text body `Internal Server Error`.
- **Conflict:** AD-7 allows `GENERATION_TIMEOUT_S=60` per attempt plus one retry, so `/api/study-set` can legitimately take ~120 s. Any generation over 30 s reaches the browser as a non-JSON 500, which breaks AD-6 ("every error is HTTP status + `{code}`") and the `err.generation` path. The memlog itself notes a 15,000-word Note can need 30-60 s.
- **Fix:** Add to AD-5: "`next.config` sets `experimental.proxyTimeout` to at least `2 x GENERATION_TIMEOUT_S + 15 s` (e.g. 140000 ms)." Add to AD-7: "The Proxy enforces a total deadline per request below that value." Add to Consistency/Errors: "The API client maps any non-JSON or `{code}`-less response to `err.generation`." Add a pytest/Playwright case with a stubbed slow model (> 30 s) to prove it.
- **Source:** `npm pack next@16.4.6` then read `package/dist/server/lib/router-utils/proxy-request.js` (lines ~29-40, ~80-87), `package/dist/server/lib/router-server.js:470`, `package/dist/server/config-schema.js:338`.

### H2. Same-origin GET carries no `Origin` header (AD-5)

- **Fact 1 (Next forwards Origin):** Next's proxy uses `httpxy` with `changeOrigin: true`, which rewrites only the `Host` header, and adds `x-forwarded-host`. The browser's `Origin` header is passed through unchanged. So the memlog concern "Proxy origin check must accept what Next forwards" is satisfied for requests that carry `Origin`.
- **Fact 2 (but GET has none):** WHATWG Fetch, "append a request `Origin` header": Origin is appended when response tainting is `cors` (cross-origin) or, otherwise, only when the method is neither GET nor HEAD. A same-origin `fetch('/api/status')` is GET with `basic` tainting, so the browser sends **no** `Origin`.
- **Conflict:** AD-5 says "The Proxy accepts a request only when its `Origin` is the app's localhost origin". Read literally, `GET /api/status` is always rejected, so startup can never learn `keyConfigured`/provider (FR-5, FR-24). Also, `ALLOWED_ORIGIN` is one value, but the app is reachable as both `http://localhost:3000` and `http://127.0.0.1:3000` (different origins).
- **Fix:** Rewrite the AD-5 rule: "A request is accepted when `Origin` is in the allowed set (`http://localhost:3000`, `http://127.0.0.1:3000`), or, when `Origin` is absent, when `Sec-Fetch-Site` is `same-origin` (or absent, for curl in the `dev` profile only). Anything else gets 403 `{code}`." Make `ALLOWED_ORIGIN` a comma-separated list in the Config row. Add pytest cases: POST with good Origin, POST with foreign Origin, GET without Origin + `Sec-Fetch-Site: same-origin`, and a Playwright check that `/api/status` succeeds through the rewrite.
- **Source:** https://fetch.spec.whatwg.org/#append-a-request-origin-header (fetched with `curl -s https://fetch.spec.whatwg.org/`); `package/dist/compiled/httpxy/index.js` and `proxy-request.js` in `next@16.4.6`.

### H3. openapi-typescript does not accept TypeScript 6 as a peer (AD-4, Stack)

- **Fact:** `npm view openapi-typescript@7.13.0 peerDependencies` gives `{"typescript": "^5.x"}`; `latest` is 7.13.0 and the only newer tag is `next: 7.0.0-rc.1` (same peer). A dry run `npm install -D typescript@6.0.3 openapi-typescript@7.13.0` fails with `ERESOLVE unable to resolve dependency tree ... peer typescript@"^5.x" from openapi-typescript@7.13.0`.
- **Tested workaround:** with `"overrides": {"openapi-typescript": {"typescript": "$typescript"}}` the install succeeds and `npx openapi-typescript o.json -o out.d.ts` generated correct types (enum, required/optional) on TypeScript 6.0.3.
- **Impact:** the first `npm install` in `web/` (and the CI contract-diff in AD-4/AD-18) fails until this is handled. It also confirms the TS 6 pin: openapi-typescript builds its output with the TS JS compiler API, which TS 7 lacks.
- **Fix:** Add to the Stack row: "openapi-typescript 7.13 (peer range says TS 5; `web/package.json` carries an `overrides` entry mapping it to the project's TypeScript 6)". Do not use `--legacy-peer-deps` globally. Add to the memlog that TS 6 is also required by openapi-typescript.
- **Source:** `npm view openapi-typescript@7.13.0 peerDependencies --json`; `npm view openapi-typescript dist-tags --json`; hands-on test in a scratch folder (commands above).

## Medium

### M1. ZDR routing for Haiku 5.5 can land on an endpoint without structured outputs (AD-13)

- **Fact:** `GET https://openrouter.ai/api/v1/endpoints/zdr` lists ZDR endpoints for: `anthropic/claude-haiku-5.5` = Google Vertex (`google-vertex/global`) **and** Amazon Bedrock (`amazon-bedrock`); `openai/gpt-6-luna` = Azure only; `google/gemini-3.5-flash-lite` = Google Vertex (global, flex, priority). Per `GET /api/v1/models/anthropic/claude-haiku-5.5/endpoints`, the Bedrock endpoint has `response_format` but **not** `structured_outputs`, and `supports_tool_choice.required = false`.
- **Conflict:** the memlog states "all three have Zero Data Retention endpoints with structured outputs (Haiku 5.5 via Google Vertex and Amazon Bedrock ...)". That is half true. With `{zdr: true, data_collection: "deny"}` alone, OpenRouter may route Haiku to Bedrock, where pydantic-ai's JSON-schema (`NativeOutput`) or forced-tool output is not honoured; the result fails validation, burns the retry and ends in `err.generation` intermittently. gpt-6-luna has a single ZDR endpoint (no fallback if Azure is down).
- **Fix:** AD-13 routing rule becomes `{zdr: true, data_collection: "deny", require_parameters: true}` and the Proxy uses structured output (pydantic-ai `NativeOutput`, i.e. `response_format` json_schema). `require_parameters` is supported by pydantic-ai's `OpenRouterProviderConfig`. Correct the memlog sentence. Record in the model comparison that gpt-6-luna has one ZDR host.
- **Source:** `curl -s https://openrouter.ai/api/v1/endpoints/zdr`; `curl -s https://openrouter.ai/api/v1/models/anthropic/claude-haiku-5.5/endpoints` (and the same for the other two IDs); `pydantic_ai/models/openrouter.py` class `OpenRouterProviderConfig` (fields `order, allow_fallbacks, require_parameters, data_collection, zdr, only, ignore, quantizations, sort, max_price`).

### M2. `convertToHtml` in a Web Worker needs an HTML parser that is not `DOMParser` (AD-8)

- **Fact:** mammoth 1.13.0 supports the browser (`{arrayBuffer}` input, `browser` field in package.json) and parses DOCX XML with `@xmldom/xmldom`, so it runs inside a Worker. Its output is an HTML **string**. `DOMParser` is not exposed in Web Workers, so "walked to lines" has no built-in way to walk the result in the place AD-8 says parsing happens.
- **Fix:** name the walk in AD-8: either (a) a small worker-safe HTML tokenizer (e.g. `htmlparser2`) over mammoth's limited, well-formed tag set (`p, h1-h6, li, table, tr, td, br, strong, em, a, img`), or (b) mammoth's `transformDocument` hook to read paragraphs/tables before HTML (README warns this API "should be considered unstable"). (a) is the safer choice. Keep the 15 s terminate as is. Add a Vitest test on `reference-notes/edge-cases/` table docx asserting one row per line with ` | `.
- **Source:** `npm view mammoth@1.13.0 dependencies browser --json`; `npm view mammoth@1.13.0 readme` (sections "browser", `{arrayBuffer}`, `transformDocument`); MDN "Functions and classes available to Web Workers" (DOMParser not listed).

### M3. pydantic-ai's OpenRouter provider refuses to start without a key (AD-12, FR-23, FR-24)

- **Fact:** `OpenRouterProvider.__init__` does `api_key = api_key or os.getenv('OPENROUTER_API_KEY')` and raises `UserError('Set the OPENROUTER_API_KEY environment variable ...')` when it is empty and no client is passed.
- **Conflict:** Demo Mode and `docker compose run --rm test` must run with no key, and `/api/status` must report `keyConfigured: false`. If `llm.py` builds the agent/provider at import or app start, the Proxy crashes on the examiner's machine without `.env`.
- **Fix:** add to AD-12 or AD-14: "The Proxy builds the OpenRouter provider lazily, only for a live request when the key is set; the app starts and serves `/api/status` and Demo with an empty key. A pytest boots the app with no `OPENROUTER_API_KEY`." The env var name in the Config row already matches pydantic-ai's default.
- **Source:** `pydantic_ai/providers/openrouter.py` lines 453-474 in `pydantic-ai-slim[openrouter]==2.71.0` (installed via `uv run --no-project --with "pydantic-ai-slim[openrouter]==2.71.0" ...`).

## Low

### L1. Docker versions on the dev machine do not match the Stack row

- **Fact:** on this machine `docker --version` = `29.8.0`, `docker compose version` = `v5.5.1` (engine was not running, so the server version could not be read). Stack/memlog say 29.9 / v5.7. Latest releases: Engine `docker-v29.10.0` (2026-11-16), Compose `v5.8.0` (2026-11-17).
- **Fix:** re-run `docker version` and `docker compose version` with Docker Desktop running and record the real values; better, state the minimum the examiner needs ("Docker with Compose v2 profiles support; tested on X") instead of the dev machine's exact build.
- **Source:** local commands above; `https://api.github.com/repos/docker/compose/releases/latest`, `https://api.github.com/repos/moby/moby/releases/latest`.

### L2. uv 0.12 is one minor behind

- **Fact:** PyPI `uv` latest = 0.13.9 (2026-11-17); 0.13.0 came out 2026-10-09. 0.12.18 (2026-09-22) is what is installed locally, which is where the memlog value came from. Image `ghcr.io/astral-sh/uv`/`astral/uv:0.13.9` exists.
- **Fix:** Stack row `uv | 0.13`; pin the uv image tag in the Proxy Dockerfile so the container does not depend on the dev machine.
- **Source:** `https://pypi.org/pypi/uv/json`; `https://hub.docker.com/v2/repositories/astral/uv/tags?name=0.13`.

### L3. Playwright package and Docker image versions differ

- **Fact:** `@playwright/test` latest 1.65.1 (2026-11-13); `mcr.microsoft.com/playwright` tags exist only for `v1.65.0` (jammy/noble/resolute). Playwright requires the browser build to match the package version exactly.
- **Fix:** if the `test` service uses the MCR image, pin `@playwright/test` and the image to the same version (1.65.0 today); otherwise install browsers in the test image with `npx playwright install --with-deps`. State the choice in AD-18.
- **Source:** `curl -s https://mcr.microsoft.com/v2/playwright/tags/list`; `npm view playwright time --json`.

### L4. Do not send sampling settings

- **Fact:** `/api/v1/models` lists no `temperature`/`top_p` for `anthropic/claude-haiku-5.5` and `openai/gpt-6-luna` (Gemini Flash-Lite has them). pydantic-ai's profile for Haiku 5.5 sets `anthropic_disallows_sampling_settings: True`. With `require_parameters: true` (M1) an unsupported parameter would exclude every endpoint.
- **Fix:** one line in AD-13: "The Proxy sets no temperature/top_p; determinism comes from the schema and Fixtures."
- **Source:** `curl -s https://openrouter.ai/api/v1/models` (field `supported_parameters`); `OpenRouterProvider().model_profile('anthropic/claude-haiku-5.5')`.

### L5. "Proxy" name collides with a Next.js 16 file convention

- **Fact:** Next.js 16 renamed `middleware.ts` to `proxy.ts` (`PROXY_FILENAME = 'proxy'` in `next/dist/lib/constants.js`). An agent told "the Proxy does the origin check" may create `web/proxy.ts`.
- **Fix:** add to the Naming row: "No `web/proxy.ts` (Next.js request proxy) in v1; 'Proxy' always means the FastAPI service."
- **Source:** `next@16.4.6` `package/dist/lib/constants.js` lines 287-290.

### L6. unpdf: fit confirmed, line handling and guards unspecified

- **Fact:** unpdf 2.2.1 runs in browsers and workers; its serverless PDF.js build parses "on your event loop (no worker)", which is exactly why AD-8's own Worker + 15 s terminate is the right design. `extractText` returns one string per page (or merged); line boundaries for the header/footer and hyphen rules depend on how items are joined. README advises `maxImageSize` and checking `pdf.numPages` before fan-out.
- **Fix:** AD-8 names `getDocumentProxy` + `extractTextItems` (per-page items with positions) as the line source, and sets `maxImageSize` and a page cap that matches FR-3's size limit. Verify on `en-unit-testing.pdf` in the first extraction story.
- **Source:** `npm view unpdf@2.2.1 readme`; `npm view unpdf@2.2.1 engines` (`node >=24`, fine for Node 26 in Vitest).

## Info (confirmed, no action)

- **I1. Every npm version in the Stack exists and is current `latest`:** next 16.4.6, react/react-dom 19.3.1, radix-ui 1.8.1 (Dialog 1.3.1, DropdownMenu 2.2.1, Tabs 1.2.1, Switch 1.4.1; peer react ^19 ok), idb 8.0.4, unpdf 2.2.1, mammoth 1.13.0, openapi-typescript 7.13.0, vitest 5.1.1, @playwright/test 1.65.1, @axe-core/playwright 4.14.0 (peer `playwright-core >=1.0.0`). Command: `npm view <pkg> version`.
- **I2. TypeScript 6 vs 7:** `latest` is 7.0.2; 6.0.3 is the newest 6.x. Next 16.4.6 checks types through the TS JS API by default and errors on TS 7 with "does not provide the compiler API required by Next.js ... or install TypeScript 6 instead" (`dist/lib/typescript/runTypeScriptCli.js:86`). Pinning 6.x is correct; H3 adds a second reason.
- **I3. Next.js server mode + rewrites:** external rewrites are proxied by the Next server (`router-server.js:470`), so AD-5's "not static export" is required and correct. Next peer `react ^19`, engines `node >=20.9`. Note: `rewrites()` is resolved at build time, so `http://proxy:8000` is baked into the image; fine for Compose.
- **I4. Node 26 LTS:** nodejs.org `v26.13.1`, LTS "Lithium", 2026-11-10; Docker `node:26.13.1-*` tags exist. Vitest 5 engines `^22.12 || ^24 || >=26` ok.
- **I5. Python 3.14:** latest 3.14.10 (2026-10-25); `python:3.14.10-slim` exists. fastapi 0.165.0 (>=3.11), pydantic 2.14.4 / pydantic-core 2.50.5 (31 cp314 wheels), pydantic-ai-slim 2.71.0 (>=3.11), uvicorn 0.54.0, pytest 9.2.0 all declare 3.14. Python 3.15 is out (2026-10-09) but uvicorn and pydantic-core do not yet classify 3.15, so 3.14 is the right pick. A live install of all of them on CPython 3.14.7 imported cleanly. Note pydantic 2.14.4 was released today; pin it in `uv.lock`.
- **I6. pydantic-ai OpenRouter support:** extra `openrouter` exists (pulls `openai>=3.31,<4`); `OpenRouterModel` / `OpenRouterProvider` / `OpenRouterModelSettings` exist; `openrouter_provider` setting is a typed dict that includes `zdr: bool` and `data_collection: 'allow' | 'deny'`. AD-13's rule is expressible directly.
- **I7. Model IDs:** `anthropic/claude-haiku-5.5`, `openai/gpt-6-luna`, `google/gemini-3.5-flash-lite` all present in `/api/v1/models`, no expiration date, all list `structured_outputs` and `response_format` at model level. pydantic-ai 2.71.0 profiles recognise all three with `supports_json_schema_output: True`.
- **I8. Fixture/test tools:** pytest 9.2, Vitest 5.1 and Playwright + @axe-core/playwright 4.14 are compatible with the chosen runtimes; no version conflict beyond H3 and L3.
- **I9. idb 8.0.4** ships ESM + CJS exports, no peer deps; fits AD-10.

## Suggested memlog corrections

- Line 39: uv 0.12.18 is the local install, current is 0.13.9; add "openapi-typescript needs an npm override for TS 6".
- Line 40: "all three have ZDR endpoints with structured outputs" -> "Haiku 5.5: Vertex (structured outputs) and Bedrock (no structured outputs); gpt-6-luna: Azure only; Flash-Lite: Vertex only; routing adds `require_parameters: true`".
- Line 18: re-record Docker/Compose versions (machine currently reports 29.8.0 / v5.5.1).
