# Fiks: system-prompt-escapes

## 2026-11-24 kl. 08:29 — lysebo

### Oppgave
Rette feilen i `proxy/app/prompts/system.md` linje 32 (fra issues.md, 2026-11-24). Linja hadde mistet JSON-escapene for `<`, `>` og `&`, så modellen fikk ikke vite hvilke escapes den skal dekode før den skriver `quote`. Feilen påvirker Quote Check i 1.8.

### Plan
- Rette linja slik at den navngir escapene som `render_passages` i `proxy/app/llm.py` faktisk skriver (unicode-escapes for 3c, 3e og 26).
- Bumpe `PROMPT_VERSION` fra 1 til 2.
- Legge til en test som binder prompten til `render_passages`.

### Resultat
- Gren `fix/system-prompt-escapes`, commit `6251765`, pushet. PR #7: https://github.com/IBE160-2026/G75-andersen-drage/pull/7 (inneholder også den lokale loggcommiten `8d58452` fra 1.6-walkthrough, som ikke var pushet til main).
- `proxy/app/prompts/system.md`: linja navngir nå de tre escapene.
- `proxy/app/config.py`: `PROMPT_VERSION = "2"`. Testen i `tests/test_study_set.py` er oppdatert.
- Ny test `test_system_prompt_names_the_escapes_render_passages_uses` sjekker at hver escape som `render_passages` skriver, står i backticks i `SYSTEM_PROMPT`.
- 108 proxy-tester består i Docker-test-containeren.
- Årsak funnet: verktøylaget mellom agenten og skallet gjør backslash-u-escapes om til tegnet før kommandoen kjører. Det var trolig slik den opprinnelige feilen oppstod. Løsning: bygg strengen med `chr(92)` og kontroller råbytes med `od -c`.
- Lukket issues-punktet om system.md:32.
- Den kjørende proxy-containeren (startet for 18 t siden) har fortsatt prompt v1 til den startes på nytt.

### Åpne punkter
Ingen.
