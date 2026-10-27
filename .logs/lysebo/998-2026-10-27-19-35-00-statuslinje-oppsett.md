# Statuslinje-oppsett

## 2026-10-27 kl. 19:35 — lysebo

### Oppgave
Brukeren ba om oppsett av statuslinje i Claude Code (`/statusline-setup`, som ikke var installert som kommando).

### Plan
- `statusline-setup`-agenten laget først et PowerShell-skript, men settings-endringen med `-ExecutionPolicy Bypass` ble blokkert av tillatelsessjekken.
- Maskinen har `MachinePolicy = AllSigned` (gruppepolicy), så usignerte `.ps1` kjører uansett ikke, og `jq` er ikke installert.
- Brukeren godkjente anbefalt løsning: Git Bash-skript uten `jq`.

### Resultat
- Laget `~/.claude/statusline.sh`: viser `<modell> | <mappe> | <git-gren>`. Testet med eksempel-JSON → `Opus 5.5 | G75-andersen-drage | main`.
- La til `statusLine` (`bash ~/.claude/statusline.sh`) i `~/.claude/settings.json`; eksisterende nøkler bevart.
- Ubrukt `~/.claude/statusline.ps1` fra første forsøk ligger fortsatt der.
- Endringene er brukerkonfig utenfor repoet, ikke committet.

### Åpne punkter
Ingen.
