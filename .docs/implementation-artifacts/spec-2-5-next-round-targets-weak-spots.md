---
title: 'Story 2.5: The next Round targets my weak spots'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: '7a9ca3dcdf7a59fe231d5ee51f11be2e1b2fb40c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Resultat offers no next Round, and the full UJ-1 loop is not proven in Demo Mode. Rotation (`composeRound`, `startRound` numbering) exists since 2.1 but is untested across consecutive Rounds.

**Approach:** One shared Round-start hook used by Notatoversikt and a new 'Ny runde' on Resultat; tests over consecutive Rounds and a Demo e2e loop. Refs: FR-18, FR-23 · AD-11, AD-21 · UX-DR15.

## Boundaries & Constraints

**Always:**
- `useStartRound(note, studySet)` → `{ start, pending, failed }`: the current Notatoversikt path (progress → `composeRound` → `startRound` → Round screen), double-press guard, never throws. Notatoversikt unchanged, label stays 'Start runde'.
- Resultat (Tor, 2026-11-26, option A): secondary 'Ny runde' right after the primary 'Tilbake til oversikten'; new key `result.next` "Ny runde" (text from `banner.interrupted`), D-24. Composes from Resultat's loaded Study Set (the Note's current one, D-19).
- Pending → `aria-disabled`, focus stays; failure → `err.generation` inline, retry works.
- Next Round: number n + 1, shaky first, least recently used Quiz Question, all known → `round.review`.

**Never:** resume/banner (3.5), Readiness (3.2), `composeRound` rule changes, DB version bump or new field, `waitForTimeout`.

## I/O & Edge-Case Matrix

| Scenario | State | Expected |
|----------|-------|----------|
| After mixed Round | A 'Kunne det ikke', B right | Round 2: A's card first |
| Two Quiz Questions | `.qq1`, `.qq2`, three Rounds | qq1, qq2, qq1 |
| All known | every covered concept `known` | `review: true` |
| Write fails on Resultat | `startRound` not ok | stays, `err.generation` |
| Reopened tab | same IndexedDB | states, `lastShownAt` unchanged |

</frozen-after-approval>

## Code Map

- `web/components/NoteOverview/NoteOverview.tsx:44-115` -- move `newRoundId`, `start`, `begin`, `starting` ref, `pending`/`failed` to new `web/components/Round/useStartRound.ts`.
- `web/components/Result/Result.tsx:79-84` (+ `.module.css`) -- button in `styles.actions`; `ErrorMessage` as in `StudyPanel`; row wraps at 320 px.
- `web/storage/db.ts:268-320` `startRound`, `web/core/round.ts` -- no change.
- `web/i18n/messages.ts:133-140` -- `result.next`.
- `e2e/round.spec.ts` helpers (`openOverview`, `startRound`, `markAllCards`, `answerQuestion`, `axeBlocking`, `readStore`); `e2e/demo.spec.ts` (`recordStudySetBodies`, `SAMPLES`).

## Tasks & Acceptance

**Execution:**
- [x] `useStartRound.ts`, `NoteOverview.tsx` -- extract the start path.
- [x] `messages.ts`, `Result.tsx` + `Result.test.tsx` -- 'Ny runde', pending, failure.
- [x] `web/storage/db.test.ts` -- consecutive Rounds: number, shaky first, qq rotation, review.
- [x] `e2e/round.spec.ts` -- Resultat → 'Ny runde' → 'Runde 2', shaky card first; reopened page keeps `conceptProgress`; axe 1280/320.
- [x] `e2e/demo.spec.ts` -- Norwegian sample: cards → quiz → Resultat → jump → 'Ny runde'; Round 2 starts with the concepts marked wrong; `/api/` sees only `GET /api/status` and `POST /api/study-set` with `mode: "demo"`.
- [x] `.docs/deviations.md` D-24, `README.md` round bullet.

**Acceptance Criteria:**
- Given a completed Round, when I press 'Ny runde' or 'Start runde', then Round n + 1 opens with focus on its `h1`.
- Given keyboard only at 1280 and 320 px, when I use Resultat, then axe finds no serious/critical violation.

## Carried items

Searched `deferred-work.md`, open `issues.md`, open sprint-status `action_items`.
- `issues.md` 2026-11-25 story-2-2 (recheck Round end, N1 in `.docs/qa/story-2-1-2-2-manual-pass.md`): manual check 3; close N1 when done.

## Implementation Notes

- `useStartRound` lives in `web/components/Round/useStartRound.ts` and imports `roundPath` from `NoteOverview.tsx`, which imports the hook back: a cycle of hoisted function exports only, safe at runtime. A throwing `router.push` is caught and shown as the failure state.
- Resultat's inline `err.generation` sits under the actions row (`.error` in `Result.module.css`); 'Ny runde' gets `aria-describedby` to it after a failure.
- The 2.4 e2e "keyboard only" test now expects 'Ny runde' between 'Tilbake til oversikten' and the first 'Kilde: Pn' in Tab order.
- `e2e/seed.ts` `readStore` also reads `studySets` (the Demo loop needs `correctIndex` and card fronts).

## Spec Change Log

## Review Triage Log

Pass 1 (2026-11-27): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Full suite before patches: Vitest 608, pytest 173, Playwright 155 green.

| ID | Finding | Verdict | Evidence | Route |
|----|---------|---------|----------|-------|
| VG1 | No test makes `router.push` throw; the catch branch in `useStartRound` is unproven | low | Real: every test lets `push` succeed; a `mockImplementationOnce` throw in `Result.test.tsx` is a direct test. | patch |
| BH1 | D-24 `done` while spec `in-review`, sprint-status `in-progress` | false | D-rows are set `done` with the implementing commit (D-23 in 2.4); sprint-status moves to `review` at step 5 (2.4 triage BH6). | reject |
| BH2 | D-24 names EXPERIENCE.md Microcopy as updated, but the diff leaves it unchanged | medium | Real: EXPERIENCE.md :174 lists the Resultat keys without `result.next`; D-23's keys were added there. Direct one-row edit. | patch |
| BH3 | Import cycle `useStartRound` ↔ `NoteOverview` (`roundPath`) | low | Real cycle, but only hoisted function exports; no caller breaks (suite green). Fix is a new routes module touching four importers. | reject |
| BH4 | A throwing `push` after a stored Round: retry composes n + 2 and abandons n + 1 | low | Next's app-router `push` does not throw synchronously in practice; the fix needs remembered `roundId` state. | reject |
| BH5/EC2 | After a successful `push` the button stays pending if navigation never commits | low | Same as Notatoversikt since 2.1 ("stays pending until the Round screen replaces this one"); fixing needs a timer or pathname watch. | reject |
| BH6 | 'Tilbake til oversikten' during a pending 'Ny runde' is later overridden by the Round push | low | The pending window is one IndexedDB transaction (ms); needs an abort guard. | reject |
| BH7 | e2e failure test does not check focus stays on 'Ny runde' after the failure | low | Real gap vs "focus stays"; one `toBeFocused()` line. | patch |
| BH8/EC3/EC4 | Demo loop assumes ≥ 4 concepts in Round 1 and a Flashcard on `wrong[0]` without asserting | low | Real: a Fixture change gives a misleading failure; two `expect` lines. Order of `slice(0, 2)` is deterministic (same `lastShownAt`, rank ties). | patch |
| BH9 | Demo comment says Round 2 becomes abandoned, unchecked | low | Real; one assertion on the stored Round 2 `status`. | patch |
| BH10 | `db.test.ts` "reading again (a reopened tab)" compares before/after pure reads; cannot fail | low | Real: no reopen is simulated; the reopened tab is covered by the e2e new-page check. Delete the test. | patch |
| BH11 | No `useStartRound` unit test; `composeRound` → null branch untested | low | Resultat needs ≥ 1 Quiz Question (`resultReady`), so null is unreachable there; Notatoversikt's path is e2e-tested (round.spec :346-384). | reject |
| BH12 | N1 not closed | false | Closed at `done`, after Tor's manual checks (carry-forward standard). | reject |
| BH13 | README says "Feiler lagringen" but the same error covers a failed progress read | low | Real, narrow wording; direct word change. The long-bullet part is style only. | patch |
| BH14 | Verification lacks lint/typecheck; `last_updated` newer than spec date | false | Fix edits this spec; the date is the session date. | reject |
| EC1 | Another tab regenerates while Resultat is open; next Round uses a stale set | low | Same exposure on Notatoversikt since 2.1; two tabs on one Note is rare and the Round URL then shows `note.missing`, not corruption. | reject |
| EC5 | `Result.test.tsx` covers a rejected progress read but not `{ ok: false }` | low | Real; the title claims both. One added case. | patch |
| EC6 | Partial `vi.mock` of `storage/db` may throw for future exports | false | Hypothetical; no current import path calls an unmocked export (suite green). | reject |

## Verification

**Commands:**
- `docker compose --profile test build && docker compose run --rm test` -- expected: all green.

**Manual checks:**
- Resultat 1280 px, keyboard: 'Tilbake til oversikten' → 'Ny runde' → 'Kilde: Pn'; visible focus; 'Ny runde' → "Runde 2", wrong concept first.
- Resultat 320 px: actions wrap, no horizontal scroll, buttons ≥ 44 px.
- N1: cards → quiz → Resultat → 'Ny runde' → Round 2; Notatoversikt 'Start runde' → Round 3; never stuck.
- Close the tab, reopen the Note: chips unchanged.
