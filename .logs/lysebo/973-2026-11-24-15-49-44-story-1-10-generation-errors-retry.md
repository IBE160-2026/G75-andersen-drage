# Story 1.10: Feil, «Prøv igjen» og avbrutt generering

## 2026-11-24 kl. 15:49 — lysebo

### Oppgave
Oppgaven var `bmad-build story 1.10`. Når genereringen feiler, skal Genererer vise riktig feilmelding med «Prøv igjen» og «Tilbake til start». Appen skal aldri prøve på nytt av seg selv. En omlasting eller et dobbelttrykk skal gi høyst én generering og aldri en halvlagret post.

### Plan
- Spec: [spec-1-10-generation-errors-retry-and-interrupted-generation.md](../../.docs/implementation-artifacts/spec-1-10-generation-errors-retry-and-interrupted-generation.md). Den er på ca. 2 100 tokens og ble godkjent i full lengde, uten splitting.
- Valg agenten tok selv, ført i D-12:
  - En 503 `err.noKey` fra Proxy-en vises som `err.noKey`, uten «Prøv igjen».
  - Ny nøkkel `gen.retry`.
  - `err.demoOnly` er lagt inn fra EXPERIENCE.
  - Omlasting trengte ingen ny kode, bare en test.
- Arbeidsflyt: en subagent implementerte, og tre reviewere gikk gjennom endringen parallelt. Funnene ble sortert, og de som skulle rettes ble rettet.

### Resultat
- **Commit:** `4c655eb` på branchen `story/1-10-generation-errors-retry-and-interrupted-generation`. Branchen er ikke pushet, og det er ingen PR ennå.
- **Koden:**
  - `Generating.tsx` har fått en feilvisning for `err.generation`, `err.tooFewItems`, `err.noKey` og `consent.declined`. «Prøv igjen» starter genereringen på nytt med en ny POST og flytter fokus til `h1`.
  - `api/studySet.ts` sender `503 err.noKey` videre som `err.noKey`.
  - Ny test `web/i18n/proxyCodes.test.ts` sjekker at alle feilkodene fra Proxy-en finnes som nøkler i `messages.ts`.
- **E2E-tester** (`generate.spec.ts`):
  - «Prøv igjen» etter feil, og «Prøv igjen» to ganger etter hverandre
  - dobbeltklikk på «Prøv igjen»
  - `err.tooFewItems`
  - 503 `err.noKey`
  - omlasting midt i genereringen
  - dobbel slipp
- **Dokumentasjon:** D-12, en ny README-tekst og et FR-4-punkt i `deferred-work.md`.
- **Verifisering:** Vitest 360, `tsc`, pytest 143 og Playwright 90 er grønne i Docker.
- **Review:** 18 funn. 6 er rettet, resten er avvist med begrunnelse i triage-loggen. Ingenting nytt er utsatt.
- **Status:** spec er `done`, og sprint-status er `1-10: review`.

### Åpne punkter
- Lag PR for story 1.10, få grønn CI og merge. Sett deretter 1-10 til `done` i `sprint-status.yaml`.
- FR-4 (Epic 3): når nettleseren får en cache for studiesett, må «Prøv igjen» hoppe over cache-oppslaget (står i `deferred-work.md`).
- Den nye Microcopy-nøkkelen `gen.retry` («Prøv igjen») og `err.demoOnly` er utkast som ikke er godkjent (D-12).
