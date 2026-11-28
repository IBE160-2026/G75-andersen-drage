---
title: 'Round selectors to core/, one routes module, flashcard-only Round replaces'
type: 'refactor'
created: '2026-11-28'
status: 'done'
baseline_commit: '35f4288a56de8672d902bd53f5152bda927f781e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-G75-andersen-drage-2026-11-18/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 left an import cycle (`NoteOverview.tsx` imports `useStartRound.ts`, which imports `roundPath` from `NoteOverview.tsx`), route helpers inside a screen component, and pure Round logic in components although AD-3 puts Round logic in `core/` (epic-2 retro F5, `epic-2-retro-item-12`). A Round without Quiz Questions also completes with `router.push`, so Back lands on the dead Round URL (F3).

**Approach:** Move the route helpers to `web/core/routes.ts` and the pure Round selectors to `web/core/roundItems.ts`, with their existing unit tests moved alongside; point every caller at them; replace the remaining hand-written `/notat/…` strings with `notePath`; and complete a flashcard-only Round with `router.replace`. No behaviour change except Back after a flashcard-only Round.

## Boundaries & Constraints

**Always:** `core/` imports only `core/` (`core/round.ts:3-4` pattern); types come from `core/round.ts` (`Round`) and `core/types.ts` (`VerifiedStudySet`, `VerifiedFlashcard`, `VerifiedQuizQuestion`), never from `storage/`. Function names, signatures and doc comments stay as they are, so the move is mechanical. `OPTION_LETTERS` stays in `QuizQuestion.tsx` (display constant).

**Never:** No change to `storage/db.ts`, to routes or URLs, or to any visible text. No re-exports from the old locations (callers import the new module directly). F1, F2 and F7 stay out (deferred to Epic 3).

</frozen-after-approval>

## Code Map

- `web/components/NoteOverview/NoteOverview.tsx:22-34` -- `notePath`, `roundPath`, `resultPath` defined here; move out.
- `web/components/Round/useStartRound.ts:8` -- imports `roundPath` from NoteOverview: the cycle.
- `web/components/Round/Round.tsx:28-78` -- `roundFlashcards`, `roundQuizQuestions`, `RoundPosition`, `roundPosition`, `itemsResolve`; `:20-21` imports routes and `displayOrder`; `:174` the `push` to fix (`:214` already `replace`).
- `web/components/Result/Result.tsx:21-36` -- `resultReady`; `:11,13,15` import routes, `displayOrder`, selectors.
- `web/components/QuizQuestion/QuizQuestion.tsx:16-28` -- `displayOrder` (move); `OPTION_LETTERS` stays.
- `web/app/notat/[noteHash]/runde/[roundId]/page.tsx:5,7,8` and `.../resultat/page.tsx:6` -- import `resultPath`, `resultReady`, `itemsResolve`.
- `web/app/notat/[noteHash]/page.tsx:93` and `web/components/Generating/Generating.tsx:139` -- hand-written `` `/notat/${…}` ``; use `notePath`.
- Tests to move: `web/components/Round/Round.test.ts` (selectors and route helpers, whole file), `Result.test.tsx:302-323` (`resultReady`), `QuizQuestion.test.tsx:129-136` (`displayOrder`).
- `e2e/round.spec.ts:842-858` -- the flashcard-only Round test; add a Back assertion.

## Tasks & Acceptance

**Execution:**
- [x] `web/core/routes.ts` -- new: `notePath`, `roundPath`, `resultPath` moved verbatim -- one home for routes, breaks the cycle.
- [x] `web/core/roundItems.ts` -- new: `roundFlashcards`, `roundQuizQuestions`, `RoundPosition`, `roundPosition`, `itemsResolve`, `resultReady`, `displayOrder`, typed with `core/` types (`Pick<Round, …>`, `Pick<VerifiedStudySet, "concepts">`) -- AD-3.
- [x] `web/core/routes.test.ts`, `web/core/roundItems.test.ts` -- the moved tests, unchanged in substance; delete `Round.test.ts` and the moved blocks in `Result.test.tsx` and `QuizQuestion.test.tsx`.
- [ ] Callers (`NoteOverview.tsx`, `useStartRound.ts`, `Round.tsx`, `Result.tsx`, `QuizQuestion.tsx`, the three route pages, `Generating.tsx`) -- import from the new modules; drop the old definitions.
- [x] `web/components/Round/Round.tsx:174` -- `router.replace(notePath(...))`, with a one-line comment like `:213`.
- [x] `e2e/round.spec.ts` -- in the flashcard-only test, after Notatoversikt shows, `page.goBack()` does not land on the finished Round URL.
- [x] `.docs/implementation-artifacts/sprint-status.yaml` -- set `epic-2-retro-item-12-…` to `done` via `sprint_status.py --set-action-status` after merge-ready.

**Acceptance Criteria:**
- Given the web sources, when listing imports, then no file under `web/components/` exports a route helper or a Round selector, `web/core/routes.ts` and `web/core/roundItems.ts` import only from `web/core/`, and `NoteOverview.tsx` and `useStartRound.ts` no longer import each other.
- Given a Round without Quiz Questions, when the last card is marked and Notatoversikt shows, then browser Back does not show the finished Round's URL.
- Given the full suite in Docker, when it runs, then Vitest, pytest and Playwright pass with the same test count as before, except for the one new Back assertion.

## Implementation Notes

- Implemented by a fresh sub-agent from this spec; the parent read the full diff against `baseline_commit` and checked every task and AC (all six tasks done).
- Vitest goes from 610 to 612: `core/boundary.test.ts` makes one test per `core/` source, so the two new modules add two. No other test was added or removed; Playwright stays at 155 (the Back assertion sits inside the existing flashcard-only test).
- `RoundScreen.test.tsx` expected `push` for the flashcard-only completion; it now expects `replace` and no `push`.
- After the review patches the full suite in Docker is green with every test image rebuilt (`build proxy-test web-test test`, `up -d --force-recreate --wait proxy-test web-test`, `run --rm test`): Vitest 612, pytest 173, Playwright 155.
- Surprise: the Verification command builds only the `test` image, so a running `web-test` served stale code and the new Back assertion failed on the first run. `docker compose --profile test down`, then `build proxy-test web-test test`, then `run --rm test` gave all green. Same pitfall as `issues.md` L133; it also stopped the dev stack, which was restarted with `up -d --no-build`.

## Review Triage Log

Pass 1: Blind Hunter (10), Edge Case Hunter (3), Verification Gap (0, "No verification gaps found").

- BH1 low, rejected: `epic-2-retro-item-12` set `done` before review ends; the change is merge-ready once this pass closes, and the status ships in the same PR.
- BH2 false: the Callers task is `[x]`; all six tasks were ticked before review.
- BH3 false: the spec is untracked only until the commit step, which adds it with the code.
- BH4 / ECH1 / ECH2 low, rejected: "the Back assertion would pass if `goBack()` did nothing". The history holds the Notatoversikt entry the Round was started from, so Back navigates; the first run against the old `push` code failed on this assertion, so it catches the regression. The extra `not.toBe(roundPage)` is redundant but harmless.
- BH5 false: `web/core/boundary.test.ts` already fails when a `core/` source imports anything but `./` paths, and it covers `routes.ts` and `roundItems.ts`.
- BH6 false: Back from Notatoversikt to Resultat after 'Tilbake til oversikten' lands on a valid Resultat (a complete Round's Resultat is meant to be reopened), not a dead URL like F3.
- BH7 low, patched: the `roundItems.ts` header now says Stories 2.1-2.4, as the test file does.
- BH8 low, rejected: the `displayOrder` test cases and doc comment moved verbatim (spec: names, signatures and doc comments unchanged); a missing non-permutation case is pre-existing.
- BH9 low, patched: the `Round.tsx` comment no longer cites the retro finding ID.
- BH10 / ECH3 false: route arguments are a 64-hex Note Hash (optionally `demo:`) and a UUID Round ID, which never contain `/`, `?`, `#` or `%`; the builders moved verbatim with no URL change.

## Design Notes

`core/routes.ts` holds pure string builders with no dependencies, which fits `core/`'s purity rule; `app/` would invert the components → app direction. A separate `roundItems.ts` keeps `core/round.ts` about composition (Story 2.1) and puts the read-side selectors (Stories 2.2–2.4) next to each other.

## Carried items

Searched `deferred-work.md`, open `issues.md` items and open `action_items` for "retro-item-12", "F5", "F3", "routes", "Round.tsx": only `epic-2-retro-item-12` itself (this spec). F1, F2 and F7 (items 13, 14, 16) are explicitly out of scope.

## Verification

**Commands:**
- `docker compose --profile test build test && docker compose run --rm test` -- expected: all suites green.
- `grep -rn "NoteOverview/NoteOverview\"" web/components web/app` -- expected: only `app/notat/[noteHash]/page.tsx` (the `NoteOverview` component itself).

**Manual checks:**
- None new beyond the e2e: no screen, text or layout changes. The flashcard-only Round is unreachable with the samples (every sample concept has a Quiz Question), so the Back fix is checked by Playwright only.
