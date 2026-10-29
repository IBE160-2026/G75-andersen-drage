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
