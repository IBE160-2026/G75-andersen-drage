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
- Ikke gjort: semantisk sitatsjekk med egen subagent, `bmad-review` på rapporten og HTML-briefing. Research-filene er ikke committet.

### Åpne punkter
- Vurder å endre steg 5 i brief til «feil svar først, pluss tidligere riktige i senere runder» (R4 i rapporten).
- Skriv om «What Makes This Different» i brief: dropp «closed loop», løft fram verifisert kildeutdrag + ingen innlogging (R5).
- Hent offisielle priser for OpenAI og Gemini før valg av språkmodell i arkitekturen.
- Test NotebookLM manuelt: vises kilde på kortet, og hvordan scores quizen?
