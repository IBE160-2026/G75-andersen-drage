---
title: 'Notatoversikt: Start runde above the summary'
type: 'feature'
created: '2026-11-28'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On a normal desktop screen 'Start runde' sits below the fold on Notatoversikt (after Sammendrag and Nøkkelbegreper), so the student scrolls to reach the primary action (O1 in `.docs/qa/story-2-5-manual-pass.md`).

**Approach:** Option B, decided by Tor 2026-11-28: move 'Start runde' with its hint (and its inline `err.generation`, or the `err.noConcepts` + 'Prøv igjen' state that replaces it) to the top of the study panel, right under where the Readiness Score will sit (Story 3.2) and where the interrupted-round banner goes (mockup `key-overview.html:229`). Record it as deviation D-25, since the IA wireframe puts 'Start runde' after Nøkkelbegreper.

</frozen-after-approval>

## Implementation Notes

Plan (oneshot):
- `web/components/NoteOverview/NoteOverview.tsx` — move the start block (button + hint + error, or the `err.noConcepts` message) to the first child of `.studyPanel`, before the Sammendrag section. Behaviour, IDs and `aria-describedby` unchanged.
- Tab order on desktop becomes h1 → 'Start runde' → 'Kilde: P1…P5' → source region. Update `e2e/notat.spec.ts` (Tab-order test and the "at the end" comment) and add a DOM-order check in `NoteOverview.test.tsx`.
- `.docs/deviations.md` D-25; EXPERIENCE.md UJ-1 step 5 and the Page structure row name the new order (step 9 only lists what shows, no order); deferred-work entries for Story 3.2 (Readiness goes above the start block) and Story 3.5 (the banner takes its place) so the carry-forward search finds it.
- Close O1's action in the 2.5 manual pass.

Manual checks (Tor):
- Notatoversikt, sample *Smidig utvikling og Scrum*, desktop 1280 px with keyboard only: Tab from the `h1` reaches 'Start runde' first with visible focus, then 'Kilde: P1'; the button is visible without scrolling.
- Same screen at 320 px: 'Studier' tab shows 'Start runde' and hint at the top, nothing clipped, no horizontal scroll.

Result: the start block moved; D-25, EXPERIENCE.md, two deferred-work entries (Stories 3.2, 3.5) and O1 updated. Full suite in Docker green after the review fixes: Vitest 610, pytest 173, Playwright 155.

## Review Triage Log

Blind Hunter, pass 1 (9 findings):
- BH1 low, patched: these notes said UJ-1 step 9 changed; step 9 lists what shows with no order, so the note was corrected instead.
- BH2 false: `status: in-progress` is the workflow state until this finalize step; D-25 `done` means "in the app; planning doc still to update" (status values in `deviations.md`); the manual checks are listed above for Tor.
- BH3 false: `epics.md` UX-DR19 is listed under D-25 "Docs to update", which Story 5.3 reconciles by design; Story 3.2 gets the order through the carry-forward entry in `deferred-work.md`.
- BH4 medium, patched: added a `deferred-work.md` entry for Story 3.5 (the banner takes the start block's place).
- BH5 medium, patched: `toBeInViewport` alone passes with the short fixture on the old order; `e2e/notat.spec.ts` now also asserts 'Start runde' sits above the 'Sammendrag' heading.
- BH6 low, rejected: mobile renders the same DOM, which the component test checks; the 320 px placement is a manual check.
- BH7 low, rejected: the `err.noConcepts` position is covered by the component test; the inline `err.generation` stays inside the start block by structure, unchanged by this move.
- BH8 low, patched: the component test now asserts the start block is the study panel's first child.
- BH9 false: mismatches with wireframes and mockups are tracked in `deviations.md` (D-25), not in EXPERIENCE.md › Known drift; DESIGN.md has no study-panel order rule for Start (only the Banner row, unchanged).
