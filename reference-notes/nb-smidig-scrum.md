# Smidig utvikling og Scrum – mine notater

*IBE160 Programmering med KI, høsten 2026. Egne notater til eksamen.*

## 1. Hvorfor smidig?

Tradisjonell systemutvikling fulgte ofte **fossefallsmodellen**: krav, design, implementering, testing og drift kommer etter hverandre i faste faser. Hver fase skal være ferdig før neste starter. Problemet er at kundens behov endrer seg underveis, og at feil i kravene først oppdages sent, når de er dyre å rette.

Smidig utvikling (engelsk: *agile*) svarer på dette ved å levere i korte runder. Teamet lager en liten, fungerende del av produktet, viser den fram, får tilbakemelding og justerer planen. Endring blir sett på som normalt, ikke som et avvik.

## 2. Det smidige manifestet (2001)

I 2001 skrev sytten utviklere det smidige manifestet. Det består av fire verdier. Teksten til høyre har verdi, men teksten til venstre verdsettes høyere:

- **Individer og samspill** framfor prosesser og verktøy
- **Programvare som virker** framfor omfattende dokumentasjon
- **Samarbeid med kunden** framfor kontraktsforhandlinger
- **Å reagere på endringer** framfor å følge en plan

Bak verdiene ligger tolv prinsipper. De viktigste å huske: lever fungerende programvare ofte (helst med noen ukers mellomrom), ta imot endrede krav også sent i prosjektet, la forretningsfolk og utviklere jobbe sammen daglig, og la teamet reflektere jevnlig over hvordan det kan bli mer effektivt.

Merk: manifestet sier ikke at dokumentasjon er unødvendig. Det sier bare at fungerende programvare er det viktigste målet på framdrift.

## 3. Scrum – et rammeverk

**Scrum** er det mest brukte smidige rammeverket. Det er bevisst lite: det beskriver roller, hendelser og artefakter, men ikke hvordan teamet skal programmere eller teste. Scrum bygger på **empirisk prosesskontroll**, altså at beslutninger tas ut fra det man faktisk observerer. Tre søyler holder dette oppe:

1. **Åpenhet** – arbeidet og framdriften er synlig for alle som har interesse av resultatet.
2. **Inspeksjon** – teamet sjekker jevnlig artefaktene og framdriften mot målet.
3. **Tilpasning** – når noe avviker, justerer teamet prosessen eller produktet så raskt som mulig.

### 3.1 Roller (ansvar)

Et Scrum-team er lite, typisk ti personer eller færre, og har tre ansvarsområder:

- **Produkteier** (Product Owner) har ansvar for å maksimere verdien av produktet. Produkteieren eier og prioriterer produktkøen og bestemmer hva som er viktigst å lage først. Det er én person, ikke en komité.
- **Scrum Master** hjelper teamet å forstå og bruke Scrum, fjerner hindringer og sørger for at hendelsene blir gjennomført og holdt innenfor tidsrammen. Scrum Master er en tjenende leder, ikke en prosjektleder som fordeler oppgaver.
- **Utviklere** er de som lager inkrementet. De planlegger sitt eget arbeid i sprinten og er selvorganiserende: ingen utenfra forteller dem hvordan kravene skal gjøres om til fungerende programvare.

### 3.2 Hendelser

Alle hendelser i Scrum er **tidsbegrensede** (*timeboxed*), det vil si at de har en fast maksimal lengde.

- **Sprint**: en fast periode på én måned eller kortere, ofte to uker. En ny sprint starter straks den forrige er ferdig. Under sprinten endres ikke sprintmålet.
- **Sprintplanlegging**: starter sprinten. Teamet svarer på tre spørsmål: hvorfor er denne sprinten verdifull (sprintmålet), hva kan bli ferdig, og hvordan skal arbeidet gjøres.
- **Daglig Scrum** (*daily standup*): et møte på høyst 15 minutter hver dag, der utviklerne sjekker framdriften mot sprintmålet og justerer planen for neste dag.
- **Sprintgjennomgang** (*sprint review*): på slutten av sprinten viser teamet fram det som er laget til interessentene og får tilbakemelding. Produktkøen kan endres som følge av dette.
- **Retrospektiv**: siste hendelse i sprinten. Teamet ser på seg selv – samarbeid, verktøy og arbeidsmåte – og velger forbedringer til neste sprint. Gjennomgangen handler om *produktet*, retrospektivet om *prosessen*.

### 3.3 Artefakter

- **Produktkø** (*product backlog*): en ordnet liste over alt som kan trengs i produktet. Den er aldri ferdig og endres hele tiden. Elementene høyest oppe er de best beskrevne.
- **Sprintkø** (*sprint backlog*): sprintmålet, elementene som er valgt fra produktkøen, og planen for å levere dem. Den eies av utviklerne.
- **Inkrement**: summen av alt som er ferdig, et brukbart steg mot produktmålet. Et element regnes bare som en del av inkrementet når det oppfyller **definisjonen av ferdig** (*Definition of Done*), for eksempel at koden er testet, gjennomgått og dokumentert.

## 4. Brukerhistorier og estimering

Elementer i produktkøen skrives ofte som **brukerhistorier**:

> Som *student* vil jeg *laste opp et notat* slik at *jeg kan øve på de viktigste begrepene*.

En god brukerhistorie har **akseptansekriterier** som sier konkret når den er oppfylt. Huskeregelen INVEST sier at en historie bør være uavhengig, forhandlingsbar, verdifull, estimerbar, liten og testbar.

Mange team estimerer med **historiepoeng** (*story points*) i stedet for timer. Poengene måler relativ størrelse og usikkerhet, ikke tid. Teknikken *planning poker* lar alle utviklerne vise sitt estimat samtidig, slik at de ikke påvirker hverandre. Over noen sprinter får teamet en **hastighet** (*velocity*): hvor mange poeng det i snitt fullfører per sprint. Hastigheten brukes til å planlegge, ikke til å sammenligne team.

## 5. Kanban – et alternativ

**Kanban** kommer fra Toyotas produksjonssystem. I stedet for sprinter har Kanban en kontinuerlig flyt av arbeid over en tavle med kolonner, for eksempel *Å gjøre – Pågår – Test – Ferdig*. Den viktigste regelen er å **begrense pågående arbeid** (*WIP-grense*): en kolonne kan bare ha et visst antall kort samtidig. Det tvinger teamet til å gjøre ferdig før det starter på noe nytt, og det gjør flaskehalser synlige. Kanban måler ofte **gjennomløpstid**, altså hvor lang tid et kort bruker fra start til ferdig.

| | Scrum | Kanban |
|---|---|---|
| Rytme | Faste sprinter | Kontinuerlig flyt |
| Roller | Produkteier, Scrum Master, utviklere | Ingen faste roller |
| Endring underveis | Ikke i sprintmålet | Når som helst |
| Viktigste mål | Hastighet | Gjennomløpstid |

## 6. Smidig og KI-assistert utvikling

I IBE160 bruker vi KI-agenter til å skrive både dokumenter og kode. Smidige prinsipper passer godt her: små brukerhistorier med tydelige akseptansekriterier gir agenten en avgrenset oppgave, og automatiske tester fungerer som en definisjon av ferdig som også agenten kan sjekke. Et retrospektiv etter hver epic er et godt sted å vurdere hva KI-en gjorde bra og dårlig.

## 7. Huskeliste til eksamen

- Fossefall = faste faser etter hverandre; smidig = korte runder med tilbakemelding.
- Manifestet: fire verdier, tolv prinsipper.
- Scrum: tre søyler (åpenhet, inspeksjon, tilpasning), tre roller, fem hendelser, tre artefakter.
- Gjennomgang = produktet, retrospektiv = prosessen.
- Definisjonen av ferdig avgjør hva som er en del av inkrementet.
- Kanban: flyt og WIP-grenser i stedet for sprinter.
