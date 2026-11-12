---
name: Torsas læringsassistent
status: final
created: 2026-11-10
updated: 2026-11-12
sources:
  - ../../prds/prd-G75-andersen-drage-2026-11-05/prd.md
  - ../../prds/prd-G75-andersen-drage-2026-11-05/addendum.md
---

# Torsas læringsassistent — Experience Spine

Behavior and structure. Visual identity lives in `DESIGN.md`. Requirements, glossary (Note, Key Concept, Item, Quote, Round, Mastery State, Readiness Score, Demo Mode, Consent …) and journeys UJ-1..UJ-3 live in the PRD and are referenced, not restated. Decision trail: `.memlog.md`.

Visual references (illustrations only; **the spines win on conflict**):

- Wireframes (v1, low-fi): [`wireframes/ia-2026-11-10.excalidraw`](wireframes/ia-2026-11-10.excalidraw) (IA map), [`wireframes/flow-uj1-2026-11-10.excalidraw`](wireframes/flow-uj1-2026-11-10.excalidraw) (UJ-1 flow, 9 screens, climax and scanned-PDF edge case).
- Visual directions and key-screen mockups (light mode only): listed in the `DESIGN.md` intro; Key Flows links the mockup for each step. Spine-only, no visual reference: Demovelger, Arkiv, Innstillinger, dark mode (Kveldsmodus).
- Mismatches between these references and the spines: Known drift (last section).

## Foundation

- **Form factor:** web app. Desktop/laptop is primary; every flow must work down to 320px wide viewports (WCAG 1.4.10; PRD NFR-7 names 360px).
- **UI system:** none named. Component library is deferred to architecture (`bmad-architecture`). `DESIGN.md` is the visual reference; components here are library-agnostic.
- **Language:** UI in Norwegian bokmål (NFR-9); generated content follows the Note's language. PRD error strings are English for the record; the student sees the Microcopy strings, referenced below by key (for example `err.noKey`).
- **Product name:** "Torsas læringsassistent" (resolves PRD open question 2).
- **Modes:** light 'Lesesal' (Must) / dark 'Kveldsmodus' (Should). Default follows OS `prefers-color-scheme`; a manual toggle overrides it and is remembered in browser storage.
- **Storage:** everything (Notes, Study Sets, Mastery history, settings, Consent) lives in this browser; no account.

## Information Architecture

| # | Surface | Priority | Reached from | Purpose |
|---|---|---|---|---|
| 0 | **Samtykke** (Consent gate, dialog) | Must | First app open, before anything else | FR-5 notice; accept or go to demo |
| 1 | **Start — 'Dine notater'** | Must | App open (after Consent decision); brand link in top bar | List of Notes stored in this browser + 'Last opp fil' / 'Lim inn tekst' / 'Prøv demomodus' |
| 2 | **Demovelger** | Must | 'Prøv demomodus' on Start; 'Nei takk, vis demo' on Consent | Pick a bundled sample note (FR-23) |
| 3 | **Genererer** | Must | Submitting a Note (upload/paste/sample) that is not cached | Progress until Study Set or error (FR-11) |
| 4 | **Notatoversikt** | Must | Note row in 'Dine notater'; end of generation; cache hit (FR-4); 'Tilbake til oversikten' | Readiness Score, Summary Points, Key Concept list with Mastery States, 'Start runde', interrupted-round banner, 'Eksamen om en time' (FR-20, Should) |
| 5 | **Runde: flashcards** | Must | 'Start runde' / 'Ny runde' / 'Fortsett' | Flashcards one at a time (FR-13) |
| 6 | **Runde: quiz** | Must | After the Round's last Flashcard | Quiz Questions one at a time (FR-14) |
| 7 | **Resultat** | Must | After the last Quiz Question | Score; per question: your answer (`result.yours`), correct answer (`result.correct`), Quote |
| 8 | **Arkiv** | Should | Link at the bottom of 'Dine notater' | Archived Notes: restore or permanently delete |
| 9 | **Innstillinger** | Must | 'Innstillinger' in top bar (desktop) or 'Mer' menu (mobile), all screens | Consent status and withdraw/accept, storage warning, Demo Mode on/off, keyboard shortcuts on/off, delete-warning toggle, export/import (FR-22, Should) |
| — | **Kildepanel** (source panel) | Must | Beside 4–7 on desktop; 'Kilde' tab on mobile | Extracted Text as Passages P1, P2 …; target of every source reference (FR-12) |
| — | **Top bar** | Must | All screens | Brand · Note name · Readiness Score + not-covered count · theme toggle · 'Innstillinger' (mobile: Component Patterns › Top bar) |
| — | **Error states** | Must | Inline on the surface that caused them | See State Patterns |

**Priority.** *Must* = required by the PRD, plus 'Dine notater'. *Should* = built only after every Must flow works end to end: Arkiv (archive, restore, permanent delete), importance level, and dark mode (Kveldsmodus; light Lesesal ships first). If a Should item is cut, its entry point is hidden, never left dead. **Cutoff: 2026-12-01** — any Should item not working end to end by then is cut and hidden.

**Navigation map**

```
first open ──► Samtykke ──'Jeg forstår, fortsett'──► Start ('Dine notater')
                   └──'Nei takk, vis demo'──► Demovelger
Start ──upload/paste──► Genererer ──► Notatoversikt          (cache hit skips Genererer)
Start ──row──► Notatoversikt      Start ──'Prøv demomodus'──► Demovelger ──► Genererer/Notatoversikt
Start ──'Arkiv' link──► Arkiv ──restore──► back in 'Dine notater'
Notatoversikt ──'Start runde'──► Runde: flashcards ──► Runde: quiz ──► Resultat ──'Tilbake til oversikten'──► Notatoversikt
any ──'Innstillinger'──► Innstillinger        any study screen ──source reference──► Kildepanel (scroll + highlight)
```

Back navigation: browser Back and the brand link in the top bar (to 'Dine notater') `[ASSUMPTION]`. Dialogs stack at most one level.

### Page structure

Every route change updates `document.title` and moves focus to the screen's `h1` (`tabindex="-1"`). Format: "{side} · {notat} · Torsas læringsassistent" (Note segment only when a Note is open). Landmarks on every screen: `header` (top bar), `main` (single column, or the study panel on 4–7); on 4–7 also `<aside aria-label="Kilde: {filnavn}">` (source panel). **DOM order is skip link → header → main → aside**: the study panel comes first in DOM and Tab order; CSS keeps the source panel visually left on desktop. The first focusable element is a skip link 'Gå til hovedinnhold' (`skip.link`) targeting the `main` `h1`.

| # | Surface | `document.title` | `h1` | Item / section headings |
|---|---|---|---|---|
| 0 | Samtykke | (unchanged underlying page) | — (dialog `h2` `consent.title`) | — |
| 1 | Start | "Dine notater · Torsas læringsassistent" | "Dine notater"; empty: "Dine notater: ingen ennå" (`start.empty`) | `h2` 'Legg til et notat' `[ASSUMPTION]` (not shown when empty) |
| 2 | Demovelger | "Velg et eksempelnotat · …" | "Velg et eksempelnotat" | — |
| 3 | Genererer | "Lager kort og quiz · {notat} · …" | "Lager kort og quiz" | — |
| 4 | Notatoversikt | "{notat} · …" | Note title | `h2` 'Sammendrag', 'Nøkkelbegreper' `[ASSUMPTION]` |
| 5 | Runde: flashcards | "Runde {n} · {notat} · …" | "Runde {n}" | `h2` "Kort {x} av {y}" per Item, inline after the `h1` (one line: "Runde {n} · Kort {x} av {y}") |
| 6 | Runde: quiz | "Runde {n}, quiz · {notat} · …" | "Runde {n}: quiz" (": quiz" visually hidden) | `h2` "Spørsmål {x} av {y}" per Item, inline after the `h1` (one line: "Runde {n} · Spørsmål {x} av {y}") |
| 7 | Resultat | "Resultat · {notat} · …" | "Resultat" | `h2` "Spørsmål {x}" per row |
| 8 | Arkiv | "Arkiv · …" | "Arkiv" | — |
| 9 | Innstillinger | "Innstillinger · …" | "Innstillinger" | `h2` 'Samtykke', 'Studier', 'Lagring', 'Sletting' |
| — | Kildepanel | — | — | `aside` label "Kilde: {filnavn}"; the scroll container is one Tab stop (`tabindex="0"`, `role="region"`, same label); Passages `tabindex="-1"` |

## Voice and Tone

The app speaks like a teacher sitting beside the student: informal bokmål, addresses the student as "du" `[ASSUMPTION]`, short and matter-of-fact (kort og saklig). No exclamation marks or cheerleading `[ASSUMPTION]`. Sentence case (NFR-9).

| Do | Don't |
|---|---|
| "Det var nok feil, rett svar er …" followed by the correct answer and the Quote | "Oops! Feil svar 😕" |
| "Du har en uferdig runde (3 av 9 besvart)" | "Velkommen tilbake! Klar for mer læring?" |
| "Skannede PDF-er støttes ikke" — say what is wrong, then what to do | Raw provider errors or HTTP codes (FR-24) |
| "Demomodus støtter bare eksempelnotatene" | Blaming the student |
| "Klar for eksamen 63 %" + "2 begreper uten verifiserte elementer" | A score without its gap note (FR-19) |
| "Progresjon lagres ikke" | Silent data loss |

Correct-answer feedback phrasing: Microcopy (`quiz.correct`, `quiz.wrong`).

## Microcopy (bokmål)

The UI strings for every state. **Status:** all strings are drafts by Claude in the teacher voice, awaiting Tor's approval `[ASSUMPTION]`. Exceptions: rows marked *(approved)* were approved by Tor (memlog 2026-11-12); rows marked *(decided)* were fixed by a memlog decision. `{…}` = variable. Strings marked (AT) are for assistive technology only (accessible names, visually hidden text, live-region announcements). Rows are grouped by surface in flow order.

| Key | State / place | Norwegian string |
|---|---|---|
| **Samtykke** | | |
| consent.title | Samtykke, dialog heading | "Før du starter" |
| consent.body | Samtykke, up front | "Notatet ditt sendes til {leverandør} for å lage kort og quiz. Vil du ikke det, kan du prøve appen med eksempelnotater." |
| consent.more | Samtykke, link | "Les mer" |
| consent.accept / decline | Samtykke, buttons | "Jeg forstår, fortsett" / "Nei takk, vis demo" |
| consent.declined | Start, after declining | "Du har ikke godtatt at notater sendes til {leverandør}. Du kan bruke demomodus, eller [godta nå]." (link opens the Consent dialog; also in Innstillinger) |
| **Global** | | |
| skip.link | First Tab stop | 'Gå til hovedinnhold' |
| topbar.more | Mobile top bar | 'Mer' |
| theme.toggle | Theme toggle, accessible name (AT) *(approved)* | 'Bytt til mørk modus' / 'Bytt til lys modus' |
| demo.indicator | Top bar, Demo Mode on | "Demomodus" (link to Innstillinger) |
| err.prefix | Before every error message (visible or AT) | "Feil:" |
| **Start** | | |
| start.empty | 'Dine notater' empty (the first string is the `h1`) | "Dine notater: ingen ennå" + "Last opp en fil, lim inn tekst eller prøv et eksempelnotat." |
| start.dropzone | Drop zone | "Slipp en fil her eller velg fil" · ".txt .md .docx .pdf · maks 10 MB" |
| start.paste.submit | Text area button | "Lag kort og quiz" |
| err.type | Unsupported file type | "Denne filtypen støttes ikke. Bruk .txt, .md, .docx eller .pdf." |
| err.size | > 10 MB | "Filen er større enn 10 MB. Velg en mindre fil." |
| err.noText | No readable text | "Fant ingen tekst i filen. Prøv en annen fil, eller lim inn teksten." |
| err.scanned | Scanned PDF | "Skannede PDF-er støttes ikke. Bruk en PDF med tekst, eller lim inn teksten." |
| err.unreadable | File could not be read | "Filen kunne ikke leses. Prøv å lagre den på nytt, eller lim inn teksten." |
| err.tooShort | < 150 words | "Notatet er for kort. Det trengs minst 150 ord." |
| err.tooLong | > 15 000 words | "Notatet er for langt. Grensen er 15 000 ord; del det opp." |
| warn.encoding | Encoding fallback | "Æ, ø og å kan vises feil i dette notatet." |
| err.demoOnly | Own file or text in Demo Mode | "Demomodus støtter bare eksempelnotatene." |
| err.noKey | No API key | "Ingen API-nøkkel er satt opp. Bruk demomodus, eller legg inn en nøkkel i .env." |
| **Genererer** | | |
| gen.status | Genererer | "Finner nøkkelbegreper …" · "Lager kort …" · "Sjekker kildene …" `[ASSUMPTION]` steps |
| err.generation | Timeout / 429 / 5xx / network / schema | "Det gikk ikke å lage kort og quiz nå." + 'Prøv igjen' + 'Tilbake til start' (`gen.back`) |
| gen.back | Genererer failure, second action *(decided)* | 'Tilbake til start' |
| err.tooFewItems | < 5 Flashcards or Quiz Questions | "For få kort eller spørsmål kunne knyttes til notatet ditt." + 'Prøv igjen' |
| **Notatoversikt** | | |
| err.noConcepts | No eligible concepts | "Fant ingen nøkkelbegreper med verifisert kilde, så runden kan ikke starte." + 'Prøv igjen' |
| readiness | Readiness Score + gap | "Klar for eksamen {n} %" · "{k} begreper uten verifiserte elementer" (before the first Round {n} = 0; hidden only with zero eligible concepts) |
| readiness.gapOne | Gap note, singular *(approved)* | "1 begrep uten verifiserte elementer" |
| overview.start | Notatoversikt | 'Start runde' · hint "Usikre begreper kommer først." |
| banner.interrupted | Notatoversikt | "Du har en uferdig runde ({n} av {m} besvart)." · 'Fortsett' / 'Ny runde' |
| **Round** | | |
| round.review | All concepts known | "Du kan alle nøkkelbegrepene. Dette er en repetisjonsrunde." |
| card.reveal / marks | Flashcard | 'Snu kortet' · 'Kunne det ikke' · 'Kunne det' |
| kbd.space | Keyboard hint for Space *(decided)* | 'Mellomrom' |
| quiz.correct | Correct answer | "Riktig." + Quote |
| quiz.wrong | Wrong answer | "Det var nok feil, rett svar er {svar}." + Quote |
| quiz.next | Advance control | 'Neste spørsmål' (last: 'Se resultatet') |
| simpler.button / fail | Explain Simpler | 'Forklar enklere' · "Fant ingen enklere forklaring med verifisert kilde. Her er sitatet fra notatet ditt." |
| **Kildepanel** | | |
| quote.start / end | Around the highlighted Quote (AT) | "Sitat start" / "Sitat slutt" |
| return.label | Return control | "Viser {Pn} fra {kort x / spørsmål x / resultatet}" · 'Tilbake til kortet' / 'Tilbake til spørsmålet' / 'Tilbake til resultatet' |
| return.hint | Description on the target Passage (AT) | "Trykk Esc for å gå tilbake." |
| **Resultat** | | |
| result.score | Resultat | "{n} av {m} riktige" · 'Tilbake til oversikten' |
| result.yours / result.correct | Resultat row *(approved)* | "Ditt svar:" / "Rett svar:" (correct answer line only on missed questions) |
| **Note rows and Arkiv** | | |
| row.lastPractised | Note row meta *(approved)* | "Sist øvd i dag" / "Sist øvd i går" / "Sist øvd for {n} dager siden" · "Ikke øvd ennå" |
| importance.name | Importance select, accessible name (AT) | "Viktighet for {tittel}: {n} (1 er viktigst)" |
| importance.changed | After a change, polite live region (AT) | "{tittel}: viktighet {n}, nå nummer {p} i listen." |
| archive.button | 'Arkiver' icon button, accessible name (AT) | "Arkiver {tittel}" |
| archive.toast | Toast after archiving | "{tittel} er arkivert." · 'Angre' · 'Vis arkiv' |
| archive.done / restore.done / delete.done | After the action, polite status | "{tittel} er arkivert." · "{tittel} er gjenopprettet." · "{tittel} er slettet." |
| archive.empty | Arkiv empty | "Arkivet er tomt. Notater du arkiverer, havner her." |
| archive.restore / delete | Arkiv row actions | 'Gjenopprett' · 'Slett for godt' |
| delete.confirm | Permanent delete dialog | "Slette {tittel} for godt? Notatet og fremgangen din blir borte." · 'Ikke spør igjen' · 'Avbryt' / 'Slett' |
| **Innstillinger** | | |
| settings.consent.on | Innstillinger › Samtykke | "Notatene dine sendes til {leverandør} når du lager kort og quiz." · 'Trekk tilbake samtykke' |
| settings.consent.off | Innstillinger › Samtykke | "Notatene dine sendes ikke til {leverandør}. Du kan bruke eksempelnotatene." · 'Godta at notater sendes' |
| settings.consent.withdrawn | After withdrawing, polite status | "Samtykket er trukket tilbake." |
| settings.demo | Innstillinger › Studier | 'Demomodus' · "Bruk bare eksempelnotatene, uten kall til {leverandør}." |
| settings.shortcuts | Innstillinger › Studier | 'Hurtigtaster' · "Mellomrom snur kortet, 1 og 2 merker det, 1–4 velger svar i quizen." |
| settings.deleteWarning | Innstillinger › Sletting | 'Spør før notater slettes for godt' |
| toggle.state | Toggle state text | 'På' / 'Av' |
| import.invalid | Innstillinger | "Filen kunne ikke importeres. Fremgangen din er ikke endret." |
| **Storage** | | |
| storage.warning | First-time notice | "Noen nettlesere sletter lagrede data etter en tid, eller når et privat vindu lukkes. Eksporter fremgangen din hvis du vil være sikker." |
| storage.unavailable | Storage full/unavailable | "Progresjon lagres ikke." |
| storage.reset | Corrupt data | "Lagrede data kunne ikke leses og er tilbakestilt." |

## Component Patterns

Behavioral. Visual specs in `DESIGN.md` › Components (same names, same order); `DESIGN.md` › Components › Mockup map shows which key-screen mockup draws each component. Focus rules: Accessibility Floor › Focus management.

| Component | Use | Behavioral rules |
|---|---|---|
| Top bar | All screens | Note name and Readiness Score appear only when a Note is open. Readiness hidden with zero eligible concepts (FR-19). Brand is a link to 'Dine notater'. Demo indicator next to the brand when Demo Mode is on. **Mobile:** condensed to brand + 'Mer' (Overflow menu); Note name, score and gap note move to the Status strip. |
| Status strip | Mobile, top of the 'Studier' tab, screens 4–7 | Holds the Note name, Readiness Score and gap note moved out of the condensed top bar; score and gap note always stay together (FR-19). Readiness hidden with zero eligible concepts, as in the top bar. |
| Demo indicator | Top bar, while Demo Mode is on | `demo.indicator`; a link to Innstillinger, where the 'Demomodus' toggle turns Demo Mode off. Turned on by choosing a sample note in Demovelger. |
| Overflow menu ('Mer') | Mobile top bar | Menu button (`aria-haspopup="menu"`, `aria-expanded`). Items: 'Innstillinger', theme toggle. Arrow keys move between items, Esc closes and returns focus to 'Mer'. Shortcuts are suppressed while it is open. |
| Skip link | All screens | First Tab stop; 'Gå til hovedinnhold' (`skip.link`) moves focus to the `main` `h1`. |
| Theme toggle | Top bar next to 'Innstillinger'; 'Mer' menu on mobile | One click switches mode; choice persisted; accessible name states the target mode (`theme.toggle`). |
| Tabs ('Studier' / 'Kilde') | Mobile, screens 4–7 | ARIA tabs (`tablist` / `tab` / `tabpanel`), arrow keys between tabs, manual activation; the inactive panel is hidden from AT. Source reference activation switches to 'Kilde'. Tab choice resets to 'Studier' on new Item `[ASSUMPTION]`. |
| Button | Everywhere | One primary per view. While its action is pending it is `aria-disabled` and ignores activation (no double submit, NFR-8) but keeps focus. Keyboard hint shown where a shortcut exists and shortcuts are on. |
| Keyboard hint | Buttons with shortcuts | Decorative mirror of the shortcut; Space is shown as 'Mellomrom' (`kbd.space`); hidden from screen readers (shortcut exposed via `aria-keyshortcuts`); hidden when 'Hurtigtaster' is off or the device is touch-only. |
| Focus ring | All interactive elements | Appears on keyboard focus (`:focus-visible`), not on mouse click. |
| Source panel | Notatoversikt, Round, Resultat | Always present on desktop, after the study panel in DOM. Scrolls independently; its scroll container is one Tab stop so keyboard users can scroll it. |
| Passage | Source panel | Static text; becomes **active** when targeted by a source reference; programmatically focusable (`tabindex="-1"`), not a Tab stop. |
| Source reference ("Kilde: P4") | Flashcard front and back, Quiz Question, Summary Point, Simpler Explanation, Resultat | Mouse or keyboard activation runs the reference jump (sequence: Interaction Primitives › Reference jump; FR-12). Allowed before reveal/answer (student's choice to peek) `[ASSUMPTION]`. |
| Quote highlight | Source panel | Exactly one at a time; replaced by the next activation. The `<mark>` is bracketed by visually hidden `quote.start` / `quote.end` text, so screen readers hear where the Quote begins and ends inside the Passage. |
| Return control | Top of source panel (desktop) / 'Kilde' tab (mobile) | Appears after every reference jump, both widths (sequence and return: Interaction Primitives › Reference jump). Shows `return.label`; the label follows context (kort / spørsmål / resultat). The target Passage carries `return.hint` via `aria-describedby`. Persistent until the next jump or Item change; no timer. |
| Flashcard | Runde: flashcards | Front: question + source reference only (Quote would give the answer away). 'Snu kortet' (Space) reveals back: answer + Quote + reference. After reveal: 'Kunne det ikke' (1) / 'Kunne det' (2) mark the card and advance to the next one; mark saved immediately and updates Mastery State (FR-13, FR-17). 'Forklar enklere' available on the back `[ASSUMPTION]`. The card is a labeled region (the **Flashcard region**) whose heading is "Kort {x} av {y}". |
| Quote block | Flashcard back, answered Quiz Question, Summary Point, Resultat, Simpler Explanation | Shown without an extra click wherever it appears (FR-12; see Open Items 1 for the Flashcard-front and pre-answer Quiz clarification). |
| Quiz Question | Runde: quiz ([key-quiz](mockups/key-quiz.html), [PNG](mockups/key-quiz.png)) | A labeled region (the **Quiz region**) headed "Spørsmål {x} av {y}"; no card container. Before answering: stem + four options A–D (keys 1–4) + source reference, no Quote. Selecting an option answers (saved immediately, FR-15) and shows feedback inline: correct option, the student's option if wrong (`quiz.wrong`), then the Quote. Feedback is immediate, per question `[ASSUMPTION]`. Answered options become `aria-disabled` but are not styled as disabled: options neither chosen nor correct keep full text contrast, only their border is muted (`DESIGN.md` › Components › Quiz Question). Advance control `quiz.next`. 'Forklar enklere' on the answered question (FR-16). |
| Explain Simpler ('Forklar enklere') | Flashcard back, answered Quiz Question | One AI call per press, never automatic. Shows a loading state in place; result is a Simpler Explanation with its Quote + reference, or `simpler.fail` with the Item's Quote (FR-16). In Demo Mode served from Fixtures (FR-23). |
| Round progress | Round screens ([key-flashcards](mockups/key-flashcards.html), [PNG](mockups/key-flashcards.png); [key-quiz](mockups/key-quiz.html), [PNG](mockups/key-quiz.png)) | One shared pattern, one line at the top: "Runde n · Kort x av y" (Flashcards) / "Runde n · Spørsmål x av y" (Quiz), made of the `h1` and the Item `h2` (Information Architecture › Page structure); bar (`aria-hidden`; the text carries the progress information); the current concept's Mastery chip. |
| Resultat row | Resultat, one per Quiz Question | Section headed `h2` "Spørsmål {x}" (Information Architecture › Page structure). Shows the question, the student's answer (`result.yours`), the correct answer (`result.correct`, only on missed questions), the Quote block and its source reference. Read-only; the source reference runs the reference jump with `return.label` 'Tilbake til resultatet'. |
| Mastery chip | Key Concept list, Round | Read-only label 'ny' / 'usikker' / 'kan'. |
| Concept chip | Flashcard, Quiz Question | Read-only Key Concept name of the current Item. |
| Readiness Score | Top bar, Notatoversikt, 'Dine notater' row | Recomputed after every mark/answer; gap note always beside it. Before the first Round it reads "Klar for eksamen 0 %" (`readiness`). |
| Summary Point | Notatoversikt | Text + Quote + source reference. |
| Key Concept list | Notatoversikt | Ordered by Centrality Rank `[ASSUMPTION]`. *Not covered* concepts listed with "ingen verifiserte elementer" (FR-10). |
| Banner (interrupted round) | Notatoversikt, top ([key-overview](mockups/key-overview.html), [PNG](mockups/key-overview.png)) | Shown when a Round is *incomplete* (FR-15): `banner.interrupted`. 'Fortsett' resumes at the first unanswered Item; 'Ny runde' discards the remainder (answered Items stay scored) and composes a new Round. **While the banner shows, 'Start runde' is hidden**; 'Ny runde' replaces it (one primary per view). |
| Note row | 'Dine notater', Arkiv ([key-start](mockups/key-start.html), [PNG](mockups/key-start.png), frame b) | List item (`<ul>`/`<li>`). Shows title, last practiced (`row.lastPractised`), Readiness Score, gap note (only when its count is above 0), importance level. **The title is a real link** to that Note's Notatoversikt, with its hit area stretched over the whole row (no inline expansion). The importance select and the 'Arkiver' button (`archive.button`) are **siblings of the link, not inside it**: separate Tab stops that never open the Note. Tab order per row: title link → importance select → 'Arkiver'. **Arkiv rows** have no link (the row opens nothing); their controls are 'Gjenopprett' / 'Slett for godt'. |
| Importance select | Note row | Student sets 1 (most important) / 2 / 3 (least) per Note; new Notes default to 2. A native `<select>` with options "1 – viktigst" / "2 – middels" / "3 – minst"; the closed select shows the full label (for example "2 – middels"); sibling of the title link (not nested). Accessible name `importance.name`. On change the value is saved, the list re-sorts, focus stays on the same Note's select in its new position, and a polite live region announces `importance.changed`. |
| Toast (archive undo) | 'Dine notater', after archiving ([key-start](mockups/key-start.html), [PNG](mockups/key-start.png), frame b) | Bottom center of the viewport. `archive.toast` with 'Angre' and 'Vis arkiv'; `role="status"`. No timer is specified `[ASSUMPTION]`; it is replaced by the next action's status. |
| Drop zone | Start | Native `<input type="file">` with label, plus drop target. Click or drop one file; validated in-browser before any network call (FR-1, FR-3). Disabled during generation (FR-11). |
| Text area | Start ('Lim inn tekst') | Same rules as a file (FR-2). Submit button `start.paste.submit`. |
| Generation progress | Genererer ([key-generating](mockups/key-generating.html), [PNG](mockups/key-generating.png)) | Shown from submission until Study Set or error (FR-11); status line (`gen.status`, each step announced once via `role="status"`) + Note meta (filename · words · Passages). |
| Dialog | Consent, permanent delete | Native modal dialog, focus trapped, heading as `h2` (`aria-labelledby`), body via `aria-describedby`; focus returns to trigger on close. Delete dialog: initial focus 'Avbryt', Esc cancels. Consent gate cannot be dismissed without a choice `[ASSUMPTION]`; 'Les mer' is an in-dialog disclosure (`aria-expanded`). Shortcuts are suppressed while any dialog is open. |
| Checkbox | Delete dialog ('Ikke spør igjen') | Native checkbox with a visible `<label>`. Checked + 'Slett' turns the 'Spør før notater slettes for godt' setting off. |
| Toggle (switch) | Innstillinger | Native checkbox with `role="switch"`, visible label, visible state text (`toggle.state`). Takes effect immediately, persisted in browser storage; no save button. |
| Settings row | Innstillinger | Label + optional description + one control. Rows (grouped under `h2`): **Samtykke** — status text and 'Trekk tilbake samtykke' (secondary button; no confirmation, reversible; announces `settings.consent.withdrawn`) or, when declined, 'Godta at notater sendes' (opens the Consent dialog). **Studier** — 'Demomodus' toggle (`settings.demo`; turns on when a sample note is chosen in Demovelger; turning it off returns to live generation if Consent is given), 'Hurtigtaster' toggle (`settings.shortcuts`, default on). **Lagring** — `storage.warning` text; export/import (Should, FR-22). **Sletting** — 'Spør før notater slettes for godt' toggle (`settings.deleteWarning`, default on). |
| Error message | Inline at the source of failure | `err.prefix` + text + next step; retryable errors carry 'Prøv igjen' (FR-8, FR-10, FR-11). On Genererer the error message also offers 'Tilbake til start' (`gen.back`). Announced via `role="alert"`; field errors tied to the drop zone / text area with `aria-describedby` + `aria-invalid`. |
| Empty state | Any list/screen that can be empty | Headline (the screen's `h1`, for example `start.empty`) + what to do next + actions (FR-11). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| First open | App | Consent gate before anything else. |
| Consent declined / withdrawn | Start, Innstillinger | Live generation is off (FR-5). Upload and paste stay operable but never reach the AI provider: input is still validated (FR-3), then rejected with `err.demoOnly` in Demo Mode, otherwise with `consent.declined`. Demo Mode offered. Accept later in Innstillinger ('Godta at notater sendes'), or via the link in `consent.declined` on Start (opens the Consent dialog). |
| Storage warning (first time) | Start `[ASSUMPTION]` | One-time `storage.warning`; afterwards visible in Innstillinger › Lagring (FR-21). |
| Empty — no Notes | 'Dine notater' | `start.empty` (FR-11). |
| Empty — Arkiv | Arkiv | `archive.empty`. |
| Input rejected | Start, inline at drop zone / text area | Before any AI call (FR-3): `err.type`, `err.size`, `err.noText`, `err.scanned`, `err.unreadable`, `err.tooShort`, `err.tooLong`. Async results (PDF parse) announced and focused. No Genererer, no Consent prompt. |
| Encoding fallback | Start → Notatoversikt | Non-blocking `warn.encoding` (FR-1). |
| Demo-only input | Start in Demo Mode | `err.demoOnly` (FR-23). |
| No API key | Start, on submit | `err.noKey` (FR-24); offer 'Prøv demomodus'. |
| Generating | Genererer | Progress + `gen.status`; second upload/paste disabled (FR-11). Times out at 90 s. |
| Generation failed | Genererer | Timeout / 429 / 5xx / network / schema failure after retry → `err.generation` + 'Prøv igjen' + 'Tilbake til start' (`gen.back`); focus: Accessibility Floor › Focus management (FR-8, FR-11). [key-generating](mockups/key-generating.html) ([PNG](mockups/key-generating.png)), frame b. |
| Too few Items | Genererer → error | Fewer than 5 Flashcards or 5 Quiz Questions survived → `err.tooFewItems` + 'Prøv igjen' + 'Tilbake til start'; focus: Accessibility Floor › Focus management (FR-10). |
| Cache hit | Start → Notatoversikt | Skips Genererer; shows stored Mastery States (FR-4). |
| No eligible concepts | Notatoversikt | No Readiness Score; Round cannot start; `err.noConcepts` + 'Prøv igjen' (FR-11, FR-19). |
| Before first Round | Notatoversikt, top bar | "Klar for eksamen 0 %" + gap note (FR-19). |
| Review round | Round start | `round.review` (FR-18). |
| Interrupted Round | Notatoversikt | `banner.interrupted` with 'Fortsett' / 'Ny runde' (FR-15). |
| Explain Simpler pending / failed | Flashcard back, Quiz | Inline loading; `simpler.fail` + Item's Quote (FR-16). |
| Shortcuts off | Round screens | 'Hurtigtaster' off in Innstillinger: Space / 1 / 2 / 1–4 do nothing, keyboard hints hidden; buttons work as usual. |
| Archived / restored / deleted | 'Dine notater', Arkiv | Row removed; `archive.done` / `restore.done` / `delete.done` in a polite status region; focus: Accessibility Floor › Focus management. After archiving, a status toast `archive.toast` (bottom center) with 'Angre' (restores the Note to its place) and 'Vis arkiv'. |
| Storage unavailable/full | Global, persistent | `storage.unavailable`; app keeps working for the session (FR-21). |
| Corrupt / unknown stored data | Start | `storage.reset`, safe reset (FR-21). |
| Import invalid (Should) | Innstillinger | `import.invalid`; existing progress untouched (FR-22). |
| Offline | — | Covered by `err.generation` (network); local study of stored Notes continues `[ASSUMPTION]`. |

## Interaction Primitives

- **Click/tap to act.** Note rows: Component Patterns › Note row.
- **Keyboard (FR-13, NFR-6):** Tab order follows DOM order: skip link → top bar → study panel (`main`) → source panel. Enter/Space activate the focused control natively.
- **Shortcuts (WCAG 2.1.4):** Flashcard: Space = 'Snu kortet', 1 = 'Kunne det ikke', 2 = 'Kunne det'. Quiz: 1–4 = options A–D. A shortcut fires only when **all** hold: 'Hurtigtaster' is on (Innstillinger, default on); no dialog or menu is open; focus is inside the Flashcard region (for Space/1/2) or the Quiz region (for 1–4); and the focused element is not a button, link, checkbox, text field or other control (it is the Item heading, the revealed answer, or the region itself). Otherwise the key keeps its native behavior. Space on a revealed card and 1/2 before reveal do nothing; 1–4 after answering do nothing. A handled Space never scrolls the page. Because focus lands on the Item heading after every advance, the loop Space → 1/2 → Space works without Tab.
- **Reference jump:** activate "Kilde: Pn" (mouse or keyboard) → on mobile, switch to the 'Kilde' tab first → scroll source panel to Pn, activate Passage, highlight Quote, show the return control, focus the Passage. Esc in the source panel or the return control goes back to the exact reference that was activated; on mobile this also switches back to 'Studier' at the same Item. Scrolling respects `prefers-reduced-motion` (instant) `[ASSUMPTION]`.
- **Theme toggle:** one click, top bar ('Mer' on mobile).
- **Confirmation policy:** Note Lifecycle (Archive, Delete permanently).
- **Banned:** auto-retrying generation or Explain Simpler; confirmation on reversible actions; showing the Quote on a Flashcard front or before a Quiz answer; modal stacks deeper than one; interactive elements nested inside a link or button.

## Accessibility Floor

Target WCAG 2.1 AA (NFR-6). Visual contrast is in `DESIGN.md` › Colors › Contrast.

- Every flow fully keyboard-operable; UJ-1 tested with the manual keyboard checklist; automated axe check of main screens with no serious/critical violations.
- Visible focus on every control (`{components.focus-ring}`); never removed; inset inside scroll containers.
- **Structure:** page title, `h1` and landmarks per surface (Information Architecture › Page structure); skip link; study panel before source panel in DOM and Tab order.
- **Focus management** (one rule set):
  - *Screen change* (route, including Genererer → Notatoversikt and 'Se resultatet' → Resultat): update `document.title`, focus the `h1`.
  - *Item change* (mark-and-advance, 'Neste spørsmål', last Flashcard → first Quiz Question): focus the new Item's heading `h2` "Kort {x} av {y}" / "Spørsmål {x} av {y}" (`tabindex="-1"`), which also announces it.
  - *Reveal:* focus moves to the back's answer `[ASSUMPTION]`. *Quiz answer:* focus stays on the chosen (now `aria-disabled`) option; feedback announced via `aria-live="polite"`.
  - *Archive / restore / delete:* focus the next row's first control (title link in 'Dine notater', 'Gjenopprett' in Arkiv); if it was the last row, the previous row; if the list is now empty, the list's `h1`. Announce `*.done`. 'Angre' in the archive toast returns focus to the restored Note's title.
  - *Reference jump:* focus the target Passage; return per Interaction Primitives › Reference jump. There is no Shift+Tab return path.
  - *Genererer failure:* focus moves to the error message (`tabindex="-1"`, also `role="alert"`), whose actions are 'Prøv igjen' and 'Tilbake til start'. Too few Items: the same.
  - *Dialogs:* trap focus; on close return it to the trigger (after a delete, to the row rule above).
- **Shortcuts** scoped and switchable (Interaction Primitives › Shortcuts; SC 2.1.4).
- **Quote highlight** perceivable without color (2px ring) and announced to screen readers (`quote.start` / `quote.end`).
- Generation progress and errors announced via live region; errors carry `err.prefix` and are never color-only.
- Mastery, correctness, importance and errors never conveyed by color alone (text labels, ✓/✗, "Feil:").
- Form controls labeled (drop zone, text area, settings toggles, 'Ikke spør igjen'); theme toggle, 'Mer' and icon buttons have accessible names.
- **Truncated titles:** a Note title truncated with an ellipsis (Note rows, top bar; `DESIGN.md` › Typography › Wrapping) keeps the full title as its accessible name and on hover (`title`).
- `lang="nb"` on the UI; generated content language attribute `[OPEN]` (follows Note language).
- **Reflow and zoom:** usable at 320 CSS px wide and at 200% zoom without horizontal scrolling or loss of content (SC 1.4.10, 1.4.4); type in rem; long words wrap (`DESIGN.md` › Typography).
- Touch targets at least 44 × 44px on mobile `[ASSUMPTION]`, including the importance select, 'Arkiver', 'Mer' and the theme toggle.

## Key Flows

### UJ-1 — Sara gets the core of a lecture note the evening before an exam

Sara, second-year student, one evening left, laptop, first visit. Wireframes: [`wireframes/flow-uj1-2026-11-10.excalidraw`](wireframes/flow-uj1-2026-11-10.excalidraw) screens 1–9 (see Known drift 3–5). Key-screen mockups are linked per step.

1. Opens the app. Consent gate: reads the two sentences, presses 'Jeg forstår, fortsett'. (mockup: [key-start](mockups/key-start.html), [PNG](mockups/key-start.png), frame a)
2. Start shows `start.empty` with drop zone, 'Lim inn tekst', 'Prøv demomodus'. (key-start, frame c)
3. Drops `forelesning-7.pdf`. Validated in-browser.
4. Genererer: "Finner nøkkelbegreper …", "forelesning-7.pdf · 3 120 ord · 24 avsnitt", under a minute. (mockup: [key-generating](mockups/key-generating.html), [PNG](mockups/key-generating.png), frame a)
5. Notatoversikt: source panel left (P1 …), right: "Klar for eksamen 0 %" with its gap note, summary with Quotes, 8 Key Concepts all 'ny', 'Start runde'.
6. Runde: Flashcard front "Hva skiller 3NF fra 2NF?" + "Kilde: P4". Space reveals the back: answer, Quote, "Kilde: P4". She presses 1 or 2 per card; focus lands on each new card's heading. On one card she presses 'Forklar enklere'. (mockup: [key-flashcards](mockups/key-flashcards.html), [PNG](mockups/key-flashcards.png))
7. Runde: quiz, "Spørsmål 4 av 9", reference "Kilde: P7" under the stem. She answers with 1–4; on a miss: `quiz.wrong` ("Det var nok feil, rett svar er C.") + Quote. (mockup: [key-quiz](mockups/key-quiz.html), [PNG](mockups/key-quiz.png))
8. **Climax — Resultat:** "6 av 9 riktige". On the question she missed she clicks "Kilde: P7"; the source panel scrolls to P7 and rings the exact sentence the question was built from. She sees it is in her own Note, then presses 'Tilbake til resultatet'. (mockup: [key-result](mockups/key-result.html), [PNG](mockups/key-result.png))
9. 'Tilbake til oversikten' → Notatoversikt: "Klar for eksamen 63 %", two concepts 'usikker', 'Start runde' ("Usikre begreper kommer først.").

Failure: her PDF is a scan → after choosing the file, Start shows `err.scanned` inline (key-start, frame d). No generation, no AI call (FR-3). Generation error → `err.generation` + 'Prøv igjen' + 'Tilbake til start', focus on the message (key-generating, frame b).

### UJ-2 — Sara comes back the next morning

1. Sara opens the app in the same browser. 'Dine notater' lists `forelesning-7` with "Sist øvd i går" (`row.lastPractised`), Readiness Score, gap note and importance "2 – middels". (mockup: [key-start](mockups/key-start.html), [PNG](mockups/key-start.png), frame b)
2. She clicks the row → Notatoversikt (no AI call). Re-uploading the same file reaches the same place via FR-4.
3. Banner: "Du har en uferdig runde (5 av 9 besvart)" — she closed the tab mid-quiz yesterday; answered questions were kept and scored. (mockup: [key-overview](mockups/key-overview.html), [PNG](mockups/key-overview.png))
4. She chooses 'Ny runde'.
5. **Climax:** the Round opens with her two 'usikker' concepts first, followed by one she already knew; the top bar shows "Klar for eksamen 63 %".

Failure: the browser cleared storage → 'Dine notater' is empty and Sara re-uploads; generation runs again. Whether the Consent gate reappears depends on where Consent is stored `[OPEN]`.

### UJ-3 — The examiner runs the app from the README

1. The examiner starts the app with one command, no API key.
2. Consent gate appears; the examiner presses 'Nei takk, vis demo' (or accepts and uses 'Prøv demomodus' on Start).
3. Demovelger lists the bundled sample notes; the examiner picks the Norwegian one.
4. Notatoversikt from Fixtures; the full loop runs: Flashcards, Quiz, Resultat, next Round.
5. **Climax:** a Quote on Resultat is clicked and the Passage highlights, with no network call to the AI provider.
6. The examiner goes back to Start and drops their own file. Upload stays operable after declining (State Patterns › Consent declined / withdrawn); the file is validated and then rejected with `err.demoOnly`. No AI call.

Failure: Demo Mode switched off with no key → `err.noKey` (FR-24).

### Flow 4 — Archive and delete a Note

Sara, after the exam (reusing her as the protagonist is an `[ASSUMPTION]`).

1. In 'Dine notater' she presses 'Arkiver' on the `forelesning-7` row; no dialog. `archive.done` is announced; focus moves on per Accessibility Floor › Focus management.
2. The row is gone; she opens 'Arkiv' via the link at the bottom.
3. She restores it by mistake, archives again, then chooses 'Slett for godt'.
4. **Climax:** `delete.confirm` warns that the Note and its Mastery history will be deleted; focus starts on 'Avbryt'. She ticks 'Ikke spør igjen' and confirms. The Note is gone; `delete.done` is announced.

## Consent & Privacy

First-run gate, shown before anything else on first open (FR-5). Strings: `consent.*`.

- **Up front (1–2 sentences, `consent.body`):** (A) Note content is sent to an external AI provider — name `[OPEN]` (from architecture) — to create cards and quiz; (F) declining still lets you try the app with demo notes.
- **Behind 'Les mer' (in-dialog disclosure):** (B) the provider does not train on Notes (paid tier); (C) the app's Proxy stores and logs no Note content (NFR-2); (D) Notes and progress are stored only in this browser; (E) Consent can be withdrawn in Innstillinger.
- **Actions:** 'Jeg forstår, fortsett' (primary) → Start. 'Nei takk, vis demo' → Demovelger, live generation off.
- **Withdraw:** Innstillinger › Samtykke → 'Trekk tilbake samtykke' → same state as declining (FR-5).

## Note Lifecycle

| Action | Where | Rule |
|---|---|---|
| Add | Start | Upload, paste or sample note; same content reconnects to the existing Note (FR-4). |
| Open | 'Dine notater' row | Title link opens Notatoversikt directly. |
| Order | 'Dine notater' | By importance level (1 first); ties broken by last practiced, most recent first `[ASSUMPTION]`. |
| Archive | 'Arkiver' button on the row in 'Dine notater' | No confirmation (reversible). Note moves to Arkiv; Mastery history kept. Status toast `archive.toast` with 'Angre' / 'Vis arkiv'. |
| Restore | Arkiv | Note returns to 'Dine notater' with its history. |
| Delete permanently | Arkiv only | Confirmation by default; the warning can be turned off via 'Ikke spør igjen' in the dialog or the 'Spør før notater slettes for godt' setting in Innstillinger. Deletes the Note and its Mastery history. |

## Responsive & Platform

| Width | Behavior |
|---|---|
| Breakpoint | 768px `[ASSUMPTION]` |
| Desktop / laptop | Split: source panel left (visually), study panel right on Notatoversikt, Round and Resultat. Full top bar. Return control at the top of the source panel after a jump. |
| Mobile, down to 320px | Single column ([key-quiz](mockups/key-quiz.html) lower frame: 360px 'Kilde' tab; [directions-4](mockups/directions-4.html) 360px frames, see Known drift 11). Layout, condensed top bar and dialogs: `DESIGN.md` › Layout & Spacing. Source and study become tabs (Component Patterns › Tabs); reference activation switches to 'Kilde' (Interaction Primitives › Reference jump). Settings rows stack label above control. |
| Zoom | `DESIGN.md` › Layout & Spacing › Zoom; Accessibility Floor › Reflow and zoom. |

Responsive web only; no native app. Keyboard hints hidden on touch-only devices `[ASSUMPTION]`.

## Inspiration & Anti-patterns

- **Lifted from Google NotebookLM:** sources side by side with generated output (source panel + study panel). Drives the split layout and FR-12 highlight.
- **Liked, qualities not stated:** 'Logically', 'Open notebook' (assumed open-source NotebookLM alternative) `[OPEN]`.
- **Rejected — direction 2 Fokus:** neutral, airy, sans throughout, indigo accent, soft shadows; closest to NotebookLM in feel. Reason not recorded.
- **Rejected — direction 4 Energi:** playful, thick outlines, hard offset shadows, strong mastery colors ("stress turned into progress and a bit of play"); flagged in the directions as hardest to keep consistent.
- **Rejected — Quote on the Flashcard front / before a Quiz answer:** gives the answer away.
- **Rejected — inline expansion of Note rows:** a row opens Notatoversikt directly.
- **Rejected — confirmation on archive:** archive is reversible.
- **Rejected — cheerleading tone:** teacher voice is short and matter-of-fact.

## Open Items

**[NOTE FOR PRD]** (PRD updates required)

1. FR-12 "Quote visible without any extra click": clarify for Flashcards (Quote visible once revealed; reference always visible) and Quiz Questions (Quote after answering).
2. The 'Dine notater' start screen is a new surface; the PRD's UJ-2 assumed the student re-uploads the Note.
3. Archive / restore / permanent delete (Arkiv) not in PRD; Mastery history kept on archive, deleted on permanent delete.
4. Importance level (viktighetsnivå 1–3, default 2) is a new Note attribute driving sort order.
5. Consent timing: first open, not first upload; align UJ-1 / FR-5 wording.
6. Product name "Torsas læringsassistent" resolves PRD open question 2.
7. NFR-7 floor: the spine designs for 320px (WCAG 1.4.10); PRD says 360px.

**PRD update pending:** [NOTE FOR PRD] items are resolved by a `bmad-prd` Update run right after UX finalizes; until then the PRD lags this spine on those items.

**[OPEN]**: provider name in Consent; Note-language `lang` attribute; where Consent is stored (UJ-2 failure path); qualities liked in 'Logically' / 'Open notebook'. Labels, error strings and empty copy are drafted in Microcopy (awaiting approval).

**[ASSUMPTION] carried from memlog:** student may open the source reference before reveal/answer; "du" form; no exclamation marks; ties broken by last practiced; stakes (graded IBE160, examiner looks for wireframes) not yet confirmed by Tor.

## Known drift

The v1 wireframes and `directions-4.html` predate these decisions; use the spine. The key-screen mockups were aligned with the spines on 2026-11-12; no residual drift is known in them.

1. *IA map numbering:* the map numbers 1 Start, 2 Samtykke, 3 Demovelger … 9 Innstillinger and puts Kildepanel "beside 5–8". The spine numbers 0 Samtykke … 9 Innstillinger, Kildepanel beside 4–7. Cross-reference by name, not number.
2. *IA map content:* no Arkiv surface, no Note-row controls (importance select, 'Arkiver'), no delete-warning or shortcut settings, no first-run Consent gate.
3. *Consent timing and labels (IA map, flow-uj1):* Consent shown at first submission with buttons 'Godta' / 'Bruk demo'. Spine: first-run gate before anything else, 'Jeg forstår, fortsett' / 'Nei takk, vis demo' (`consent.*`).
4. *Consent copy (flow-uj1 screen 2):* "Ingenting lagres hos oss" contradicts Consent point (D) (stored only in this browser). Use `consent.body` and 'Les mer' points A–F (Consent & Privacy).
5. *Readiness before the first Round (flow-uj1 screen 4):* "Klar: –". Spine: "Klar for eksamen 0 %" (FR-19; hidden only with zero eligible concepts).
6. *Product name (directions-4):* "Torsa's". Spine: "Torsas".
7. *Quote on the Flashcard front (directions-4):* spine shows the Quote on the back only, and in the Quiz only after answering.
8. *Reference label (directions-4):* "Se i kilden". Spine: "Kilde: P4".
9. *Active Passage and highlight (directions-4):* tinted Passage with a pale 1px ring. Spine: no tint, 3px `accent` rule, 2px `highlight-ring` (`DESIGN.md` › Colors › Contrast).
10. *Kveldsmodus (directions-4):* sans for Note content, 6px / 10px radii, 1 : 1.2 columns. Spine: serif for Note content in both modes, shared 4px / 6px radii, 1 : 1.15.
11. *Mobile top bar (directions-4, 360px):* full bar. Spine: condensed bar with 'Mer' menu, 320px floor.
