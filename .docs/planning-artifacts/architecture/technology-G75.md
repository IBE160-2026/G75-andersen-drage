# Torsas læringsassistent – arkitektur, teknologi og nøkler

Oversikt over oppsettet til Torsas læringsassistent (G75, IBE160 høst 2026), skrevet med samme oppbygging som
[`technology.md`](technology.md) for `pytagoras-website-v2`, slik at de to kan leses side om side. `technology.md` beskriver en
fullstack-plattform i drift; denne fila beskriver hva som er tatt med, hva som er tilpasset og hva som er utelatt for en lokal
studieapp.

Kilder: [arkitekturdokumentet](architecture-G75-andersen-drage-2026-11-18/ARCHITECTURE-SPINE.md) (AD-1 til AD-21),
`compose.yaml`, `.env.example`, `proxy/pyproject.toml`, `web/package.json` og `.github/workflows/ci.yml`.
**Ingen hemmeligheter er lest eller gjengitt** – bare navnene på variablene.

**Status 2026-11-22:** story 1.1 (oppstart med én kommando, tom app, grønn testkjøring) er ferdig; resten er planlagt og bygges
story for story. Versjonene under er de som er valgt i arkitekturen.

---

## 1. Hva systemet er

En lokal læringsapp: studenten laster opp et fagnotat (`.txt`, `.md`, `.docx` eller tekst-PDF), og appen lager nøkkelbegreper,
flashcards og quiz med en KI-modell. **Hvert kort og spørsmål viser et sitat fra notatet**, og koden sjekker at sitatet faktisk
står i notatet (Quote Check) før kortet vises. Fremgangen lagres i nettleseren, og neste runde prioriterer begrepene studenten
er usikker på.

Det finnes ingen brukerkontoer, ingen server-database og ingen hosting. Appen kjører på maskinen til studenten eller sensor
med `docker compose up`.

**Prinsippet fra Pytagoras som er tatt med:** *zero-config / mock-fallback.* Uten API-nøkkel starter appen likevel, og
**Demomodus** kjører hele løkka på ferdig innspilte KI-svar (Fixtures) for eksempelnotatene. Sensor trenger bare Docker.

---

## 2. Tjenestene (runtime-arkitektur)

```
Nettleser  ──  http://localhost:3000
   │
   ▼
┌───────────────────────────┐
│ web (Next.js, next start) │  sider, all logikk på tekst, lagring i nettleseren
│ 127.0.0.1:3000            │  /api/*  ── rewrite ──►  proxy:8000 (Compose-nettverket)
└───────────────────────────┘
                │
                ▼
┌───────────────────────────┐
│ proxy (FastAPI)           │  nøkkel, prompter, KI-kall, validering, Fixtures
│ :8000, ikke publisert     │  lagrer ingenting
└─────────────┬─────────────┘
              ▼
        OpenRouter  →  modellvert med Zero Data Retention
```

| Tjeneste | Rolle | Offentlig? |
| --- | --- | --- |
| `web` | Next.js – skjermer, tekstuttrekk, Quote Check, mestring, lagring (IndexedDB/localStorage) | bare `127.0.0.1:3000` |
| `proxy` | FastAPI – holder nøkkelen og promptene, kaller modellen, validerer svaret, serverer Fixtures i Demomodus | nei (kun Compose-nettverket) |
| `test` | Profil `test`: Vitest + pytest + Playwright med axe mot `web` | nei |
| `web-dev`, `proxy-dev` | Profil `dev`: `next dev` og `uvicorn --reload` med kildekoden montert | `127.0.0.1:3001` og `:8000` |

### Nettverks- og tillitsmodell
- Nettleseren er **single-origin**, som i Pytagoras: den kaller bare relative `/api/*`-stier. Next.js videresender dem til
  proxyen (rewrite i `next.config.ts`, timeout 100 s). Det trengs ingen Caddy og ingen CORS.
- **Proxyen er porten mot KI-leverandøren, ikke en backend.** Den lagrer ingen notatdata, skriver ingen filer og har bare én
  tilstand: en teller for rate limiting i minnet (AD-14).
- **Opphavssjekk i stedet for innlogging:** en `POST` godtas bare med `Origin` fra `ALLOWED_ORIGINS`; andre opphav får 403.
  Live-kall begrenses til `RATE_LIMIT_PER_MIN` (standard 10) per minutt (AD-5).
- **Personvern:** notatteksten sendes bare etter samtykke, bare til OpenRouter, og bare til modellverter med
  `zdr: true, data_collection: "deny"` (AD-13). Notatteksten sendes som JSON-data under en fast avgrensning, aldri som
  instruksjoner, og en injeksjonstest sjekker dette.
- **Logging:** proxyen logger bare metode, sti, statuskode, varighet og feilkode – aldri notattekst eller nøkkel. En test sender
  en markørstreng og sjekker at den ikke havner i logg eller fil.

---

## 3. Proxy (`proxy/`) – tilsvarer Pytagoras' backend, men tynn

| Område | Valg |
| --- | --- |
| Språk/runtime | Python 3.14 (image `python:3.14-slim`), pakkehåndtering **uv** 0.13 (`uv.lock`, `--frozen`) |
| Web-rammeverk | **FastAPI** 0.165 + Uvicorn 0.54 (access-loggen slått av) |
| Validering | **Pydantic** 2.14 – eneste kilde til API-kontrakten (AD-4) |
| KI | **pydantic-ai-slim[openrouter]** 2.71 mot **OpenRouter**, strukturert JSON-utdata (`NativeOutput`) |
| Demo | `proxy/fixtures/{noteHash}.json` – innspilte råsvar, kjøres gjennom samme validering som live |
| Tester | pytest 9.2 + httpx 0.28, modellen stubbet |

**Endepunkter (bare tre, AD-6):**

| Endepunkt | Gjør |
| --- | --- |
| `GET /api/status` | `{keyConfigured, model, provider, promptVersion}` – nettleseren spør ved oppstart |
| `POST /api/study-set` | Passasjer inn, nøkkelbegreper med flashcards, quiz og oppsummering ut (`mode: "live"` eller `"demo"`) |
| `POST /api/simpler` | «Forklar enklere» for ett kort eller spørsmål |

Alle feil er en HTTP-status pluss `{code}`, der `code` er en tekstnøkkel i `messages.ts` (f.eks. `err.noKey`, `err.generation`).
Rå feiltekst fra leverandøren når aldri studenten.

**Mønstre fra Pytagoras som er tatt med:** FastAPI + pydantic-ai + OpenRouter, uv med låst lockfil, mock-fallback uten nøkkel,
og kontrakt fra Pydantic. **Nytt her:** TypeScript-typene (`web/api/schema.d.ts`) genereres fra `/openapi.json`, og CI feiler
hvis fila ikke stemmer med `schemas.py`.

---

## 4. Frontend (`web/`)

| Område | Valg |
| --- | --- |
| Rammeverk | **Next.js** 16.4 (App Router, `next start` på produksjonsbygg), **React** 19.3, **TypeScript** 6.0 |
| Stil/UI | Egne designtokens i `styles/tokens.css` (fra DESIGN.md) + **CSS Modules** + **Radix Primitives** 1.8 (Dialog, DropdownMenu, Tabs, Switch). Ingen Tailwind, ingen ferdig komponentbibliotek, ingen web-fonter |
| Tekst i UI | Alle strenger i `i18n/messages.ts` (bokmål), `<html lang="nb">` |
| Lagring | **IndexedDB** via `idb` 8.0 (notater, kortsett, fremgang, runder) + **localStorage** (innstillinger, samtykke). **Zod** 4.6 validerer alt som leses |
| Tekstuttrekk | Web Worker: `TextDecoder` (txt/md), **mammoth** 1.13 + **htmlparser2** 12.0 (docx), **unpdf** 2.2 (PDF) |
| Should-funksjoner | `features.ts` med ett boolsk flagg per funksjon (Arkiv, viktighet, mørk modus, hurtigtaster …) |
| Tester | **Vitest** 5.1 (ren logikk og uttrekk), **Playwright** 1.65 + **@axe-core/playwright** 4.14 (e2e og tilgjengelighet) |
| Docker | flertrinns `node:26-slim`: `npm ci` → `next build` → `next start` |

**Struktur (AD-3, AD-11):** `core/` er ren TypeScript uten React, nettverk eller klokke – her ligger normalisering, passasjer,
Note Hash, Quote Check, mestring, rundesammensetning og poeng. Rundt den ligger `app/` og `components/` (skjermer),
`extract/` (Web Worker), `storage/` (eneste kode som rører nettleserlagring) og `api/` (eneste kode som kaller nettverket).

**Mønstre fra Pytagoras som er tatt med:** Next.js App Router, Radix UI, Vitest + Playwright, feature flags i én fil
(tilsvarer `registry.ts`). **Utelatt:** Tailwind/shadcn, TanStack Query, TipTap, Univer, Recharts og resten – appen har ingen
editor, ingen server-data å hente og ingen diagrammer.

---

## 5. Infrastruktur og drift

| Del | Valg |
| --- | --- |
| Lokal kjøring | **Docker Compose** (v5.5+): `docker compose up` bygger og starter `web` og `proxy`. `web` venter til proxyens healthcheck er grønn |
| Tester | `docker compose run --rm test` – samme kommando lokalt og i CI, uten nøkkel |
| CI | **GitHub Actions** (`.github/workflows/ci.yml`): bygg, testkjøring, kontrakt-diff |
| Production / hosting | Ingen. Appen er lokal (PRD §7) |
| Database, fil-lagring, cache | Ingen på serversiden. Alt studenten lagrer, ligger i nettleseren |
| Backup | Ingen på serversiden. Eksport/import av et notat med fremgang er en Should-funksjon (FR-22) |
| Overvåkning | Ingen. Proxyen har en healthcheck på `/api/status` |
| Release | `main` er arbeidsgren; hver story får egen gren og PR, og CI skal være grønn før merge |

---

## 6. Nøkler og miljøvariabler

Legende: 🔴 hemmelig (aldri i git) · 🟡 ikke-hemmelig konfig · ⚪ valgfri (Demomodus uten).

Bare **proxyen** leser `.env` (`env_file` med `required: false`). Alle variabler unntatt nøkkelen har standardverdi i
`compose.yaml`, og `.env.example` lister dem uten verdier. `web` får ingen miljøvariabler og ingen `NEXT_PUBLIC_*` – nettleseren
har ingen hemmeligheter og ingen miljøspesifikke URL-er.

| Variabel | Type | Standard | Merknad |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | 🔴 ⚪ | tom | openrouter.ai/keys. Tom = Demomodus og `err.noKey` ved live-forsøk. **Opprett med kredittgrense** |
| `OPENROUTER_MODEL` | 🟡 | `anthropic/claude-haiku-5.5` | Foreløpig. Endelig modell velges med `web/scripts/evaluate.ts` på referansenotatene |
| `GENERATION_TIMEOUT_S` | 🟡 | `40` | Per forsøk. Totalbudsjett 85 s i proxyen, 90 s i nettleseren (AD-7) |
| `SIMPLER_TIMEOUT_S` | 🟡 | `15` | «Forklar enklere», ett forsøk |
| `ALLOWED_ORIGINS` | 🟡 | `http://localhost:3000,http://127.0.0.1:3000` | `dev`-profilen legger til port 3001 og 8000 |
| `RATE_LIMIT_PER_MIN` | 🟡 | `10` | Bare live-kall teller; `test`-profilen hever den |

Sammenlignet med `technology.md` kapittel 6 faller alt dette bort: `DATABASE_URL`, `JWT_SECRET`, Supabase-, Stripe-, Vipps-,
Resend-, Fiken-, Redis-, backup- og capability-token-nøkler, `COMPANY_*` og alle `FEATURE_*`/`NEXT_PUBLIC_FEATURE_*` som
miljøvariabler (flaggene ligger i koden, se kapittel 4).

**Kostnad (AD-13):** omtrent USD 0,002–0,006 per notat med novemberpriser 2026 (inntil 0,012 med ett nytt forsøk). «Forklar
enklere» koster rundt en tidel av det per kall.

---

## 7. Konkrete kontoer/tjenester du må opprette for å replikere

| # | Tjeneste | Brukes til | Påkrevd? |
| --- | --- | --- | --- |
| 1 | **Docker Desktop** | kjøre appen og testene | ja |
| 2 | **OpenRouter** | KI-kall for egne notater | nei – Demomodus virker uten |
| 3 | **GitHub** | repo og CI | ja for utvikling, nei for å kjøre |

Minimum for å kjøre: Docker. Minimum for egne notater: i tillegg `OPENROUTER_API_KEY` i `.env`.

---

## 8. Hva er tatt med fra Pytagoras, og hvorfor

| Fra `technology.md` | I G75 | Hvorfor |
| --- | --- | --- |
| FastAPI + Next.js | **Beholdt** (AD-1) | Samme oppsett som referanseoppsettet fra faglærer; Python passer pydantic-ai, TypeScript passer UI |
| pydantic-ai mot OpenRouter | **Beholdt** | Bytte modell uten å bytte kode; ZDR-ruting |
| Mock-fallback uten nøkler | **Beholdt** som Demomodus (AD-12) | Sensor skal kunne kjøre alt uten nøkkel |
| Docker Compose lokalt | **Beholdt** (AD-2) | Én kommando, samme versjoner på alle maskiner |
| Single-origin `/api` | **Beholdt**, via Next-rewrite i stedet for Caddy (AD-5) | Ingen CORS, én tjeneste mindre |
| Feature flags | **Tilpasset**: én fil `features.ts` i stedet for miljøvariabler (AD-17) | Should-funksjoner skal kunne kuttes uten døde knapper |
| Radix UI, Vitest, Playwright | **Beholdt** | Tilgjengelig tastaturhåndtering; e2e med axe |
| uv med låst lockfil | **Beholdt** | Reproduserbart bygg |
| Caddy, Postgres, Redis, Supabase, Railway | **Utelatt** | Ingen server-data, ingen hosting |
| Innlogging, JWT, capability-tokens | **Utelatt** | Én bruker per nettleser, ingen kontoer |
| Stripe, Vipps, Resend, Fiken | **Utelatt** | Ingen salg, e-post eller regnskap |
| Backup, watchdog, Cloudflare | **Utelatt** | Ingenting å sikkerhetskopiere eller overvåke på serversiden |
| Tailwind, shadcn, TanStack Query, TipTap m.fl. | **Utelatt** | Egne tokens fra DESIGN.md; ingen editor eller server-data |

---

## 9. Sjekkliste for å kjøre og videreutvikle

1. Installer Docker Desktop. Klon repoet.
2. `docker compose up` og åpne <http://localhost:3000>. Uten nøkkel: velg et eksempelnotat (Demomodus).
3. For egne notater: kopier `.env.example` til `.env`, sett `OPENROUTER_API_KEY` (nøkkel med kredittgrense). `.env` er git-ignorert.
4. Tester: `docker compose run --rm test` – Vitest, pytest og Playwright med axe, uten nøkkel.
5. Utvikling med hot reload: `docker compose --profile dev up` (web på port 3001, proxy på 8000).
6. Endrer du `proxy/app/schemas.py`: generer `web/api/schema.d.ts` på nytt (`npm run gen:api`), ellers feiler CI.
7. Endrer du en prompt: øk `PROMPT_VERSION`. Endrer du uttrekk eller normalisering: øk `normalizationVersion` og spill inn
   Fixtures på nytt i samme commit.
8. Ny Should-funksjon: legg flagget i `features.ts`, slå det på i storyen som fullfører funksjonen.
