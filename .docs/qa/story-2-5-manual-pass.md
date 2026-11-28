# Story 2.5 manual pass: next Round from Resultat, keyboard and 320 px

The `**Manual checks:**` of `spec-2-5-next-round-targets-weak-spots.md` (`.docs/standards/manual-checks.md`), including the Round-end recheck N1 carried from `story-2-1-2-2-manual-pass.md`. Axe and Playwright cover the rest; they cannot judge keyboard use or the 320 px layout by themselves.

**Run by:** Tor · **Date:** 2026-11-28 · **Browser:** Edge · **Build:** `main`, commit d9d79c1

## Setup

1. `docker compose up -d --build`, then open <http://localhost:3000> in a fresh private window, so no Consent, Notes or Rounds are stored.
2. Press 'Nei takk, vis demo', then pick the Norwegian sample *Smidig utvikling og Scrum*. You land on Notatoversikt.
3. **Keyboard runs:** do not use the mouse. Only Tab, Shift+Tab, Enter, Space and Esc.
4. **320 px runs:** DevTools › device toolbar (Ctrl+Shift+M), *Responsive* **320 × 640**, then reload. In the Console, `document.documentElement.scrollWidth > innerWidth` must be `false`.
5. **Round 1:** 'Start runde'. Mark the **first** card 'Kunne det ikke' and the rest 'Kunne det'; answer the **first** question wrong and the rest right. Note the first card's concept (its chip, then 'usikker').

Mark each row **P** (pass) or **F** (fail). Note every F under *Findings*.

## 1. Resultat → 'Ny runde'

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 1.1 | On Resultat, Tab from the `h1` "Resultat" | 320 px: the tabs first. Then 'Tilbake til oversikten' → 'Ny runde' → the first row's 'Kilde: Pn'; visible focus on each |P|P|
| 1.2 | Look at the actions row | 'Tilbake til oversikten' is the filled (primary) button, 'Ny runde' the outlined (secondary) one right after it. 320 px: the buttons wrap onto two lines if needed, nothing clipped, each at least 44 px high (DevTools › hover the button) |P|P|
| 1.3 | 320 px, on Resultat | No horizontal scroll (Console check from Setup 4) | — |P|
| 1.4 | Enter on 'Ny runde' | Focus on `h1` "Runde 2"; page title starts "Runde 2 · …"; the first card is from a concept you got wrong in Round 1, and its chip reads 'usikker' |P|P|

## 2. End of a Round (N1, carried from Stories 2.1–2.2)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 2.1 | Finish Round 2 (all cards and questions) | 'Se resultatet' → Resultat for Round 2; never stuck on a screen without a way on |P|P|
| 2.2 | 'Tilbake til oversikten', then 'Start runde' | Focus on `h1` "Runde 3"; the chips on Notatoversikt matched your Round 2 answers before you pressed it |P|P|

## 3. Reopened tab

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 3.1 | Note the chips on Notatoversikt; open a new tab in the same private window (Ctrl+T) **first**, then close the old tab and paste Notatoversikt's address (copied beforehand, `/notat/demo:…`) into the new one. Closing the last private tab would wipe the stored data; picking the sample again in Demovelger would regenerate it, so use the address | The same chips as before |P| — |

## Findings

| # | Row | What happened | Severity | Action (fix in PR / GitHub issue) |
|---|---|---|---|---|
| O1 | Setup 5 | Observation, not an F: on a normal desktop screen 'Start runde' sits below the fold on Notatoversikt (sample *Smidig utvikling og Scrum*), so you scroll to reach it. As built per the IA wireframe (Readiness → Sammendrag → Nøkkelbegreper → 'Start runde'); the key-overview mockup hints at a place under the Readiness Score | Low (UX) | Tor 2026-11-28: option B, move 'Start runde' + hint up under the Readiness Score, own PR after this pass (new deviation D-25) |

## Result

- [x] Every row has P or F
- [x] Every F is fixed or has an issue linked above (no F; O1 is an observation, follow-up PR)
- Done 2026-11-28 → set `2-5-the-next-round-targets-my-weak-spots` to `done` in `sprint-status.yaml`; close N1 in `story-2-1-2-2-manual-pass.md` and the two items in `issues.md`
