# Stories 2.3–2.4 manual pass: keyboard, screen reader and 320 px

The `**Manual checks:**` of `spec-2-3-answer-quiz-questions.md` and `spec-2-4-resultat-with-score-and-sources.md`, in one pass (`.docs/standards/manual-checks.md`). Axe and Playwright cover the rest; they cannot judge keyboard use, screen reader output or the 320 px layout by themselves.

**Run by:** Tor · **Date:** 2026-11-26–27 · **Browser:** Edge · **Screen reader:** NVDA · **Build:** `main`, commit 431f23b

## Setup

1. `docker compose up -d --build`, then open <http://localhost:3000> in a fresh private window, so no Consent, Notes or Rounds are stored.
2. Press 'Nei takk, vis demo', then pick the Norwegian sample *Smidig utvikling og Scrum*. Demo Mode needs no key and nothing reaches the provider. You land on Notatoversikt.
3. **Keyboard runs:** do not use the mouse. Only Tab, Shift+Tab, Enter, Space, arrow keys and Esc.
4. **Screen reader:** NVDA, or Narrator (Ctrl+Win+Enter turns it on and off). Only rows marked *SR* need it.
5. **320 px runs:** DevTools › device toolbar (Ctrl+Shift+M), *Responsive* **320 × 640**, then reload. In the Console, `document.documentElement.scrollWidth > innerWidth` must be `false`.
6. **Get a mixed Quiz:** answer at least one question wrong and at least one right, so Resultat has both kinds of row.
7. **A fresh Round:** on Resultat press 'Tilbake til oversikten', then 'Start runde'.

Mark each row **P** (pass) or **F** (fail). Note every F under *Findings*.

## 1. Quiz (Story 2.3)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 1.1 | Mark every Flashcard with the keyboard; after the last mark | Focus on "Spørsmål 1 av y"; page title starts "Runde n, quiz · …"; progress line "Runde n · Spørsmål 1 av y" and the bar partly filled (1 / y) |P|P|
| 1.2 | Unanswered question: Tab from "Spørsmål x av y" | Desktop: 'Kilde: Pn' → A → B → C → D. 320 px: the tabs first. Visible focus on each; no Quote yet |P|P|
| 1.3 | *SR*: move into the question | The region is named "Spørsmål x av y" |P| — |
| 1.4 | Pick a **wrong** option (Enter or Space) | Focus stays on that option; ✗ on it, ✓ on the correct one; the other options are not greyed out; *SR* says "Feil. Rett svar er X." |P|P|
| 1.5 | Tab from the chosen option | The Quote's 'Kilde: Pn', then 'Neste spørsmål'; Enter → focus on "Spørsmål x+1 av y" |P|P|
| 1.6 | Pick a **right** option | ✓ on it; *SR* says "Riktig." |P|P|
| 1.7 | Before answering: Enter on 'Kilde: Pn', then Esc | 320 px: 'Kilde' tab opens. Pn highlighted; "Viser Pn fra spørsmål x"; Esc returns focus to the same 'Kilde: Pn' (320 px: 'Studier' active again) |P|P|
| 1.8 | After answering: Enter on the Quote's 'Kilde: Pn', Tab to 'Tilbake til spørsmålet', Enter | Focus back on that reference; the question is still answered (feedback still shown) |P|P|
| 1.9 | Reload mid-Quiz (after x answers) | "Spørsmål x+1 av y", unanswered |P|P|
| 1.10 | 320 px: a question with long options, before and after answering | Option texts wrap; no horizontal scroll; nothing clipped; each option at least 44 px high (DevTools › hover the button) | — |P|
| 1.11 | Answer the last question | The control reads 'Se resultatet' |P|P|

## 2. Resultat (Story 2.4)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 2.1 | Enter on 'Se resultatet' | Address ends in `/resultat`; focus on `h1` "Resultat"; page title "Resultat · …"; "n av m riktige" below; *SR* reads the score with the heading |P|P|
| 2.2 | Tab from the `h1` | 320 px: the tabs first. Then 'Tilbake til oversikten', then each row's 'Kilde: Pn' in order; visible focus on each |P|P|
| 2.3 | Look at the rows | One "Spørsmål x" per question; "Ditt svar: …" with ✓/✗; "Rett svar: …" only on misses; the score matches what you answered |P|P|
| 2.4 | *SR*: read a missed row | "Ditt svar: …" and "Rett svar: …" are read without the marks ✓/✗ |P| — |
| 2.5 | Enter on a row's 'Kilde: Pn', Tab to 'Tilbake til resultatet', Enter | 320 px: 'Kilde' tab opens. "Viser Pn fra resultatet"; focus back on the same 'Kilde: Pn' |P|P|
| 2.6 | Same jump again, then Esc | Focus back on the same 'Kilde: Pn' (320 px: 'Studier' active again) |P|P|
| 2.7 | 320 px: look at the whole page | No horizontal scroll; question, answers and Quotes wrap; nothing clipped | — |P|
| 2.8 | Reload Resultat | Same score and rows |P|P|
| 2.9 | Paste the Round address without `/resultat` | It is replaced by `.../resultat` |P|P|
| 2.10 | 'Tilbake til oversikten' | Notatoversikt; the chips match your marks and answers ('kan' / 'usikker'; concepts not in the Round 'ny') |P|P|
| 2.11 | From Notatoversikt, browser Back (Alt+←), then Back again | Resultat once, then where you were before; no loop that keeps you on Resultat |P|P|

## Findings

| # | Row | What happened | Severity | Action (fix in PR / GitHub issue) |
|---|---|---|---|---|
| N1 | 2.10 | Note, not a fail: first marked F because the row's wording was unclear; the chips followed the rules (latest signal wins: 'Kunne det'/right → 'kan', 'Kunne det ikke'/wrong → 'usikker', not in the Round → 'ny'). Changed to P by Tor. | — | None |

The Round-end recheck (N1 in `story-2-1-2-2-manual-pass.md`) belongs to Story 2.5, not this pass.

## Result

- [x] Every row has P or F
- [x] Every F is fixed or has an issue linked above (no F; note N1 only)
- Done 2026-11-27 → set `2-3-answer-quiz-questions` and `2-4-resultat-with-score-and-sources` to `done` in `sprint-status.yaml`; close the two items in `issues.md`
