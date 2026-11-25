# Retro-tiltak 3: Manual checks påkrevd i UI-specs

## 2026-11-25 kl. 10:22 — lysebo

### Oppgave
Pushe forrige logg-commit, og gjennomføre retro-tiltak 3 fra epic-1-retroen (funn A8): gjøre «Manual checks» til en påkrevd seksjon i spec for hver story som legger til eller endrer UI, fra Story 2.1.

### Plan
- Push 2c0fb50 (logg for retro-tiltak 2) til main.
- Skrive regelen én gang i `.docs/standards/manual-checks.md`.
- Laste den som `persistent_facts` i team-overstyringer for bmad-build, bmad-build-auto og bmad-spec (de som skriver specs), i stedet for å endre spec-malen (malen overskrives ved BMAD-oppdatering).
- Branch + PR, som for tiltak 2, 7 og 8.

### Resultat
- 2c0fb50 pushet til origin/main.
- Branch `docs/retro-item-3-manual-checks`, commit 935ded7 på branchen: `.docs/standards/manual-checks.md` (regel: UI = `web/app/`, `web/components/`, `web/styles/` eller Microcopy-nøkler; lista dekker tastatur, 320 px og konkret skjerm/tilstand; spec kan ikke forlate `draft` uten lista, story ikke `done` før P/F er logget) og `_bmad/custom/{bmad-build,bmad-build-auto,bmad-spec}.toml`.
- Verifisert med `_bmad/scripts/resolve_customization.py` at alle tre skillene løser `workflow.persistent_facts` til fila.
- PR #20: https://github.com/IBE160-2026/G75-andersen-drage/pull/20

### Åpne punkter
- PR #20: grønn CI og merge; sett deretter epic-1-retro-item-3 til done i sprint-status.yaml.
