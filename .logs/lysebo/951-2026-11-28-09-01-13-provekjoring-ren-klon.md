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
