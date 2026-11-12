# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G75 – G75-andersen-drage |
| **PRD vurdert** | `.docs/planning-artifacts/prds/prd-G75-andersen-drage-2026-11-05/prd.md` (status `final`, sist endret 2026-11-05, commit 9756163) |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en sterk PRD med egen tese, ærlig positionering mot NotebookLM og Quizlet, og FR-er som nesten alle kan bli testtilfeller. Risikoen ligger ikke i kvaliteten, men i omfanget for én person med knapt fem uker til levering, og i noen få steder der kjernetesen («neste Round fokuserer på det jeg ikke kan») og detaljkravene ikke helt stemmer med hverandre.

## 2. Dette fungerer godt

- **Ærlig differensiering (§1.3).** Dere skriver at «a closed study loop is therefore not what sets this app apart» og peker ut tre bærende egenskaper (kilde på hvert Item, ingen konto, 80/20-profil). Det gir UX og arkitektur noe konkret å ikke bytte bort.
- **Testbare FR-er og KI-kontroll.** FR-9 (Quote Check med grenser på 20 og 300 tegn), FR-8 (skjemavalidering, én retry, prompt-injection-test), FR-10 (minimum overlevende Items) og FR-17/18 som rene funksjoner med enhetstester viser hvordan KI-funksjonalitet kontrolleres, ikke bare brukes. FR-23 (Demo Mode med Fixtures) og NFR-5 (maks 2 kall per generering) dekker testmodus og kostnad.
- **Motmål og ærlige grenser.** SM-C2 hindrer at pass rate økes ved å løse opp Normalization, og §7 sier rett ut at Quote Check «proves that the source exists, not that the answer is right».

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | sterk | D1–D9 og §11 viser valg og avveininger; åpne spørsmål er reelt åpne. |
| Substans | sterk | Én persona-reise per situasjon, NFR-er med tall, ingen pynte-seksjoner. |
| Strategisk sammenheng | god | Tydelig tese, men FR-18 og FR-7 svekker «fokus på det sentrale» (4.2, 4.3). |
| Testbarhet | sterk | Nesten alle FR-er har målbare konsekvenser; noen NFR-er og meldingstekster er løsere (4.4). |
| Scope og avgrensning | god | Ærlig Non-Goals og Should-liste, men totalen er stor for én person (4.1). |
| Brukbarhet for neste fase | god | Stabile ID-er og glossar; noen interne henvisninger og små avvik mellom UJ og FR (kap. 5). |
| Formtilpasning | god | Passer et KI-støttet læringsverktøy; PRD-en er lang (ca. 6 900 ord) og blander produkt- og kurskrav. |

## 4. Viktigste forbedringer

### 4.1 Omfanget er stort for én person og fem uker
- **Alvorlighet:** høy
- **Hvor:** §8.1 «FR-1 to FR-19, FR-21, FR-23 and FR-24, NFR-1 to NFR-9, and DR-1 to DR-9»; §10 åpne spørsmål 1–3
- **Problem og hvorfor det betyr noe:** 22 FR-er, 9 NFR-er og 9 DR-er (PR per story, CI, QA-logg, pre-delivery-sjekk) skal bygges av én person før 15. desember, mens modellvalg, produktnavn og referansenotater med forventede nøkkelbegreper ennå ikke er avklart. Uten referansenotater kan ikke SM-1 til SM-3 måles, og uten modellvalg kan ikke Consent-teksten (FR-5) skrives. Epics vil bli for mange, og dere risikerer å ende med mange halvferdige deler i stedet for en stabil kjerne.
- **Forslag:** Legg til en kuttrekkefølge i §8, f.eks.: «Kjerne (må være ferdig): FR-1, 3, 6–12, 14, 17, 18, 23, 24. Deretter: FR-4, 5, 13, 15, 19, 21. Kuttes først: FR-20, FR-22, deretter FR-15 og FR-2.» Sett også frist for spørsmål 1 og 3 (f.eks. før epics lages), siden begge styrer testene.

### 4.2 Kjernetesen virker ikke for vanlige notater (FR-18, UJ-2)
- **Alvorlighet:** høy
- **Hvor:** §1.2 «The next Round then focuses on what the student has not yet mastered»; FR-18 «Fewer than 10 eligible concepts: the Round holds all of them»; UJ-2 «The shaky concepts come first, followed by one concept she already knew»
- **Problem og hvorfor det betyr noe:** Et Note har 5–15 Key Concepts og Round-størrelsen er 10. For de fleste notater (som Saras åtte begreper) består derfor hver Round av alle begreper, og kjente begreper repeteres like mye som svake. Da er det bare rekkefølgen som endres, og UJ-2 (kun shaky + ett known) kan ikke oppstå etter FR-18. UX og tester vil bygges på feil forventning.
- **Forslag:** La «fewer than 10»-regelen gjelde bare shaky og new. Eksempel: «When at least one concept is shaky or new, the Round contains those (at most 10) plus `max(1, round(0.2 × number of shaky/new concepts))` known concepts, least recently shown first.» Rett deretter UJ-2 og legg inn en testcase med åtte begreper, tre shaky.

### 4.3 Sammendraget er ikke begrenset til «20 %»
- **Alvorlighet:** medium
- **Hvor:** FR-7 «The summary is at most 25% of the Note's word count»; §1.2 «most central 20%»
- **Problem og hvorfor det betyr noe:** 25 % av et notat på 15 000 ord er 3 750 ord, ikke et «short summary». Tallene 20 og 25 står dessuten mot hverandre, og antall Summary Points har ingen nedre grense, så regelen kan ikke gi en tydelig test.
- **Forslag:** Sett antall i stedet for prosent: «The summary has 5–10 Summary Points, each at most 40 words.» Bruk samme tall i §1.2.

### 4.4 Meldingstekster er på engelsk, grensesnittet på norsk
- **Alvorlighet:** medium
- **Hvor:** NFR-9 «Error messages in this PRD are written in English for the record and are shown in Norwegian»; FR-1 «"Unsupported file type"»
- **Problem og hvorfor det betyr noe:** Testene i FR-1, 3, 5, 11 og 24 er formulert mot engelske strenger som aldri vises. Den som skriver stories og tester må gjette den norske teksten, og testene kan ende med å sjekke feil streng.
- **Forslag:** Gi hver melding en kode (f.eks. `ERR_SCANNED_PDF`) og la FR-ene teste koden. Legg en tabell kode → norsk tekst i `addendum.md` eller UX-dokumentet.

### 4.5 Noen NFR-er mangler grenseverdier
- **Alvorlighet:** lav
- **Hvor:** NFR-3 «applies a rate limit»; NFR-2 «by a test or a documented code review»; NFR-8 «never crash»
- **Problem og hvorfor det betyr noe:** Disse er i praksis ikke testbare slik de står. Resten av NFR-ene har tall.
- **Forslag:** «The Proxy rejects the 11th request within one minute from one origin with HTTP 429», velg test (ikke «test eller review») for NFR-2, og list tre konkrete scenarier for NFR-8.

## 5. Mekaniske funn

- **ID-er:** FR-1 til FR-24, NFR-1 til NFR-9, DR-1 til DR-9 og SM-1 til SM-6 er sammenhengende. Ingen `[ASSUMPTION]` er ubesvarte; §11 samler bekreftede verdier.
- **UJ mot FR:** UJ-1 har «6 of 9» spørsmål med åtte begreper, men FR-18 gir nøyaktig ett Quiz Question per begrep (altså 8). UJ-2 passer ikke FR-18 (se 4.2).
- **Glossar:** «Summary Point», «Flashcard», «Quiz Question», «Simpler Explanation», «Centrality Rank» (hvem setter den?) og «Panic Mode» har ingen egen definisjon. «Not covered» og «Round size» er definert først inne i FR-ene.
- **Interne henvisninger:** «Review fix E5», «Decision D3» osv. løses bare i `.memlog.md`. Det gjør FR-ene tyngre å lese og etterlater en ekstern avhengighet. Behold dem i en kort endringslogg til slutt i PRD-en, eller fjern dem fra selve kravene.

## 6. Før dere går videre

**Må avklares nå (før epics):** kuttrekkefølge (4.1), Round-regelen (4.2), og referansenotater med forventede nøkkelbegreper (spørsmål 3). Modellvalg (spørsmål 1) må være tatt før Consent-teksten og NFR-4 kan verifiseres. Avklar også om Proxy-en bare kjøres lokalt eller hostes offentlig. NFR-3 antyder det siste, men DR-1 beskriver bare lokal kjøring, og det påvirker kostnadsrisikoen.

**Kan vente:** produktnavn (spørsmål 2), sammendragets eksakte tall (4.3) og meldingstabellen (4.4), så lenge UX-dokumentet fanger dem.

**Oppfølging av tilbakemelding på briefen: ja.** Antakelsene er avklart (§11), suksesskriteriene er målbare, filformat er valgt, Demo Mode og Fixtures finnes, Readiness Score og Mastery-Rounds er den ene utvidelsen, og solo-status er dokumentert i DR-1. Modellvalget er utsatt, men med en plan (spørsmål 1).

## 7. Refleksjonsspørsmål

1. Quote Check viser at kilden finnes, men ikke at det riktige svaralternativet i en Quiz er riktig. Hvordan skal studenten få vite det i selve appen, og hvordan vil dere oppdage feil «correct option» i testingen utover stikkprøven i SM-2?
2. Dere forkastet den svake «fuzzy»-treffnivået fra forskningen (Decision D3). Hva fikk dere KI-en til å foreslå, hva avgjorde at dere sa nei, og er det lignende forslag i PRD-en dere ikke har prøvd å avvise?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
