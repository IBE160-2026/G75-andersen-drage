# Epic 1 Context: From Note to verified Study Set

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up the whole system with one command and deliver the first half of the core learning loop. The student gives Consent (or declines), uploads a Note, and has unusable input rejected before any AI call. They then land on Notatoversikt, which shows a summary, Key Concepts and a source panel in which every Quote has passed the browser-side Quote Check. This works live with an API key, or in Demo Mode from recorded Fixtures with no key. Everything later (Rounds, Mastery, Readiness) depends on the scaffold, extraction pipeline, identity scheme and verified Study Set shape built here. Tier: Core, never cut. Budget is about 45–55 active hours. M0 (Stories 1.1–1.4) is due 2026-11-26 and M1 (Demo loop end to end, 1.1–1.14) is due 2026-12-01.

## Stories

- Story 1.1: One-command start with an empty app and a green test run
- Story 1.2: Norwegian app shell with design tokens and accessible structure
- Story 1.3: Consent gate and Innstillinger › Samtykke
- Story 1.4: Upload a text or Markdown Note and reject unusable input
- Story 1.5: Upload `.docx` and text-based PDF Notes
- Story 1.6: Proxy generates and validates a Study Set
- Story 1.7: Proxy guards: origin, rate limit and no data retention
- Story 1.8: Verify the Study Set in the browser (Quote Check and minimums)
- Story 1.9: Generate a Study Set from an uploaded Note
- Story 1.10: Generation errors, retry and interrupted generation
- Story 1.11: Notatoversikt with summary, Key Concepts and source panel
- Story 1.12: Jump from a source reference to the highlighted Quote
- Story 1.13: Record Fixtures and compare models on the reference notes
- Story 1.14: Demo Mode with the bundled sample notes

## Requirements & Constraints

- **Input** (`.txt`, `.md`, `.docx`, text-based PDF); every rejection happens before any AI call:
  - other extension, including `.doc` → `err.type`; over 10 MB → `err.size` (checked before parsing)
  - empty or whitespace only → `err.noText`; PDF averaging under 100 characters per page → `err.scanned`
  - corrupt, password-protected or misnamed file, or parser timeout → `err.unreadable`; the parser error never reaches React and the page stays responsive
  - under 150 words → `err.tooShort`; over 15 000 words → `err.tooLong`
  - non-UTF-8 text is decoded with a fallback and shows `warn.encoding`.
- **Consent:** shown once, before any other screen, cannot be dismissed, names OpenRouter and the model. No generation request before Consent. Declining turns live mode off and keeps `consent.declined` reachable with a way to accept. Withdrawable in Innstillinger. Consent is checked before the key.
- **Generation content:** 5–15 Key Concepts with stable IDs and a Centrality Rank; 5–10 Summary Points of at most 40 words; 1–2 Flashcards and at least 1 Quiz Question per concept; each Quiz Question has exactly 4 unique options and one valid correct index; all content in the Note's language.
- **Response validation:** only schema-valid output is accepted. Invalid output, refusal, max-tokens stop, 429/5xx or attempt timeout gets one Proxy retry, then `err.generation`. Note text is data, never instructions (checked by the injection test note).
- **Quote Check:** the cited Passage exists; the normalized Quote is an exact substring of that one Passage; 20–300 characters. Failed Items are dropped silently, never regenerated automatically.
- **Minimums:** fewer than 5 surviving Flashcards or Quiz Questions → `err.tooFewItems`. A concept with no surviving Items is *not covered*. 'Prøv igjen' starts a fresh generation that bypasses the cache.
- **Waiting and errors:** progress indicator from submit to result; 90 s timeout, 429, 5xx or network failure → `err.generation` with 'Prøv igjen' and a way back; second submit disabled while pending; no key with Demo off → `err.noKey` and nothing reaches the provider.
- **Demo Mode:** the full loop runs from Fixtures with no key and no provider call; Fixtures pass the same validation and Quote Check as live responses; any other input → `err.demoOnly`.
- **NFRs:** key only in the Proxy environment; Proxy keeps no Note content and logs only status, timing and error code (marker test); localhost origins only, 11th live POST within a minute → 429; first result within 60 s for a ~3 000-word Note; at most 2 AI calls per generation; WCAG 2.1 AA, axe clean, usable from 320 px; no crash on reload mid-generation or double submit; bokmål UI from Microcopy keys.
- **Delivery:** one keyless test command, run in GitHub Actions on every PR. One branch and PR per story, naming the story ID and FR-IDs. Definition of Done includes tests green in CI and README updated wherever behaviour, setup or commands change.

## Technical Decisions

- **Stack:** Next.js 16.4, React 19.3, TypeScript 6.0 (not 7); Proxy is FastAPI 0.165, Pydantic 2.14, pydantic-ai-slim[openrouter] on Python 3.14 with uv. No database, auth, hosting or Tailwind. Exact pins live in the architecture Stack table.
- **Compose:** `docker compose up` builds `web` (`next start`, only service published, on `127.0.0.1:3000`) and `proxy`, whose healthcheck gates `web`. `.env` is optional and goes to `proxy` only; every variable except `OPENROUTER_API_KEY` has a default. Profiles `dev` (bind mounts, reload, Proxy on 8000) and `test`; `docker compose run --rm test` runs Vitest, pytest (stubbed model) and Playwright with axe.
- **Layering:** `web/core/` is pure (clock and randomness injected). Shell is `app/`, `components/`, `extract/` (Web Worker), `storage/` (only storage access) and `api/` (only network access). The Proxy never normalizes or compares Note text.
- **Contract:** Pydantic models in `proxy/app/schemas.py` (camelCase aliases) are the single source; `web/api/schema.d.ts` is generated with openapi-typescript, committed, and CI fails on a diff. Browser-only types live in `core/types.ts`.
- **Endpoints:** `GET /api/status`, `POST /api/study-set`, `POST /api/simpler`, reached via relative `/api/*` and a Next.js rewrite to `http://proxy:8000` (`proxyTimeout` 100 s). Errors are HTTP status plus `{code}` (a Microcopy key); unknown failures map to `err.generation`; no key → 503 `err.noKey`. Status is fetched at startup with 3 retries; live submit stays disabled until it answers.
- **Timeouts:** only the Proxy retries, once, and only if at least 40 s remain. Browser aborts at 90 s; Proxy deadline 85 s total; each attempt 40 s.
- **Extraction pipeline** (single source of all text): lines → paragraphs (table rows and list items separate) → Normalization → sentence split → Passages `p1…pn`, persisted and reused everywhere. Worker killed after 15 s → `err.unreadable`. `.docx`: mammoth HTML walked with htmlparser2, table cells joined by ` | `, OMML equations lost (README says so). PDF: unpdf per-page text items; a line repeated at top or bottom of at least half the pages (ignoring page numbers) is removed before Normalization. Each Note records `normalizationVersion`; a test asserts Fixture hashes match.
- **Identity** (defined once in `core/`): Note Hash = SHA-256 hex of Passages joined by a blank line. Concept IDs `k-` + slug (later duplicate dropped). Item IDs `{keyConceptId}.fc{n}`, `{keyConceptId}.qq{n}`, `sp{n}`, assigned before the Quote Check. Cache key `{noteHash}:{promptVersion}:{model}`; demo records `demo:{noteHash}`.
- **`verifyStudySet(raw, passages)`:** assigns IDs, drops duplicate concepts, runs Quote Check and option uniqueness, applies floors (`err.generation` / `err.tooFewItems`), returns a `VerifiedStudySet` (all concepts with `covered` flag, surviving Items, `model`, `promptVersion`, `language`, `cacheKey`). Only this type is stored or rendered.
- **Send gate:** `core/gate.ts canSend(settings, status, mode)`: demo → ok; no Consent → `consent.declined`; no key → `err.noKey`. Called by `api/` before every POST.
- **Storage:** IndexedDB (idb) with `notes` and `studySets` used here (all stores exist in the schema); localStorage for settings (Consent, demoMode, …). Records Zod-validated on read with `schemaVersion`. A Note and its Study Set are written in one transaction.
- **State:** UI event → `core/` function → persist → render. The open Note lives in one `NoteSession` context. `api/` is single-flight per Note Hash with an `AbortSignal`; late responses for a closed Note are discarded.
- **Proxy:** provider built lazily (boots with no key); writes no runtime files; access log off, noisy loggers at WARNING, error handlers never echo input. OpenRouter called with `{zdr: true, data_collection: "deny", require_parameters: true}`, JSON-schema output (`NativeOutput`), no temperature/top_p. `OPENROUTER_MODEL` provisionally `anthropic/claude-haiku-5.5`; `evaluate.ts` makes the final pick. Passages go only as delimited JSON data in the user message, never in the system prompt. Bump `PROMPT_VERSION` on every prompt change.
- **Demo:** same endpoints with `mode: "demo"`; Fixtures at `proxy/fixtures/{noteHash}.json` pass the same validation. Recording is two steps: `export-passages.ts` (real TS pipeline) → `record_fixtures.py`. Samples copied to `web/public/samples/` with a manifest.
- **UI plumbing:** tokens in `web/styles/tokens.css`; CSS Modules with `var(--token)` only, never hex. Radix for Dialog, DropdownMenu, Tabs, Switch. Client-side rendering with a pre-paint inline script setting `data-theme` and `data-consent`. `<html lang="nb">`; every string from `web/i18n/messages.ts`. `StudySet.language` checked against an allow-list (fallback `und`) and set as `lang` on generated content. `web/features.ts` flags stay false for Should features.
- **Conventions:** PRD glossary terms in identifiers; ISO 8601 UTC timestamps; code never throws to React and returns a result with a key; no Note content in the browser console.

## UX & Interaction Patterns

- **Shell:** skip link 'Gå til hovedinnhold' is the first Tab stop; landmarks header, main, aside; each route sets `document.title` and focuses its `h1`. Top bar: brand, Demo indicator, Note name, 'Innstillinger'; below 768 px it condenses to a 'Mer' menu.
- **Visual rules:** serif only for Note content, sans for UI chrome; 3 px `:focus-visible` ring everywhere; buttons at least 44 px tall, one primary per view, pending buttons use `aria-disabled`; color is never the only cue.
- **Errors:** inline, crimson, `role="alert"`, "Feil:" prefix. A failure on Genererer focuses the message and offers 'Prøv igjen' and 'Tilbake til start'. Empty states show an `h1` plus the next step.
- **Consent dialog:** not dismissable (no Esc, no outside click), 'Les mer' disclosure, actions `consent.accept` / `consent.decline`.
- **Upload:** labelled native file input plus drop zone, disabled during generation. Determinate progress bar; `gen.status` steps announced via `role="status"`; Note meta line (`note.meta`: filename · words · Passages) in `role="status"`.
- **Notatoversikt:** desktop splits into source panel (left) and study panel (right, first in DOM); mobile uses 'Studier' / 'Kilde' tabs. Study panel: Summary Points with compact Quote blocks, then Key Concepts by Centrality Rank with mastery chips; not-covered concepts read "ingen verifiserte elementer". 'Start runde' at the end. Source panel: Passages with mono IDs P1…, scroll region is one Tab stop.
- **Reference jump:** "Kilde: Pn" scrolls to the Passage (instant under reduced motion), highlights exactly one `<mark>` with hidden `quote.start` / `quote.end`, focuses the Passage and shows a sticky return control; Esc returns focus to the exact reference. Source references are always activatable, including before a Flashcard is revealed or a Quiz Question answered (confirmed decision).
- **Microcopy:** always use keys, never hard-code text; strings not marked approved are drafts. Approved: `skip.link`, `topbar.more`, `theme.toggle`, `demo.indicator`, `err.prefix`, `start.empty`, all `consent.*` and `settings.consent.*`, and (2026-11-23) `start.dropzone`, `start.dropzone.types`, `note.meta`, `err.type`, `err.size`, `err.noText`, `err.unreadable`, `err.tooShort`, `err.tooLong`, `warn.encoding`, and (2026-11-23, Story 1.5) `err.scanned`. `gen.back` ('Tilbake til start') is decided. Still drafts include `err.demoOnly`, `err.noKey` and the generation strings. In `consent.body`, `{leverandør}` is "OpenRouter (modellen {model})" from `/api/status`, elsewhere "OpenRouter". Handling of Note-language `lang` is still open.
- **Voice:** informal bokmål with "du", sentence case, no exclamation marks.

## Cross-Story Dependencies

- 1.1 (scaffold, Compose, CI) comes first; 1.2 (shell, tokens, messages) is needed by every UI story.
- 1.3 lands on the start screen after decline; 1.14 later changes the decline target to Demovelger (planned interim state).
- 1.4 builds the extraction pipeline and identity; 1.5 extends it to `.docx` and PDF and completes `reference-notes/` (three reference notes with expected Key Concepts) and `reference-notes/edge-cases/` (one file per rejection case plus the injection note that 1.6's tests use).
- 1.6 (Proxy generation) and 1.8 (`verifyStudySet`) both feed 1.9 (live generation end to end). 1.9 stores Note and Study Set, shows a placeholder overview until 1.11 and only a basic `err.generation`; 1.10 adds the full error states.
- 1.12 builds on the 1.11 source panel and is reused by Epic 2's Flashcard, Quiz and Resultat screens.
- 1.13 needs 1.4–1.8 plus the reference notes; 1.14 needs the 1.13 Fixtures and the send gate.
- Epic 2 consumes `VerifiedStudySet`, the `covered` flag, Item IDs and the storage schema defined here.
- Every departure from the planning docs (new Microcopy key, changed behaviour, cut) is recorded in `.docs/deviations.md` with its own entry; Epic 5 reconciles the planning docs from that list.
- Cut order if Epic 1 falls behind: reduce 1.13 to one model first, then simplify 1.5's PDF header/footer removal.
