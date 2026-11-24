# Story 1.9: Lag et Study Set fra et opplastet notat

## 2026-11-24 kl. 15:12 — lysebo

### Oppgave
`bmad-build story 1.9`: når et notat er lastet opp og godkjent, skal appen sende det til Proxy-en, verifisere svaret, lagre notatet og Study Set-et i nettleseren og åpne Notatoversikt. Fremdriften skal vises mens det pågår.

### Plan
- Spec: [spec-1-9-generate-study-set.md](../../.docs/implementation-artifacts/spec-1-9-generate-study-set.md). Den er godkjent med full størrelse, ca. 2 300 tokens, uten å splittes.
- Disse valgene tok agenten selv. De står i Design Notes og i D-11:
  - Genererer vises på `/` i stedet for Start-innholdet.
  - Fremdriftslinja er tidsbasert, og `gen.status` er delt i tre nøkler.
  - Når send-gaten blokkerer, vises feilen på Start.
  - `gen.back` er med allerede nå.
  - Plassholderen for Notatoversikt ligger på `/notat/{noteHash}`.
- Arbeidsflyt: en subagent implementerte, og tre reviewere gikk gjennom diffen parallelt (Blind Hunter, Edge Case Hunter og Verification Gap). Deretter ble funnene triagert og rettet.

### Resultat
- **Commit:** `16b6e5c` på branchen `story/1-9-generate-study-set`. Branchen er pushet, og PR #10 er opprettet: https://github.com/IBE160-2026/G75-andersen-drage/pull/10
- **Nye filer:**
  - `web/storage/db.ts` med `idb`: alle fire AD-21-stores, og notat og studiesett lagres i én transaksjon.
  - `web/api/studySet.ts`: send-gate, single-flight, 90 s timeout og abort.
  - `web/core/noteRecord.ts`.
  - Genererer-skjermen i `web/components/Generating/`.
  - `web/app/notat/[noteHash]/page.tsx`.
  - Nye Microcopy-nøkler, D-11 i `deviations.md` og en README-seksjon «Lag kort og quiz».
- **E2E-tester:** ny `e2e/generate.spec.ts` med 7 tester, blant annet
  - happy path med nøyaktig én request,
  - 502,
  - verify-feil,
  - at brukeren forlater Genererer,
  - de tidsstyrte stegene,
  - samtykke-gaten.

  `upload.spec.ts` er justert for inline `err.noKey`.
- **Verifisering:** `tsc` OK. Vitest 351, pytest 143 og Playwright 83 er grønne i Docker.
- **Review:** 19 funn.
  - 9 er rettet, blant dem utdatert `status` ved tidlig opplasting, `decodeURIComponent`-krasj og tre manglende tester.
  - 1 er utsatt (se åpne punkter). Resten er avvist med begrunnelse i triage-loggen.
- **Status:** spec er `done`, og sprint-status er `1-9: review`.
- Lukker punktet fra story 1.6 om at nettleserens tidsgrense må være over 85 s. Den er nå 90 s, i `STUDY_SET_TIMEOUT_MS`.

### Åpne punkter
- PR #10 for story 1.9 (https://github.com/IBE160-2026/G75-andersen-drage/pull/10): vent på grønn CI og merge, og sett deretter 1-9 til done i sprint-status.yaml.
- Utsatt til Epic 3 (FR-4): gjenopplasting av et lagret notat nullstiller brukerfeltene og kan etterlate et foreldreløst studiesett (deferred-work.md).
- De nye Microcopy-nøklene er utkast som ikke er godkjent: `gen.status.*`, `gen.progress`, `title.generating` og `note.missing` (D-11).
- E2E-testen «forlate Genererer» bruker `waitForTimeout(500)`. Den er litt tidsavhengig, så følg med i CI.

## 2026-11-24 kl. 15:30 — lysebo

### Oppgave
PR #10 er merget. Sett 1-9 til `done` i sprint-status.

### Plan
- Byttet til `main` og hentet merge-commiten `60830d1`. Oppdaterte deretter `sprint-status.yaml` på samme måte som for story 1.8.

### Resultat
- I `sprint-status.yaml` er 1-9 satt til `done` (commit `09560fe` på `main`).
- PR-punktet i `issues.md` er lukket.

### Åpne punkter
- De øvrige punktene fra 1.9 står fortsatt i `issues.md` (utsatt FR-4, Microcopy-utkast og `waitForTimeout` i e2e).
