# Retro-tiltak 2: manuell tastatur- og 320 px-runde

## 2026-11-25 kl. 08:19 — lysebo

### Oppgave
Epic 1-retro-tiltak 2 (funn A8): fullfør og logg en manuell runde med tastatur og 320 px over Genererer, feilvisningen, Notatoversikt, kildehoppet og Demovelger/Innstillinger › Studier før Epic 2.

### Plan
- Runden må Tor kjøre selv. Claude lager sjekklista med forventet fokus og taster per steg, hentet fra spec 1.9–1.12 og 1.14.
- Sjekklista er smalere enn den fulle UJ-1-lista i story 5.2 (`.docs/qa/keyboard-checklist.md`) og erstatter den ikke.

### Resultat
- **Ny fil:** `.docs/qa/epic-1-manual-pass.md` med oppsett (Docker, ren profil, DevTools 320 × 640, sjekk for horisontal scroll, offline for å utløse `err.generation`).
- **Innhold:** 28 rader i fem seksjoner, med P/F-kolonner for desktop og 320 px, en funntabell og en sluttsjekk.
- `err.noKey` og `err.tooFewItems` er utelatt fra runden, fordi `e2e/generate.spec.ts` dekker dem.
- **Git:** commit eb75945 på `docs/retro-item-2-manual-pass`, ikke pushet. Ingen PR ennå: den kommer når resultatene er fylt inn.

### Åpne punkter
- Kjør runden i `.docs/qa/epic-1-manual-pass.md`, fyll inn P/F og funn, og sett deretter `epic-1-retro-item-2` til `done`.
