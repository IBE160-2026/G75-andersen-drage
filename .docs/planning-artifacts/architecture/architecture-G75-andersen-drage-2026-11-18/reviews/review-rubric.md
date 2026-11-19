---
title: Rubric review of ARCHITECTURE-SPINE.md
reviewed: ARCHITECTURE-SPINE.md (status draft, updated 2026-11-19)
against: prd.md (final 2026-11-12), addendum.md, EXPERIENCE.md, .memlog.md
altitude: feature (must keep the epics consistent)
date: 2026-11-19
---

# Rubric review: Architecture Spine, Torsas læringsassistent v1

## Verdict

The spine is strong. It has a clear paradigm, enforceable rules for most of the real divergence points (one Normalization, one contract source, one storage module, one retry location, one ID derivation), verified versions and a usable seed. It is **not ready for epics yet**. Four high findings would let two epics build incompatible pieces or would break the examiner path: Items have no identity; the timeout and retry budget contradicts FR-11, NFR-4 and NFR-5; the cache-key rule in AD-9 cannot implement FR-4; and the Origin guard, as written, rejects requests the spine itself relies on. All four can be fixed by editing ADs. None of them reopens the stack.

## Checklist summary

| Criterion | Result |
| --- | --- |
| Fixes the real divergence points, misses none | Mostly. Missing: Item identity and Item→concept link (H1), the end-to-end timeout budget (H2), the browser's handling of a stale cache (H3). |
| Every AD Rule is enforceable and prevents its divergence | Mostly. AD-5's Origin rule contradicts itself in practice (H4). AD-7 is ambiguous for `/api/simpler` (H2). AD-9's "never from `/api/status`" blocks FR-4 (H3). |
| Nothing under Deferred lets two units diverge | Yes, with one gap. Fixture format for Simpler Explanations is silently deferred (inside H1). |
| Named tech verified-current | Yes. The memlog records verification on 2026-11-19. Minor: `httpx` is verified but not listed in the Stack table (L4). |
| Covers the spec's capabilities | Gaps: NFR-4 and NFR-5 are not in `binds` and are not addressed (M1). DR-4 to DR-9 are absent with no statement that they are process-only (L1). |
| Every owned dimension decided, deferred or open | The operational envelope is mostly covered (Compose, profiles, OpenRouter ZDR, Demo as fallback). Silent: image build and run mode, missing-`.env` behaviour, the dev loop, and spend control on the key (H5, M2). |
| Decisions, not rationale | Yes. "Prevents" lines are short, and rationale stays in the memlog. |
| Diagrams are valid Mermaid | Valid syntax. `\n` in quoted labels renders literally in some renderers (L3). |
| No bloat | Yes. The spine is compact; AD-15 and AD-16 are detailed but each detail binds something. |

## Findings

### Critical

None.

### High

**H1. Items have no identity, and the Item→Key Concept link is not defined.**
AD-9 defines Note, Passage and Key Concept identity, but not Item identity. Several units need a stable Item key: FR-18 stores the "last-used Quiz Question per concept" (storage epic and Round epic), FR-15 saves "each answer as soon as it is given" (Round progress), FR-12 links an Item to its highlight, and AD-12 must look up Demo-Mode Simpler Explanations in a Fixture (a Fixture keyed only by `noteHash` cannot say which Simpler Explanation belongs to which Item). AD-6 also says concept entries carry names, never IDs, but it does not say how a Flashcard or Quiz Question points to its concept (name, index, or something else). Two epics will each invent an answer.
*Fix:* add to AD-9: "**Item ID** = `{keyConceptId}:{type}:{n}` (`fc`, `qq`, `sp`), with `n` the 1-based order within that concept and type in the validated response, assigned in `core/` after the Quote Check and the duplicate-concept drop. Items whose concept is dropped are dropped." Add to AD-6: "Each Flashcard and Quiz Question in `StudySet` carries `conceptIndex` (0-based index into `concepts`)" (or the concept name, but choose one). Add to AD-12: "A Fixture holds `studySet` plus `simpler: {<itemId>: <raw response>}`; a Demo `/api/simpler` call for an Item that has no entry returns `simpler.fail`." Then `/api/simpler` needs `itemId` in its request.

**H2. The timeout and retry budget contradicts FR-11, NFR-4 and NFR-5, and the browser-side timeout is undecided.**
AD-7 sets 60 s per attempt plus one retry, so a generation can take more than 120 s before `err.generation`. FR-11 and EXPERIENCE.md say that the request times out after 90 s. AD-7's "the Proxy retries exactly once" reads as applying to `/api/simpler` too, which gives 2 calls and up to 60 s. That contradicts NFR-5 (Simpler is one call per request) and NFR-4 (15 s). The browser's own abort time is not stated, so the UI epic and the Proxy epic will choose different numbers. A further risk to check: the Next.js rewrite proxy has its own default timeout (`experimental.proxyTimeout`, historically 30 s), which would cut every 60 s generation off with a socket error before the Proxy answers.
*Fix:* rewrite the AD-7 timing as one budget. "`/api/study-set`: total budget 85 s across both attempts (the second attempt gets what is left); the browser aborts at 90 s (FR-11) and shows `err.generation`. `/api/simpler`: one attempt, no retry (NFR-5), timeout 15 s (NFR-4) → `simpler.fail`. `next.config` sets the rewrite proxy timeout above 90 s." Add a test in AD-18 that a stubbed slow model hits `err.generation` within 90 s.

**H3. AD-9's cache-key rule cannot implement FR-4.**
AD-9 says that the cache key is taken from the response metadata, "never from `/api/status`". FR-4 needs the browser to decide **before** any call whether a stored Study Set is still valid ("a change of prompt or model leads to a new generation"; "when a reconnection hits the cache, no AI call is made"). Before a call there is no response, so the only current `promptVersion` and `model` the browser has are the ones from `/api/status`. As written, the Known-Note epic either never detects a stale set or breaks the rule. It is also not decided what happens to the old Study Set and to the Note's progress records when a new one is stored under the same Note Hash, or which Study Set Demo Mode uses (the Fixture's recorded `promptVersion` and `model` will differ from the live ones).
*Fix:* "Lookup: the browser builds the cache key from `/api/status` (`promptVersion`, `model`) and looks it up. Store: the key is taken from the response metadata. A Note has one current Study Set: storing a new one replaces the previous one, and Mastery States are carried over per AD-9. In Demo Mode, the lookup uses the Fixture's `model` and `promptVersion` as returned by `/api/status?mode=demo` (or: Demo Study Sets are never cached and are always served from the Fixture)." Choose one Demo rule.

**H4. The Origin guard in AD-5 rejects requests the spine depends on.**
Browsers do not send `Origin` on same-origin `GET` requests, so `GET /api/status` (called at startup) carries no `Origin` and is rejected by "accepts a request only when its `Origin` is the app's localhost origin". The `dev` profile in AD-2 publishes the Proxy for curl and `/docs`, but curl sends no `Origin` and `/docs` runs on origin `127.0.0.1:8000`, so both are rejected. `ALLOWED_ORIGIN` is a single value, but the examiner may open `http://127.0.0.1:3000` instead of `http://localhost:3000`, and every POST then fails. The memlog flagged "Proxy origin check must accept what Next forwards"; the spine never decides it.
*Fix:* make the rule precise: "`POST` requires an `Origin` header in `ALLOWED_ORIGINS` (default `http://localhost:3000,http://127.0.0.1:3000`, set in `compose.yaml`, not in `.env`); a `GET` without `Origin` is accepted; a request with any other `Origin` gets 403 `err.forbidden`. The `dev` profile adds `http://127.0.0.1:8000` to the list. Network isolation (Proxy not published) is the primary guard." Add a pytest test for each case and add `err.forbidden` (or reuse an existing key) to Microcopy.

**H5. The examiner path breaks if `.env` is missing, and the image build and run mode are undecided.**
UJ-3 and SM-4 have the examiner run `docker compose up` without a key, and so normally without a `.env`. A Compose `env_file: .env` fails when the file does not exist unless it is marked `required: false`. The spine also does not say whether `docker compose up` builds images from source (and how long a first `next build` plus `uv sync` takes against SM-4's 15 minutes), whether `web` runs `next start` on a production build or `next dev`, or how the developer gets hot reload. Each epic that touches `compose.yaml` will decide this differently.
*Fix:* add to AD-2: "`compose.yaml` uses `env_file: [{path: .env, required: false}]`; every variable has a default in `compose.yaml` except `OPENROUTER_API_KEY`. Default profile: both images are built from `web/Dockerfile` and `proxy/Dockerfile` (multi-stage; `web` runs `next start` on a production build). The `dev` profile bind-mounts the source and runs `next dev` and `uvicorn --reload`. DR-9 measures the first cold `docker compose up` on a clean machine."

### Medium

**M1. NFR-4 and NFR-5 are not bound, and NFR-5 explicitly asks the architecture for the expected cost per Note.**
`binds` lists NFR-1 to NFR-3 and NFR-6 to NFR-9. NFR-5 says: "The architecture states the expected cost per Note." The figure exists only in `addendum.md` (about $0.002 per generation with Haiku 5.5). NFR-4 (60 s to first Flashcard, 15 s Simpler) shapes the timeouts in AD-7 but is not cited.
*Fix:* add NFR-4 and NFR-5 to `binds` and to AD-7 and AD-13. Add one line to AD-13: "Expected cost: at most 2 calls per generation, about $0.002 to $0.004 per Note with the provisional model; recomputed in the model comparison." Add NFR-4 to the model comparison criteria.

**M2. Provider strategy is missing spend control and the outage path.**
AD-13 covers routing (ZDR, `data_collection: deny`) and model selection. It does not decide a spending limit on the OpenRouter key, behaviour when OpenRouter or every ZDR endpoint for the model is unavailable (which error key the user sees), or whether the Consent decision stays valid when `OPENROUTER_MODEL` changes the named maker.
*Fix:* add to AD-13: "The key is created with a credit limit in OpenRouter (e.g. $5). No ZDR endpoint available, provider 5xx or 429 → counted as a failed attempt under AD-7 → `err.generation`; Demo Mode is the documented fallback. Consent is recorded together with the maker name; if `/api/status` reports a different maker, Consent is asked again."

**M3. Hyphen rejoining sits in extraction in AD-8, but the PRD puts it in Normalization.**
The PRD glossary defines Normalization as including "rejoined end-of-line hyphenation", which applies to both Extracted Text and every Quote, and also to pasted text and `.txt` (FR-2). AD-8 lists the hyphen rule only under PDF extraction. The extraction epic and the core epic may each implement it, or neither will for pasted text, which changes the Note Hash for the same content (FR-2: "pasting the same text … reconnects to the same Note").
*Fix:* state the rule's home once: "Hyphen rejoining (line ends in `-`, next line starts lowercase) is part of `core` Normalization and runs for every source; extractors only produce lines." Alternatively, record a PRD deviation (DR-4) if it stays PDF-only.

**M4. The rate limit can break the Playwright suite and normal use.**
The limit is 10 requests per minute per origin, and every call reaches it through Next, so all traffic shares one origin. `GET /api/status`, Demo-Mode calls and several Simpler presses all count. A Playwright run of the full loop over three reference notes, or a student pressing Explain Simpler on several cards, will hit 429.
*Fix:* "The limit counts only `POST /api/study-set` and `POST /api/simpler` with `mode: live`. `/api/status` and Demo calls are not counted. The test profile sets `RATE_LIMIT_PER_MIN` (default 10)." Add the variable to the Config row.

**M5. The browser's error mapping for post-Quote-Check failures is not fixed.**
Some FR-6 and FR-7 failures can only be detected in the browser after the Proxy has returned: fewer than 5 Summary Points left after the Quote Check (FR-7 says "failed under FR-8"), and fewer than 5 concepts left after AD-9 drops duplicate IDs. AD-7 forbids browser retries but does not say which message key these cases show (`err.generation` or `err.tooFewItems`), or that they are not cached.
*Fix:* add to AD-7: "Browser-side validation in `core/` (Quote Check, FR-10 minimums, fewer than 5 Summary Points, fewer than 5 concepts after the ID de-duplication) returns `err.tooFewItems` for Item minimums and `err.generation` for Summary Point and concept counts; neither is cached and neither is retried."

**M6. Fixture staleness on `PROMPT_VERSION` or schema change is unruled.**
AD-8 re-records Fixtures when extraction changes. AD-12 stores the recorded `promptVersion`. Nothing says what happens when `PROMPT_VERSION` is bumped or `schemas.py` changes. Old Fixtures may then fail validation, and the exam-day fallback can break unnoticed until it is needed.
*Fix:* "A schema change re-records Fixtures in the same commit. A pytest test validates every Fixture against the current schema. A `PROMPT_VERSION` bump does not require re-recording, but `record_fixtures.py` is rerun before DR-9."

### Low

**L1. DR-4 to DR-9 are absent with no explanation.** *Fix:* one line under Deferred or in the map: "DR-4 to DR-9 are process requirements (branches, PRs, logs, QA log, pre-delivery check), outside the architecture; DR-6 `.gitignore` covers `node_modules`, `.next`, `.venv`, `.env`."

**L2. Naming collision with Next.js 16 `proxy.ts`.** Next.js 16 renamed `middleware.ts` to `proxy.ts`. With "Proxy" as a glossary term for the FastAPI service, a file `web/proxy.ts` would be confusing. *Fix:* add to Conventions: "No Next.js middleware/`proxy.ts` in v1; 'Proxy' always means the FastAPI service."

**L3. Mermaid labels use `\n`.** Some renderers (including some GitHub versions) show it literally. *Fix:* use `<br/>` in the quoted labels in both diagrams.

**L4. The Stack table omits `httpx`, which the memlog verified (0.28.1).** *Fix:* add it, or remove it from the memlog line if it is only a transitive dependency.

**L5. Passage ID casing differs.** The PRD glossary says `P1, P2`, and AD-9 says `p1, p2`. *Fix:* keep `p1` and add a note that the UI label shows it as "P1", or align with the PRD.

**L6. The paradigm says the Proxy "keeps no state between requests", but AD-5 needs an in-memory rate-limit counter.** *Fix:* "keeps no Note data and nothing on disk; its only state is the in-memory rate-limit counter."

**L7. The FR-8 prompt-injection test and the NFR-8 double-submit guard are not placed.** *Fix:* add the injection Note to `reference-notes/edge-cases/` in AD-18 (run with Fixtures, plus once live in the model comparison); add to AD-11: "`NoteSession` holds one in-flight generation; a second submit while pending is ignored (NFR-8, FR-11)."

## What is good and should stay

- One Normalization and one place for ID derivation (AD-3, AD-9), with the Fixture-hash test as a trip-wire (AD-8).
- The contract has one source, enforced by a CI diff (AD-4).
- Demo Mode goes through the same validation path as live (AD-12). It fits DR-2, FR-23 and the exam-day fallback.
- Storage has exactly one gate, with versioning, reset and a memory fallback (AD-10).
- Should features are behind flags, which makes the 2026-12-01 cut mechanical (AD-17).
- Versions were verified on the day, and the decision to pin TypeScript 6 is recorded.
