# Reference notes

The reference notes for Torsas læringsassistent (PRD DR-3, Open Question 3). They serve three purposes:

1. **Content verification**: SM-1 (concept coverage), SM-2 (grounding) and SM-3 (Quote Check pass rate) are measured on these notes.
2. **Demo Mode**: they are the bundled sample notes, and their Fixtures are recorded from them (FR-23).
3. **Model comparison**: the candidate models (PRD Open Question 1) are compared on them before the final model is chosen.

All notes may be shared publicly. Two of the three are in Norwegian (DR-3 requires at least one), and together they cover the three main upload formats (`.md`, `.docx`, `.pdf`).

## Notes

| # | File | Language | Format | Words | Source and licence |
|---|---|---|---|---|---|
| 1 | `nb-smidig-scrum.md` | nb | Markdown | 1071 | Written for this project by Tor Lysebo Andersen with AI assistance. Free to share. |
| 2 | `nb-digital-verden.docx` | nb | Word | 1993 | Tor Lysebo Andersen's own exam notes for IBE110 (*Understanding the Digital World*, Kernighan), written with AI assistance. Free to share. |
| 3 | `en-unit-testing.pdf` | en | PDF (12 pages) | 4448 | "Unit testing", English Wikipedia, saved as PDF on 2026-11-19. Text licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); authors: see the [page history](https://en.wikipedia.org/w/index.php?title=Unit_testing&action=history). Source: <https://en.wikipedia.org/wiki/Unit_testing> |

Word counts are from text extraction with pypdf / python-docx on 2026-11-19; the app's own extraction may differ slightly.

### Why each note is here

1. **`nb-smidig-scrum.md`**: a typical student note with headings, lists, a table, a quote block and mixed Norwegian/English terms. It is the easy case.
2. **`nb-digital-verden.docx`**: a real student note in question-and-answer form, covering many short topics. It tests that the app picks out central concepts from a broad note. Known extraction issue: a few numbers and formulas are missing from the extracted text (e.g. "Tallet  skrevet binært", "4 bit ()"), probably Word equations. Quotes cannot be taken from those spots.
3. **`en-unit-testing.pdf`**: the English case and the hard case. The extracted text has:
   - section headings moved away from their paragraphs (the PDF places them in a side column),
   - a Java code sample split in two by running text,
   - citation markers like `[12]`, words hyphenated across lines ("specification-\nbased"), and long lists of language names,
   - about 1000 words of references and "See also" links at the end.

   No repeated page headers or footers (the browser's "Save as PDF" adds none), so this note does not test that. A separate test file is needed for it.

## Edge cases (not reference notes)

| File | Purpose | Source and licence |
|---|---|---|
| `edge-cases/nb-norge-too-long.pdf` | About 16,500 words: must be rejected with `err.tooLong` (FR-3). | "Norge", Norwegian Wikipedia (bokmål), saved as PDF on 2026-11-19. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); authors: see the [page history](https://no.wikipedia.org/w/index.php?title=Norge&action=history). Source: <https://no.wikipedia.org/wiki/Norge> |
| `edge-cases/nb-tabell-digitale-tjenester.docx` | About 350 words with an 8×4 Word table (merged title cell). Tests table extraction: `mammoth` puts each cell on its own line, so a row's label and numbers end up apart, and a number alone (e.g. "62,0") is shorter than the 20-character minimum Quote (FR-9). Extraction should keep one table row on one line. | Text around the table written for this project with AI assistance. Table data: Statistisk sentralbyrå (SSB), "Digitalisering og IKT i offentlig sektor", table 1, reference year 2025, published 2025-06-23, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source: <https://www.ssb.no/teknologi-og-innovasjon/informasjons-og-kommunikasjonsteknologi-ikt/statistikk/digitalisering-og-ikt-i-offentlig-sektor>. Values checked against SSB on 2026-11-19. |

## Expected Key Concepts

The app should find at least 80% of these per note (SM-1). Each list has 5–15 entries (FR-6) and is ordered roughly by centrality. The lists were written before any prompt was tuned (DR-3).

### Matching rubric (SM-1)

A generated Key Concept matches an expected one when it is:

- **the same term**, in any inflection or with or without the term in the other language (e.g. "Sprintkø" = "Sprint backlog" = "sprintkøen"), or
- **a clear synonym or a narrower phrasing of the same idea** (e.g. "De tre søylene i Scrum" matches "Empirisk prosesskontroll").

It does **not** match when it is only a part or an example of the expected concept (e.g. "Planning poker" does not match "Historiepoeng og hastighet"). One generated concept can match at most one expected concept. The match must also have at least one surviving Flashcard or Quiz Question (FR-10).

### 1. `nb-smidig-scrum.md` (14)

1. Smidig utvikling (vs. fossefallsmodellen)
2. Det smidige manifestet (fire verdier)
3. Scrum (rammeverk)
4. Empirisk prosesskontroll (åpenhet, inspeksjon, tilpasning)
5. Produkteier
6. Scrum Master
7. Sprint
8. Sprintgjennomgang
9. Retrospektiv
10. Produktkø
11. Inkrement og definisjonen av ferdig
12. Brukerhistorie (med akseptansekriterier)
13. Historiepoeng og hastighet
14. Kanban (WIP-grense)

### 2. `nb-digital-verden.docx` (14)

1. Bit og byte (alt digitalt er 0 og 1)
2. Moores lov
3. Heksadesimalsystemet (og binærtall)
4. Von Neumann-arkitekturen (hent–dekode–utføre)
5. Turingmaskin (universell Turingmaskin, stoppeproblemet)
6. Kompilator og tolk
7. Algoritmer (binærsøk vs. lineært søk)
8. Operativsystem
9. Pakkesvitsjing
10. TCP/IP (IP ruter, TCP sikrer levering)
11. Internett vs. weben (URL, HTTP, HTML)
12. Asymmetrisk kryptering (vs. symmetrisk)
13. GPU (vs. CPU, parallellprosessering)
14. A/D-omformer (sampling og kvantisering)

### 3. `en-unit-testing.pdf` (12)

1. Unit testing (testing isolated code against expected behaviour)
2. Unit (a single behaviour of the system under test)
3. Test case
4. Test double
5. Parameterized test
6. Test-driven development
7. Regression testing (safe refactoring)
8. Early bug detection and lower cost
9. Limitations of unit testing (cannot prove absence of errors, misses integration errors)
10. Integration testing (vs. unit testing)
11. Extreme programming
12. Unit testing frameworks (xUnit, JUnit)
