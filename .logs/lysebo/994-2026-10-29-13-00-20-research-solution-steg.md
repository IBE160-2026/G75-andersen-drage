# Research: Solution-stegene i product brief

## 2026-10-29 kl. 13:00 — lysebo

### Oppgave
Tor ønsket research mot de fem «Solution»-stegene i product brief (opplasting, 80/20-kjerne, flashcards + «Explain simpler», quiz med score, repetisjon av feil svar) samt lokal lagring — fra teknisk, faglig (forskning) og konkurrent-vinkel.

### Plan
- `bmad-deep-recon`, Run-modus, preset `standard`, validering `normal`, red team av.
- Tre parallelle forskere (teknisk T1–T4, akademisk A1–A4, konkurrenter), deretter én verifikator på fire bærende påstander.
- Planen er logget i `.docs/planning-artifacts/research/technical-learning-assistant-solution-steps-2026-10-29/.memlog.md`.

### Resultat
- Rapport: `.docs/planning-artifacts/research/technical-learning-assistant-solution-steps-2026-10-29/research.md` (41 kilder, 6 verifiserte / 9 uverifiserte påstander, ingen omgjort; mekanisk sitatsjekk OK). Digests i `digests/`.
- Hovedfunn: alt kan bygges med få avhengigheter (tekstuttrekk i nettleseren, skjemastyrt JSON, localStorage). Anthropic Citations kan ikke kombineres med structured outputs → sporbarhet via chunk_id + ordrett sitat sjekket i kode.
- Forskning: selvtesting er godt belagt (g ≈ 0,50). Å fjerne riktig besvarte spørsmål fra testing gir dårligere husking (~80 % vs 33–36 %). Ingen empiri for 80/20 eller ELI5.
- Konkurrenter: NotebookLM dekker allerede hele loopen inkl. «Only cards you missed». Gjenstående forskjeller: verifisert kildeutdrag på hvert element, og ingen innlogging.
- Ikke gjort: semantisk sitatsjekk med egen subagent, `bmad-review` på rapporten og HTML-briefing.
- Brief oppdatert etter R4 og R5 (steg 5, Success Criteria, Scope, «What Makes This Different»), lest og godkjent av Tor. Brief + research committet i `10ef45c` og pushet.

- Priser for OpenAI og Gemini hentet fra offisielle prissider og lagt inn i research.md (kostnadstabell under steg 2, R8, kilder [42][43], staleness-kart). Haiku 5.5 og `gpt-6-luna` koster det samme ($0,10 / $0,50 per mill. tokens); Gemini Flash dobles 2027-01-01; Gemini gratisnivå bruker innholdet til å forbedre Googles produkter.

### Åpne punkter
- Sammenlign kvaliteten på de billige modellene på 2–3 referansenotater før modellvalget i arkitekturen.
- Test NotebookLM manuelt: vises kilde på kortet, og hvordan scores quizen?
