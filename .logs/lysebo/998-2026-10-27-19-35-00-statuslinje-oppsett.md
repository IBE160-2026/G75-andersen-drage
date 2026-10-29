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

## 2026-10-29 kl. 10:21 — lysebo

### Oppgave
Brukeren ba om statuslinje-oppsett fra shellens PS1, og bestemte deretter at statuslinjen skal vise det den viser nå. Loggen skulle oppdateres så den stemmer med faktisk innhold.

### Plan
- `statusline-setup`-agenten fant ingen PS1 (ingen `~/.bashrc`, `~/.bash_profile`, `~/.zshrc` eller `~/.profile`) og endret ingenting.
- Leste og testet `~/.claude/statusline.sh` for å dokumentere hva den faktisk viser.

### Resultat
- Ingen endringer i statuslinjen; `statusLine` i `~/.claude/settings.json` er fortsatt `bash ~/.claude/statusline.sh`.
- Skriptet viser nå mer enn beskrevet i forrige seksjon: `<modell> | <mappe> | <git-gren> | ctx <n>% | 7d: <tid igjen> (<n>% brukt)`. Context- og 7-dagersdelen vises bare når Claude Code sender feltene. Skriptet bruker `node` til JSON-parsing (ikke `jq`).
- Testet med eksempel-JSON → `Opus 5.5 | G75-andersen-drage | main | ctx 12%`.

### Åpne punkter
Ingen.
