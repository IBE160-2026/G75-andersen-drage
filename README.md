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

`docker compose run --rm test` kjører Vitest (`web/`), pytest (`proxy/`) og Playwright (`e2e/`) mot `web` og `proxy` på Compose-nettverket, og avslutter med feilkode hvis en suite feiler.

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

`ALLOWED_ORIGINS` og `RATE_LIMIT_PER_MIN` leses allerede, men håndheves først fra Story 1.7.

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

Nettleseren kaller bare relative `/api/*`-stier. Next.js videresender dem til Proxy-en (`http://proxy:8000`) på Compose-nettverket. Bare `web` er publisert, på `127.0.0.1:3000`.

## Kontrakt

Pydantic-modellene i `proxy/app/schemas.py` er eneste kilde for API-kontrakten. `web/api/schema.d.ts` genereres og committes. Kommandoen kjører i test-imaget, så den trenger bare Docker (Git Bash eller annet POSIX-skall):

```sh
docker compose --profile test build test
docker compose run --rm --no-deps -v "$PWD/web/api:/repo/web/api" test bash -c \
  "cd proxy && uv run --frozen python scripts/dump_openapi.py > openapi.json && cd ../web && npm run gen:api"
```

CI genererer filen på nytt og feiler hvis den avviker fra det som er committet.

## CI og branch-beskyttelse

GitHub Actions (`.github/workflows/ci.yml`) kjører testkommandoen og kontraktsjekken på hver PR og hver push til `main`. For at en rød CI skal blokkere merge, må branch-beskyttelse settes manuelt i GitHub: *Settings › Branches › main* → krev at statussjekken `test` er grønn før merge.
