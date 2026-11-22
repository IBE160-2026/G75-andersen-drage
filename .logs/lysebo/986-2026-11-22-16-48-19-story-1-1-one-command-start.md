# Story 1.1 — ett-kommando-oppstart

## 2026-11-22 kl. 16:48 — lysebo

### Oppgave
Fortsette story 1.1 (one-command start med tom app og grønn testkjøring) fra der forrige økt slapp: spec sto på `in-review` med review-patcher lagt inn, men ikke verifisert eller committet.

### Plan
- Gjenoppta `bmad-build` på [spec-1-1-one-command-start.md](../../.docs/implementation-artifacts/spec-1-1-one-command-start.md) (status `in-review`).
- Bekrefte at patchene fra review-triage (iterasjon 0) faktisk ligger i koden.
- Kjøre spec-ens Verification-kommandoer, deretter step 5: spec `done`, sprint-status `review`, lokal commit.

### Resultat
- Patchene var på plass: `.gitattributes` (LF for `*.sh`), CI `permissions: contents: read` + `git status --porcelain`-sjekk, `strip()` av nøkkel i `config.py`, healthcheck på `web` + `service_healthy`, e2e sjekker at `keyConfigured` er boolean.
- Docker Desktop var ikke startet; startet den.
- Verifisering: `docker compose up -d --build` OK; `GET /api/status` → `{"keyConfigured":false,"model":"anthropic/claude-haiku-5.5","provider":"OpenRouter","promptVersion":"0"}`; `docker compose run --rm test` exit 0 (Vitest 1, pytest 4, Playwright 2 bestått); kontrakt regenerert i test-imaget uten drift i `web/api/schema.d.ts`; `docker compose down` rent.
- Spec satt til `done`; `1-1-…` i `sprint-status.yaml` satt til `review`.
- Commit `4ce881403ffecb799bb30c9e3885804a048b8924` på `story/1-1-one-command-start`, pushet til origin 2026-11-22. PR #1 mot `main` opprettet; CI-jobben `test` grønn på GitHub (1m35s).
- Lukket åpent punkt «neste steg: bmad-build på story 1.1».

### Åpne punkter
- Slå på branch protection på `main` i GitHub (krev grønn CI før merge) — kontoen mangler admin; mail sendt til faglærer 2026-11-22.
- Utsatt (deferred-work.md): sterkere lazy-provider-test i `proxy/tests/test_status.py` — tas i Story 1.6.
- Neste steg: story 1.2 (UI-skall, tokens, i18n) etter at 1.1 er merget.
