---
title: 'Story 2.1: Start a Round from Notatoversikt'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_commit: 'd629c7e3f769aec4a48aa3b814d0aa7b2c91b6ca'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 'Start runde' is an `aria-disabled` placeholder; there is no Round composition, no `conceptProgress`/`rounds` records and no Round screen.

**Approach:** Pure `core/composeRound`, one-transaction `storage/startRound`, and a Round screen at `/notat/[noteHash]/runde/[roundId]` rendered only from the stored Round. Refs: FR-18 · AD-3, AD-11, AD-21 · NFR-6, NFR-7 · UX-DR7, UX-DR8, UX-DR15, UX-DR19.

## Boundaries & Constraints

**Always:**
- `composeRound` is pure; time, `roundId` and a random source are arguments.
- Selection: ≤ 10 concepts, never `covered: false`; shaky + new up to 8 (shaky first, least recently shown first, never-shown first, ties by `centralityRank` ascending); then `max(1, round(0.2 × n))` known (n = shaky + new included), least recently shown first; order shaky → new → known. No shaky/new → ≤ 10 known, `review: true`.
- Items: all surviving Flashcards per concept, plus the Quiz Question after `lastUsedQuizQuestionId` in Study Set order, wrapping (first if none or stale). `itemIds` = Flashcards in concept order, then Quiz Questions in concept order. `optionOrder`: a shuffled permutation of original indices per question (Tor, 2026-11-25).
- `startRound`, one transaction: create missing `conceptProgress` rows as `new` for all eligible concepts; set `lastShownAt` and `lastUsedQuizQuestionId` on included ones; put `{roundId, noteHash, cacheKey, number, review, conceptIds, itemIds, optionOrder, answers: [], status: "active", startedAt, completedAt: null}` with `number` = the Note's Round count + 1; set any other `active` Round of the Note to `abandoned`. Keep `demo:` prefixes.
- Round screen: never recomposes. Title "Runde {n} · {notat} · …", focused `h1` "Runde {n}", inline `h2` "Kort {x} av {y}" (`tabindex="-1"`), 6 px `aria-hidden` bar, Mastery chip, `round.review` on a review Round, the Notatoversikt split layout / tabs. Below: the current Flashcard front (question in `card-front` serif, "Kilde: Pn" as plain text, no buttons or Quote) (Tor, 2026-11-25).
- New keys, approved by Tor 2026-11-25: `round.title` "Runde {n}", `round.item.card` "Kort {x} av {y}", `mastery.shaky` "usikker", `mastery.known` "kan"; recorded as D-18.
- Start failure: stay, leave pending, show the error key inline (`role="alert"`); never throw to React.

**Never:** reveal/marks/`updateMastery` (2.2), Quiz UI or scoring (2.3–2.4), resume (3.5), overview chips from `conceptProgress` (2.4), shortcuts (4.1), the regenerate fix (own PR after 2.1; Tor, 2026-11-25), a DB version bump, `waitForTimeout`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| PRD 1 | 3 shaky + 5 known | 3 shaky, then 1 least recently shown known |
| PRD 2 | 4 concepts, one without Quiz Question | Flashcards of 4, Quiz of 3 |
| Many new | 12 new | 8 new by rank |
| Few known | 9 shaky/new, 1 known | 8 + 1 |
| Review | 12 known | 10 least recently shown, `review: true` |
| Not covered | `covered: false` | excluded, no progress row |
| Rotation | qq1, qq2, last used qq2 | qq1 |
| Write fails | transaction rejects | nothing stored, inline `err.generation` |
| Bad URL | unknown `roundId` or set gone | `note.missing` empty state |

</frozen-after-approval>

## Code Map

- `web/core/types.ts:42-74` -- `VerifiedStudySet`; concept `id` = `keyConceptId`. `core/overview.ts:6` `sortConcepts` to reuse; `verifyStudySet.ts:18` result pattern; `core/boundary.test.ts` guards imports.
- `web/storage/db.ts` -- stores :12-20 (`noteHash` index on all); Zod schemas + type asserts :27-75 (replace placeholders :81-82 the same way); `saveGeneratedNote` :124-148 is the transaction pattern. Tests: `db.test.ts` (fake-indexeddb).
- `web/components/NoteOverview/NoteOverview.tsx` -- split/tabs :52-106 (extract to shared `StudyLayout`), chip :154-158, Start :164-172 (`Button` `pending`).
- `web/app/notat/[noteHash]/page.tsx` -- load/session/stale-hash pattern for the Round page (sets its own session).
- `web/components/Screen/Screen.tsx`, `web/i18n/messages.ts:127-143` -- `pageTitle` is key-only; needs a formatted segment.
- `e2e/notat.spec.ts:122-186` -- `axeBlocking`, `openOverview`, `start` aria-disabled assert (change); `e2e/seed.ts:35-67` add `conceptProgress` seeding.

## Tasks & Acceptance

**Execution:**
- [x] `web/core/round.ts` + test -- types, `composeRound`; a test per rule and matrix row.
- [x] `web/storage/db.ts` + test -- record schemas, `readConceptProgress`, `startRound`, `readRound`; test rows, timestamps, number, abandon, rollback.
- [x] `web/i18n/messages.ts` -- keys, formatted title.
- [x] `web/components/StudyLayout/`, `NoteOverview.tsx` -- extract layout; wire Start (`crypto.randomUUID()` and now in the UI layer, `router.push`).
- [x] `web/app/notat/[noteHash]/runde/[roundId]/page.tsx`, `web/components/Round/` -- Round screen.
- [x] `e2e/seed.ts`, `e2e/notat.spec.ts`, `e2e/round.spec.ts` -- start, reload, review, tabs, axe and overflow at 320 px.
- [x] `.docs/deviations.md` D-18 (keys, `abandoned`); `README.md` 'Start runde' sentence.

**Acceptance Criteria:**
- Given an eligible concept, when I press 'Start runde', then records are stored in one transaction and focus lands on `h1` "Runde n".
- Given an active Round, when I reload its URL, then the same Items show without recomposing.
- Given 320 px, when the Round screen shows, then no horizontal scroll, tabs work, and axe finds no serious/critical violation.
- Given a pending start, when I press again, then one Round is stored.

## Carried items

- Retro item 5 / R2 (`sprint-status.yaml`, `deferred-work.md › spec-1-9`, `issues.md`): regenerate fix. Deferred to its own PR after 2.1 (Tor); targets updated.
- Retro R3 (`web/api/studySet.ts` guard): deferred to 2.3, first Quiz UI; added to `deferred-work.md`.
- Retro item 9 (Demo without Consent): not this story.

## Implementation Notes

- `composeRound` returns `{round (without number), eligibleConceptIds, usedQuizQuestionIds}`; `startRound` re-reads the rows inside its transaction, so a row's `state` is never overwritten, and assigns `number`. Invalid progress rows read as `new` and are replaced on start.
- `crypto.randomUUID` exists only in a secure context; the e2e app runs at `http://web-test:3000`, so the UI falls back to a v4 UUID from `crypto.getRandomValues` (`core/ids.ts` › `uuidFromBytes`). Recorded in D-18.
- Shared pieces: `StudyLayout` (split / tabs / source panel, `useWide`), `MasteryChip`, `app/notat/shared.tsx` (`decodeParam`, `NoteMissing`). `Screen`'s `title` takes a key with values (`FormattedMessage`).
- The progress line sits above the tabs on mobile, so the `h1` stays visible on 'Kilde'. A Round with no Flashcards (only Quiz-only concepts) shows the progress line without the `h2`; Story 2.3 handles Quiz Items.

## Spec Change Log

## Review Triage Log

Pass 1 (2026-11-25): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG).

| ID | Finding | Verdict | Evidence | Route |
|----|---------|---------|----------|-------|
| EC1/BH1 | Round page renders `abandoned`/`complete` Rounds as live | medium | `loadRecords` never checks `status`; browser back after starting Runde 2 shows abandoned Runde 1, and 2.2 would write marks to it. Round screens are for the active Round (intent AC 4). | patch: non-active → `note.missing` |
| EC2 | `random()` NaN/negative breaks `shuffledIndices` | false | The only caller passes `Math.random`, which returns [0, 1). | reject |
| EC3 | Round of a superseded Study Set shows after regenerate | low | Real only after 'Prøv igjen' regenerate; the quotes still match the same Passages, and the regenerate fix PR (after 2.1) deletes the old set → `note.missing`. Unlikely, fix adds a guard. | reject |
| EC4/BH3 | `startRound` derives "included" from `usedQuizQuestionIds` keys, not `round.conceptIds` | low | `composeRound` always fills both consistently, but the hidden coupling lets `db.test.ts` pass self-contradictory compositions. Direct correction. | patch |
| BH2 | `number` counts abandoned and invalid Round records | false / low | Counting all Rounds is what the spec says ("the Note's Round count + 1"); invalid records come only from hand-edited storage, fix adds validation. | reject |
| BH4 | `Timestamp` accepts any string; `lastShownAt` compared as strings | low | The app writes only `toISOString()`, but a non-canonical value would sort silently wrong; `z.iso.datetime()` (zod 4.6) is a direct correction. | patch |
| BH5 | `RoundRecordSchema` accepts a non-permutation `optionOrder` | low | Written only by `composeRound`; no reader until 2.3; fix adds a refine. | reject |
| BH6 | Mastery chip on the Round screen has no concept context | low | UX-DR places the chip in the progress line by design; reading order "Runde 1 · Kort 1 av 5 · ny" ties it to the current card. 2.2 builds the Flashcard region with its chip. | reject |
| BH7 | Start error not in the button's `aria-describedby` | low | `ErrorMessage` is `role="alert"` (announced once), but on returning to the button it is not read. Direct correction. | patch |
| BH8 | No test that the button is `aria-disabled` while pending | low | Double-press test checks only the count. NFR: pending is `aria-disabled`. | patch |
| BH9/VG4 | Round with no Flashcards (Quiz-only concepts) untested, empty study panel | medium | `covered` is true with quizzes only (`verifyStudySet.ts:82`); the null guard exists but is untested. Quiz Items are Story 2.3. | defer → 2.3 |
| BH10/VG2 | `itemsResolve` false branch and `roundFlashcards` order never tested | medium | No test file references them; e2e "bad URL" clears `studySets`, so `itemsResolve` never runs false. | patch: `Round.test.ts` |
| BH11 | `sprint-status.yaml` says in-progress while spec is in-review | false | Step 5 of this workflow syncs sprint status to review. | reject |
| BH12 | D-18 omits `conceptIds`; `epic-2-context.md` Stores lacks `number`, `review`, `conceptIds` | low | Docs drift from the stored shape; direct correction. | patch |
| BH13 | `axeBlocking` duplicated in `round.spec.ts` | low | Same copy pattern already in `demo.spec.ts`; extraction is a refactor beyond a direct fix. | reject |
| BH14 | Start stays pending forever if navigation does not complete | low | `router.push` to a client route does not fail silently in practice; fix adds lifecycle handling. | reject |
| VG1 | No test that a Round under another Note's URL shows `note.missing` | medium | Removing the `noteHash` check passes every test; would mix one Note's cards with another's source. | patch: e2e step |
| VG3 | `Screen` effect rerunning only on text change is untested | medium | Reverting deps to `[title, note]` refocuses `h1` on every `RoundScreen` render (new title object) and no test fails. | patch attempted; needs a DOM test environment (new dev dependency) → deferred by Tor 2026-11-25 in `deferred-work.md` |
| VG-o1 | Double-press test cannot tell the ref guard from `Button`'s pending guard | low | Either guard alone passes; isolating the ref needs timing control. | reject |

## Verification

**Commands:**
- `docker compose run --rm test` -- expected: Vitest and Playwright green.

**Manual checks:**
- Notatoversikt › 'Start runde' by keyboard: visible focus, lands on `h1` "Runde 1".
- Round screen at 320 px: no horizontal scroll, nothing clipped; tabs keyboard-usable with visible focus.
- Round screen after reload: same "Kort 1 av y" and chip.
