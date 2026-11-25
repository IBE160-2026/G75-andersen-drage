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
- Commit `c86476e` på branchen `docs/retro-item-10-drop-hours` (ikke pushet). Ingen kode er endret, så ingen tester er kjørt.
- `sprint-status.yaml` er ikke oppdatert. Item 10 settes til `done` etter merge, som for de forrige tiltakene.

### Åpne punkter
Ingen.
