# Product brief-oppdatering

## 2026-10-29 kl. 10:50 — lysebo

### Oppgave
Oppdatere product brief (`brief.md`) med nye ideer fra brukeren og innarbeide faglærerens tilbakemelding fra 2026-10-06, slik at briefen blir et testbart grunnlag for PRD.

### Plan
- Kjørte `bmad-product-brief` i update-modus: leste brief, `.memlog.md` og `tilbakemelding-product-brief.md`.
- Coaching på nye ideer (ELI5, 80/20, Feynman, sokratisk metode) og målgruppe; fast path på tekniske punkter.
- Siste gjennomgang med `bmad-review` (linsene structure og prose).

### Resultat
- Commit `97e2104`: `.docs/planning-artifacts/briefs/brief-G75-andersen-drage-2026-09-24/brief.md` (status `final`) og `.memlog.md` (alle beslutninger logget).
- Beslutninger: 80/20-studenten med dårlig tid før eksamen er primærbruker, og 80/20 er produktprofilen. Utvidelsen er quiz med poeng og repetisjon av feil svar. ELI5 blir en «forklar enklere»-knapp. Feynman og sokratisk metode er droppet. Lyd og video er flyttet til Vision.
- Filformater i v1: txt, Markdown, Word `.docx` og tekstbasert PDF. Ingen innlogging, lokal lagring i nettleseren, demomodus og `.env.example`, varsel om ekstern språkmodell.
- Testbare suksesskriterier: ≥ 80 % dekning av forhåndsmarkerte nøkkelbegreper, sammendrag ≤ 20–25 % av lengden, sporbarhet, JSON-validering.
- Alle `[ASSUMPTION]`-merker er avklart. Ikke pushet.

### Åpne punkter
- Eksakt innleveringsfrist for IBE160 er ukjent.
- Språkmodell (leverandør, modell og kostnad) skal velges og begrunnes i arkitekturen.
