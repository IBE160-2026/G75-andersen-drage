# Story 1.7 proxy guards – elicitation av spec

## 2026-11-24 kl. 10:09 — lysebo

### Oppgave
Kjøre bmad-advanced-elicitation på [spec-1-7-proxy-guards.md](../../.docs/implementation-artifacts/spec-1-7-proxy-guards.md), som var i draft, for å finne hull før implementeringen.

### Plan
- Valgte metodene Security Audit Personas og Boundary & Edge Case Sweep, støttet av `proxy/app/main.py`, `config.py`, `compose.yaml`, `Dockerfile` og Next-rewriten.
- Anbefalte et kuttet utvalg av funnene, som Tor godkjente, også endringene i den frosne blokken.

### Resultat
Endringer i specen (ukommittert, filen er fortsatt utracket):
- Always: `hit(origin, limit)` i stedet for grensen i konstruktøren; normalisering av `ALLOWED_ORIGINS`; ugyldig eller < 1 `RATE_LIMIT_PER_MIN` gir 10; vinduet utløper ved `now - t >= 60`; presisert hva som blir registrert (403/413/429 registreres aldri).
- Decisions: invariant for demo-unntaket (ikke telt ⇒ 404 `err.demoOnly` uten modellkall; ved tvil telles requesten); body-grense 8 388 608 byte passerer, +1 gir 413.
- Matrisen: nye rader for dupliserte `mode`-nøkler, eksakte grenser for 8 MiB og 60 s, ugyldig grense, og normalisering av origin.
- Tasks og Code Map: `RateLimiter(clock)`, ekstra `is_counted`-testcaser, `proxy-test` med healthcheck og `read_only`, og endringer i `config.py`.
- Design Notes: trusselmodell (Origin er ikke autentisering), DNS-rebinding på GET er akseptert risiko, rekkefølgen origin → limiter holder minnet begrenset, og antakelsen om én worker.
- Droppet: flere Origin-headere (E2) og `OPTIONS` i matrisen (E7).

### Åpne punkter
- FastAPI sine `/docs` og `/openapi.json` er åpne for GET uten Origin. Vurder `docs_url=None`/`openapi_url=None` (utenfor story 1.7).

## 2026-11-24 kl. 10:37 — lysebo

### Oppgave
Kjøre bmad-build på story 1.7 (proxy-guards) fra den elicitation-justerte specen.

### Plan
- Kortet specen ned fra ca. 2 000 til ca. 1 560 tokens; Tor godkjente den og valgte å fortsette (branch `story/1-7-proxy-guards`).
- Implementerte direkte fra [spec-1-7-proxy-guards.md](../../.docs/implementation-artifacts/spec-1-7-proxy-guards.md), deretter review med tre subagenter (Blind Hunter, Edge Case Hunter, Verification Gap) og triage.

### Resultat
- Commit 78c0f37 (spec ready-for-dev) og 828733f (implementering). Specen er `done`, sprint-status står på `review`.
- `proxy/app/guards.py` (origin, telling, RateLimiter) og guarden i `log_request` i `main.py`. `config.py` har `MAX_BODY_BYTES`, normalisering av origins og fallback for ugyldig grense. Body-en leses med grensen og caches i `request._body`; Starlette spiller ikke av en body som bare er lest med `stream()`.
- Tester: `test_guards.py` (hele matrisen) og `test_retention.py` (markør, ingen skriving til fil, ingen telemetri, `--no-access-log`). 143 pytest-tester består lokalt.
- `compose.yaml`: `proxy-test` og `web-test` på et `internal`-nettverk, uten nøkkel og med grense 1000. `e2e/Dockerfile` kopierer `compose.yaml`. `e2e/guards.spec.ts` har tre tester.
- README («Vern», testprofilen, `PROMPT_VERSION` rettet til 2) og `deviations.md` (D-7 telemetri, D-8 body-grense).
- Review: 16 funn. 5 rettet (blant dem RecursionError ved dyp JSON, og at bare GET/HEAD/OPTIONS kan sendes uten Origin), 8 forkastet som `low` og 3 som `false`. Ingenting utsatt. Se Review Triage Log i specen.
- Ikke verifisert lokalt: Docker kjørte ikke, så compose, Playwright og Vitest er ikke kjørt.

### Åpne punkter
- Kjør `docker compose run --rm --build test` (eller la CI gjøre det) for å verifisere testprofilen på det interne nettverket og `e2e/guards.spec.ts`, særlig at `Origin` overlever Next-rewriten.
- Manuell sjekk: `docker compose up`, og bruk appen fra http://localhost:3000 som før. `curl` med fremmed `Origin` skal gi 403.
- PR for story 1.7, grønn CI og merge; sett deretter 1-7 til `done` i sprint-status.yaml.

## 2026-11-24 kl. 10:52 — lysebo

### Oppgave
Kjøre testene i Docker etter at Docker Desktop var startet.

### Plan
- `docker compose --profile test build` og `docker compose run --rm test`, deretter verifiseringskommandoen i specen mot `docker compose up`.

### Resultat
- Alle suiter besto: Vitest 251, pytest 143, Playwright 76. Alle tre testene i `guards.spec.ts` besto, så `Origin` overlever Next-rewriten, og testprofilen virker på det interne nettverket.
- Mot `docker compose up`: POST med fremmed `Origin` gir 403, `GET /api/status` gir 200, og en demo-POST fra localhost gir 404 `err.demoOnly`. Proxy-loggen viser bare `METHOD path status ms code`.

### Åpne punkter
- Manuell bruk av appen i nettleseren på http://localhost:3000 gjenstår (står allerede i `issues.md`).
- PR for story 1.7 (står allerede i `issues.md`).
