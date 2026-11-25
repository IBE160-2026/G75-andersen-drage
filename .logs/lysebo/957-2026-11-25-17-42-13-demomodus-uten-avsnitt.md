# Demomodus uten avsnitt

## 2026-11-25 kl. 17:42 — lysebo

### Oppgave
Lukke retro-punkt A9 (Epic 1, funn R1). Tor bestemte å stramme inn, slik at demomodus sender `passages: []`. Da forlater en egen notattekst aldri nettleseren når brukeren har sagt nei til samtykke.

### Plan
- Kjørte `bmad-help`, som anbefalte Story 2.3 som neste steg. Forklarte A9 og anbefalte å stramme inn.
- Kjørte `bmad-build` med oneshot-ruten. Spec: [spec-fix-demo-mode-empty-passages.md](../../.docs/implementation-artifacts/spec-fix-demo-mode-empty-passages.md).
- Funn under undersøkelsen: proxyen krevde `min_length=1` på `passages`. Kontrakten måtte derfor endres slik at tom liste er lov i demo, mens live fortsatt krever minst én passasje.

### Resultat
- Branch `fix/demo-mode-empty-passages`, commit `d3c17edee561f4d25606ac619305df177919b265`. Ikke pushet.
- `web/api/studySet.ts` sender `passages: []` i demomodus. JSDoc og filhode er oppdatert.
- `proxy/app/schemas.py`: `min_length` er fjernet. Validatoren `_check_passages` (tidligere `_total_length`) gir 400 for live uten passasjer. `openapi.json` er regenerert, og `schema.d.ts` er uendret.
- Tester:
  - Vitest: +1 (avslått samtykke i demo, ingen notattekst i bodyen).
  - pytest: +2 i `test_demo.py`.
  - e2e: `demo.spec.ts` sjekker nå `passages: []`, både for eget notat og for eksempelnotat gjennom den ekte proxyen. `notat.spec.ts` (demo «Prøv igjen») er oppdatert.
- README (Demomodus, Proxy-en) og ny rad D-21 i `.docs/deviations.md`.
- `sprint-status.yaml`: `epic-1-retro-item-9` er satt til `done`. Issue-punktet fra 2026-11-24 om R1 er lukket.
- Blind Hunter-review ga 10 funn: 5 rettet, 1 avvist (proxyen krever ikke `[]` i demo) og 4 falske. Triagen står i speken.
- Full suite (`docker compose run --rm --build test`): Vitest 534, pytest 173, Playwright 142, exit 0.

### Åpne punkter
- D-21 skal avstemmes i arkitektur-spine (AD-6-kontrakttabellen og AD-12) i Story 5.3. Dette spores allerede i `.docs/deviations.md`, så det er ikke lagt til i `issues.md`.
