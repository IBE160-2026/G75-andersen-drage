# Epic 1 manual pass: keyboard and 320 px

Epic 1 retro action 2 (finding A8). Run this pass once, by hand, before Epic 2. It covers the Story 1.9–1.14 screens: axe and Playwright cannot judge these by themselves. Story 5.2 later writes the full UJ-1 checklist (`.docs/qa/keyboard-checklist.md`, with Firefox, 200 % zoom, forced colors and NVDA). This pass is narrower and does not replace it.

**Run by:** Tor · **Date:** 2026-11-25 · **Browser:** Chromium 158.0.8127.37 · **Build:** commit 897a121

## Setup

1. `docker compose up --build`, then open <http://localhost:3000> in a fresh profile or a private window, so no Consent or Notes are stored.
2. **Keyboard runs:** do not use the mouse. Only Tab, Shift+Tab, Enter, Space, arrow keys and Esc.
3. **320 px runs:** open DevTools › device toolbar (Ctrl+Shift+M), set *Responsive* to **320 × 640**, then reload. In the Console, check for horizontal scroll with `document.documentElement.scrollWidth > innerWidth` (expected: `false`).
4. **Failure views:** you get `err.generation` by setting DevTools › Network to *Offline* before you start a generation. `err.noKey` and `err.tooFewItems` need a Proxy change or a bad Study Set, so Playwright covers them (`e2e/generate.spec.ts`) and they are not part of this pass.

Mark each row **P** (pass) or **F** (fail). Note every F under *Findings*.

## 1. Genererer (Story 1.9)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 1.1 | Start a generation: decline Consent, then pick a sample in Demovelger | Focus on the `h1` "Lager kort og quiz"; page title starts with it |P|P|
| 1.2 | Wait | Status text goes "Finner nøkkelbegreper …" → "Lager kort …" (15 s) → "Sjekker kildene …"; the progress bar fills without animation |P|P|
| 1.3 | Look at the layout | Progress bar and text fit; no horizontal scroll  |P|P|

## 2. Failure view (Story 1.10)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 2.1 | Go offline, then start a generation | "Feil: Det gikk ikke å lage kort og quiz nå." is shown and focused (not `body`) |P|P|
| 2.2 | Tab | 'Prøv igjen' first, then 'Tilbake til start' |P|P|
| 2.3 | Go back online, then Enter on 'Prøv igjen' | Focus moves to the `h1`, and the generation runs again |P|P|
| 2.4 | Fail again, then Enter on 'Tilbake til start' | Start content is back; focus does not fall to `body` |P|P|
| 2.5 | Reload in the middle of a generation | No broken half-state; you can start again |P|P|
| 2.6 | Look at the layout | Message and buttons wrap; buttons are at least 44 px high |P|P|

## 3. Notatoversikt (Story 1.11)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 3.1 | Arrive after a generation | Focus on the `h1` (Note name) |P|P|
| 3.2 | Desktop: Tab from the `h1` | Summary and its "Kilde: Pn" buttons, then 'Start runde' (`aria-disabled`, hint visible), then the source region as **one** Tab stop |P| — |
| 3.3 | Desktop: in the source region, use arrow keys or Page Down | The region scrolls |P| — |
| 3.4 | 320 px: Tab to the tabs, then press → | Focus moves to 'Kilde', but 'Studier' stays active until Enter/Space | — |P|
| 3.5 | 320 px: Enter on 'Kilde', then ← and Enter | Panels switch; the hidden panel is not reachable with Tab | — |P|
| 3.6 | 320 px: look at the layout | Status strip with the Note name; long concept names and Passages wrap; no horizontal scroll | — |P|

## 4. Reference jump (Story 1.12)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 4.1 | Enter on a "Kilde: Pn" under a Summary Point | 320 px: 'Kilde' tab activates. Both: region scrolls to Pn, the Quote is highlighted, focus is on Pn, and the return control "Viser Pn fra sammendraget" is shown |P|P|
| 4.2 | Esc | Focus back on the same "Kilde: Pn" (320 px: 'Studier' active again); highlight and control stay |P|P|
| 4.3 | Jump again, then Tab to 'Tilbake til sammendraget' and Enter | Same result as 4.2 |P|P|
| 4.4 | Esc with focus outside the source panel | Nothing happens |P|P|
| 4.5 | 320 px: after a jump, scroll down the 'Kilde' panel | Return control stays at the top (sticky) and does not cover the highlighted text | — |P|
| 4.6 | Focus ring | Visible on every "Kilde: Pn" button, the Passage and the return control |P|P|

## 5. Demovelger and Innstillinger › Studier (Story 1.14)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 5.1 | Fresh profile: Tab to 'Nei takk, vis demo', then Enter | Demovelger opens with focus on the `h1` "Velg et eksempelnotat" |P|P|
| 5.2 | Tab through the samples | Three samples, each with a language under its title; Enter starts Genererer |P|P|
| 5.3 | Look at the top bar | "Demomodus" indicator is visible at every width (not inside 'Mer') and is a link |P|P|
| 5.4 | Enter on the indicator | Innstillinger opens |P|P|
| 5.5 | Tab to the 'Demomodus' switch, then Space | State text 'På' ↔ 'Av' changes; the indicator disappears when off |P|P|
| 5.6 | 320 px: 'Mer' menu, then arrow keys and Esc | Arrow keys move between 'Innstillinger' and the theme toggle; Esc closes it and returns focus to 'Mer' | — |P|
| 5.7 | 320 px: look at Innstillinger | Label stacked above control; description wraps; no horizontal scroll | — |P|

## Findings

| # | Row | What happened | Severity | Action (fix in PR / GitHub issue) |
|---|---|---|---|---|
| — | — | None: every row passed | — | — |

## Result

- [X] Every row has P or F
- [X] Every F is fixed or has an issue linked above
- Done 2026-11-25 → set `epic-1-retro-item-2` to `done` in `sprint-status.yaml`
