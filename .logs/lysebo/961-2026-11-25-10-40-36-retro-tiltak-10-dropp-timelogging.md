# Retro-tiltak 10: dropp timelogging mot milepælsbudsjettet

## 2026-11-25 kl. 10:40 — lysebo

### Oppgave
Gjennomføre retro-tiltak 10 fra Epic 1-retroen (funn P2): avgjøre om timer skal logges mot milepælsbudsjettet, eller om den delen av re-plan-regelen skal droppes.

### Plan
- La Tor velge mellom tre muligheter: droppe timene og beholde datoene, logge timer fra nå av, eller anslå timene for Epic 1 og logge videre.
- Tor valgte å droppe timene og beholde datoene. Endringen er gjort i `epics.md`, ført som avvik og lukket i retroen og `issues.md`.

### Resultat
- `epics.md` › Milestones and re-plan rule: regelen sammenligner nå ferdige stories med milepælsdatoene. Budsjett-tabellen står igjen som estimatet fra pre-mortem, ikke som noe å føre timer mot.
- `.docs/deviations.md`: ny D-17 (`reconciled`, siden `epics.md` er oppdatert i samme endring).
- `epic-1-retro-2026-11-24.md`: åpent spørsmål 2 er besvart.
- `issues.md`: punktet fra 2026-11-22 («… logg timer brukt mot budsjett») er lukket.
- Commit `c86476e` på branchen `docs/retro-item-10-drop-hours` (pushet kl. 10:42, PR #22 mot `main`: https://github.com/IBE160-2026/G75-andersen-drage/pull/22). Ingen kode er endret, så ingen tester er kjørt.
- `sprint-status.yaml` er ikke oppdatert. Item 10 settes til `done` etter merge, som for de forrige tiltakene.

### Åpne punkter
Ingen.

## 2026-11-25 kl. 10:47 — lysebo

### Oppgave
Markere tiltaket som ferdig etter at PR #22 er merget.

### Plan
- Sjekk at PR-en er merget, og sett item 10 til `done` i `sprint-status.yaml` på main.

### Resultat
- PR #22 ble merget 2026-11-25 (merge-commit `225ccff`). Ved første forespørsel sto den fortsatt som åpen, så sprint-status ble ikke endret før mergen var bekreftet.
- `epic-1-retro-item-10` er satt til `done` i `sprint-status.yaml` (commit `fe90d1a` på main). Punktet i `issues.md` ble lukket allerede i PR-en.

### Åpne punkter
Ingen.
