---
title: 'Story 1.11: Notatoversikt with summary, Key Concepts and source panel'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'f8579ce84c4586da36ed01787831ed83caabbb65'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/notat/{noteHash}` is a placeholder that shows only the Note title. The student cannot see the summary, the Key Concepts or the source text.

**Approach:** Load the stored Note and Study Set into one `NoteSession` context. Render a study panel in `main` and a source panel in an `aside` after `main`. From 768 px the two panels sit side by side, with the source panel on the left. Below 768 px they become Radix Tabs. If no concept is covered, show `err.noConcepts` with 'Prøv igjen'. Refs: FR-6, FR-10–12 · AD-8, AD-11, AD-16 · NFR-6, NFR-7 · UX-DR3, UX-DR6–9, UX-DR12, UX-DR18, UX-DR19.

## Boundaries & Constraints

**Always:**
- Render only validated records: `readNote`, then `readStudySet(note.currentCacheKey)`. If either is missing or invalid, show the existing `note.missing` empty state.
- Every string is a Microcopy key. Generated content and Passage text carry `lang` from `StudySet.language`.
- Landmark order is header → main → aside. The aside is a sibling of `main`.
- Use `var(--token)` only. Nothing scrolls horizontally at 320 px or at 200 % zoom.
- Every Mastery chip is 'ny'.
- 'Start runde' (decided by Tor 2026-11-24): rendered at the end of the study panel with `aria-disabled` and the hint "Usikre begreper kommer først." until Story 2.1 wires it up. `err.noConcepts` replaces it.

**Never:**
- Build the reference jump, `<mark>`, the tab switch on activation or the return control (Story 1.12). "Kilde: Pn" is plain text.
- Build Readiness, the gap note or the interrupted-Round banner (Epic 3), or any Round logic (Epic 2).
- Change `proxy/`, `schema.d.ts` or the storage schema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desktop | stored records, ≥ 768 px | `h1` and top bar show the Note title; page title "{notat} · Torsas læringsassistent"; panels 1fr : 1.15fr, source on the left | N/A |
| Mobile | < 768 px | Tabs 'Studier' (default) and 'Kilde', manual activation; a Status strip with the Note name at the top of 'Studier' | N/A |
| Not covered | `covered: false` | "ingen verifiserte elementer" in `ink-muted` instead of a chip | N/A |
| None covered | injected set with every concept `covered: false` | `err.noConcepts` + 'Prøv igjen' in place of the start action | 'Prøv igjen' → Genererer from the stored Passages → overview reloads |
| Set missing | Note stored, Study Set missing or invalid | `note.missing` | no crash |
| `und` | `language: "und"` | `lang=""`, so the content is not announced as bokmål | axe stays clean |

</frozen-after-approval>

## Code Map

- `web/app/notat/[noteHash]/page.tsx` -- the placeholder. Keep `decodeParam` and the `note.missing` state.
- `web/storage/db.ts` -- `readNote`, `readStudySet`. Read only.
- `web/components/AppShell/AppShell.tsx` + `.module.css` -- `main` has `max-width: 40rem`. Add the `NoteSessionProvider`, an empty aside slot after `main` (the overview portals its `<aside>` there) and a split-layout class used only by the overview.
- New `web/components/NoteSession/NoteSession.tsx` -- context `{note, studySet} | null` plus a setter. The overview sets it on load and clears it on unmount.
- `web/components/TopBar/TopBar.tsx` -- reads the session and shows the Note name, in both variants.
- `web/components/Screen/Screen.tsx` -- `note={title}` already gives the page title and the `h1` focus.
- `web/components/Generating/Generating.tsx` -- reused for 'Prøv igjen'. Rebuild its `ExtractedNote` as `fileName` = `{title}.{sourceType}` with `encodingFallback: false`. It always calls `router.push` to the same route, which does not remount the page, so add an optional `onSaved` callback that replaces that push.
- `ErrorMessage`, `Button`, Radix Tabs (`radix-ui`, imported like `DropdownMenu` in TopBar) -- reuse.
- `web/styles/tokens.css` -- the quote, source-panel, mastery, panel-label and mono tokens already exist.
- `e2e/seed.ts` -- add a helper that writes a Note and a Study Set to IndexedDB `torsa` (`schemaVersion: 1`). `e2e/generate.spec.ts` -- its happy test must stay green.

## Tasks & Acceptance

**Execution:**
- [x] `web/i18n/messages.ts` -- add these keys:
  - `overview.summary` "Sammendrag"
  - `overview.concepts` "Nøkkelbegreper"
  - `overview.notCovered` "ingen verifiserte elementer"
  - `mastery.new` "ny"
  - `source.ref` "Kilde: {id}"
  - `source.label` "Kilde · {filnavn}"
  - `source.aria` "Kilde: {filnavn}"
  - `tabs.study` "Studier"
  - `tabs.source` "Kilde"
  - `overview.start` "Start runde"
  - `overview.start.hint` "Usikre begreper kommer først."
  - `err.noConcepts` "Fant ingen nøkkelbegreper med verifisert kilde, så runden kan ikke starte."
- [x] `NoteSession`, `AppShell`, `TopBar` -- add the session, the aside slot and the split grid. Place the source panel visually with grid placement, not DOM order. The source panel scrolls on its own.
- [x] `web/components/NoteOverview/` (new) -- the study panel:
  - `h2` Sammendrag. Each Summary Point has a Quote block (« », serif, `quote-bg`, a 3 px accent rule) and "Kilde: P{n}".
  - `h2` Nøkkelbegreper, sorted by `centralityRank`.

  The source panel:
  - a `panel-label`, then a `role="region"` scroll container with `tabindex="0"`
  - Passages with `tabindex="-1"`, an `id` and a mono `P{n}` label.
- [x] `page.tsx` -- load the records, set the session and choose the layout from `(min-width: 768px)`. Add the `err.noConcepts` path: 'Prøv igjen' renders Genererer in place, and when it is saved the page reloads its records.
- [x] `Generating.tsx` -- add the optional `onSaved`.
- [x] Vitest -- test the pure helpers: concept sort, the `fileName` rebuild and the `lang` mapping.
- [x] `e2e/notat.spec.ts` (new) -- seed records, then cover every row of the matrix:
  - DOM order and visual order (bounding boxes)
  - the region is one Tab stop
  - tabs and arrow keys at 390 px
  - `scrollWidth` at 320 px and at 200 % zoom
  - 'Prøv igjen' sends 1 POST
  - axe on desktop, on mobile and on `err.noConcepts`
- [x] `.docs/deviations.md` -- add D-13: the new keys, "Kilde: Pn" as plain text until 1.12, the 'Start runde' decision and `onSaved`.
- [x] `README.md` -- replace the placeholder sentence with a short description of Notatoversikt.

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` without a key, when run, then Vitest, pytest and Playwright pass. `npx tsc --noEmit` in `web/` passes.
- Given desktop, when the user tabs from the `h1`, then the study panel comes before the source region, and the source region is one Tab stop.
- Given the mobile tabs, when focus moves to 'Kilde' with the arrow keys and nothing is activated, then 'Studier' stays active and the inactive panel is hidden from assistive technology.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Source | Finding | Verdict | Route / evidence |
|---|--------|---------|---------|------------------|
| 1 | BH | `aside` and nested region share the name "Kilde: {filnavn}" | low | patch: region named by the panel label via `aria-labelledby` |
| 2 | BH | Send gate not run before 'Prøv igjen' on the overview | false | `requestStudySet` runs `checkSendGate` with fresh settings before every POST; Generating shows `consent.declined` / `err.noKey` as failure views |
| 3 | BH, EC | Regeneration rewrites `archived`, `importanceLevel`, `lastPractisedAt` with defaults; `conceptProgress` may go stale | low | rejected: nothing sets those fields or progress before Epic 2/4, and the all-uncovered state cannot come from `verifyStudySet` (≥ 5 Quiz Questions ⇒ ≥ 1 covered concept); only injected sets reach it |
| 4 | BH, EC | A failed regeneration offers only 'Tilbake til start', not a way back to the overview | low | rejected: the label is accurate and the path needs an injected set (see 3); a back-to-overview action adds a branch |
| 5 | BH | `e2e/seed.ts` duplicates the DB schema | low | rejected: identical to `db.ts`; a version bump in `db.ts` still upgrades over it |
| 6 | BH | "Kilde: Pn" inside `<blockquote>` reads as quoted text | low | patch: `<figure>` + `<figcaption>` |
| 7 | BH | « » added by CSS regardless of `lang` | low | rejected: DESIGN.md prescribes « » for every Quote block |
| 8 | BH | Note name shown three times on mobile | false | top bar and Status strip are in the frozen intent, the h1 is a story AC |
| 9 | BH | 'Start runde' uses `pending` for `aria-disabled` | false | `Button` `pending` only sets `aria-disabled` and ignores activation; no spinner or text change |
| 10 | BH, VG | No test for a viewport switch after load | low | patch: resize test 1280 → 390 → 1280 |
| 11 | BH, VG | No test that the session clears on leaving the overview | medium | patch: e2e via 'Innstillinger' asserts no title in the banner and no aside |
| 12 | VG | Top bar Note name untested below 768 px | low | patch: assertion in the 390 px test |
| 13 | BH | Stale "placeholder until Story 1.11" comment in `messages.ts` | low | patch |
| 14 | BH | D-13 `done` while the story is in progress | false | as D-1…D-12: `done` means recorded |
| 15 | BH, EC | `passageLabel` mishandles ids not matching `p{n}` | false | every Passage id comes from `core/passages.ts` as `p{n}` |
| 16 | BH | `contentLang` lacks tests for `nb-NO` / upper case | false | `checkLanguage` covers both in `core/language.test.ts` |
| 17 | EC | 'Prøv igjen' before `/api/status` answers gives `err.noKey` | low | rejected: needs an injected set (see 3) plus a click inside the startup fetch window |
| 18 | EC | Stale `note.missing` stays when `noteHash` changes | low | patch: reset to loading at the start of the load effect |
| 19 | EC | One frame without the split layout on first render | low | rejected: cosmetic; a fix adds a layout handshake |
| 20 | EC | Seed transaction hangs on abort | low | patch: `onabort` rejects |
| 21 | EC | The region is a Tab stop on mobile without its own scroll | low | rejected: UX-DR9 makes the region one Tab stop; the page scrolls instead |

## Design Notes

- The portalled `<aside>` keeps one React tree, so the context and the Tabs state flow through while the DOM keeps `main` before `aside`. On mobile the 'Kilde' `Tabs.Content` renders inside that aside.

## Verification

**Commands:**
- `cd web && npx vitest run && npx tsc --noEmit` -- green.
- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
