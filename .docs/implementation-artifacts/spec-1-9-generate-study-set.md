---
title: 'Story 1.9: Generate a Study Set from an uploaded Note'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'c9b9b548627a14c2727ecd8aee46bf1e9ab42e13'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An uploaded Note is extracted and hashed, but nothing sends it to the Proxy, verifies the answer or stores it, so the student never gets from file to Study Set.

**Approach:** After a successful extraction the Start page runs the send gate. If the gate passes, it switches to Genererer, where the `api/` client sends one live `POST /api/study-set`. The response goes through `verifyStudySet`. The Note record and the `VerifiedStudySet` are written to IndexedDB in one transaction, and the app navigates to a placeholder Notatoversikt. Refs: FR-5, FR-8, FR-11 · AD-6, AD-7, AD-10, AD-11, AD-19, AD-20, AD-21 · NFR-5 · UX-DR26.

## Boundaries & Constraints

**Always:**
- Layering: only `web/api/` calls `fetch`, and only `web/storage/` touches `indexedDB`. Neither throws to React; both return `{ok, code}` results whose codes are message keys.
- `api/` calls `canSend(readSettings(), status, "live")` with freshly read settings right before each POST. It is single-flight per Note Hash, and every request carries an `AbortSignal` with a 90 s browser timeout.
- Leaving Genererer (unmount) aborts the request, and a late result is never written.
- Records:
  - Both records carry `schemaVersion: 1` and are Zod-validated on read.
  - `notes`, keyed by `noteHash`: `{noteHash, title, sourceType, wordCount, passages, normalizationVersion, currentCacheKey, archived: false, importanceLevel: 2, lastPractisedAt: null}`.
  - `studySets`, keyed by `cacheKey`: `{noteHash, ...VerifiedStudySet}`.
  - All four AD-21 stores and their `noteHash` indexes are created in the DB schema now.
- Every new string is a Microcopy key, and no Note content goes to the console.

**Never:**
- Demo Mode, paste, or a cache-hit skip of Genererer (FR-4 belongs to Epic 3).
- 'Prøv igjen', `err.tooFewItems` text, and focus or reload handling for interrupted generations (Story 1.10).
- The real Notatoversikt content and the `NoteSession` context (Story 1.11).
- Automatic browser retries, and changes to `proxy/`, `schemas.py` or `schema.d.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| happy | valid file, Consent accepted, key configured, the Proxy returns a valid StudySet | Genererer, then 1 POST, then both records stored in one transaction, then `/notat/{noteHash}` with `h1` = title | N/A |
| gate: no key / declined | status `keyConfigured: false`, or Consent not accepted | stays on Start; the gate's code is shown inline at the drop zone; Note meta kept | no request sent |
| HTTP error | 429/5xx/503, network error, non-JSON, unknown `code` | Genererer shows `err.generation` (`role="alert"`) + 'Tilbake til start' | nothing stored |
| timeout | no answer in 90 s | aborted, then `err.generation` | nothing stored |
| verify fails | `verifyStudySet` returns `err.generation` or `err.tooFewItems` | `err.generation` (detailed text in 1.10) | nothing stored |
| storage fails | IndexedDB write rejects or is unavailable | `err.generation` | no partial record (transaction aborted) |
| double submit | a second file dropped while pending | drop zone disabled (`busy`); `api/` returns the pending promise for the same hash | exactly 1 request |
| title | `Forelesning 7 – normalformer.final.pdf`, or a name over 80 chars | `Forelesning 7 – normalformer.final`; cut to 80 code points | N/A |
| same Note again | a `noteHash` that is already stored | records replaced via `put`, in the same transaction | N/A |

</frozen-after-approval>

## Code Map

- `web/app/page.tsx` -- `StartPage.onFile`: after `extractInWorker`, call the gate, then switch to `<Generating>`. Keep the reject/focus pattern (`ERROR_ID`, `seq`).
- `web/components/Screen/Screen.tsx`, `web/i18n/messages.ts` (`pageTitle` L82) -- `title` is a `MessageKey` only. Extend it so a Note segment ("{side} · {notat} · …") and a raw Note-title page title ("{notat} · …") are possible.
- `web/components/AppSettings/AppSettings.tsx` -- `useAppSettings().status` (`Status | null`, fetched once at startup). Pass it to `api/`. `null` counts as no key (`gate.ts`).
- `web/api/status.ts` -- pattern for an injectable `fetchImpl` and a never-throw guard. `schema.d.ts`: `StudySetRequest {mode, noteHash, passages}`, response `StudySet` (do not edit).
- `web/storage/settings.ts` -- `readSettings()`; Zod `looseObject` + `schemaVersion` pattern for the new stores.
- `web/core/verifyStudySet.ts` (`verifyStudySet(raw, passages)`), `core/types.ts` (`ExtractedNote` has no `sourceType`; `VerifiedStudySet`), `extract/types.ts` (`fileType(fileName)` → `txt|md|docx|pdf`, the value used for `sourceType`).
- `web/components/DropZone` -- `busy` prop disables it.
- `e2e/upload.spec.ts` -- `afterEach` asserts no `/api/study-set` request. It stays true because the keyless `proxy-test` answers `keyConfigured: false`, so the gate blocks. Update only the comment, plus any success-row assertions broken by the new inline `err.noKey`.
- `e2e/consent.spec.ts` L94 -- `page.route("**/api/status")` stub pattern. `e2e/seed.ts` provides `seedConsent`.

## Tasks & Acceptance

**Execution:**
- [x] `web/package.json` + lockfile -- add `idb` (dep) and `fake-indexeddb` (dev, imported in storage tests). Pin exact versions that are at least 2 weeks old.
- [x] `web/storage/db.ts` -- `openDb()` (idb, `DB_VERSION` 1, four stores + `noteHash` indexes), Zod `NoteRecordSchema` / `StudySetRecordSchema`, `saveGeneratedNote(note, set)` (one `readwrite` transaction over `notes`+`studySets`), `readNote(noteHash)`. Results are never-throw.
- [x] `web/storage/db.test.ts` -- round trip, a rejected write leaves both stores empty, an invalid record read returns not-ok, the four stores exist.
- [x] `web/core/noteRecord.ts` (+ test) -- pure `noteTitle(fileName)` and `buildNoteRecord(extracted, noteHash, set)` covering the matrix "title" row.
- [x] `web/api/studySet.ts` (+ test) -- `requestStudySet({noteHash, passages, status, signal, fetchImpl})`: gate, then single-flight map, then POST with a 90 s timeout merged with the caller's signal, then a guarded parse. Returns `{ok, studySet} | {ok:false, code}` and maps every non-2xx/abort/parse failure to `err.generation`. Test every matrix row that touches HTTP, including the gate codes and the pending promise.
- [x] `web/components/Generating/Generating.tsx` + `.module.css` -- Genererer screen (see Design Notes). On success: `verifyStudySet`, then `saveGeneratedNote`, then `router.push("/notat/" + noteHash)`.
- [x] `web/app/notat/[noteHash]/page.tsx` -- placeholder Notatoversikt: `readNote`, then `<Screen>` with `h1` = title. If the record is missing or invalid, show `start.empty.next`-style text with a link to Start.
- [x] `web/i18n/messages.ts` -- `title.generating` "Lager kort og quiz", `gen.status.concepts|cards|sources` (EXPERIENCE L137 drafts), `gen.back` "Tilbake til start", `gen.progress` (accessible name of the bar).
- [x] `e2e/generate.spec.ts` -- stub `/api/status` (`keyConfigured: true`) and `/api/study-set` (a StudySet whose Quotes exist in the uploaded fixture Note). Run upload, then Genererer, then Notatoversikt `h1`. Assert both IndexedDB records via `page.evaluate` and exactly one request. Add an axe check on Genererer, and an `err.generation` case (stub returns 502) where nothing is stored.
- [x] `.docs/deviations.md` -- D-11: `gen.status` split into three keys, a time-based progress bar, and an early `gen.back`.
- [x] `README.md` -- under App-skallet: upload now generates and stores the Note in the browser (IndexedDB); the overview is a placeholder until 1.11.

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` without a key, when run, then Vitest, pytest and Playwright (including `generate.spec.ts` and the unchanged no-request rule in `upload.spec.ts`) pass.
- Given `npm run typecheck` in `web/`, when run, then it passes.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Source | Finding | Verdict | Route / evidence |
|---|--------|---------|---------|------------------|
| 1 | BH, EC | Start uses the `status` captured before `await extractInWorker`; a file dropped before /api/status answers gets a false `err.noKey` | medium | patch: read status from a ref after extraction |
| 2 | BH, EC | Re-upload resets user fields and orphans an old Study Set | medium | defer: matrix decides `put`; AD-21 replacement belongs to the FR-4 story (Epic 3); no UI sets the fields yet |
| 3 | BH, EC | Single-flight promise tied to the first caller's signal | low | rejected: only one `Generating` calls per hash; StrictMode remount frees the hash on abort; fix adds refcounting |
| 4 | EC | Already-aborted caller receives the pending promise | low | patch: move the aborted check above the pending lookup |
| 5 | BH, EC | `decodeURIComponent` throws on a malformed escape | low | patch: try/catch |
| 6 | BH | Missing-state page title "Dine notater" vs h1 "Fant ikke notatet" | low | patch: `title="note.missing"` |
| 7 | BH | 503 `err.noKey` from the Proxy shown as `err.generation` | low | rejected: frozen matrix maps 503 to `err.generation`; gate covers no key; 1.10 owns detailed errors |
| 8 | BH | `fileType` checked only after the POST | false | `checkFile` already rejects any other extension before extraction |
| 9 | BH, EC | No `blocked`/`blocking` handlers on `openDB` | false | only DB version 1 exists; `blocked` fires only on a version change |
| 10 | BH, EC, VG | "late answer is never written" is untrue once the save started; one aborted check is dead code | low | patch: reword comment, delete the dead check |
| 11 | BH | `setProgress(100)` never painted before navigation | low | rejected: cosmetic; spec asks for it; no user harm |
| 12 | BH | Notatoversikt renders nothing while loading | low | rejected: one IndexedDB read, imperceptible; 1.11 replaces the page |
| 13 | BH | After 'godta nå' the file must be uploaded again | low | rejected: re-upload is a valid path; 1.10 owns the declined flow; fix adds state |
| 14 | BH | Diff omits spec, sprint-status and lockfile | false | intentional: reviewers see code only |
| 15 | EC | Response schema allows non-integer rank/correctIndex that storage later rejects | false | Proxy Pydantic models and `rules.py` enforce integer ranks 1..n and `correctIndex` 0..3 |
| 16 | EC | Storage failure shown as "Fant ikke notatet" | low | rejected: storage-unavailable messaging is Story 3.7 (AD-10); fix adds a key and a branch |
| 17 | VG, BH | Abort on leaving Genererer untested | medium | patch: e2e navigates to Innstillinger while the POST is held |
| 18 | VG, BH | Time-based status steps and progress untested | medium | patch: e2e with `page.clock` |
| 19 | VG | Clearing the inline `consent.declined` after accepting untested | medium | patch: extend the gate e2e test |

## Design Notes

- **Genererer** renders on `/` in place of the Start content (no URL change, so there is no reload state to handle before 1.10). It is a `<Screen title="title.generating">` with the Note name as page-title segment and `h1` "Lager kort og quiz".
- **Progress** is time-based, because one POST has no real progress. A native `<progress max=100>` named by `gen.progress` shows `min(90, elapsed/60 s·90)`. The status line `role="status"` shows `gen.status.concepts` at 0 s, `gen.status.cards` at 15 s, and `gen.status.sources` when the response arrives, so each step changes the text once. The Note meta line (`note.meta`) sits below it. Set the bar to 100 right before navigating. Respect reduced motion (no animated fill transition).
- **Gate on Start:** the UX places `err.noKey` and `consent.declined` on Start (State Patterns), so a blocked gate never opens Genererer. The full 1.10 treatment (demo offer, link) builds on this.
- **Failure:** `ErrorMessage` with `err.generation`, focused, plus a `gen.back` button that returns to the Start content.

## Verification

**Commands:**
- `cd web && npx vitest run && npx tsc --noEmit` -- green.
- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
