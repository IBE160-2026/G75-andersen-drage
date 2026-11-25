# Stories 2.1–2.2 manual pass: keyboard and 320 px

The `**Manual checks:**` of `spec-2-1-start-a-round-from-notatoversikt.md` and `spec-2-2-review-flashcards-and-mark-them.md`, in one pass (`.docs/standards/manual-checks.md`). Axe and Playwright cover the rest; they cannot judge keyboard use or the 320 px layout by themselves.

**Run by:** Tor · **Date:** 2026-11-25 · **Browser:** · **Build:** branch `feat/story-2-2-flashcards`, commit 4eac9bf

## Setup

1. `docker compose up -d --build`, then open <http://localhost:3000> in a fresh private window, so no Consent, Notes or Rounds are stored.
2. Press 'Nei takk, vis demo', then pick the Norwegian sample *Smidig utvikling og Scrum*. Demo Mode needs no key and nothing reaches the provider. You land on Notatoversikt.
3. **Keyboard runs:** do not use the mouse. Only Tab, Shift+Tab, Enter, Space, arrow keys and Esc.
4. **320 px runs:** open DevTools › device toolbar (Ctrl+Shift+M), set *Responsive* to **320 × 640**, then reload. In the Console, check for horizontal scroll with `document.documentElement.scrollWidth > innerWidth` (expected: `false`).
5. **A fresh Round:** go back to Notatoversikt (browser Back, or `/notat/…` without `/runde/…` in the address bar; the Round screen has no link back until Story 2.4) and press 'Start runde' again. The previous Round is abandoned.

Mark each row **P** (pass) or **F** (fail). Note every F under *Findings*.

## 1. Start a Round (Story 2.1)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 1.1 | Notatoversikt: Tab to 'Start runde', then Enter | Visible focus ring on the button; the Round screen opens with focus on the `h1` "Runde 1"; the page title starts "Runde 1 · …" | P | P |
| 1.2 | Look at the progress line | "Runde 1 · Kort 1 av y", a thin bar and the Mastery chip 'ny'; 320 px: it sits above the 'Studier' / 'Kilde' tabs | P | P |
| 1.3 | 320 px: Tab to the tabs, → then Enter, then ← and Enter | Panels switch with a visible focus ring; the progress line stays visible on both tabs; no horizontal scroll, nothing clipped | — | P |
| 1.4 | Reload the Round screen (before marking anything) | Same "Kort 1 av y", the same card front and the same chip | P | P |

## 2. Flashcard front and back (Story 2.2)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 2.1 | Look at the card front | Concept chip (the concept's name) on top, the question in serif, "Kilde: Pn" and 'Snu kortet'; no Quote | P | P |
| 2.2 | From "Kort 1 av y", Tab | Desktop: "Kilde: Pn", then 'Snu kortet'. 320 px: the tabs come first, then "Kilde: Pn", then 'Snu kortet'. Visible focus on each | P | P |
| 2.3 | Enter (or Space) on 'Snu kortet' | The answer, a dashed line and the Quote block (serif, « », "Kilde: Pn" below) appear; focus is on the answer (focus ring on it) | P | P |
| 2.4 | Tab from the answer | "Kilde: Pn" under the Quote, then 'Kunne det ikke', then 'Kunne det'; both marks at least 44 px high | P | P |
| 2.5 | Enter on 'Kunne det' | The next card shows its front, with focus on "Kort 2 av y". If it is the same concept, the chip now reads 'kan' | P | P |
| 2.6 | On a later card, reveal and press Space on 'Kunne det ikke' | Next card, focus on its heading; when that concept comes again, the chip reads 'usikker' | P | P |
| 2.7 | 320 px: look at the front and the back | Question, answer and Quote wrap; the marks wrap onto their own lines if needed; no horizontal scroll, nothing clipped or overlapping | — | P |

## 3. Reference jump from a card (Stories 1.12, 2.2)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 3.1 | On a front, Enter on "Kilde: Pn" | 320 px: 'Kilde' tab activates. Both: Pn is highlighted and focused; the return control says "Viser Pn fra kort x" with 'Tilbake til kortet' | P | P |
| 3.2 | Esc | Focus back on the same "Kilde: Pn" (320 px: 'Studier' active again); the card is still on its front | P | P |
| 3.3 | Reveal, then Enter on "Kilde: Pn" under the Quote, then Tab to 'Tilbake til kortet' and Enter | Focus back on that "Kilde: Pn"; the card is **still revealed** (the marks are there) | P | P |
| 3.4 | Mark the card | The next card has no return control and no highlight left from the previous card | P | P |

## 4. Reload and the end of the cards (Story 2.2)

| # | Do | Expected | Desktop | 320 px |
|---|---|---|---|---|
| 4.1 | After marking two cards, reload | Focus on the `h1`; "Kort 3 av y", front side; the chip shows that concept's stored state | P | P |
| 4.2 | Mark the last card | Focus on "Spørsmål 1 av z"; the first quiz question shows as plain text with "Kilde: Pn" (no options yet, Story 2.3) | P | P |
| 4.3 | Reload in the quiz part | Same "Spørsmål 1 av z" | P | P |
| 4.4 | 320 px: look at the quiz shell | No horizontal scroll, nothing clipped | — | P |

A Round with no Quiz Questions (it completes and goes back to Notatoversikt) cannot be reached with the samples; Playwright covers it (`e2e/round.spec.ts`).

## Findings

| # | Row | What happened | Severity | Action (fix in PR / GitHub issue) |
|---|---|---|---|---|
| N1 | 4.2 | Note, not a fail: after the last card the Round stops at the Quiz shell with no way on; Tor had to open the Note again to practise the concepts marked 'Kunne det ikke'. Expected until Quiz (2.3), Resultat with 'Tilbake til oversikten' (2.4) and the next Round from Resultat (2.5). | — | None now; recheck the end of a Round in the 2.3–2.5 manual passes |

## Result

- [x] Every row has P or F
- [x] Every F is fixed or has an issue linked above (no F; note N1 only)
- Done 2026-11-25 → set `2-1-start-a-round-from-notatoversikt` and `2-2-review-flashcards-and-mark-them` to `done` in `sprint-status.yaml`; close VG3 in `deferred-work.md` and `issues.md`
