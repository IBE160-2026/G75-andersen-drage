---
stepsCompleted: [1, 2]
inputDocuments:
  - .docs/planning-artifacts/prds/prd-G75-andersen-drage-2026-11-05/prd.md
  - .docs/planning-artifacts/architecture/architecture-G75-andersen-drage-2026-11-18/ARCHITECTURE-SPINE.md
  - .docs/planning-artifacts/ux-designs/ux-G75-andersen-drage-2026-11-10/DESIGN.md
  - .docs/planning-artifacts/ux-designs/ux-G75-andersen-drage-2026-11-10/EXPERIENCE.md
excludedDocuments:
  - .docs/planning-artifacts/prds/prd-G75-andersen-drage-2026-11-05/addendum.md
  - .docs/planning-artifacts/architecture/technology.md
---

# G75-andersen-drage - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for G75-andersen-drage (Torsas læringsassistent v1), decomposing the requirements from the PRD, the UX design contract (DESIGN.md + EXPERIENCE.md) and the architecture spine into implementable stories. Every story references its FR-IDs and AD-IDs (DR-4).

## Requirements Inventory

### Functional Requirements

Tier per PRD §8.1: **Core** / **Then** / **Should** (Should cutoff 2026-12-06).

- FR-1 (Core): Upload one `.txt`, `.md`, `.docx` or text-based `.pdf`; text is extracted, normalized and shown in the text view. Other extensions (incl. `.doc`) → `err.type`; > 10 MB → `err.size` before parsing; non-UTF-8 `.txt`/`.md` decoded with fallback + `warn.encoding`.
- FR-2 (Then): Paste text as an alternative to upload; same Normalization, length limits and Note Hash; pasting text earlier uploaded as `.txt` reconnects to the same Note.
- FR-3 (Core): Reject unusable input with no AI call: empty/whitespace → `err.noText`; PDF < 100 chars/page average → `err.scanned`; corrupt/password-protected/misnamed or parser timeout → `err.unreadable` (page stays responsive); < 150 words → `err.tooShort`; > 15 000 words → `err.tooLong`.
- FR-4 (Then): Recognize a known Note: Note Hash from normalized Extracted Text; cache key = Note Hash + prompt version + model ID; cache hit makes no AI call; prompt/model change regenerates and keeps Mastery for matching concept IDs; re-supplying an archived Note restores it with history; only valid, above-minimum Study Sets are cached.
- FR-5 (Core): One-time Consent at first open, before any other screen (`consent.title`, `consent.body`, names the provider). No generation request before Consent; not shown again once decided; accept → 'Dine notater'; decline → Demovelger, live off, `consent.declined` on start with a way to accept; after declining, input is validated then rejected (`err.demoOnly` in Demo, else `consent.declined`); withdraw in Innstillinger; Consent checked before API key.
- FR-6 (Core): Generate 5–15 Key Concepts with stable app-assigned IDs and a Centrality Rank; stored and stable for the same cache key.
- FR-7 (Core): Generate 5–10 Summary Points (≤ 40 words each; > 40 dropped; > 10 trimmed; < 5 remaining = failed generation), 1–2 Flashcards and ≥ 1 Quiz Question per concept; Quiz Questions have exactly four unique options and one in-range correct index (else dropped); counts checked in app validation; < 5 or > 15 concepts = failed generation; all content in the Note's language. A Summary Point shortfall found only in the browser after the Quote Check → `err.generation` at once, no auto-retry, not cached.
- FR-8 (Core): Accept only schema-valid AI responses; invalid JSON / schema mismatch / refusal / max-tokens → one retry, then `err.generation` with 'Prøv igjen', no crash. Note text passed as delimited data; injected instructions are never followed (injection test note).
- FR-9 (Core): Quote Check every Item: Passage ID must exist; normalized Quote must be an exact substring of the cited Passage; 20–300 chars after Normalization; no cross-Passage Quotes; failed Items dropped, never shown, never auto-regenerated.
- FR-10 (Core): Minimum surviving Items: < 5 Flashcards or < 5 Quiz Questions → `err.tooFewItems` with 'Prøv igjen'; 'Prøv igjen' is a user-started fresh generation that bypasses the cache; a concept with no surviving Flashcard or Quiz Question is *not covered*, excluded from Rounds and Readiness, and shown as having no verified items.
- FR-11 (Core): Waiting, error and retry states: progress indicator from submission until result; timeout (90 s) / 429 / 5xx / network → `err.generation` with 'Prøv igjen' and a way back to start; second upload/paste disabled while pending; empty states (`start.empty`; `err.noConcepts` defensive guard).
- FR-12 (Core): Show the source of every Item: Summary Points and Simpler Explanations show the Quote at once; Flashcard Quote on the back (reference visible on front too); Quiz Quote after answering and on Resultat (reference visible before answering); activating a reference (mouse or keyboard) scrolls to the Passage and highlights the Quote.
- FR-13 (Core): Review Flashcards: front → reveal → mark 'Kunne det' / 'Kunne det ikke'; each mark updates Mastery (FR-17); reveal and marking work by keyboard alone.
- FR-14 (Core): Take the Quiz: one Quiz Question per Round concept that has one; deterministic, unit-tested scoring with no AI call; result shows score and per question the student's answer, the correct answer and the Quote; each answer updates Mastery (FR-17).
- FR-15 (Then): Survive interruption: each answer saved immediately; after reload, answered questions are kept and scored, the Round is marked incomplete (`banner.interrupted`), resume or start a new Round.
- FR-16 (Then): Explain Simpler on any Flashcard and Quiz answer: one AI call per press, never automatic; result is a Quote-checked Simpler Explanation in the Note's language, or `simpler.fail` shown with the Item's own Quote.
- FR-17 (Core): Mastery State update table (new/shaky/known × correct/wrong) as one pure function with a unit test per row; latest signal wins.
- FR-18 (Core): Compose the next Round: ≤ 10 concepts; not-covered excluded; all shaky+new up to 8 (shaky before new, least recently shown first, ties by Centrality Rank); `max(1, round(0.2 × n))` known concepts added, least recently shown first; order shaky → new → known; each concept contributes all surviving Flashcards plus one rotating Quiz Question if it has one; all-known → review Round with `round.review`; one pure function with unit tests incl. the two PRD test cases.
- FR-19 (Then): Readiness Score = known ÷ eligible, whole percent, halves round up (5/8 → 63 %); no score with zero eligible; gap note (`readiness`, `readiness.gapOne`) whenever ≥ 1 concept is not covered.
- FR-20 (Should): Panic Mode "Eksamen om en time": Round = the 10 most central eligible concepts, ordered shaky → new → known; < 10 eligible uses all; items per concept as FR-18; message key defined in the story.
- FR-21 (Then): Persist per Note (Extracted Text, Study Set, Mastery, Round progress, last-shown time and last-used Quiz Question per concept, last practiced, archive state, Importance Level), separated by Note Hash; schema version, corrupt data reset with `storage.reset`; storage unavailable/full → session keeps working + `storage.unavailable`; one-time `storage.warning`, later visible in Innstillinger; last write wins across tabs (README).
- FR-22 (Should): Export a Note's progress and Study Set as JSON and import it in another browser; invalid/incompatible file → `import.invalid`, existing progress untouched.
- FR-23 (Core): Demo Mode: pick a bundled sample note; Study Set and Simpler Explanations served from Fixtures with no AI provider call and no key; full UJ-1 loop for every sample; other input → `err.demoOnly` (recognized by Note Hash); Fixtures pass the same schema validation and Quote Check; switchable at any time.
- FR-24 (Core): Missing key: no key and Demo off → `err.noKey`, no request reaches the provider, never a raw error; `consent.declined` takes precedence.
- FR-25 (Then): 'Dine notater' start screen after the Consent decision: lists every non-archived Note with title, `row.lastPractised`, Readiness Score + gap note and (with FR-27) Importance Level; opening a row shows the stored overview with no AI call; `start.empty` when empty; ordered by last practiced without FR-27.
- FR-26 (Should): Arkiv: archive from 'Dine notater' without confirmation + `archive.toast` with 'Angre'; archived Notes keep history; restore (or re-supply) returns it intact; permanent delete only in Arkiv, with `delete.confirm` (focus on 'Avbryt'), switchable via 'Ikke spør igjen' / `settings.deleteWarning`; delete removes all records; `archive.empty`.
- FR-27 (Should): Importance Level 1–3 (default 2) set on the row; list ordered by level then last practiced; change re-orders at once, announces `importance.changed`, survives reload; affects only list order.

### NonFunctional Requirements

- NFR-1: Secrets — API key only in the Proxy environment; never in browser, repo or history; `.env` git-ignored; `.env.example` lists every variable without values.
- NFR-2: No data retention in the Proxy — no Note content stored; logs only status codes, timings and error codes; automated marker-string test over logs and files.
- NFR-3: Proxy access — local only; accepts only the app's own localhost origin; 11th live `POST` within a minute → HTTP 429 (`/api/status` and Demo not counted).
- NFR-4: Latency — first Flashcard within 60 s for a ~3 000-word Note; Explain Simpler within 15 s.
- NFR-5: Cost — ≤ 2 AI calls per generation; each 'Prøv igjen' is a new budget; Simpler = 1 call; cache hit = 0; architecture states expected cost.
- NFR-6: Accessibility — WCAG 2.1 AA (contrast, full keyboard operation, visible focus, labelled controls, text alternatives); axe check of main screens with no serious/critical violations in the test suite + documented manual keyboard checklist for UJ-1.
- NFR-7: Responsive — every flow usable from 320 px (WCAG 1.4.10) up to desktop.
- NFR-8: Stability — no crash or unrecoverable state; tested: reload mid-generation (no partial cache), double submit / double 'Prøv igjen' (one generation), storage full/unavailable.
- NFR-9: Language — UI in Norwegian bokmål from EXPERIENCE.md Microcopy keys; generated content follows the Note's language; tests assert keys.

**Delivery requirements (IBE160, PRD §6)** — apply to every epic:

- DR-1: One-command start + README (prerequisites, commands, config, screenshot, Demo as default path, folder overview, links to planning docs/logs/QA/tests, team status: solo by Tor; Lasse S. Drage dropped out before the brief).
- DR-2: One documented test command without API key, using Fixtures; covers Normalization/Quote Check, schema validation, Mastery table, Round composition, scoring, Readiness, input rejections; runs in GitHub Actions on every PR and `main`; failing run blocks merge.
- DR-3: 2–3 shareable reference notes (≥ 1 Norwegian) with expected Key Concepts; documented run measuring SM-1–SM-3 incl. manual spot check.
- DR-4: Traceability — stories reference FR-IDs; commits and PRs reference stories; deviations recorded.
- DR-5: Saved AI sessions in `.logs/` and memlogs, naming story/FR and resulting commit/PR, incl. rejected/corrected AI suggestions.
- DR-6: Repository hygiene — `.gitignore` covers dependencies, build output, `.env`; no stray root files.
- DR-7: Workflow — one branch + PR per story naming story ID and FR-IDs; small scoped commits spread over time; open items as GitHub issues.
- DR-8: Every PR reviewed (`bmad-code-review` minimum); findings visible in the PR; AI-code defects logged in `.docs/qa-log.md`.
- DR-9: Pre-delivery check by 2026-12-12 — fresh-clone run per README logged; planning docs updated to match delivered app; dropped/changed features listed with reason.

### Additional Requirements

From the architecture spine (AD-1–AD-21). **No starter template is named**; Epic 1 Story 1 is a hand-built scaffold per AD-1, AD-2 and the Structural Seed.

- AD-1: Stack — Next.js 16.4 / React 19.3 / TypeScript 6.0 frontend; FastAPI 0.165 + pydantic-ai-slim[openrouter] Proxy; no database, cache server, auth, hosting.
- AD-2: `docker compose up` starts `web` (`next start`) and `proxy`; only `web` published on `127.0.0.1:3000`; `env_file` optional for `proxy` only; every variable except `OPENROUTER_API_KEY` defaulted; proxy healthcheck gates web; profiles `dev` and `test`.
- AD-3: Logic split — browser owns extraction, Normalization, Passages, Note Hash, IDs, Quote Check, option uniqueness, post-check floors, Mastery, Round, scoring, Readiness, persistence; Proxy owns prompts + `PROMPT_VERSION`, model call, Pydantic validation, text-independent count rules, the single retry, Fixtures and guards.
- AD-4: Pydantic models in `proxy/app/schemas.py` (camelCase aliases) are the only contract; `web/api/schema.d.ts` generated with `openapi-typescript` and committed; CI fails on diff.
- AD-5: Browser calls only relative `/api/*`; Next.js rewrite to `http://proxy:8000` with `proxyTimeout` 100 000 ms; origin guard (POST needs allowed Origin, GET without Origin ok, other Origin → 403); rate limit counts only live POSTs (`RATE_LIMIT_PER_MIN`, default 10).
- AD-6: Three endpoints only — `GET /api/status`, `POST /api/study-set`, `POST /api/simpler`; errors are HTTP status + `{code}` with a Microcopy key; status fetched at startup with 3 retries; client maps unknown failures to `err.generation` / `simpler.fail`; test that every Proxy code is a key in `messages.ts`.
- AD-7: Only the Proxy retries, only study-set, once; 90 s browser abort, 85 s Proxy deadline, `GENERATION_TIMEOUT_S=40` per attempt; Simpler one attempt, `SIMPLER_TIMEOUT_S=15`; browser never auto-retries.
- AD-8: One extraction pipeline in a Web Worker (terminated after 15 s → `err.unreadable`): lines → paragraphs (table rows/list items separate) → Normalization → sentence split → Passages `p1…pn`, persisted and reused everywhere; per-format rules for `.md/.txt`, `.docx` (mammoth + htmlparser2), PDF (unpdf, repeated header/footer removal); `normalizationVersion`; Fixture-hash test.
- AD-9: Identity defined once in `core/` — SHA-256 Note Hash, Passage IDs, `k-`+slug concept IDs (collisions dropped), Item IDs (`.fc{n}`, `.qq{n}`, `sp{n}`) assigned before the Quote Check, cache key `{noteHash}:{promptVersion}:{model}`, Demo records keyed `demo:{noteHash}`.
- AD-10: `web/storage/` is the only storage code — IndexedDB (idb) for records, localStorage for settings (Consent, theme, demoMode, shortcuts, warnings); Zod validation on read/import; `schemaVersion` with tested migrations; reset per Note with `storage.reset`; memory fallback with `storage.unavailable`.
- AD-11: State mutation path — UI event → `core/` pure function → persist via `storage/` → render; one `NoteSession` React context; single-flight `api/` per Note Hash / Item ID; every request has an `AbortSignal`; late responses for a closed Note discarded.
- AD-12: Demo uses the same endpoints with `mode: "demo"`; Fixture files `proxy/fixtures/{noteHash}.json` run through the same validation; two-step recording (`export-passages.ts` → `record_fixtures.py`); samples copied into `web/public/samples/` with a manifest; pytest validates every Fixture.
- AD-13: OpenRouter with `{zdr: true, data_collection: "deny", require_parameters: true}`, JSON-schema output, no temperature/top_p; `OPENROUTER_MODEL` (provisional `anthropic/claude-haiku-5.5`); final pick via `web/scripts/evaluate.ts` on the reference notes incl. NFR-4 timings; Note text only as delimited JSON data; `PROMPT_VERSION` bumped per prompt change; injection test note in `reference-notes/edge-cases/`; Consent names OpenRouter and the model; key with credit limit.
- AD-14: Proxy keeps nothing — lazy provider (starts and serves status/Demo with no key), no runtime files, guard-only log line, uvicorn access log off, noisy loggers at WARNING, error handlers return `{code}` without echoing input, marker test.
- AD-15: Styling — `web/styles/tokens.css` with all DESIGN.md tokens (`:root` Lesesal, `[data-theme="dark"]` Kveldsmodus); CSS Modules per component; Radix Primitives for Dialog, DropdownMenu, Tabs, Switch; no Tailwind; client-side rendering with a pre-paint inline script setting `data-theme`/`data-consent`; theme always light while the dark-mode flag is off.
- AD-16: `<html lang="nb">`; every UI string from `web/i18n/messages.ts` keyed by Microcopy keys; `StudySet.language` checked against an allow-list (fallback `und`) and set as `lang` on generated content.
- AD-17: `web/features.ts` exports one boolean per Should feature (FR-20, FR-22, FR-26, FR-27, dark mode); entry points render only when the flag is true; the completing story turns it on; schema fields exist from the start.
- AD-18: `docker compose run --rm test` runs Vitest (core, extract, reference notes, edge cases), pytest (Proxy with stubbed model: 90 s budget, no-key boot, origin/rate limit, Fixture validation) and Playwright + axe (full Demo loop, double submit, double 'Prøv igjen', reload mid-generation); same command in GitHub Actions plus the contract-diff check.
- AD-19: `core/verifyStudySet(raw, passages)` — assign IDs, drop duplicate concepts, Quote Check + option uniqueness, floors (`err.generation` / `err.tooFewItems`), returns `VerifiedStudySet` (concepts with `covered`, surviving Items, `model`, `promptVersion`, `language`, `cacheKey`); only this type is stored, rendered and exported; Fixtures and imports use the same function.
- AD-20: `core/gate.ts` `canSend(settings, status, mode)` — demo → ok; no Consent → `consent.declined`; no key → `err.noKey`; else ok; called by `api/` before every POST.
- AD-21: IndexedDB stores `notes`, `studySets`, `conceptProgress`, `rounds` with fixed fields and transaction rules (replace Study Set + prune progress; start Round + last-shown; one transaction per answer; active Round resumed never recomposed; delete/archive over all records); Readiness never stored; Simpler not persisted; export format `{format: "torsa-export", exportVersion: 1, …}` with re-hash and re-verify on import.
- Consistency conventions: PRD glossary terms in identifiers; ISO 8601 UTC timestamps; `{code}` errors end-to-end, no throw to React; no Note content in browser console; README obligations (`docker compose up`, Demo default, test command, OMML limitation, last write wins, storage-deletion warning, OpenRouter credit limit).

### UX Design Requirements

From DESIGN.md (visual identity, tokens) and EXPERIENCE.md (structure, behavior). Each is specific enough for testable acceptance criteria.

- UX-DR1: Design tokens — implement every DESIGN.md color (light + `-dark` pairs), typography role (fontSize in rem), radius and spacing token as CSS custom properties in `tokens.css`; components use tokens only, no hex.
- UX-DR2: Typography rule — serif (Georgia stack) only for Note content (source, Quote, card-front, brand/headline in light), sans for UI chrome; `overflow-wrap: anywhere` + `hyphens: auto`; no fixed heights on text containers.
- UX-DR3: Page structure — every route updates `document.title` ("{side} · {notat} · Torsas læringsassistent") and focuses the screen `h1` (`tabindex="-1"`); landmarks `header`, `main`, and on screens 4–7 `aside aria-label="Kilde: {filnavn}"`; DOM order skip link → header → main → aside.
- UX-DR4: Skip link 'Gå til hovedinnhold' (`skip.link`) as first Tab stop, visually hidden until focused.
- UX-DR5: Top bar — brand link to 'Dine notater', Demo indicator, Note name, Readiness Score + gap note (only with an open Note; hidden with zero eligible), theme toggle, 'Innstillinger'.
- UX-DR6: Mobile condensed top bar (< 768 px) — brand + 'Mer' overflow menu (Radix DropdownMenu, 44 × 44 px, arrow keys, Esc returns focus) with 'Innstillinger' and theme toggle; Status strip at top of 'Studier' tab with Note name + score + gap note together.
- UX-DR7: Desktop split layout on Notatoversikt, Round and Resultat — source panel visually left, study panel right (1fr : 1.15fr), study panel first in DOM; single-column screens max ~40rem.
- UX-DR8: Mobile tabs 'Studier' / 'Kilde' (Radix Tabs, manual activation, inactive panel hidden from AT); reference activation switches to 'Kilde'; resets to 'Studier' on new Item.
- UX-DR9: Source panel + Passage — Passages with mono IDs P1…; scroll container is one Tab stop (`tabindex="0"`, `role="region"`); Passages `tabindex="-1"`; active Passage: no tint, 3 px `accent` left rule.
- UX-DR10: Quote highlight — exactly one `<mark>` at a time, `highlight` fill + 2 px `highlight-ring` outline with `box-decoration-break: clone`, bracketed by visually hidden `quote.start` / `quote.end`; forced-colors fallback.
- UX-DR11: Reference jump + Return control — "Kilde: Pn" link (mouse/keyboard) scrolls (instant under `prefers-reduced-motion`), activates the Passage, highlights the Quote, focuses the Passage (with `return.hint` via `aria-describedby`), shows a sticky return control with `return.label` ('Tilbake til kortet' / 'spørsmålet' / 'resultatet'); Esc or the control returns focus to the exact reference; no timer.
- UX-DR12: Quote block — `quote-bg`, 3 px accent left rule, serif in « », source reference below; shown without extra click wherever it appears (never on Flashcard front or before a Quiz answer).
- UX-DR13: Flashcard component — labeled Flashcard region headed "Kort {x} av {y}"; concept chip; front = question (`card-front`) + reference; 'Snu kortet' reveals back (answer + dashed divider + Quote block); focus to the answer on reveal; marks advance and focus the next card heading.
- UX-DR14: Quiz Question component — Quiz region headed "Spørsmål {x} av {y}", no card container; stem + reference + four full-width options A–D; selecting answers immediately; correct ✓ (known colors), chosen wrong ✗ (shaky colors) + `quiz.wrong`/`quiz.correct` via `aria-live="polite"`; other options `aria-disabled` with full ink contrast and muted border; focus stays on chosen option; `quiz.next` ('Se resultatet' on last).
- UX-DR15: Round progress — one line "Runde n · Kort x av y" / "Runde n · Spørsmål x av y" (h1 + h2 inline), `aria-hidden` 6 px bar, current concept's mastery chip.
- UX-DR16: Keyboard shortcuts — Space / 1 / 2 on Flashcards, 1–4 in Quiz; fire only when 'Hurtigtaster' is on, no dialog/menu open, focus inside the region and not on a control; handled Space never scrolls; keyboard hints (mono; 'Mellomrom' via `kbd.space`) `aria-hidden` with `aria-keyshortcuts`, hidden when off or touch-only.
- UX-DR17: Resultat row — `h2` "Spørsmål {x}", question (serif), `result.yours` with ✓/✗ (`aria-hidden`), `result.correct` only on misses, Quote block + reference with 'Tilbake til resultatet'.
- UX-DR18: Mastery chip ('ny' / 'usikker' / 'kan') and Concept chip — pills with text labels, never color only.
- UX-DR19: Notatoversikt — Readiness (larger `headline`), Summary Points (`h2` 'Sammendrag') with compact Quote blocks, Key Concept list (`h2` 'Nøkkelbegreper') ordered by Centrality Rank with mastery chips, not-covered shown as "ingen verifiserte elementer"; 'Start runde' + hint (`overview.start`).
- UX-DR20: Interrupted-round banner — `banner.interrupted` with 'Fortsett' (primary) / 'Ny runde' (secondary); 'Start runde' hidden while it shows.
- UX-DR21: Buttons — primary/secondary/ghost per tokens, one primary per view, min 44 px touch height; pending = `aria-disabled`, ignores activation, keeps focus.
- UX-DR22: Focus ring — `:focus-visible` 3 px `focus` with 2 px offset on every interactive element, inset inside scroll containers; never removed.
- UX-DR23: Error message — inline crimson `error-bg`/`error-fg`, 3 px rule, icon + `err.prefix` "Feil:" + text + next step; `role="alert"`; field errors linked with `aria-describedby` + `aria-invalid`; Genererer failure focuses the message and offers 'Prøv igjen' + 'Tilbake til start' (`gen.back`).
- UX-DR24: Empty state — `h1` headline (e.g. `start.empty`) + next-step line + actions.
- UX-DR25: Drop zone + Text area — native labelled `<input type="file">` + drop target with `start.dropzone`; paste text area with visible label and `start.paste.submit`; both disabled during generation.
- UX-DR26: Generation progress — determinate bar + `gen.status` steps announced once via `role="status"` + Note meta (filename · words · Passages).
- UX-DR27: Dialog (Radix Dialog) — focus trap, `h2` via `aria-labelledby`, body via `aria-describedby`, focus returns to trigger; Consent dialog cannot be dismissed (no Esc/outside click), 'Les mer' in-dialog disclosure (points B–E); delete dialog initial focus 'Avbryt', Esc cancels; shortcuts suppressed while open; at most one level.
- UX-DR28: Consent & Privacy copy — `consent.body` up front (provider named), 'Les mer' points B–E, actions `consent.accept` / `consent.decline`.
- UX-DR29: Note row — `<ul>/<li>`; title is a real link stretched over the row; importance select and 'Arkiver' are sibling Tab stops (never inside the link); meta `row.lastPractised` · score · gap note (only > 0); Arkiv variant with no link and 'Gjenopprett' / 'Slett for godt'. Truncated titles keep the full title as accessible name and `title`.
- UX-DR30: Importance select — native `<select>` "1 – viktigst" / "2 – middels" / "3 – minst", accessible name `importance.name`, re-sort keeps focus on the same Note's select, polite announcement `importance.changed`. *(Should, FR-27)*
- UX-DR31: Toast (archive undo) — bottom-center, `role="status"`, `archive.toast` with 'Angre' / 'Vis arkiv'; replaced by next status; focus rules after archive/restore/delete (next row, previous row, or `h1`). *(Should, FR-26)*
- UX-DR32: Innstillinger — `h2` sections 'Samtykke', 'Studier', 'Lagring', 'Sletting'; settings rows (label + description + control, stack < 480 px); toggles as Radix Switch with visible `toggle.state`, immediate effect, persisted; consent withdraw/accept, Demo toggle, 'Hurtigtaster' (default on), `storage.warning`, export/import (Should), delete-warning (Should).
- UX-DR33: Demo indicator — `demo.indicator` pill link next to the brand while Demo Mode is on, linking to Innstillinger.
- UX-DR34: Theme toggle + Kveldsmodus — icon button with `theme.toggle` accessible name; default follows `prefers-color-scheme`, manual choice persisted; dark tokens, sans chrome with uppercase tracked panel labels, single soft shadow on Flashcard/dialogs/toast; layout identical across modes. *(Should, dark-mode flag)*
- UX-DR35: Accessibility floor — color never the only cue (labels, ✓/✗, "Feil:"); touch targets ≥ 44 × 44 px on mobile; usable at 320 CSS px and 200 % zoom without horizontal scroll; contrast pairs per DESIGN.md › Contrast; manual keyboard checklist for UJ-1.
- UX-DR36: Voice and tone — informal bokmål "du", short and matter-of-fact, no exclamation marks, sentence case; all strings from Microcopy keys.

### FR Coverage Map

- FR-1: Epic 1 — Upload a file (`.txt`/`.md`, `.docx`, PDF)
- FR-2: Epic 3 — Paste text
- FR-3: Epic 1 — Reject unusable input before any AI call
- FR-4: Epic 3 — Recognize a known Note (cache key, reconnect)
- FR-5: Epic 1 — One-time Consent gate, decline, withdraw
- FR-6: Epic 1 — Key Concepts with stable IDs and Centrality Rank
- FR-7: Epic 1 — Summary Points, Flashcards, Quiz Questions with count rules
- FR-8: Epic 1 — Schema validation, single retry, injection guard
- FR-9: Epic 1 — Quote Check on every Item
- FR-10: Epic 1 — Minimum surviving Items, *not covered* concepts
- FR-11: Epic 1 — Waiting, error, retry and empty states
- FR-12: Epic 1 (Summary Points, overview, reference jump) + Epic 2 (Flashcards, Quiz, Resultat)
- FR-13: Epic 2 — Review Flashcards
- FR-14: Epic 2 — Quiz and scoring
- FR-15: Epic 3 — Survive interruption
- FR-16: Epic 3 — Explain Simpler
- FR-17: Epic 2 — Mastery State table
- FR-18: Epic 2 — Compose the next Round
- FR-19: Epic 3 — Readiness Score and gap note
- FR-20: Epic 4 — Panic Mode (Should)
- FR-21: Epic 3 — Persistence robustness (reset, unavailable, warning)
- FR-22: Epic 4 — Export and import (Should)
- FR-23: Epic 1 — Demo Mode with Fixtures
- FR-24: Epic 1 — Missing key
- FR-25: Epic 3 — 'Dine notater'
- FR-26: Epic 4 — Arkiv: archive, restore, permanent delete (Should)
- FR-27: Epic 4 — Importance Level (Should)
- Dark mode (no FR; UX-DR34, AD-15, AD-17): Epic 4 (Should)
- DR-1, DR-3, DR-9, NFR-6 manual checklist, SM-1–SM-4: Epic 5 (final verification); NFRs and DR-2/DR-6 otherwise carried in the acceptance criteria of the stories they constrain.

## Epic List

### Epic 1: From Note to verified Study Set
The app starts with one command. The student gives Consent (or declines), uploads a Note, has unusable input rejected before any AI call, and lands on Notatoversikt with a summary, Key Concepts and a source panel in which every Quote has passed the Quote Check — live with a key, or in Demo Mode with no key. Tier: Core.
**FRs covered:** FR-1, FR-3, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12 (overview and reference jump), FR-23, FR-24

### Epic 2: Practise in Rounds
The student works through Flashcards and a Quiz, sees a scored Resultat with sources, and the next Round starts with what they do not yet know. Completes the Core loop of UJ-1 and UJ-3. Tier: Core.
**FRs covered:** FR-12 (Flashcards, Quiz, Resultat), FR-13, FR-14, FR-17, FR-18

### Epic 3: Come back and go deeper
The student returns to 'Dine notater', reopens or re-supplies a Note without a new AI call, keeps progress across restarts and interrupted Rounds, sees the Readiness Score with its gap note, can paste text, and can ask for a simpler explanation. Tier: Then.
**FRs covered:** FR-2, FR-4, FR-15, FR-16, FR-19, FR-21, FR-25

### Epic 4: Should extras (cut by 2026-12-06)
Independent, cuttable stories, each behind its own flag in `web/features.ts` (AD-17); a cut story keeps its flag `false` and its entry point hidden. Built in reverse cut order: Importance Level, Arkiv, dark mode, export/import, Panic Mode. Tier: Should.
**FRs covered:** FR-27, FR-26, (dark mode: UX-DR34), FR-22, FR-20

### Epic 5: Ready for delivery
The examiner can verify the delivery: content quality measured on the reference notes, accessibility verified by hand, README complete, and a fresh-clone run logged before 2026-12-12. No new FRs.
**Requirements covered:** DR-1, DR-3, DR-9, NFR-6, SM-1–SM-4

---

**Story reference convention.** Every story carries a **Refs** line listing the FR-, AD-, NFR-, DR- and UX-DR-IDs it implements (DR-4). PRs name the story ID and its FR-IDs (DR-7).

## Epic 1: From Note to verified Study Set

The app starts with one command. The student gives Consent (or declines), uploads a Note, has unusable input rejected before any AI call, and lands on Notatoversikt with a summary, Key Concepts and a source panel in which every Quote has passed the Quote Check — live with a key, or in Demo Mode with no key.

### Story 1.1: One-command start with an empty app and a green test run

As the examiner,
I want to start the app and run its tests with one command each and no API key,
So that I can run the project on a clean machine without knowing it.

**Refs:** AD-1, AD-2, AD-4, AD-5, AD-14, AD-18 · NFR-1, NFR-3 · DR-1, DR-2, DR-6

**Acceptance Criteria:**

**Given** a clean clone with only Docker installed and no `.env`
**When** I run `docker compose up`
**Then** `web` (Next.js production build, `next start`) and `proxy` (FastAPI) start, `web` waits for the `proxy` healthcheck, and only `web` is published, on `127.0.0.1:3000`
**And** the Proxy starts without a key (the OpenRouter provider is built lazily) and `GET /api/status` answers `{keyConfigured: false, model, provider: "OpenRouter", promptVersion}`

**Given** the app is running
**When** the browser calls the relative path `/api/status`
**Then** Next.js rewrites it to `http://proxy:8000` with `proxyTimeout` 100 000 ms, and no Proxy URL is hard-coded in the browser

**Given** the repository
**When** I inspect it
**Then** the folders follow the Structural Seed (`web/core`, `web/app`, `web/components`, `web/extract`, `web/storage`, `web/api`, `web/i18n`, `web/styles`, `proxy/app`, `proxy/tests`, `e2e/`), `.gitignore` excludes dependencies, build output and `.env`, `.env.example` lists every Proxy variable without values, and `compose.yaml` defaults every variable except `OPENROUTER_API_KEY`

**Given** `proxy/app/schemas.py` holds the `/api/status` Pydantic model with camelCase aliases
**When** the contract is generated
**Then** `web/api/schema.d.ts` is produced by `openapi-typescript` from `/openapi.json` and committed

**Given** the `test` profile
**When** I run `docker compose run --rm test`
**Then** Vitest, pytest and Playwright each run at least one smoke test and pass without a key, with `@playwright/test` pinned to the Playwright image version

**Given** a pull request or a push to `main`
**When** GitHub Actions runs
**Then** it runs the same test command plus a contract-diff check that fails if regenerated `schema.d.ts` differs, and a failing run blocks merge

**Given** the README
**When** a reader follows it
**Then** it states prerequisites with versions, `docker compose up`, the test command, and the team status (solo by Tor; Lasse S. Drage dropped out before the brief, September 2026), with the "Medlemmer" section updated

### Story 1.2: Norwegian app shell with design tokens and accessible structure

As a student,
I want a calm, readable app in Norwegian that I can use with a keyboard and on a narrow phone,
So that the app is usable before any study feature exists and every later screen looks and behaves the same.

**Refs:** AD-15, AD-16, AD-17 · NFR-6, NFR-7, NFR-9 · UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5 (shell), UX-DR6 (condensed bar + 'Mer'), UX-DR21, UX-DR22, UX-DR23, UX-DR24, UX-DR35, UX-DR36

**Acceptance Criteria:**

**Given** `web/styles/tokens.css`
**When** it is inspected
**Then** it defines every DESIGN.md colour, typography, radius and spacing token as a CSS custom property, with `:root` = Lesesal and `[data-theme="dark"]` = Kveldsmodus values, font sizes in rem
**And** components use `var(--token)` only (a lint or test fails on hex values in component CSS Modules), one CSS Module per component, no Tailwind

**Given** `web/features.ts`
**When** it is inspected
**Then** it exports one boolean per Should feature (`panicMode`, `exportImport`, `archive`, `importance`, `darkMode`), all `false`
**And** while `darkMode` is `false` the inline script in `app/layout.tsx` always sets `data-theme="light"` before paint

**Given** any screen
**When** it renders
**Then** `<html lang="nb">`, every visible string comes from `web/i18n/messages.ts` keyed by EXPERIENCE.md Microcopy keys, and content renders client-side behind a mount gate
**And** the top bar shows the brand as a link to 'Dine notater' and an 'Innstillinger' button; below 768 px it condenses to brand + 'Mer' (Radix DropdownMenu, 44 × 44 px, arrow keys, Esc returns focus to 'Mer')

**Given** a route change
**When** the new screen mounts
**Then** `document.title` follows "{side} · {notat} · Torsas læringsassistent", focus moves to the `h1` (`tabindex="-1"`), landmarks `header` and `main` exist, and the first Tab stop is the skip link 'Gå til hovedinnhold' (`skip.link`), visible on focus

**Given** the shared Button, Error message and Empty state components
**When** they are used
**Then** buttons follow primary/secondary/ghost tokens with min 44 px touch height and a pending state that is `aria-disabled`, ignores activation and keeps focus
**And** error messages show icon + `err.prefix` + text + next step with `role="alert"`, and empty states use the screen `h1` + next-step line + actions
**And** every interactive element shows the 3 px `:focus-visible` ring

**Given** the shell at 320 px width and at 200 % zoom
**When** it is checked
**Then** nothing scrolls horizontally, and the Playwright axe check of the shell reports no serious or critical violations

### Story 1.3: Consent gate and Innstillinger › Samtykke

As a student opening the app for the first time,
I want to be told that my Notes are sent to an external AI provider and choose whether I accept,
So that nothing leaves my browser without my agreement.

**Refs:** FR-5 · AD-6 (status at startup), AD-10 (settings store), AD-13 (provider name), AD-15 (Radix Dialog), AD-20 · UX-DR27, UX-DR28, UX-DR32 (Samtykke section)

**Acceptance Criteria:**

**Given** no Consent decision is stored
**When** I open the app
**Then** the Consent dialog (`consent.title`, `consent.body`) shows before any other screen, names OpenRouter and the model from `/api/status` (or the fallback provider name from `messages.ts` if status has not answered after 3 retries 1 s apart), and cannot be closed with Esc or an outside click
**And** 'Les mer' is an in-dialog disclosure (`aria-expanded`) with points B–E from EXPERIENCE.md › Consent & Privacy

**Given** the Consent dialog
**When** I press 'Jeg forstår, fortsett' (`consent.accept`)
**Then** Consent is stored through `web/storage/` (localStorage settings, Zod-validated, with `schemaVersion`) and I land on the start screen
**And** on later opens the dialog is not shown again; the inline script sets `data-consent` before paint so the dialog never flashes

**Given** the Consent dialog
**When** I press 'Nei takk, vis demo' (`consent.decline`)
**Then** the decline is stored, live generation is off, and the start screen shows `consent.declined`, whose link reopens the Consent dialog

**Given** `core/gate.ts`
**When** `canSend(settings, status, mode)` is called
**Then** it returns ok for `mode === "demo"`, `consent.declined` when Consent is not accepted, `err.noKey` when `!status.keyConfigured`, otherwise ok — in that order, with a unit test per branch

**Given** Innstillinger › Samtykke
**When** Consent is accepted
**Then** it shows `settings.consent.on` and 'Trekk tilbake samtykke' (secondary, no confirmation), which returns the app to the declined state and announces `settings.consent.withdrawn`
**And** when declined it shows `settings.consent.off` and 'Godta at notater sendes', which opens the Consent dialog

**Given** storage is unavailable
**When** I open the app
**Then** Consent is asked once per session and the app keeps working

### Story 1.4: Upload a text or Markdown Note and reject unusable input

As a student,
I want to upload my `.txt` or `.md` notes and be told at once if they cannot be used,
So that I never wait for an AI call on input that would fail.

**Refs:** FR-1 (`.txt`/`.md`), FR-3 · AD-3, AD-8, AD-9 (Note Hash, Passage IDs) · UX-DR23, UX-DR24, UX-DR25

**Acceptance Criteria:**

**Given** the start screen
**When** it renders
**Then** it shows the drop zone (native labelled `<input type="file">` + drop target, `start.dropzone`) and, with no stored Notes, the empty state `start.empty`

**Given** I choose a valid UTF-8 `.txt` or `.md` file of 150–15 000 words
**When** it is processed
**Then** extraction runs in a Web Worker: `File.arrayBuffer()` + `TextDecoder('utf-8', {fatal: true})`, BOM stripped, lines → paragraphs (each list item its own paragraph) → per-paragraph Normalization (NFKC, collapsed whitespace, unified quotation marks, rejoined end-of-line hyphenation) → sentence split over the Passage limit → Passages `p1…pn`
**And** `core/` computes the Note Hash as lowercase-hex SHA-256 (Web Crypto) of the normalized Passages joined by a blank line, and records `normalizationVersion`

**Given** a `.txt`/`.md` file that is not valid UTF-8
**When** it is processed
**Then** it is decoded as `windows-1252` and `warn.encoding` is shown (non-blocking)

**Given** invalid input
**When** I choose it
**Then** the correct key is shown inline at the drop zone (`aria-describedby` + `aria-invalid`, focused and announced) and no request reaches the Proxy:
- any extension other than `.txt`, `.md`, `.docx`, `.pdf` (incl. `.doc`) → `err.type`
- a file over 10 MB → `err.size`, before parsing
- no text or whitespace only → `err.noText`
- fewer than 150 words → `err.tooShort`; more than 15 000 words → `err.tooLong`

**Given** the extraction worker
**When** it runs longer than 15 s
**Then** it is terminated, `err.unreadable` is shown, and the page stays responsive during parsing

**Given** Vitest
**When** the suite runs
**Then** Normalization, Passage splitting, Note Hash and every rejection above have unit tests, and the hash is identical for the same text in a `.txt` and a `.md` file with different names

### Story 1.5: Upload `.docx` and text-based PDF Notes

As a student,
I want to upload my Word documents and PDF lecture notes,
So that I can use the files I actually have.

**Refs:** FR-1 (`.docx`, PDF), FR-3 (`err.scanned`, `err.unreadable`) · AD-8, AD-9 · DR-3 (reference notes)

**Acceptance Criteria:**

**Given** a `.docx` file
**When** it is extracted in the worker
**Then** `mammoth.convertToHtml` output is walked to lines with `htmlparser2`, each table row becomes one line with cells joined by ` | `, and the lines enter the same pipeline as Story 1.4

**Given** a text-based PDF
**When** it is extracted with `unpdf` (`getDocumentProxy` + per-page text items)
**Then** a line repeated at the top or bottom of at least half the pages (ignoring page numbers) is removed before Normalization

**Given** a PDF whose Extracted Text averages fewer than 100 characters per page
**When** it is processed
**Then** `err.scanned` is shown and no AI call is made

**Given** a corrupt, password-protected or misnamed file
**When** it is processed
**Then** `err.unreadable` is shown, the parser error never reaches React, and the app does not crash

**Given** the reference notes in `reference-notes/` (`nb-smidig-scrum.md`, `nb-digital-verden.docx`, `en-unit-testing.pdf`) and `reference-notes/edge-cases/`
**When** Vitest runs
**Then** each reference note extracts to Passages without error and each edge case produces its expected key
**And** the README documents that Word equations (OMML) are lost in v1

### Story 1.6: Proxy generates and validates a Study Set

As a student,
I want the app to turn my Note into Key Concepts, a summary, Flashcards and Quiz Questions through a validated AI call,
So that I only ever get well-formed output in my Note's language.

**Refs:** FR-6, FR-7, FR-8 · AD-3, AD-4, AD-6, AD-7, AD-13 · NFR-4, NFR-5, NFR-9

**Acceptance Criteria:**

**Given** `POST /api/study-set` with `{mode: "live", noteHash, passages: [{id, text}]}` and a configured key
**When** the Proxy handles it
**Then** it calls OpenRouter through pydantic-ai with routing `{zdr: true, data_collection: "deny", require_parameters: true}`, JSON-schema output (`NativeOutput`), no `temperature`/`top_p`, and `OPENROUTER_MODEL` (default `anthropic/claude-haiku-5.5`)
**And** the Note's Passages reach the model only as JSON data under a fixed delimiter in the user message, never in the system prompt, and the prompt asks for verbatim Quotes in the source language from within one Passage, with `PROMPT_VERSION` set

**Given** a model response
**When** the Proxy validates it
**Then** it is checked against the Pydantic `StudySet` model (concepts by name with Centrality Rank, nested Flashcards and Quiz Questions, Summary Points, each Item with `passageId` and `quote`; plus `model`, `promptVersion`, `language`)
**And** the text-independent count rules are applied: 5–15 concepts; four options and an in-range correct index per Quiz Question (else dropped); Summary Points over 40 words dropped and the list trimmed to 10; ≥ 5 Summary Points; Items per concept trimmed to their limits

**Given** a response that is invalid JSON, fails the schema or a count rule, ends in a refusal or max-tokens stop, hits a provider 5xx or 429, or times out (`GENERATION_TIMEOUT_S=40`)
**When** at least 40 s remain of the 85 s deadline
**Then** the Proxy retries exactly once, and after the second failure returns HTTP 502/504 with `{code: "err.generation"}` — at most 2 AI calls per request

**Given** no key is configured
**When** a live request arrives
**Then** the Proxy returns 503 `{code: "err.noKey"}` without contacting the provider

**Given** pytest with the model stubbed
**When** the suite runs
**Then** it covers schema pass/fail, each count rule, the single retry, the 85 s budget with a slow stub, the no-key 503, and the injection test note from `reference-notes/edge-cases/` (output that follows the injected instruction is rejected, or the instruction is not followed)
**And** `web/api/schema.d.ts` is regenerated and committed in the same change

### Story 1.7: Proxy guards: origin, rate limit and no data retention

As a student,
I want the Proxy to serve only my local app and keep nothing I send,
So that my Notes and the API key cannot leak or be misused.

**Refs:** NFR-1, NFR-2, NFR-3 · AD-5, AD-14

**Acceptance Criteria:**

**Given** a `POST` request
**When** its `Origin` is not in `ALLOWED_ORIGINS` (`http://localhost:3000`, `http://127.0.0.1:3000`; `dev` adds `http://127.0.0.1:8000`)
**Then** it is rejected with 403; a `GET` with no `Origin` is accepted

**Given** live `POST` requests from one origin
**When** the 11th arrives within one minute (`RATE_LIMIT_PER_MIN` default 10)
**Then** it gets HTTP 429 with `{code: "err.generation"}`, while `GET /api/status` and `mode: "demo"` requests are never counted, and the `test` profile raises the limit

**Given** any request
**When** it is logged
**Then** the only log line is the guard's own (method, path, status, duration, error code); Uvicorn's access log is off; `httpx`, `openai` and `pydantic_ai` loggers are at `WARNING`; no Logfire/OpenTelemetry is installed

**Given** malformed input or an unexpected exception
**When** it is handled
**Then** `RequestValidationError` and the generic handler return only `{code}`, never echoing input

**Given** pytest
**When** a marker string is sent in a valid request, a malformed request and a request that triggers a stubbed provider error
**Then** the marker appears in no log output and in no file, and the Proxy writes no files at runtime

### Story 1.8: Verify the Study Set in the browser (Quote Check and minimums)

As a student,
I want every Item checked against my own Note before I see it,
So that I never study something the AI made up.

**Refs:** FR-6 (IDs), FR-7 (floors), FR-9, FR-10 · AD-3, AD-9, AD-16 (language), AD-19 · DR-2

**Acceptance Criteria:**

**Given** a raw `StudySet` and the Note's Passages
**When** `core/verifyStudySet(raw, passages)` runs
**Then** it assigns Key Concept IDs (`k-` + slug of the normalized name; on collision the later concept and its Items are dropped) and Item IDs (`{keyConceptId}.fc{n}`, `.qq{n}`, `sp{n}`, 1-based, assigned before the Quote Check)

**Given** an Item
**When** the Quote Check runs
**Then** it fails if the Passage ID does not exist, if the normalized Quote is not an exact substring of the cited Passage (even if it occurs elsewhere), if it is under 20 or over 300 characters after Normalization, or if it spans two Passages
**And** a Quiz Question whose options are not unique after Normalization is dropped; failed Items are dropped and never regenerated

**Given** the surviving Items
**When** the floors apply
**Then** fewer than 5 concepts or fewer than 5 Summary Points returns `{ok: false, code: "err.generation"}`; fewer than 5 Flashcards or fewer than 5 Quiz Questions returns `{ok: false, code: "err.tooFewItems"}`
**And** otherwise it returns `{ok: true, set: VerifiedStudySet}` in which every concept carries `covered: boolean` (false when no Flashcard or Quiz Question survived) and only its surviving Items, plus `model`, `promptVersion`, `language` (checked against an allow-list, fallback `und`) and `cacheKey` = `{noteHash}:{promptVersion}:{model}`

**Given** Vitest
**When** the suite runs
**Then** every rule above has a unit test, `VerifiedStudySet` lives in `core/types.ts`, and `core/` imports nothing outside itself

### Story 1.9: Generate a Study Set from an uploaded Note

As a student,
I want to submit my Note and see clear progress, and a clear way forward if something fails,
So that I am never left facing a silent or endless spinner.

**Refs:** FR-5 (send gate), FR-8, FR-10, FR-11, FR-24 · AD-6, AD-7, AD-10, AD-11, AD-19, AD-20, AD-21 (`notes`, `studySets`) · NFR-5, NFR-8 · UX-DR23, UX-DR26

**Acceptance Criteria:**

**Given** a valid Note, Consent accepted and a key configured
**When** I submit it
**Then** the `api/` client calls `canSend` with fresh settings, sends one `POST /api/study-set` with an `AbortSignal`, and Genererer shows the generation progress (determinate bar, `gen.status` steps announced once via `role="status"`, Note meta "{filnavn} · {n} ord · {m} avsnitt")
**And** while it is pending the drop zone is disabled and a second submit returns the same pending promise (single-flight per Note Hash)

**Given** the Proxy answers with a `StudySet`
**When** `verifyStudySet` returns ok
**Then** the Note record (`title`, `sourceType`, `wordCount`, `passages`, `normalizationVersion`, `currentCacheKey`, `archived: false`, `importanceLevel: 2`, `lastPractisedAt: null`, `schemaVersion`) and the `VerifiedStudySet` are written through `web/storage/` (IndexedDB `notes` and `studySets`, Zod-validated) in one transaction, and I move to Notatoversikt

**Given** a timeout (browser abort at 90 s), 429, 5xx, network error, non-JSON body or unknown code
**When** generation fails
**Then** Genererer shows `err.generation` with 'Prøv igjen' and 'Tilbake til start' (`gen.back`), focus moves to the error message, and nothing is stored

**Given** `verifyStudySet` returns `err.generation` or `err.tooFewItems`
**When** the result is shown
**Then** the matching message with 'Prøv igjen' is shown, there is no automatic retry, and nothing is stored

**Given** 'Prøv igjen'
**When** I press it (once or twice quickly)
**Then** exactly one fresh generation starts

**Given** Consent declined
**When** I submit a valid Note
**Then** it is validated and then rejected with `consent.declined`, and no request is sent
**And** given Consent accepted and no key, `err.noKey` is shown, with no request sent and no raw provider error

**Given** I leave Genererer or reload mid-generation
**When** the response arrives late
**Then** the request is aborted or its response discarded, no partial Study Set is stored, and the Note can be submitted again

**Given** Playwright with a stubbed Proxy
**When** the suite runs
**Then** double submit, double 'Prøv igjen' and reload mid-generation each lead to at most one generation and no partial record
**And** a test asserts that every Proxy error code is a key in `messages.ts`

### Story 1.10: Notatoversikt with summary, Key Concepts and source panel

As a student,
I want to see the core of my Note — summary, Key Concepts and the source text side by side,
So that I immediately know what matters and where it comes from.

**Refs:** FR-6, FR-10 (not covered), FR-11 (`err.noConcepts`), FR-12 (Summary Points) · AD-8, AD-11 (`NoteSession`), AD-16 · NFR-6, NFR-7 · UX-DR3, UX-DR6 (Status strip), UX-DR7, UX-DR8, UX-DR9, UX-DR12, UX-DR18, UX-DR19

**Acceptance Criteria:**

**Given** a stored `VerifiedStudySet`
**When** Notatoversikt opens
**Then** the open Note's state lives in one `NoteSession` React context, the `h1` is the Note title, `document.title` is "{notat} · Torsas læringsassistent", and the top bar shows the Note name

**Given** a desktop viewport (≥ 768 px)
**When** Notatoversikt renders
**Then** the source panel (`aside aria-label="Kilde: {filnavn}"`, `surface-source`, `panel-label` "Kilde · {filnavn}") is visually left and the study panel right (1fr : 1.15fr), with `main` before `aside` in DOM and Tab order
**And** the source panel lists the stored Passages with mono IDs P1…, its scroll container is one Tab stop (`tabindex="0"`, `role="region"`), and Passages are `tabindex="-1"`

**Given** a viewport under 768 px
**When** Notatoversikt renders
**Then** 'Studier' / 'Kilde' are Radix Tabs (manual activation, arrow keys, inactive panel hidden from AT), and a Status strip at the top of 'Studier' shows the Note name

**Given** the study panel
**When** it renders
**Then** `h2` 'Sammendrag' lists each Summary Point with its Quote block (`quote-bg`, 3 px accent rule, serif in « ») and source reference "Kilde: Pn", shown at once
**And** `h2` 'Nøkkelbegreper' lists concepts by Centrality Rank, each with its Mastery chip ('ny'); a not-covered concept shows "ingen verifiserte elementer" instead of a chip
**And** Note text and generated content carry `lang` from `StudySet.language`

**Given** a Study Set in which no concept is covered (injected directly in a test)
**When** Notatoversikt renders
**Then** `err.noConcepts` with 'Prøv igjen' is shown instead of a start action

**Given** Notatoversikt at 320 px and 200 % zoom
**When** it is checked
**Then** nothing scrolls horizontally, long Norwegian compounds wrap, and axe reports no serious or critical violations

### Story 1.11: Jump from a source reference to the highlighted Quote

As a student,
I want to click "Kilde: P4" and see the exact sentence in my own Note highlighted,
So that I can check every Item against my source and return to where I was.

**Refs:** FR-12 · AD-8 · NFR-6 · UX-DR8, UX-DR10, UX-DR11

**Acceptance Criteria:**

**Given** a source reference on a Summary Point
**When** I activate it by mouse or keyboard
**Then** the source panel scrolls to the Passage (instant under `prefers-reduced-motion`), the Passage becomes active (no tint, 3 px `accent` left rule), the Quote is wrapped in one `<mark>` with `highlight` fill and a 2 px `highlight-ring` outline (`box-decoration-break: clone`) bracketed by visually hidden `quote.start` / `quote.end`, and focus moves to the Passage

**Given** a reference jump
**When** it completes
**Then** a sticky return control at the top of the source panel shows `return.label` with the context-specific action, the target Passage carries `return.hint` via `aria-describedby`, and the control persists until the next jump or Item change (no timer)

**Given** the return control or Esc inside the source panel
**When** I activate it
**Then** focus returns to the exact reference I activated

**Given** a second reference
**When** I activate it
**Then** only one highlight is visible at a time

**Given** a mobile viewport
**When** I activate a reference
**Then** the app switches to the 'Kilde' tab first, and returning switches back to 'Studier' at the same place

**Given** forced-colors mode
**When** a Quote is highlighted
**Then** it uses `Mark`/`MarkText` with a `CanvasText` outline
**And** the reference-jump component takes the return context as a parameter so Round and Resultat screens reuse it

### Story 1.12: Record Fixtures and compare models on the reference notes

As the developer (Tor),
I want recorded model responses for every reference note and a measured model choice,
So that Demo Mode, the tests and the exam-day fallback work without a key, and the model is chosen on evidence.

**Refs:** FR-23 (Fixtures), PRD Open Question 1 · AD-8 (Fixture hash), AD-12, AD-13 · NFR-4, NFR-5 · DR-2, DR-3

**Acceptance Criteria:**

**Given** `reference-notes/`
**When** I run `web/scripts/export-passages.ts`
**Then** it runs the real `extract/` + `core/` code and writes `{noteHash, passages}` per note; no Python code splits or normalizes Note text

**Given** that output and a key
**When** I run `proxy/scripts/record_fixtures.py`
**Then** it calls the live model through `llm.py` and writes `proxy/fixtures/{noteHash}.json` = `{studySet, simpler: {<itemId>: <raw>}, model, promptVersion}` with raw model responses (Simpler entries for a representative set of Items)

**Given** recorded responses for `anthropic/claude-haiku-5.5`, `openai/gpt-6-luna` and `google/gemini-3.5-flash-lite`
**When** I run `web/scripts/evaluate.ts`
**Then** it reports per model and reference note the Quote Check pass rate (SM-3), surviving Items, and generation and Simpler timings (NFR-4)
**And** the chosen model is set as the default `OPENROUTER_MODEL`, and the result is logged in `.logs/`

**Given** the test suite
**When** it runs
**Then** a pytest validates every Fixture against the current schema, and a Vitest asserts that each reference note hashes to its Fixture's `noteHash`
**And** any change to extraction, Normalization, splitting or the schema re-records the Fixtures in the same commit

### Story 1.13: Demo Mode with the bundled sample notes

As the examiner,
I want to try the app with bundled sample notes and no API key,
So that I can see the whole result without configuring anything.

**Refs:** FR-5 (decline → demo), FR-23, FR-24 · AD-9 (`demo:` records), AD-12, AD-20 · UX-DR32 (Studier › Demomodus), UX-DR33

**Acceptance Criteria:**

**Given** the build
**When** it runs
**Then** the reference notes are copied into `web/public/samples/` with a manifest

**Given** I press 'Nei takk, vis demo' in the Consent dialog or 'Prøv demomodus' on the start screen
**When** Demovelger opens (`h1` "Velg et eksempelnotat")
**Then** it lists the bundled sample notes, and picking one turns Demo Mode on and runs the normal pipeline (extraction → `POST /api/study-set` with `mode: "demo"` → `verifyStudySet`) to Notatoversikt

**Given** `mode: "demo"`
**When** the Proxy handles the request
**Then** it loads `proxy/fixtures/{noteHash}.json` and runs it through the same validation function as a live response, making no provider call and needing no key; an unknown hash returns 404 `{code: "err.demoOnly"}`

**Given** Demo Mode is on
**When** I upload anything that is not a bundled sample note
**Then** it is validated (FR-3) and then rejected with `err.demoOnly`

**Given** Demo Mode is on
**When** any screen renders
**Then** the top bar shows the `demo.indicator` pill linking to Innstillinger, where the 'Demomodus' switch (`settings.demo`, Radix Switch with visible `toggle.state`) turns it off
**And** Demo Mode can also be turned on there at any time, even with a key

**Given** Demo Mode is off, Consent accepted and no key
**When** I submit a Note
**Then** `err.noKey` is shown

**Given** a Demo Note
**When** it is stored
**Then** it is keyed `demo:{noteHash}` and never touches live progress for the same Note

**Given** Playwright
**When** the Demo path runs in a fresh browser context with no key
**Then** decline → Demovelger → Norwegian sample → Notatoversikt with Summary Points and a working reference jump completes, with no request reaching the AI provider
