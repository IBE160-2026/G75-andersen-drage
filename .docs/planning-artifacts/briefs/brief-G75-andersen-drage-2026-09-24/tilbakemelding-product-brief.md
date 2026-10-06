# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G75 – G75-andersen-drage |
| **Product brief** | `.docs/planning-artifacts/briefs/brief-G75-andersen-drage-2026-09-24/brief.md` (commit `2f4d01d`) |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

Briefen er skrevet på engelsk; tilbakemeldingen er på norsk.

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Kjerneløkken er tydelig og fornuftig avgrenset: last opp egne notater → generer sammendrag, flashcards og quiz → test deg selv aktivt. V1 har bare fire punkter, og lydoppsummering og videoanbefalinger er riktig plassert som «stretch».
2. «What Makes This Different» er ærlig: dere sier rett ut at ChatGPT, NotebookLM, Quizlet og Anki allerede gjør deler av dette, og at verdien ligger i en samlet arbeidsflyt, ikke ny KI-teknologi.
3. Visjonen er nøktern og holder fokus på dybde (bedre forankring i kildematerialet, repetisjon av det studenten svarer feil på) i stedet for flere funksjoner.

**De viktigste endringene:**

1. Briefen har mange `[ASSUMPTION]`-merker og åpne spørsmål om form, målgruppe, frist og vurdering. Flere av dem er nå besvart i emnet (bl.a. emnebeskrivelse, sensorveiledning og forslagslista). Avklar dem og fjern merkene, slik at briefen blir et grunnlag for PRD.
2. Suksesskriteriene er ikke konkrete nok til å testes («recognizably grounded», «in a few minutes»). Skriv sjekkbare kriterier, f.eks. hvor mange flashcards og quiz-spørsmål en gitt mengde tekst skal gi, og at hvert spørsmål kan spores til en del av notatet.
3. Briefen sier ikke hvilken språkmodell som skal brukes, hva det koster, eller hvordan sensor kan kjøre appen uten deres API-nøkkel.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Enkel**

**Sammenlignbart med:** 1) AI Study Buddy (enkel) og 8) Foredragsnotater – sammendrag og quizgenerator (enkel). V1 tilsvarer disse forslagene nesten punkt for punkt.

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | Lav | Få egne regler: filvalidering, generering og visning av resultater, og enkel flashcard-gjennomgang. |
| Datamodell – antall entiteter og relasjoner mellom dem | Lav | Dokument, sammendrag, flashcard og quiz-spørsmål. Uklart om noe lagres. |
| Brukere, roller og innlogging | Lav | Ikke nevnt. Uten lagring trengs ingen innlogging. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | Middels | Tre genereringsfunksjoner fra samme kilde. Strukturert output og kontroll av at innholdet er forankret i notatet krever omtanke. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | Middels | Språkmodell-API. Stretch-målene (tekst-til-tale, YouTube Data API) ville lagt til to ekstra tjenester. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | Lav | Ikke relevant. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | Middels | «Upload notes/course material» – avklar format. Ren tekst er enkelt; PDF og Word krever tekstuttrekk. |
| Sikkerhet og personvern | Lav | Egne notater, men innholdet sendes til en ekstern språkmodell. Nevn det for brukeren. |

**Hva vanskelighetsgraden betyr for dere:**

- _Enkel:_ Et enkelt prosjekt gir stor sjanse for å bli ferdig. Vanskelighetsgraden inngår likevel i vurderingen, så for å nå helt opp må dere vise mer i gjennomføringen. Det betyr særlig et gjennomarbeidet design, grundig testing, en tydelig dokumentert prosess og en README som virker. Vurder også om én utvidelse, f.eks. at quizen gir poeng og viser hvilke spørsmål studenten bør repetere, kan løfte prosjektet.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | OK | Fire punkter i v1 er realistisk, med god tid til testing og forbedring. Repoet har foreløpig bare briefen, så det er viktig å komme i gang med PRD. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | Risiko | Kjerneløkken er tydelig, men filformat, lagring, målgruppe og suksesskriterier er uavklart. Det må på plass før PRD. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En enkel webapp med opplasting og LLM-kall passer godt. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | OK | Dere kan vurdere om flashcards og quiz stemmer med egne notater. Lag noen faste notater med forventede nøkkelbegreper. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | Risiko | Filvalidering, at alle tre resultater kommer tilbake i riktig format, og feilhåndtering kan testes automatisk. Dette må stå som kriterier. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | Risiko | Ikke omtalt. Legg inn en demomodus med lagrede svar for et eksempelnotat, eller beskriv oppsett med egen nøkkel. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | Risiko | Språkmodell er ikke valgt. Stretch-målene (lyd og video) ville gitt flere betalte eller nøkkelbaserte tjenester. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart som beskrevet.**

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. Velg én realistisk utvidelse framfor to stretch-mål med eksterne tjenester. En interaktiv quiz med poengsum og repetisjon av feil svar bygger videre på kjernen uten nye API-er; lyd og YouTube-søk gir mer integrasjonsarbeid enn læringsverdi for prosjektet.
2. Bestem filformat for v1 (f.eks. tekst og PDF), og be språkmodellen svare i et fast format som valideres i koden.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Tydelig: last opp egne notater og få sammendrag, flashcards og quiz, som et supplement til egen læring. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Gjenkjennelig: passiv gjenlesing, tid brukt på formatering og improvisert bruk av ChatGPT. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | Juster | Lister resultatene, men ikke flyten. Beskriv hva studenten gjør etter opplasting: blar gjennom flashcards, tar quizen, ser svar. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig og realistisk. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | Juster | «Students» generelt er bredt. Velg en konkret primærbruker, f.eks. en student i et bestemt emne som forbereder seg til eksamen. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Endre | Gjør dem målbare. To av fire kriterier handler om emnet og prosessen, ikke appen. Legg til funksjonelle kriterier som kan bli testtilfeller. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | Juster | V1, stretch og out er tydelig delt. Avklar filformat og om noe lagres, og fjern `[ASSUMPTION]`-merkene. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Nøktern og godt avgrenset. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | Juster | Briefen er et greit utkast, men repoet har bare tre commits. Avklar antakelsene, kom i gang med PRD, og lagre prompts og KI-økter fortløpende. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | Juster | Realistisk, men nokså lite. Planlegg én utvidelse som bygger på kjernen. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | Endre | Skriv testbare kriterier og lag eksempelnotater med forventet resultat. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | Juster | Skisser opplasting, flashcard-visning og quiz, og hvordan feil og ventetid vises. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | Juster | Teknologi er ikke valgt. Hold det enkelt og begrunn valget i arkitekturen. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg demomodus eller tydelig nøkkeloppsett med `.env.example`. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | API-nøkkel i `.env` utenfor Git, og bruk eksempelnotater dere har lov til å dele offentlig. |

## 3. Neste steg for gruppen

1. Gå gjennom alle `[ASSUMPTION]`-merker og åpne spørsmål, ta en beslutning for hvert, og oppdater briefen. Briefen sier at prosjektet leveres «solo»; kontroller at dette stemmer med gruppens sammensetning.
2. Skriv om suksesskriteriene til konkrete, testbare krav, og velg én utvidelse som kan løfte prosjektet når kjernen virker.
3. Velg språkmodell, planlegg demomodus, og gå videre til PRD.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
