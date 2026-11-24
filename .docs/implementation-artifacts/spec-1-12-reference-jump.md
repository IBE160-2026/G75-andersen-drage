---
title: 'Story 1.12: Jump from a source reference to the highlighted Quote'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: '6409b2963a30830e56946d88be6dd3dea736dd81'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** "Kilde: Pn" on Notatoversikt is plain text. The student cannot see the cited sentence in their own Note or get back to where they were.

**Approach:** Make each source reference a button that runs a reusable reference jump: scroll the source panel to the Passage, mark it active, wrap the Quote in one `<mark>`, focus the Passage and show a sticky return control. Esc in the source panel or the control returns focus to the exact reference. On mobile the jump switches to 'Kilde' first and the return switches back to 'Studier'. The jump takes its return context as a parameter, so Epic 2 reuses it. Refs: FR-12 · AD-8 · NFR-6 · UX-DR8, UX-DR10, UX-DR11.

## Boundaries & Constraints

**Always:**
- Every string is a Microcopy key. Approved texts from EXPERIENCE.md: `quote.start` "Sitat start", `quote.end` "Sitat slutt", `return.hint` "Trykk Esc for å gå tilbake.". `return.label` "Viser {id} fra {kilde}".
- Return context on Notatoversikt (decided by Tor 2026-11-24): `return.from.summary` "sammendraget" and `return.summary` 'Tilbake til sammendraget'. Both are new keys and get recorded in D-14.
- Exactly one `<mark>` in the document at a time. The Passage ID stays outside the `<mark>`.
- The active Passage has no tint, a 3 px `accent` left rule and `aria-describedby` pointing at `return.hint`.
- Scrolling is instant under `prefers-reduced-motion: reduce`, smooth otherwise.
- The return control persists until the next jump or until the overview unmounts. No timer. It stays after a return.
- Forced colors: the `<mark>` uses `Mark` / `MarkText` with a 2 px `CanvasText` outline.
- `var(--token)` only. Nothing scrolls horizontally at 320 px.

**Never:**
- Build Flashcard, Quiz or Resultat screens or their return labels (Epic 2).
- Change `proxy/`, `schema.d.ts`, the storage schema or `verifyStudySet`.
- Search for the Quote fuzzily. The stored Quote is already normalized and an exact substring of its Passage.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Jump, desktop | click or Enter on "Kilde: P4" | region scrolls to P4, one `<mark>` around the Quote, focus on P4, return control at the top of the region | N/A |
| Return | Esc in the source panel, or the control | focus on the activated reference; highlight and control stay | Esc outside the source panel does nothing |
| Second jump | another reference | the old `<mark>` and active rule are gone; one new highlight | N/A |
| Mobile | < 768 px | 'Kilde' tab activates, then the jump runs; return activates 'Studier' and focuses the same reference | N/A |
| Quote not found | stored Quote not in the Passage text | Passage active and focused, no `<mark>` | no crash |

</frozen-after-approval>

## Code Map

- `web/components/NoteOverview/NoteOverview.tsx` -- `SourceRef` (plain `<p>`), `SourcePanel` (Passages `li#passage-pN tabIndex=-1`), `passageElementId`. The mobile Tabs state `tab` lives here. On mobile the 'Kilde' `Tabs.Content` is in the portalled `<aside>`. Radix unmounts inactive Tabs content, so the reference must be found again by DOM id after a return, not by element ref.
- `web/components/NoteOverview/NoteOverview.module.css` -- `.ref`, `.region` (the scroll container from 768 px; below 768 px the page scrolls), `.passage`.
- `web/core/overview.ts` -- pure helpers. Add the Quote split here.
- `web/styles/global.css` -- `.visually-hidden` already exists. `tokens.css` -- `highlight`, `highlight-ring`, `accent`, `accent-strong`, `surface`, `line-strong` and `reference` tokens already exist.
- `web/i18n/messages.ts` -- add the keys.
- `e2e/notat.spec.ts` + `e2e/seed.ts` -- seeded records. Check that the seeded Quotes are substrings of their Passages.
- `.docs/deviations.md` (next is D-14), `README.md` (the Notatoversikt paragraph at line 67).

## Tasks & Acceptance

**Execution:**
- [x] `web/core/overview.ts` -- `splitQuote(text, quote)` returns `{before, quote, after}` or null (empty quote or no match, first occurrence). Add Vitest cases.
- [x] `web/i18n/messages.ts` -- `quote.start`, `quote.end`, `return.hint`, `return.label`, `return.from.summary`, `return.summary`.
- [x] `web/components/ReferenceJump/` (new) -- `ReferenceJumpProvider` with `onShowSource` / `onShowStudy` callbacks (no-ops on desktop). `SourceRef` is a link-styled `<button>` with a stable `id`. Its props are `passageId`, `quote` and `returnContext: {from, action}`. `useActiveJump()` drives the Passage highlight. `ReturnControl` is sticky at the top of the source panel. `useSourceEscape` returns on Esc. Focus and scroll run in effects after commit, keyed by a jump sequence number.
- [x] `NoteOverview.tsx` + `.module.css` -- wrap both panels in the provider, use `SourceRef` for Summary Points and render `ReturnControl` plus the highlighted Passage. On mobile the callbacks call `setTab`.
- [x] `e2e/notat.spec.ts` -- cover every matrix row except "Quote not found", which Vitest covers. Also cover Enter activation, `aria-describedby`, reduced motion (the Passage is in view right after the click), forced colors (`emulateMedia({forcedColors: "active"})` plus the computed outline) and axe after a jump on desktop and mobile.
- [x] `.docs/deviations.md` -- D-14: the new keys, the overview return label and the button element.
- [x] `README.md` -- describe the reference jump in the Notatoversikt paragraph.

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` without a key, when run, then Vitest, pytest and Playwright pass, and `npx tsc --noEmit` in `web/` passes.
- Given a jump, when a screen reader reads the Passage, then it hears "Sitat start", the Quote, "Sitat slutt" and the `return.hint` description.

## Implementation Notes

- Radix Presence mounts the other Tabs content one render after the tab switch, so the focus effect retries on up to 10 animation frames until the target exists and holds focus.
- `passageElementId` moved from `NoteOverview` to `ReferenceJump`.
- The return control renders between the panel label and the scroll region. On desktop it is therefore outside the scroll container and always visible. On mobile the page scrolls and the control is `position: sticky`.
- The visually hidden `quote.start` / `quote.end` spans carry `lang="nb"` and padding spaces, so they are not read run together with the Note text.
- The 1.11 Tab-order test now steps through the five "Kilde: Pn" buttons before 'Start runde'.

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Source | Finding | Verdict | Route / evidence |
|---|--------|---------|---------|------------------|
| 1 | VG, BH | No render test for `HighlightedText`: text before/after the Quote and the not-found fallback are unchecked (e2e Quotes always start at offset 0) | medium | patch: `ReferenceJump.test.tsx` checks the full order and the plain-text fallback |
| 2 | EC, BH | Crossing 768 px remounts `ReferenceJumpProvider` (different tree position per width), so the highlight and return control are lost | low | patch: one provider at the same position for both widths; e2e resize test |
| 3 | BH | Activating a Passage adds padding and a 3 px rule, so the text moves | low | patch: inactive Passages get the same box, with the rule's width as padding; e2e asserts the text box does not move |
| 4 | EC, BH | Focus retry gives up silently after 10 frames | low | rejected: the target Passage always exists (the Quote Check verified it) and the ref is on screen; only a hypothetical missing target reaches it |
| 5 | EC | `passageId` with no Passage shows "Viser Pn" without a highlight | false | `verifyStudySet` drops every Item whose cited Passage does not exist in the same Note |
| 6 | EC | Spec names `useActiveJump()`, code exports `useActivePassage()` | low | rejected: the fix edits this build's spec; the name is recorded in Implementation Notes |
| 7 | BH | Spec file missing from the diff | false | excluded on purpose: the spec is the claims file, read only by the edge-case layer |
| 8 | BH | D-14 `done` while the story is in progress | false | as in D-1…D-13, `done` means recorded |
| 9 | BH | Esc in the source panel keeps returning to the last reference after a return | low | rejected: by design; the return control stays until the next jump, and Esc mirrors it |
| 10 | BH | Effect reads `jump` without listing it in deps | false | `setJump` and `setRequest` run in one event handler and React 19 batches them into one commit; no linter is configured |
| 11 | BH | No unit tests of the provider state machine | low | rejected beyond #1: e2e covers jump, return, Esc, second jump, mobile and resize |
| 12 | BH | Fixed ids `return-hint` / `ref-sp{n}` could collide when Epic 2 reuses the component | low | rejected: one provider per screen and caller-supplied ref ids; no current collision |
| 13 | BH | The return control has no live region; touch screen-reader users have no Esc | low | rejected: the control precedes the region in reading order; `return.hint` is approved Microcopy |
| 14 | BH | README omits Space; long header comment in `notat.spec.ts` | low | rejected: cosmetic |

## Design Notes

- The provider sits inside `NoteOverview`. The `<aside>` is a portal in the same React tree, so the context reaches both panels.
- A Round screen later renders `<SourceRef returnContext={{from: "kort 3", action: t("return.card")}} …/>` inside the same provider. Nothing in the component is specific to the overview.

## Verification

**Commands:**
- `cd web && npx vitest run && npx tsc --noEmit` -- green.
- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
