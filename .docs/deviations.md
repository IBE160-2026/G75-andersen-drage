# Deviations

Planned and actual departures from the planning documents (PRD, EXPERIENCE.md, DESIGN.md, architecture spine, `epics.md`). Required by DR-4 (deviations recorded) and DR-9 (dropped or changed features listed with reason before delivery). Story 5.3 uses this list to update the planning documents to match the delivered app.

**Status values:** `planned` (decided, not yet built or cut) · `done` (in the app; planning doc still to update) · `reconciled` (planning doc updated).

| # | Date | Area | Deviation | Reason | Source | Docs to update | Status |
|---|------|------|-----------|--------|--------|----------------|--------|
| D-1 | 2026-11-21 | Keyboard shortcuts (UX-DR16) | Moved from the core UX contract to Should: built as Story 4.1 behind the `shortcuts` flag (default `false` until built). If 4.1 is cut, the 'Hurtigtaster' toggle and the keyboard hints are not shown. | Time budget for a solo delivery; buttons cover every action, so WCAG 2.1.1 holds without shortcuts. | `epics.md` Epic 4, Story 4.1; log 2026-11-21 epics-og-stories | EXPERIENCE.md (Innstillinger › Studier, Keyboard hint, Shortcuts) | planned |
| D-2 | 2026-11-21 | Microcopy | New key `panic.start`: "Eksamen om en time: de {n} viktigste begrepene." Not in the EXPERIENCE.md Microcopy table. | Panic Mode (Epic 4) needs a start line; the UX contract has none. | `epics.md` Panic Mode story | EXPERIENCE.md Microcopy | planned |
| D-3 | 2026-11-22 | Microcopy | New keys `app.brand`, `nav.notes`, `nav.settings`, `nav.label` (accessible name of the top-bar nav: "Hovedmeny"), `title.notes`, `title.settings`, `settings.h1` for the app shell; `start.empty` split into `start.empty` (h1) and `start.empty.next` (second line). Not in the EXPERIENCE.md Microcopy table. | The shell needs brand, navigation, page-title and heading strings; the table lists none. | `spec-1-2-norwegian-app-shell.md` (Decisions) | EXPERIENCE.md Microcopy | planned |

## Should-feature cuts

Cut-off date 2026-12-06. Each Should flag in `web/features.ts` that is still `false` at delivery gets a row here with its reason.
