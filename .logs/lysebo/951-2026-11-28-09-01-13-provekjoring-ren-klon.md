# Prøvekjøring fra ren klon (M2)

## 2026-11-28 kl. 09:01 — lysebo

### Oppgave
Generalprøve på story 5.4 ved milepæl M2: klon `main`, følg README, fullfør en Demo-runde på under 15 minutter med tidtaking, kjør testkommandoen uten nøkkel, sjekk CI, og logg funnene i README.

### Plan
- Klonet fra GitHub til en tom mappe utenfor repoet. Stoppet appen som kjørte, så port 3000 var ledig.
- Agenten bygde uten cache, startet appen og kjørte testkommandoen. Tor tok Demo-runden i Edge InPrivate og tidtok den.
- Begrensning: dette er ikke en ren maskin. Base-imagene lå allerede lokalt, og testimagene gjenbrukte cachede lag. Den endelige 5.4-kjøringen bør gjøres i Windows Sandbox, i en ny brukerkonto eller på en annen PC.

### Resultat
- Bevis i [.docs/qa/fresh-clone-rehearsal-2026-11-28.md](../../.docs/qa/fresh-clone-rehearsal-2026-11-28.md), commit cc11e4f.
- Kloning 7 s, bygg og oppstart 1 min 27 s, Demo-runde ca. 2 min (08:58–09:00). Fra klon til Resultat tok det ca. 9 min, under kravet på 15 min (SM-4).
- `docker compose run --rm test` var grønn i klonen uten `.env`: Vitest 610, pytest 173, Playwright 155 på 1 min 44 s. Siste CI på `main` er grønn (SM-5).
- Funn i README: R1 mangler kloningssteg og URL (lav). R2 mangler hurtigstart for Demo-runden (middels; Tor måtte spørre hvordan runden startes). R3 sier ikke at første oppstart bygger imagene (lav). R4 sier ikke at port 3000 må være ledig (lav).
- Ryddet etterpå: klonens containere og nettverk er stoppet og fjernet, og den vanlige appen er startet igjen. Klonens imager (`g75-clone-*`) og mappa i scratchpad er beholdt.

### Åpne punkter
- Rett R1–R4 i README (seksjonen «Kom i gang») før feature freeze 9.12. Kjør deretter de berørte stegene på nytt (story 5.4 AC 1).
- Story 5.4 skal kjøres på en ren maskin (Windows Sandbox, ny brukerkonto eller annen PC) senest 12.12.

## 2026-11-28 kl. 09:08 — lysebo

### Oppgave
Rett README-funnene fra prøvekjøringen i samme PR (Tor), og kjør de berørte stegene på nytt.

### Plan
- Ny seksjon «Kom i gang» rett under «Forutsetninger»: 6 nummererte steg fra kloning til Resultat.
- Kjør steg 1–2 på nytt fra en ny klon, og sjekk knappetekstene mot `web/i18n/messages.ts`.

### Resultat
- README: «Kom i gang» retter R1–R4. Under arbeidet med R1 dukket R5 opp: «Ingenting annet trengs» stemte ikke, fordi kloning krever Git. Nå står det at Git er valgfritt, med ZIP-nedlasting som alternativ.
- Ny kjøring: repoet er offentlig og ZIP-lenken gir 200. Ny klon og `docker compose up` gir `✓ Ready` på en `web-1`-linje, og appen svarer 200. Mellomrommene i logglinja varierer, så README siterer ikke linja bokstavelig.
- `.docs/qa/fresh-clone-rehearsal-2026-11-28.md` er oppdatert med R5, ny kjøring og resultat.
- Commits 0ee97d0 (prøvekjøringen) og 7118f94 (README) på `docs/fresh-clone-rehearsal-m2`, pushet, PR #34 (https://github.com/IBE160-2026/G75-andersen-drage/pull/34).

### Åpne punkter
- Story 5.4 skal kjøres på en ren maskin senest 12.12 (står allerede i issues.md).

