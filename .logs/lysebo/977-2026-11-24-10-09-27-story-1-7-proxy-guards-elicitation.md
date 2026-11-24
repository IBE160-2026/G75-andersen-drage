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
