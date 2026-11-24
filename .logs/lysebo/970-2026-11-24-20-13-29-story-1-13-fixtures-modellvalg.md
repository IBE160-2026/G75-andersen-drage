# Story 1.13: opptak av Fixtures og modellvalg

## 2026-11-24 kl. 20:13 — lysebo

### Oppgave
`bmad-build` for story 1.13. Oppgaven var å ta opp ekte modellsvar (Fixtures) for de tre referansenotatene og velge modell ut fra målte resultater (PRD OQ1), slik at Demo Mode (1.14) og testene uten nøkkel har data å kjøre mot.

### Plan
- Spec: [spec-1-13-record-fixtures-compare-models.md](../../.docs/implementation-artifacts/spec-1-13-record-fixtures-compare-models.md). Den ble kortet ned fra cirka 2300 til cirka 1500 tokens etter ønske fra Tor.
- Beslutninger tatt av Tor:
  - Nøkkelen legges inn i denne økta, og opptaket kjøres her.
  - Fixtures får `simpler: {}` til Story 3.6.
  - Specen beholdes samlet.
  - Gemini tas også opp, siden Luna fikk tidsavbrudd.
- Fire steg: `export-passages.ts` (ekte uttrekking), så `record_fixtures.py --model` per modell, så `evaluate.ts`, og til slutt `--promote` av vinneren.
- Branch: `story/1-13-record-fixtures-and-compare-models-on-the-reference-notes`.

### Resultat
- Commit `57fa87a` på story-branchen. Branchen er pushet, og PR #14 er opprettet: https://github.com/IBE160-2026/G75-andersen-drage/pull/14
- Nye filer:
  - `web/scripts/export-passages.ts`, `evaluate.ts` og `isMain.ts`, med tester.
  - `proxy/scripts/record_fixtures.py`.
  - `proxy/tests/test_record_fixtures.py` og `test_fixtures.py`.
  - `web/extract/fixtures.test.ts`.
  - `tsx` er lagt til som dev-avhengighet.
- Opptak (`PROMPT_VERSION` 2, 40 s per forsøk):

  | Modell | Beståtte sitater | Overlevende Items | Tid per notat | Notater bestått |
  |---|---|---|---|---|
  | `anthropic/claude-haiku-5.5` | 100 % | 71 | 18–33 s | 3/3 |
  | `google/gemini-3.5-flash-lite` | 65 % i snitt | 53 | 9–17 s | 2/3 (`nb-smidig-scrum.md` feilet, 21 %) |
  | `openai/gpt-6-luna` | — | — | tidsavbrudd (40 s) | 0/3 |

- Haiku er valgt. Den var allerede standardmodellen, så `config.py` og `compose.yaml` er uendret. Resultatet står i D-15 og README («Fixtures og modellvalg»).
- Haiku-opptakene er promotert til `proxy/fixtures/`. Alle kandidatopptakene ligger i `proxy/recordings/`.
- Review med tre lag (Blind Hunter, Edge Case Hunter og Verification Gap) ga 17 funn:
  - 6 er rettet. Det viktigste er at Fixtures nå testes mot `verifyStudySet`, og at testene ikke lenger består når Fixtures mangler.
  - 11 er avvist med begrunnelse i triageloggen.
- Testene i Docker uten nøkkel: Vitest 394, pytest 160 og Playwright 108 besto, `tsc` er ren, og kjøringen endte med exit 0.
- Nøkkelen havnet først i den sporede fila `.env.example`. Den er flyttet til `.env`, som er git-ignorert, og `.env.example` er satt tilbake. Nøkkelen er ikke committet.
- CI (`test`) er grønn. PR #14 er merget i `a708899`, og sprint-status for 1-13 er satt til `done` i `ca62075` på `main`.
- Issue lukket: «neste story: 1.13».

### Åpne punkter
- Simpler-oppføringene i Fixtures (`simpler: {}`) må tas opp på nytt i Story 3.6 (D-15).
- `MinApiKey.env.example` ligger i mappa over prosjektroten (utenfor repoet) og kan inneholde en ekte nøkkel. Vurder å slette den.
- Neste story: 1.14 (Demo Mode med de medfølgende eksempelnotatene).
