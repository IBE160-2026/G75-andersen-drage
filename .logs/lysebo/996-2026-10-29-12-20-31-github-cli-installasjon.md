# GitHub CLI-installasjon

## 2026-10-29 kl. 12:20 — lysebo

### Oppgave
Brukeren ba om å få installert GitHub CLI (`gh`).

### Plan
- Installerte med `winget install --id GitHub.cli --exact`.
- Første forsøk feilet med kode 1602 fordi UAC-godkjenningen ble avbrutt. Andre forsøk lyktes etter at brukeren godkjente.

### Resultat
- `gh` 2.103.3 er installert i `C:\Program Files\GitHub CLI`, utenfor repoet.
- `gh auth status`: ikke innlogget ennå. Innlogging gjøres med `gh auth login`.
- Nye terminaler (og Claude Code etter omstart) finner `gh` i PATH.

### Åpne punkter
Ingen.

## 2026-11-25 kl. 07:16 — lysebo

### Oppgave
PR #17 kunne ikke opprettes med `gh`, fordi kommandoen manglet. Tor ba meg finne stien og deretter installere den på nytt.

### Plan
- Lette etter `gh.exe` i vanlige installasjonsmapper og i PATH, og sjekket `winget list --id GitHub.cli`. Den fantes ikke noe sted, og `C:\Program Files\GitHub CLI` var borte. Årsaken er ukjent; det kan være IT-opprydding på Enterprise-PC-en.
- Installerte med `winget install --id GitHub.cli --exact`.

### Resultat
- `gh` 2.105.0 er installert i `C:\Program Files\GitHub CLI\gh.exe`.
- `gh auth status` viser at den ikke er innlogget.
- Claude Code må startes på nytt for å finne `gh` i PATH. Fram til da brukes full sti.

### Åpne punkter
- Kjør `gh auth login` (interaktivt, må gjøres av Tor).
