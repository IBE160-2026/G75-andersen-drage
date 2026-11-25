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

## 2026-11-25 kl. 00:01 — lysebo

### Oppgave
Pushe grenen og opprette PR for fiksen.

### Plan
- `git push -u origin fix/gate-waits-for-status`, deretter PR mot `main`.

### Resultat
- Første push fikk `Internal Server Error` fra GitHub. Andre forsøk gikk gjennom.
- `gh` finnes ikke på maskinen (verken i Bash, PowerShell eller vanlige installasjonsmapper), så PR-en ble opprettet med GitHub-integrasjonen: PR #16, https://github.com/IBE160-2026/G75-andersen-drage/pull/16.

### Åpne punkter
- PR #16: grønn CI og merge. Sett deretter `epic-1-retro-item-4` til `done` i `sprint-status.yaml` (se issues.md).

## 2026-11-25 kl. 00:07 — lysebo

### Oppgave
Sjekke PR #16, og sette tiltak 4 til `done` når den er merget.

### Plan
- Sjekke PR-status og CI (check runs) via GitHub-API-et.
- Kjøre `sprint_status.py update --set-action-status` for `epic-1-retro-item-4`.

### Resultat
- PR #16 er merget: merge-commit `9a2d9c9`, 2026-11-24 23:05 UTC. CI-jobben `test` var grønn på PR-grenen (`37c3531` og `93f1d86`) før merge. CI på merge-commiten kjørte fortsatt da dette ble skrevet.
- Lokal `main` er oppdatert til `9a2d9c9`, og den lokale grenen `fix/gate-waits-for-status` er slettet.
- `sprint-status.yaml`: `epic-1-retro-item-4-fix-err-nokey-shown-before-api-status-an` er satt fra `open` til `done` (commit `71cd27b`), bekreftet av Tor.
- Lukket issues-punktet om PR #16.
- Ikke pushet.

### Åpne punkter
Ingen nye. CI på `main` for `9a2d9c9` er ikke sjekket ferdig.
