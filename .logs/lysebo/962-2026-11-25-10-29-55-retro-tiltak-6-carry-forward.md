# Retro-tiltak 6: før utsatte punkter inn i storyens spec

## 2026-11-25 kl. 10:29 — lysebo

### Oppgave
Gjennomføre retro-tiltak 6 fra Epic 1-retroen (funn A6): når en story-spec skrives, skal alle punkter i `deferred-work.md` / `issues.md` som nevner storyen hentes inn; de tre åpne 1.13-sjekkene skal føres inn i Story 5.1 ved navn.

### Plan
- Samme mønster som tiltak 3: regel i `.docs/standards/`, lastet som `persistent_facts` i bmad-spec, bmad-build og bmad-build-auto.
- Skrive de tre sjekkene som AC i Story 5.1 i `epics.md`.
- Endre målet fra 1.13 til 5.1 i kildene, slik at søket finner dem.

### Resultat
- Ny `.docs/standards/carry-forward.md`: søk i `deferred-work.md`, åpne punkter i `issues.md` og åpne `action_items` i `sprint-status.yaml` (etter storynummer, epic, FR/AD). Hvert treff tas inn i en AC eller task, utsettes på nytt (med ny mål-story i kilden) eller droppes med begrunnelse, og føres under `## Carried items`. Gates: specen kan ikke forlate `draft` uten seksjonen; ved `done` lukkes punktene i kilden.
- `_bmad/custom/bmad-{spec,build,build-auto}.toml`: `persistent_facts` laster nå både `manual-checks.md` og `carry-forward.md`.
- `epics.md` › Story 5.1: ny AC med (1) output-tokens og tid mot `MAX_OUTPUT_TOKENS` 16 000 og 40 s (NFR-4), (2) JSON-schema-støtte per modell, (3) live-kjøring av `nb-injeksjon.md` uten `KODE-RØD-4471`.
- `deferred-work.md` (spec-1-6) og `issues.md` (to story-1-6-linjer) peker nå på Story 5.1 i stedet for 1.13; punktene står fortsatt åpne.
- Commit `25b29cd` på branchen `docs/retro-item-6-carry-forward` (ikke pushet). Ingen kode endret, så ingen tester kjørt.
- `sprint-status.yaml` er ikke oppdatert; item 6 settes til `done` etter merge, slik det ble gjort for tiltak 3.

### Åpne punkter
Ingen nye. Retro-punktet i `issues.md` («hent inn punkter fra deferred-work.md/issues.md …») lukkes etter merge.
