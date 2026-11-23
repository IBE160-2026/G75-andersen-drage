# Epic 1 Context: From Note to verified Study Set

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up the whole system with one command and deliver the first half of the core learning loop. The student gives Consent (or declines), uploads a Note, and has unusable input rejected before any AI call. They then land on Notatoversikt, which shows a summary, Key Concepts and a source panel. Every Quote shown there has passed the browser-side Quote Check. This works live with an API key, or in Demo Mode from recorded Fixtures with no key. Everything later (Rounds, Mastery, Readiness) depends on the scaffold, pipeline, identity scheme and verified Study Set shape built here. Tier: Core, never cut. Budget is about 45–55 active hours. M0 (Stories 1.1–1.4) is due 2026-11-26 and M1 (Demo loop end to end) is due 2026-12-01.

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

- **Input:** accepted formats are `.txt`, `.md`, `.docx` and text-based PDF. Each rejection happens before any AI call:
  - other extension, including `.doc` → `err.type`
  - over 10 MB → `err.size`, checked before parsing
  - empty or whitespace only → `err.noText`
  - PDF averaging under 100 characters per page → `err.scanned`
  - corrupt, password-protected or misnamed file, or a parser timeout → `err.unreadable`, and the page stays responsive
  - under 150 words → `err.tooShort`
  - over 15 000 words → `err.tooLong`
  - non-UTF-8 text is decoded with a fallback and shows `warn.encoding`.
- **Consent:** shown once, before any other screen. It cannot be dismissed and names OpenRouter and the model. No generation request is sent before Consent. Declining leads to Demovelger with live mode off, and `consent.declined` stays reachable with a way to accept. Consent can be withdrawn in Innstillinger. Consent is checked before the key.
- **Generation content:**
  - 5–15 Key Concepts with stable IDs and a Centrality Rank
  - 5–10 Summary Points of at most 40 words each
  - 1–2 Flashcards and at least 1 Quiz Question per concept
  - each Quiz Question has exactly 4 unique options and one valid correct index
  - all content is in the Note's language.
- **Response validation:** only schema-valid responses are accepted. Invalid output, a refusal or a max-tokens stop gets one Proxy retry, then `err.generation` with 'Prøv igjen'. Note text is data and must never act as instructions; an injection test note checks this.
- **Quote Check:**
  - the cited Passage ID must exist
  - the normalized Quote must be an exact substring of that Passage
  - the Quote is 20–300 characters
  - a Quote never spans Passages.
  Failed Items are dropped silently and never regenerated automatically.
- **Minimums:** fewer than 5 surviving Flashcards or fewer than 5 Quiz Questions → `err.tooFewItems`. A concept with no surviving Items is *not covered* and is shown as having no verified items. 'Prøv igjen' starts a fresh generation that bypasses the cache.
- **Waiting and errors:**
  - a progress indicator shows from submit until the result
  - a 90 s timeout, 429, 5xx or network failure → `err.generation` with 'Prøv igjen' and a way back
  - a second submit is disabled while one is pending
  - no key with Demo off → `err.noKey`, and no request reaches the provider.
- **Demo Mode:** the full loop runs from Fixtures with no key and no provider call. Fixtures pass the same validation and Quote Check as live responses. Any other input → `err.demoOnly`.
- **NFRs:**
  - the key lives only in the Proxy environment
  - the Proxy keeps no Note content; logs hold only status, timing and error code, checked by a marker test
  - only localhost origins are accepted, and the 11th live POST within a minute → 429
  - first result within 60 s for a ~3 000-word Note
  - at most 2 AI calls per generation
  - WCAG 2.1 AA with axe clean, usable from 320 px
  - no crash on reload mid-generation or double submit
  - Norwegian bokmål UI from Microcopy keys.
- **Delivery:** one test command needs no key and runs in GitHub Actions on every PR. Use one branch and one PR per story, naming the story ID and FR-IDs. Keep `.gitignore` hygiene. Every story's Definition of Done includes updating the README wherever behaviour changes.

## Technical Decisions

- **Stack:** Next.js 16.4, React 19.3 and TypeScript 6.0 (not 7). The Proxy is FastAPI 0.165, Pydantic 2.14 and pydantic-ai-slim[openrouter], on Python 3.14 with uv. There is no database, auth or hosting, and no Tailwind. Exact pins are in the architecture Stack table.
- **Compose:**
  - `docker compose up` builds `web` (`next start`) and `proxy`. Only `web` is published, on `127.0.0.1:3000`.
  - The proxy healthcheck gates `web`.
  - `.env` is optional and goes to `proxy` only. Every variable except `OPENROUTER_API_KEY` has a default.
  - Profiles: `dev` (bind mounts, reload, Proxy on 8000) and `test`.
  - `docker compose run --rm test` runs Vitest, pytest (stubbed model) and Playwright with axe.
- **Layering:**
  - `web/core/` is pure, with clock and randomness injected.
  - The shell is `app/`, `components/`, `extract/` (Web Worker), `storage/` (the only storage access) and `api/` (the only network access).
  - The Proxy never normalizes or compares Note text.
- **Contract:** Pydantic models in `proxy/app/schemas.py` (camelCase aliases) are the only source of the contract. `web/api/schema.d.ts` is generated with openapi-typescript and committed, and CI fails on a diff. Browser-only types live in `core/types.ts`.
- **Endpoints:**
  - The three endpoints are `GET /api/status`, `POST /api/study-set` and `POST /api/simpler`. All are reached through relative `/api/*` paths and a Next.js rewrite to `http://proxy:8000`, with `proxyTimeout` set to 100 s.
  - Errors are an HTTP status plus `{code}`, where `code` is a Microcopy key. Unknown failures map to `err.generation`.
  - Status is fetched at startup with 3 retries; live submit stays disabled until it answers.
- **Retry and timeouts:** only the Proxy retries, and only once. The browser aborts at 90 s, the Proxy deadline is 85 s in total, and each attempt has 40 s. The browser never retries automatically.
- **Extraction pipeline:** this is the single source of all text.
  - The steps are: lines → paragraphs (table rows and list items are separate) → Normalization → sentence split → Passages `p1…pn`.
  - Passages are persisted and reused everywhere.
  - The worker is killed after 15 s → `err.unreadable`.
  - `.docx` uses mammoth and htmlparser2, with table cells joined by ` | `; OMML equations are lost.
  - PDF uses unpdf and removes repeated headers and footers.
  - Each Note records `normalizationVersion`. A test asserts that the Fixture hashes match.
- **Identity:** defined once in `core/`.
  - Note Hash is the SHA-256 hex of the Passages joined by a blank line.
  - Concept IDs are `k-` plus a slug; on a collision the later concept is dropped.
  - Item IDs are `{keyConceptId}.fc{n}`, `{keyConceptId}.qq{n}` and `sp{n}` (Summary Points), assigned before the Quote Check.
  - The cache key is `{noteHash}:{promptVersion}:{model}`.
  - Demo records are keyed `demo:{noteHash}`.
- **`verifyStudySet(raw, passages)`:** assigns IDs, drops duplicate concepts, runs the Quote Check and option uniqueness, applies the floors (`err.generation` or `err.tooFewItems`), and returns a `VerifiedStudySet`. That set holds every concept with a `covered` flag, the surviving Items, `model`, `promptVersion`, `language` and `cacheKey`. Only this type is stored or rendered.
- **Send gate:** `core/gate.ts canSend(settings, status, mode)` checks in this order: demo → ok; no Consent → `consent.declined`; no key → `err.noKey`. It is called by `api/` before every POST.
- **Storage:**
  - IndexedDB (idb) holds `notes` and `studySets` in this epic; all stores exist in the schema.
  - localStorage holds settings (Consent, demoMode, and so on).
  - Records are Zod-validated on read and carry `schemaVersion`.
  - A Note record and its Study Set are written in one transaction.
- **State:** a UI event → a `core/` function → persist → render. The open Note's state lives in one `NoteSession` context. `api/` is single-flight per Note Hash with an `AbortSignal`, and late responses for a closed Note are discarded.
- **Proxy:**
  - The provider is built lazily, so the Proxy boots with no key.
  - It writes no runtime files.
  - The access log is off, noisy loggers are at WARNING, and error handlers never echo input.
  - OpenRouter is called with `{zdr: true, data_collection: "deny", require_parameters: true}` and JSON-schema output, with no temperature.
  - `OPENROUTER_MODEL` provisionally is `anthropic/claude-haiku-5.5`; `evaluate.ts` makes the final pick.
  - Note text is sent as delimited JSON data in the user message.
  - `PROMPT_VERSION` is bumped on every prompt change.
- **Demo:**
  - Demo uses the same endpoints with `mode: "demo"`.
  - Fixtures are `proxy/fixtures/{noteHash}.json` and go through the same validation as live responses.
  - Recording takes two steps: `export-passages.ts` (real TS pipeline) → `record_fixtures.py`.
  - Samples are copied to `web/public/samples/` with a manifest.
- **UI plumbing:**
  - `web/styles/tokens.css` holds the tokens; components use CSS Modules and `var(--token)` only, never hex.
  - Radix covers Dialog, DropdownMenu, Tabs and Switch.
  - Rendering is client-side, with a pre-paint inline script setting `data-theme` and `data-consent`.
  - `<html lang="nb">`, and every string comes from `web/i18n/messages.ts`.
  - `StudySet.language` is checked against an allow-list (fallback `und`) and set as `lang` on generated content.
  - `web/features.ts` flags stay false for Should features.
- **Conventions:** use PRD glossary terms in identifiers and ISO 8601 UTC timestamps. Code never throws to React and returns a result with a key instead. No Note content goes to the browser console.

## UX & Interaction Patterns

- **Shell:**
  - The skip link 'Gå til hovedinnhold' is the first Tab stop.
  - Landmarks are header, main and aside.
  - Each route sets `document.title` and focuses its `h1`.
  - The top bar has the brand, Demo indicator, Note name and 'Innstillinger'. Below 768 px it condenses to a 'Mer' menu.
- **Visual rules:** serif type only for Note content and sans for UI chrome. Every interactive element gets a 3 px `:focus-visible` ring. Buttons are at least 44 px tall, with one primary per view, and pending buttons use `aria-disabled`. Color is never the only cue.
- **Errors:** errors appear inline in crimson with `role="alert"` and the "Feil:" prefix. A failure on Genererer focuses the message and offers 'Prøv igjen' and 'Tilbake til start'. Empty states show an `h1` plus the next step.
- **Consent dialog:** it cannot be dismissed (no Esc, no outside click) and has a 'Les mer' disclosure. Its actions are `consent.accept` and `consent.decline`.
- **Upload:** a labelled native file input plus a drop zone, disabled during generation. The progress bar is determinate, with `gen.status` steps announced through `role="status"` and the Note meta (filename · words · Passages).
- **Notatoversikt:**
  - Desktop splits into a source panel (left) and a study panel (right, first in DOM); mobile uses 'Studier' / 'Kilde' tabs.
  - The study panel shows Summary Points with compact Quote blocks, then Key Concepts by Centrality Rank with mastery chips; not-covered concepts read "ingen verifiserte elementer".
  - 'Start runde' sits at the end.
- **Source panel:** Passages carry mono IDs P1…, and the scroll region is one Tab stop.
- **Reference jump:** activating "Kilde: Pn" scrolls to the Passage (instant under reduced motion) and highlights exactly one `<mark>` with hidden `quote.start` / `quote.end`. It focuses the Passage and shows a sticky return control. Esc returns focus to the exact reference.
- **Source references** ("Kilde: Pn") can always be activated, including before a Flashcard is revealed or a Quiz Question is answered. This is a confirmed decision, not an assumption.
- **Microcopy status:** most strings are still drafts awaiting approval, so always use keys and never hard-code text. These are approved and final: `skip.link`, `topbar.more`, `theme.toggle`, `demo.indicator`, `err.prefix` and `start.empty`. `gen.back` ('Tilbake til start') is decided. All `consent.*` and `settings.consent.*` strings are approved (2026-11-23); in `consent.body`, `{leverandør}` is "OpenRouter (modellen {model})" from `/api/status`, elsewhere just "OpenRouter". How the Note-language `lang` is handled is still open.
- **Added shell keys:** `app.brand`, `nav.notes`, `nav.settings`, `nav.label` ("Hovedmeny"), `title.notes`, `title.settings` and `settings.h1`. `start.empty` is split into `start.empty` (the `h1`) and `start.empty.next` (the second line). These are recorded as a deviation, and any further new key needs its own deviation entry.
- **Voice:** informal bokmål using "du", sentence case and no exclamation marks.

## Cross-Story Dependencies

- 1.1 (scaffold, Compose, CI) comes first. 1.2 (shell, tokens, messages) is needed by every UI story.
- 1.3 first lands on the start screen after decline. 1.14 later changes the decline target to Demovelger, a planned interim state recorded under DR-4.
- 1.4 builds the extraction pipeline and identity. 1.5 extends it to `.docx` and PDF and adds the `reference-notes/edge-cases/` files, including the injection note that 1.6 uses.
- 1.6 (Proxy generation) and 1.8 (`verifyStudySet`) both feed 1.9, the end-to-end live generation.
- 1.9 stores the Note and Study Set and shows a placeholder overview until 1.11. It shows only a basic `err.generation`; 1.10 adds the full error states.
- 1.12 builds on the 1.11 source panel and is reused by the Epic 2 Flashcard, Quiz and Resultat screens.
- 1.13 needs 1.4–1.8 plus the reference notes. 1.14 needs the 1.13 Fixtures and the send gate.
- Epic 2 consumes `VerifiedStudySet`, the `covered` flag, Item IDs and the storage schema defined here.
- Any departure from the planning docs (a new Microcopy key, changed behaviour or a cut feature) goes into the deviations list before delivery. Epic 5 uses that list to bring the planning docs in line.
- Cut order: if Epic 1 falls behind, cut 1.13 to one model first, then simplify the PDF header and footer removal in 1.5.
