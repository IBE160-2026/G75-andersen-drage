# Fiks: gaten venter på /api/status

## 2026-11-24 kl. 23:57 — lysebo

### Oppgave
Tiltak 4 fra Epic 1-retroen (funn R5, `epic-1-retro-item-4`). En fil som slippes før `/api/status` har svart, fikk «Ingen API-nøkkel» selv om nøkkelen var satt, og feilen ble stående. «Prøv igjen» på Notatoversikt rett etter en omlasting hadde samme kappløp.

### Plan
- `bmad-build`, oneshot-rute: [spec-fix-gate-waits-for-status.md](../../.docs/implementation-artifacts/spec-fix-gate-waits-for-status.md).
- Gren `fix/gate-waits-for-status` fra `main` (etter push av retro-commitene, `0bd682b..b7881e0`).

### Resultat
- Commit `d8b41cf` på `fix/gate-waits-for-status`:
  - `AppSettingsProvider` gir `waitForStatus()`, den avklarte statusen.
  - Start og Genererer venter på den før gaten, men bare når `gateNeedsStatus()` sier det trengs (live-forespørsel med samtykke). Demomodus og manglende samtykke venter ikke.
  - Start viser notat-metaen før ventingen.
  - Hvert statusforsøk har nå en grense på 5 s.
  - README › Lag kort og quiz beskriver ventingen.
- Tester:
  - Vitest +8: `gateNeedsStatus` og tidsgrense i `fetchStatus`.
  - Playwright +3: status holdes ved slipp (med nøkkel og uten nøkkel), og «Prøv igjen» før status.
  - Full kjøring: Vitest 434, pytest 171, Playwright 123, exit 0.
  - De tre nye e2e-testene feiler mot den gamle `page.tsx`/`Generating.tsx` (3 failed), så de fanger feilen.
- Blind Hunter-review fant 9 punkter:
  - Rettet: hengende status uten tidsgrense (medium), plassering av JSDoc, to utdaterte kommentarer og en regex-escape. Escapen ble spist av verktøylaget, akkurat som retro-pitfall P1, og er sjekket med `od -c`.
  - Avvist: 2 som ikke stemte (`false`) og 3 kosmetiske.
  - Utsatt: testhullene, ført i `deferred-work.md`.
- Lukket issues-punktet om err.noKey-kappløpet.
- Ikke pushet, ingen PR.

### Åpne punkter
- PR for `fix/gate-waits-for-status` (commit `d8b41cf`): push, grønn CI og merge. Sett deretter `epic-1-retro-item-4` til `done` i `sprint-status.yaml` (`sprint_status.py update --set-action-status`).
- Utsatt: flere tester for ventingen (enhetstest for `waitForStatus`, e2e der status aldri svarer, at demomodus ikke venter, andre slipp under ventingen); se `deferred-work.md`.
