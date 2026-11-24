# Epic 1 Context: From Note to verified Study Set

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up the whole system with one command and deliver the first half of the core learning loop. The student gives Consent (or declines), uploads a Note, and has unusable input rejected before any AI call. They then land on Notatoversikt, which shows a summary, Key Concepts and a source panel in which every Quote has passed the browser-side Quote Check. This works live with an API key, or in Demo Mode from recorded Fixtures with no key, which is the examiner's default path. Everything later (Rounds, Mastery, Readiness) depends on the scaffold, extraction pipeline, identity scheme and verified Study Set shape built here. Tier: Core, never cut. Budget about 45–55 active hours. M1 (Demo loop end to end, 1.1–1.14) is due 2026-12-01; Stories 1.1–1.13 are done, 1.14 remains. Decisions taken during implementation are recorded in `.docs/deviations.md` (D-1…D-15) and summarized below where they bind later work.

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

- **Input** (`.txt`, `.md`, `.docx`, text-based PDF); every rejection happens before any AI call: wrong type → `err.type`; > 10 MB → `err.size`; empty → `err.noText`; scanned PDF → `err.scanned`; corrupt/timeout → `err.unreadable`; < 150 words → `err.tooShort`; > 15 000 words → `err.tooLong`; non-UTF-8 → fallback decode plus `warn.encoding`.
- **Consent:** one-time gate before any other screen, not dismissable, names OpenRouter and the model. No generation request before Consent. Accept → 'Dine notater'; decline → Demovelger with live generation off, and `consent.declined` stays on Start with a way to accept. Withdrawable in Innstillinger. Consent is checked before the key.
- **After declining:** upload stays operable but never reaches the provider: input is validated first, then rejected with `err.demoOnly` in Demo Mode, otherwise `consent.declined`.
- **Generation content:** 5–15 Key Concepts with stable IDs and Centrality Rank; 5–10 Summary Points ≤ 40 words; 1–2 Flashcards and 1–2 Quiz Questions per concept; each Quiz Question has exactly 4 unique options and one valid correct index; content in the Note's language. Only schema-valid output is accepted; one Proxy retry, then `err.generation`. Note text is data, never instructions.
- **Quote Check and minimums:** cited Passage exists; normalized Quote is an exact substring of that one Passage; 20–300 characters. Failed Items are dropped silently. Fewer than 5 surviving Flashcards or Quiz Questions → `err.tooFewItems`. A concept with no surviving Items is *not covered*.
- **Demo Mode:** the full loop runs for every bundled sample from Fixtures with no key and no provider call; Fixtures pass the same schema validation and Quote Check as live responses; any other input (recognized by Note Hash) → `err.demoOnly`; switchable at any time, even with a key. Demo Notes never touch live progress for the same Note.
- **Missing key:** Demo off, Consent accepted and no key → `err.noKey`, nothing reaches the provider, never a raw error; `consent.declined` takes precedence.
- **NFRs:** key only in the Proxy environment; Proxy keeps no Note content and logs only status, timing and error code; localhost origins only, rate limit 10 live POSTs/min; first result within 60 s for a ~3 000-word Note; ≤ 2 AI calls per generation; WCAG 2.1 AA, axe clean, usable from 320 px; no crash on reload mid-generation or double submit; bokmål UI from Microcopy keys.
- **Delivery:** one keyless test command, run in CI on every PR; merge only on green CI by convention (no branch protection). One branch and PR per story naming story ID and FR-IDs. Definition of Done includes README updates wherever behaviour, setup or commands change.

## Technical Decisions

- **Stack:** Next.js 16.4, React 19.3, TypeScript 6.0; Proxy is FastAPI 0.165, Pydantic 2.14, pydantic-ai-slim[openrouter] on Python 3.14 with uv. No database, auth, hosting or Tailwind.
- **Compose:** `docker compose up` builds `web` (only service published, `127.0.0.1:3000`) and `proxy` (healthcheck gates `web`). `.env` optional, Proxy only. `docker compose run --rm test` runs Vitest, pytest (stubbed model) and Playwright with axe.
- **Layering:** `web/core/` is pure; shell is `app/`, `components/`, `extract/` (Web Worker), `storage/` (only storage access) and `api/` (only network access). The Proxy never normalizes or compares Note text.
- **Contract:** Pydantic models in `proxy/app/schemas.py` are the single source; `web/api/schema.d.ts` is generated and CI fails on a diff. Endpoints `GET /api/status`, `POST /api/study-set` (`{mode: "live" | "demo", noteHash, passages}`), `POST /api/simpler`, via relative `/api/*`. Errors are HTTP status plus `{code}` (a Microcopy key): `/api/study-set` uses `err.noKey` (503), `err.demoOnly` (404), `err.generation` (others). Every Proxy error code must exist as a Microcopy key (enforced by a test). Request caps: 8 MiB body, ≤ 15 000 Passages, ≤ 1 000 000 chars, unique Passage ids.
- **Status:** fetched at startup with 3 retries; until it answers, live submit is disabled but Demo Mode and stored Notes stay usable. The Proxy boots and serves status and Demo with no key (provider built lazily).
- **Send gate:** `core/gate.ts canSend(settings, status, mode)` checks in order: demo → ok; no Consent → `consent.declined`; no key → `err.noKey`; else ok. `api/` calls it with fresh settings before every POST; no screen decides the gate itself.
- **Extraction and identity:** one pipeline yields Passages `p1…pn`, used everywhere. Note Hash = SHA-256 hex of Passages joined by a blank line. Item IDs are `{keyConceptId}.fc{n}`, `{keyConceptId}.qq{n}`, `sp{n}`. Cache key `{noteHash}:{promptVersion}:{model}`.
- **`verifyStudySet(raw, passages)`** produces the `VerifiedStudySet` (all concepts with `covered`, surviving Items, `model`, `promptVersion`, `language`, `cacheKey`); only this type is stored or rendered. Language allow-list `nb nn no da sv fi is en de fr es it nl pl`, else `und`.
- **Storage:** IndexedDB `notes` and `studySets`, Note and Study Set written in one transaction; Demo Notes are separate records keyed `demo:{noteHash}`. Settings (Consent, `demoMode`, …) in localStorage, Zod-validated on read.
- **Demo path (same as live):** Demo uses the same endpoints with `mode: "demo"`; the Proxy loads `proxy/fixtures/{noteHash}.json` (`{studySet, simpler, model, promptVersion}`, raw responses) and runs it through the same validation as live; unknown hash → 404 `err.demoOnly`. Picking a sample runs the normal pipeline (extraction → POST → `verifyStudySet`). Reference notes are copied into `web/public/samples/` at build time with a manifest.
- **Fixtures and model (settled in 1.13):** `anthropic/claude-haiku-5.5` is the default `OPENROUTER_MODEL` (100 % Quote Check pass rate on all three reference notes). Only its recordings are promoted to `proxy/fixtures/`; candidate recordings stay in `proxy/recordings/`. Fixtures carry `simpler: {}` until Story 3.6 re-records them. A pytest validates every Fixture against the schema; a Vitest asserts each reference note hashes to its Fixture's `noteHash`; any change to extraction, Normalization, splitting or schema re-records Fixtures in the same commit.
- **UI plumbing:** tokens in `web/styles/tokens.css`, CSS Modules with `var(--token)` only. Radix for Dialog, DropdownMenu, Tabs, Switch. `<html lang="nb">`; every string from `web/i18n/messages.ts`.
- **Conventions:** PRD glossary terms in identifiers; code never throws to React and returns a result with a key; no Note content in the browser console.

## UX & Interaction Patterns

- **Shell:** skip link first; landmarks; each route sets `document.title` and focuses its `h1`. Top bar: brand, Demo indicator, Note name, 'Innstillinger'; below 768 px a 'Mer' menu.
- **Visual rules:** serif only for Note content; 3 px `:focus-visible` ring; buttons ≥ 44 px, one primary per view, pending buttons `aria-disabled`; color never the only cue.
- **Errors:** inline, `role="alert"`, "Feil:" prefix. On Genererer: 'Prøv igjen' (`gen.retry`) for `err.generation` / `err.tooFewItems`, plus 'Tilbake til start' (`gen.back`); `err.noKey` offers only the way back. Generation steps via `gen.status.*` in `role="status"`, time-based progress bar.
- **Demovelger:** reached from 'Nei takk, vis demo' (Consent) and 'Prøv demomodus' (Start); title and `h1` "Velg et eksempelnotat"; lists the bundled sample notes; choosing one turns Demo Mode on and goes through Genererer to Notatoversikt. No mockup exists for it.
- **Demo indicator:** `demo.indicator` pill next to the brand while Demo Mode is on, linking to Innstillinger.
- **Innstillinger › Studier:** 'Demomodus' row (`settings.demo`) as a Radix Switch with visible `toggle.state`, immediate effect, persisted; turning it off returns to live generation if Consent is given.
- **No API key** on submit shows `err.noKey` and offers 'Prøv demomodus'.
- **Notatoversikt and reference jump:** source panel left, study panel right (first in DOM); mobile 'Studier' / 'Kilde' tabs. "Kilde: Pn" is a button that scrolls to and highlights exactly one `<mark>`, with a return control and Esc back to the reference.
- **Microcopy:** always keys, never hard-coded text. Approved: all `consent.*` and `settings.consent.*`, `demo.indicator`, `start.empty`, the upload and FR-3 keys. `err.demoOnly` ("Demomodus støtter bare eksempelnotatene.") already exists in `messages.ts`; `err.noKey`, `settings.demo` and Demovelger strings are drafts. New keys need a `.docs/deviations.md` entry. Voice: informal bokmål with "du", sentence case, no exclamation marks; never blame the student.

## Cross-Story Dependencies

- 1.3 currently lands on Start after decline (planned interim state); 1.14 changes the decline target to Demovelger.
- 1.14 needs the 1.13 Fixtures in `proxy/fixtures/`, the 1.10 error handling and the `canSend` demo branch; the Playwright Demo path (fresh context, no key: decline → Demovelger → Norwegian sample → Notatoversikt with Summary Points and a working reference jump, no provider request) reuses 1.11 and 1.12.
- Epic 2 consumes `VerifiedStudySet`, the `covered` flag, Item IDs and the storage schema; Story 2.5 extends the full Demo loop through Rounds. Story 3.6 adds Simpler and re-records Fixtures with `simpler` entries.
- Every departure from the planning docs is recorded in `.docs/deviations.md`; Epic 5 reconciles the planning docs from that list.
