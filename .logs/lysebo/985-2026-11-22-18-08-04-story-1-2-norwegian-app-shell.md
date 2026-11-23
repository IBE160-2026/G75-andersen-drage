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

## 2026-11-22 kl. 22:43 — lysebo

### Oppgave
Fortsette story 1.2 fra CHECKPOINT 1: rydde spec-en under 1600 tokens, godkjenne, implementere, reviewe og committe. Mens implementeringsagenten jobbet: ta åpne punkter fra issues.md (avviksliste, Microcopy, kildereferanse, kanttilfeller, teknologinotat og arkitekturversjon for sensor og Bård).

### Plan
- `bmad-build` steg 2 → 5 på [spec-1-2-norwegian-app-shell.md](../../.docs/implementation-artifacts/spec-1-2-norwegian-app-shell.md).
- Spec-en ble strammet inn fra 7509 til 6373 tegn (ca. 1600 tokens) uten å endre den låste intensjonsdelen; Design Notes ble flettet inn i oppgavene.
- Implementering i subagent, tre reviewere parallelt (Blind Hunter, Edge Case Hunter, Verification Gap), triage i spec-ens Review Triage Log, patcher tilbake til implementeringsagenten.

### Resultat
- **Story 1.2 committet i `7ab8e08`.** Spec `done`, sprint-status 1-2 = `review`. Tokens fra DESIGN.md, `global.css`, `features.ts` (alle av), `messages.ts`, AppShell bak mount-gate, TopBar med 'Mer' under 768 px, Screen (tittel + fokus på h1), Button/ErrorMessage/EmptyState, Vitest-vakter og Playwright + axe.
- **Tester:** `docker compose run --rm --build test` grønn, kjørt av meg selv etter patchene: Vitest 42/42, pytest 4/4, Playwright 17/17. Alle seks rader i I/O-matrisen dekket av tester som kjørte.
- **Review:** 21 funn; 7 patchet (nav-landemerke på mobil, fokus ved 'Mer' › 'Innstillinger' på samme side, e2e-sjekk av fokus etter menyvalg, hex-sjekk også i `global.css`, sjekk av at `var(--…)` finnes, strengere sjekk av hardkodet tekst, tester for ErrorMessage og EmptyState), 14 avvist med begrunnelse i Review Triage Log. Ingenting utsatt til deferred-work.
- **Avvik fra spec:** første Tab etter innlasting sendes til hopp-lenken (matriseradene 1 og 2 kolliderer ellers); to ekstra tekstnøkler `nav.label` og `start.empty.next`; `.dockerignore` og `e2e/Dockerfile` kopierer DESIGN.md inn i test-imaget. Ingen `<title>` før mount.
- **Dokumenter committet i `068c1eb`:**
  - `.docs/deviations.md` opprettet med D-1 (Hurtigtaster til Should), D-2 (`panic.start`), D-3 (nye tekstnøkler fra 1.2).
  - EXPERIENCE.md: `skip.link`, `topbar.more`, `err.prefix`, `start.empty`, `demo.indicator` merket *(approved)*. Resten av Microcopy godkjennes bolkvis per story. Kildereferanse før svar bekreftet (med markering, som før).
  - `reference-notes/edge-cases/nb-injeksjon.md` (to injeksjonsforsøk, markør `KODE-RØD-4471`) og `nb-topptekst-bunntekst.pdf` (4 sider, gjentatt topptekst/bunntekst med «Side n av 4»), begge i `reference-notes/README.md`.
  - `.docs/planning-artifacts/architecture/technology-G75.md` (samme kapitler som Bårds technology.md + hva som er beholdt/utelatt) og `arkitektur-oversikt.md` (lesevennlig for sensor og Bård, Mermaid-diagrammer). Begge på norsk.
- **`2621b25`:** `.gitattributes` merker `*.pdf` og `*.docx` som binære; den nye PDF-en var ren ASCII og ville ellers fått CRLF ved utsjekk på Windows.
- Branchen `story/1-2-norwegian-app-shell` pushet til origin (ingen PR opprettet ennå).
- Lukket i issues.md: CHECKPOINT 1, deviations.md, kildereferanse før svar, teknologinotat/arkitekturversjon, injeksjonsnotat og PDF.

### Åpne punkter
- Manuell tastatursjekk av `/` og `/innstillinger` ved 320 px (spec › Manual checks) er ikke gjort; Playwright dekker den automatisk.
- Ingen e2e-test for at fokus går tilbake til 'Mer' når 'Innstillinger' velges mens du allerede står på `/innstillinger` (fiksen er på plass).
- Se over `technology-G75.md` og `arkitektur-oversikt.md`: er det greit å navngi Bård Pettersen og «referansen fra Bård» slik?
- Story 1.5 må fortsatt lage de øvrige kanttilfellene (feil type, for kort, skannet PDF, ødelagt/passordbeskyttet, ikke-UTF-8).
- Neste steg: PR for story 1.2 og grønn CI, deretter story 1.3 (Samtykke) — start med Microcopy-bolken for Samtykke.

## 2026-11-23 kl. 07:10 — lysebo

### Oppgave
Opprette PR for story 1.2 og følge med på CI (etter `bmad-help`, som anbefalte PR → merge → `bmad-build` på story 1.3).

### Plan
- PR-beskrivelse i samme stil som PR #1, bygget fra spec-en og forrige logg.
- `gh pr checks` i bakgrunnen; første forsøk stoppet på en nettverksfeil (`dial tcp … connectex`), andre forsøk prøvde på nytt til sjekken var ferdig.

### Resultat
- **PR #2 opprettet:** https://github.com/IBE160-2026/G75-andersen-drage/pull/2 (`story/1-2-norwegian-app-shell` → `main`).
- **CI:** sjekken `test` er grønn (2m4s, run 45122074008).
- **Sprint-status:** 1-2 satt til `done` i `a9cd9b6` og pushet til branchen sammen med loggcommiten. CI kjørte på nytt og ble grønn (1m50s, run 45122590740).
- **Merget:** PR #2 inn i `main` som merge-commit `dc682bc`. Første merge-forsøk feilet på en nettverksfeil mot GitHub, og andre forsøk gikk gjennom.
- Lukket i issues.md: «PR for story 1.2 og grønn CI» og «merge PR #2 og sett 1-2 til done».

### Åpne punkter
- Den manuelle tastatursjekken ved 320 px er fortsatt ikke gjort (står allerede i issues.md).
- Neste steg etter merge: `bmad-build` på story 1.3 (Samtykke). Start med Microcopy-bolken for Samtykke.
