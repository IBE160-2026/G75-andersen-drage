# Story 1.2 — norsk app-skall med designtokens

## 2026-11-22 kl. 18:08 — lysebo

### Oppgave
Merge story 1.1 (PR #1) og starte story 1.2 (norsk app-skall, designtokens, tilgjengelig struktur) med `bmad-build`. Også: sjekke om branch protection på `main` er satt opp.

### Plan
- Merge PR #1 etter grønn CI, lage branch `story/1-2-norwegian-app-shell` fra `main`.
- `bmad-build` step 1–2: epic-1-kontekst (gyldig cache), DESIGN.md/EXPERIENCE.md/arkitektur undersøkt, spec skrevet.
- Spec: [spec-1-2-norwegian-app-shell.md](../../.docs/implementation-artifacts/spec-1-2-norwegian-app-shell.md) (status `draft`, venter på CHECKPOINT 1).

### Resultat
- Branch protection sjekket via API to ganger: `main` er ikke beskyttet, ingen rulesets; kontoen har `push`/`triage`, ikke `admin`. Mail sendt til faglærer.
- PR #1 merget til `main` (merge-commit `d6110a8`), remote-branch slettet.
- Ny branch `story/1-2-norwegian-app-shell`. `sprint-status.yaml`: 1-1 satt til `done` (ukommittert).
- Spec for 1.2 skrevet (ukommittert, `draft`). Egne valg i spec-en: rutene `/` og `/innstillinger`; nye tekstnøkler (`app.brand`, `nav.notes`, `nav.settings`, `title.*`, `settings.h1`) der EXPERIENCE.md mangler dem; hex-sjekk som Vitest-test. Pins sjekket mot npm: `radix-ui@1.8.1`, `@axe-core/playwright@4.14.0`.
- Spec-en er ca. 1900 tokens (over 1600); anbefalt å beholde samlet.

### Åpne punkter
- Story 1.2: svar på CHECKPOINT 1 — godkjenn og fortsett / godkjenn og stopp / gjennomgå, og om spec-en beholdes samlet eller deles. Fortsett med `bmad-build` på spec-fila.
- Branch protection på `main` venter fortsatt på faglærer (se story-1-1-loggen).
