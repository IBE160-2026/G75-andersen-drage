# G75 — Gruppe Jæren

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon (Torsas læringsassistent) og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Tor Lysebo Andersen

Prosjektet gjennomføres solo. Lasse S. Drage trakk seg fra emnet før prosjektbeskrivelsen ble levert (september 2026).

## Forutsetninger

- Docker Desktop med Docker Compose v5.5 eller nyere. Ingenting annet trengs.
- En OpenRouter-nøkkel er **valgfri**. Appen starter og testene kjører uten nøkkel.

## Kommandoer

| Hva | Kommando |
| --- | --- |
| Start appen | `docker compose up` (åpne <http://localhost:3000>) |
| Kjør alle tester | `docker compose run --rm test` |
| Utviklingsmodus (hot reload) | `docker compose --profile dev up proxy-dev web-dev` (web på <http://localhost:3001>, Proxy på <http://127.0.0.1:8000>) |
| Stopp | `docker compose down` |
| Generer kontrakttyper | Se «Kontrakt» under |

`docker compose run --rm test` kjører Vitest (`web/`), pytest (`proxy/`) og Playwright (`e2e/`) mot egne testtjenester, `web-test` og `proxy-test`, og avslutter med feilkode hvis en suite feiler. Testtjenestene står på et internt nettverk uten vei ut, `proxy-test` får aldri nøkkel (`.env` leses ikke), og grensen er hevet til 1000 per minutt så e2e aldri treffer den. Bygg på nytt etter kodeendringer: `docker compose --profile test build` eller `docker compose run --rm --build test`.

## Konfigurasjon

Kopier `.env.example` til `.env` (filen er git-ignorert) og fyll inn det du trenger. Bare Proxy-tjenesten leser `.env`; nettleseren får ingen hemmeligheter.

| Variabel | Standard |
| --- | --- |
| `OPENROUTER_API_KEY` | ingen (uten nøkkel: `keyConfigured: false`) |
| `OPENROUTER_MODEL` | `anthropic/claude-haiku-5.5` |
| `GENERATION_TIMEOUT_S` | `40` |
| `SIMPLER_TIMEOUT_S` | `15` |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |
| `RATE_LIMIT_PER_MIN` | `10` |

`ALLOWED_ORIGINS` og `RATE_LIMIT_PER_MIN` leses ved hver forespørsel (se «Vern» under Proxy-en). Oppføringene i `ALLOWED_ORIGINS` normaliseres (små bokstaver, uten `/` til slutt); `Origin`-headeren i forespørselen må deretter være helt lik en av dem. En ugyldig `RATE_LIMIT_PER_MIN` (ikke et heltall, eller under 1) gir `10`.

Opprett nøkkelen med en kredittgrense i OpenRouter.

## Mappeoversikt

```text
compose.yaml        web, proxy; profilene dev og test
.env.example        alle Proxy-variabler uten verdier
web/                Next.js-appen (app/, components/, core/, extract/, storage/, api/, i18n/, styles/)
proxy/              FastAPI-Proxy (app/, fixtures/, scripts/, tests/)
e2e/                Playwright-tester og test-imaget
scripts/test.sh     kjører alle testsuitene i test-tjenesten
reference-notes/    referansenotater (DR-3)
.docs/              planleggingsdokumenter (PRD, arkitektur, UX, stories)
```

## App-skallet

- **Skall:** `web/components/AppShell/` rendrer hele appen i nettleseren (først etter mount). Rekkefølgen er alltid lenken «Gå til hovedinnhold» → topplinje → `main`. Hver side bruker `Screen`, som setter `document.title` og flytter fokus til sidens `h1`. Under 768 px samles topplinjen i en «Mer»-meny.
- **Tekst:** all synlig tekst ligger i `web/i18n/messages.ts` og hentes med `t("nøkkel")`. Nøklene følger Microcopy-tabellen i EXPERIENCE.md.
- **Designtokens:** `web/styles/tokens.css` er hentet fra frontmatter i DESIGN.md (`:root` = lys, `[data-theme="dark"]` = mørk). Komponentene bruker bare `var(--token)` i sin egen CSS Module, aldri hex-farger. En Vitest-test sjekker at tokens.css stemmer med DESIGN.md.
- **Samtykke:** første gang appen åpnes, vises en dialog som sier at notater sendes til OpenRouter (og hvilken modell). Valget lagres i nettleseren (`web/storage/settings.ts`). Samtykket kan trekkes tilbake, eller gis senere, under *Innstillinger › Samtykke*.
- **Last opp notat:** Start tar imot én fil (velg eller slipp): `.txt`, `.md`, `.docx` og PDF med tekst. Filen sjekkes i nettleseren før noe sendes: maks 10 MB og 150–15 000 ord, ellers vises en feilmelding ved slippsonen. Skannede PDF-er (under 100 tegn tekst per side i snitt) avvises; det finnes ingen OCR. Korrupte og passordbeskyttede filer gir «Filen kunne ikke leses». Teksten trekkes ut i en Web Worker (`web/extract/`, avbrytes etter 15 s): `.docx` med mammoth og htmlparser2 (én linje per tabellrad, celler skilt med ` | `), PDF med unpdf (topptekst og bunntekst som går igjen på minst halvparten av sidene fjernes). Alt deles i avsnitt etter reglene i `web/core/passages.ts`. Ikke med i v1: formler (Word-ligninger, OMML) og topptekst/bunntekst i Word-filer. Fotnoter og sluttnoter i Word-filer kommer med, men som de siste avsnittene i notatet, ikke ved [n]-merket i teksten. Testfilene ligger i `reference-notes/` (se `reference-notes/README.md`).
- **Lag kort og quiz:** når filen er godkjent, sjekker appen først samtykke og at Proxy-en har en API-nøkkel (`web/core/gate.ts`). Mangler noe av dette, vises feilen ved slippsonen og ingenting sendes. Ellers vises *Genererer* («Lager kort og quiz») med en tidsbasert fremdriftslinje, og nettleseren sender én `POST /api/study-set` (`web/api/studySet.ts`, avbrytes etter 90 s eller når du forlater skjermen, ingen automatiske nye forsøk). Svaret sjekkes i nettleseren (sitatkontroll og minstekrav), og notatet og studiesettet lagres sammen i én IndexedDB-transaksjon i nettleseren (`web/storage/db.ts`, databasen `torsa`). Deretter åpnes `/notat/{noteHash}`. Notatoversikten (`web/components/NoteOverview/`) leser notatet og studiesettet fra IndexedDB og viser notatets tittel, et studiepanel med sammendragspunkter (hvert med sitat og «Kilde: Pn») og nøkkelbegreper sortert etter sentralitet (hvert med merket «ny», eller «ingen verifiserte elementer» når ingen elementer besto sitatkontrollen), og et kildepanel med notatets avsnitt P1, P2 … Fra 768 px står kildepanelet til venstre og studiepanelet til høyre; smalere skjermer får fanene «Studier» og «Kilde». «Start runde» vises, men er ikke aktiv før runder kommer (Epic 2). Har ingen begreper verifisert kilde, vises en feil med «Prøv igjen», som lager studiesettet på nytt fra de lagrede avsnittene. Mangler notatet eller studiesettet, vises «Fant ikke notatet». Feiler noe, lagres ingenting, og *Genererer* viser feilen (fokusert) med knappene «Prøv igjen» og «Tilbake til start»: «Det gikk ikke å lage kort og quiz nå.» ved nettverksfeil, tidsavbrudd, 429/5xx og andre feilsvar, et ugyldig svar eller når lagringen i nettleseren feiler, og «For få kort eller spørsmål kunne knyttes til notatet ditt.» når for få kort eller quizspørsmål består sitatkontrollen. «Prøv igjen» sender en ny forespørsel; appen prøver aldri på nytt av seg selv. Svarer Proxy-en `503 err.noKey` (nøkkelen er fjernet etter oppstart), vises nøkkelfeilen med bare «Tilbake til start». Lastes siden på nytt under genereringen, avbrytes forespørselen, ingenting lagres, og du er tilbake på start.
- **Funksjonsflagg:** `web/features.ts` har ett flagg per Should-funksjon (hurtigtaster, «Eksamen om en time», eksport/import, arkiv, viktighet, mørk modus). Alle er `false`; et inngangspunkt vises bare når flagget er `true`.

## Proxy-en

- **`GET /api/status`** svarer `keyConfigured`, `model`, `provider` og `promptVersion`. Proxy-en starter uten nøkkel; OpenRouter-klienten bygges først når en generering trenger den.
- **`POST /api/study-set`** tar `{mode, noteHash, passages}` (`mode` `"live"` eller `"demo"`, `noteHash` 64 små heks-tegn, 1–15 000 avsnitt `{id: "p<n>", text}` med unike `id`, til sammen høyst 1 000 000 tegn) og svarer med et studiesett: 5–15 nøkkelbegreper etter sentralitet, hvert med 1–2 kort og 1–2 quizspørsmål (nøyaktig 4 valg), 5–10 sammendragspunkter på høyst 40 ord, `language`, `model` og `promptVersion`. Modellen kalles via OpenRouter med `zdr: true`, `data_collection: "deny"` og `require_parameters: true`, JSON-skjema-svar og uten `temperature`/`top_p`. Notatteksten sendes bare som JSON-data mellom `<note_passages>` og `</note_passages>` i brukermeldingen, aldri i systemprompten (`proxy/app/prompts/`). Svaret sjekkes mot skjemaet og tellereglene (`proxy/app/rules.py`); ugyldige quizspørsmål og for lange sammendragspunkter fjernes, og overskytende elementer kuttes. Sitatkontroll og ID-er gjøres i nettleseren (Story 1.8).
- **Tidsfrister og nytt forsøk:** hvert modellkall har `GENERATION_TIMEOUT_S` (40 s), hele forespørselen 85 s (fast). Ugyldig svar, avvisning, avkuttet svar, 429/5xx, nettverksfeil eller tidsavbrudd gir ett nytt forsøk, men bare hvis minst 40 s gjenstår. Høyst 2 modellkall per forespørsel.
- **Feil** er alltid `{code}`: `400 err.generation` (ugyldig forespørsel), `404 err.demoOnly` (`mode: "demo"`; demodata kommer i Story 1.13/1.14), `503 err.noKey` (ingen nøkkel), `502 err.generation` (ugyldig svar eller leverandørfeil), `504 err.generation` (tidsavbrudd), `500 err.generation` (uventet feil i Proxy-en), og fra vernet `403`, `413` og `429`, alle `err.generation`. En `OPENROUTER_MODEL` uten støtte for JSON-skjema-svar gir `502 err.generation` på hver forespørsel, uten nytt forsøk.
- **Vern** (sjekkes i denne rekkefølgen før ruten kjører):
  1. **Opphav:** en forespørsel med `Origin` utenfor `ALLOWED_ORIGINS` gir `403 err.generation`, uansett metode. Uten `Origin` slipper bare `GET`, `HEAD` og `OPTIONS` gjennom (som healthcheckens `GET /api/status`); en `POST` uten `Origin` gir 403. Det finnes ingen CORS: appen og Proxy-en deler opphav via Next.js.
  2. **Størrelse:** en body over 8 MiB, oppgitt eller strømmet, gir `413 err.generation`.
  3. **Takt:** høyst `RATE_LIMIT_PER_MIN` (10) live-`POST`-er per opphav i et glidende vindu på 60 s; den neste gir `429 err.generation` uten modellkall. Demo-forespørsler (`mode: "demo"`) og `GET` telles ikke. Ugyldige live-forespørsler telles. Telleren ligger bare i minnet og nullstilles ved omstart.
  
  `Origin` er ingen autentisering, siden `curl` kan sette den. Vernet stopper andre nettsider i nettleseren (også DNS rebinding) fra å bruke nøkkelen; portene er bare bundet til `127.0.0.1`.
- **Logg:** én linje per forespørsel med metode, sti, status, varighet og eventuell feilkode. Aldri notattekst, modellsvar eller feiltekst. Proxy-en skriver ingen filer og har ingen telemetri (ingen Logfire- eller OpenTelemetry-SDK, ingen instrumentering; se D-7). `proxy/tests/test_retention.py` sjekker dette.
- **`PROMPT_VERSION`** (`proxy/app/config.py`, nå `2`) økes ved hver endring i promptene.

Nettleseren kaller bare relative `/api/*`-stier. Next.js videresender dem til Proxy-en (`http://proxy:8000`) på Compose-nettverket. Bare `web` er publisert, på `127.0.0.1:3000`.

## Kontrakt

Pydantic-modellene i `proxy/app/schemas.py` er eneste kilde for API-kontrakten. `web/api/schema.d.ts` genereres og committes. Kommandoen kjører i test-imaget, så den trenger bare Docker (Git Bash eller annet POSIX-skall):

```sh
docker compose --profile test build test
docker compose run --rm --no-deps -v "$PWD/web/api:/repo/web/api" test bash -c \
  "cd proxy && uv run --frozen python scripts/dump_openapi.py > openapi.json && cd ../web && npm run gen:api"
```

CI genererer filen på nytt og feiler hvis den avviker fra det som er committet.

## CI

GitHub Actions (`.github/workflows/ci.yml`) kjører testkommandoen og kontraktsjekken på hver PR og hver push til `main`. `main` har ingen branch-beskyttelse (avklart med faglærer, se D-10 i `.docs/deviations.md`). En PR merges derfor bare når CI er grønn, og det er en arbeidsregel. GitHub håndhever den ikke.
