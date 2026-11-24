# Fjern kravet om branch protection

## 2026-11-24 kl. 14:36 — lysebo

### Oppgave
Faglærer har svart at regelen om branch protection kan fjernes. Spørsmålet ble sendt på mail 2026-11-22, fordi kontoen ikke har admin. Prosjektet skal ryddes slik at kravet ikke lenger står som noe som gjenstår.

### Plan
- README: seksjonen «CI og branch-beskyttelse» skrives om til «CI». Merge bare ved grønn CI blir en arbeidsregel som GitHub ikke håndhever.
- `.docs/deviations.md`: ny D-10. «A failing run blocks merge» i DR-2 er fjernet, og kriteriet i Story 1.1 gjelder ikke lenger.
- Lukk punktet om branch protection fra story 1.1 i `issues.md`.

### Resultat
- README, `deviations.md` (D-10) og `issues.md` er oppdatert.
- Planleggingsdokumentene (PRD DR-2 og CI-kriteriet for Story 1.1 i `epics.md`) er ikke endret. De rettes i Story 5.3 ut fra D-10.

### Åpne punkter
Ingen.
