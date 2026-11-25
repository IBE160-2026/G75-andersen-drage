# Retro-tiltak 1: godkjenn Microcopy

## 2026-11-25 kl. 07:53 — lysebo

### Oppgave
Ta Epic 1-retro-tiltak 1: godkjenn eller endre alle Microcopy-utkast i EXPERIENCE.md i én runde (D-11–D-16 og eldre utkast) før Epic 2.

### Plan
- Samlet utkastene i to grupper. A: allerede i appen (`web/i18n/messages.ts`, D-11–D-16). B: ikke bygd ennå (Epic 2–4).
- Tor godkjente A uendret og B med to endringer (alternativene for `quiz.wrong` og `storage.unavailable`).
- Retro: [epic-1-retro-2026-11-24.md](../../.docs/implementation-artifacts/epic-1-retro-2026-11-24.md) (A5, tiltak 1).

### Resultat
- **EXPERIENCE.md › Microcopy:** alle rader er merket *(approved)* (2026-11-25), og ingen utkast gjenstår. De splittede nøklene fra D-11, D-12, D-13, D-14 og D-16 har fått egne rader. Statusavsnittet og [OPEN]-linjen er oppdatert.
- **Endrede tekster:**
  - `quiz.wrong` er nå «Feil. Rett svar er {svar}.», også i Do/Don't-tabellen, i flyten og i akseptkriteriet i `epics.md`.
  - `storage.unavailable` er nå «Fremgangen din lagres ikke.», også i Do/Don't-tabellen.
- **UX-`.memlog.md`:** ny beslutningslinje. Den gamle `quiz.wrong`-teksten var Tors egne ord derfra.
- **issues.md:** seks Microcopy-punkter er lukket (2026-11-12 ux-design og stories 1.9, 1.10, 1.11, 1.12, 1.14).
- **sprint-status:** `epic-1-retro-item-1` står som `done`.
- **`web/i18n/messages.ts`:** uendret, fordi ingen av de endrede nøklene er bygd ennå.
- **Git:** commit 7975c70 på `docs/retro-item-1-microcopy`, [PR #18](https://github.com/IBE160-2026/G75-andersen-drage/pull/18), merget til main som 5918af1 etter grønn CI. Grenen er slettet.

### Åpne punkter
- `mockups/key-quiz.html` og `key-quiz.png` viser fortsatt den gamle `quiz.wrong`-teksten («Det var nok feil, rett svar er C.»). De er ikke oppdatert fordi de er historiske designfiler. Oppdater dem hvis de skal vises i README eller rapporten.
