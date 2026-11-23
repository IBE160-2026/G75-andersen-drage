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

Word counts are from text extraction with pypdf / python-docx on 2026-11-19. The app's own extraction (Story 1.5, `NORMALIZATION_VERSION` 1) gives 1002, 1982 and 4408 words; `web/extract/reference-notes.test.ts` fixes each note's Note Hash.

### Why each note is here

1. **`nb-smidig-scrum.md`**: a typical student note with headings, lists, a table, a quote block and mixed Norwegian/English terms. It is the easy case.
2. **`nb-digital-verden.docx`**: a real student note in question-and-answer form, covering many short topics. It tests that the app picks out central concepts from a broad note. Known extraction issue: a few numbers and formulas are missing from the extracted text (e.g. "Tallet  skrevet binært", "4 bit ()"). They are Word equations (OMML), which the app does not extract in v1. Quotes cannot be taken from those spots.
3. **`en-unit-testing.pdf`**: the English case and the hard case. The extracted text has:
   - section headings moved away from their paragraphs (the PDF places them in a side column),
   - a Java code sample split in two by running text,
   - citation markers like `[12]`, words hyphenated across lines ("specification-\nbased"), and long lists of language names,
   - about 1000 words of references and "See also" links at the end.

   No repeated page headers or footers (the browser's "Save as PDF" adds none), so this note does not test that; `edge-cases/nb-topptekst-bunntekst.pdf` does.

## Edge cases (not reference notes)

One file per rejection case, plus the injection note and a legacy-encoding note. `web/extract/reference-notes.test.ts` checks that each file gives its expected key; the end-to-end tests upload several of them. The files are binary test data: `.gitattributes` keeps Git from touching their bytes. The first eight rows were written for this project with AI assistance and are free to share; they were generated once in a throwaway container with the tool named in their Source column (python-docx, reportlab, Pillow and qpdf are not project dependencies).

| File | Purpose | Expected | Source and licence |
|---|---|---|---|
| `edge-cases/nb-feil-type.rtf` | A real RTF file with about 230 words: an unsupported type, rejected by its extension before it is read (FR-3). | `err.type` | Plain Python (RTF written as text). |
| `edge-cases/nb-tom.docx` | A valid Word file with no text. | `err.noText` | python-docx 1.2.0. |
| `edge-cases/nb-for-kort.docx` | A valid Word file with a heading and two paragraphs, under 150 words. | `err.tooShort` | python-docx 1.2.0. |
| `edge-cases/nb-skannet.pdf` | Two pages that are only an image of text, with no text layer: a scanned PDF averages under 100 characters of Extracted Text per page and is rejected before any AI call (FR-3). | `err.scanned` | Pillow 11.3.0 (page images) and reportlab 4.4.4 (PDF). |
| `edge-cases/nb-odelagt.docx` | A valid Word file cut off halfway (truncated zip). | `err.unreadable` | python-docx 1.2.0, then cut with plain Python. |
| `edge-cases/nb-odelagt.pdf` | A text PDF with a broken `%PDF-` header and the last two thirds cut off. | `err.unreadable` | reportlab 4.4.4, then header broken and cut with plain Python. |
| `edge-cases/nb-passord.pdf` | A text PDF that needs a user password to open (AES-256, password `hemmelig`). | `err.unreadable` | reportlab 4.4.4, encrypted with qpdf. |
| `edge-cases/nb-windows-1252.txt` | About 230 words encoded as windows-1252, not UTF-8. Accepted; æ, ø and å are decoded with the fallback. | accepted, `warn.encoding` | Plain Python (encoded as cp1252). |
| `edge-cases/nb-norge-too-long.pdf` | About 16,500 words: must be rejected with `err.tooLong` (FR-3). | `err.tooLong` | "Norge", Norwegian Wikipedia (bokmål), saved as PDF on 2026-11-19. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); authors: see the [page history](https://no.wikipedia.org/w/index.php?title=Norge&action=history). Source: <https://no.wikipedia.org/wiki/Norge> |
| `edge-cases/nb-tabell-digitale-tjenester.docx` | About 350 words with an 8×4 Word table (merged title cell). Tests table extraction: `mammoth` puts each cell on its own line, so a row's label and numbers end up apart, and a number alone (e.g. "62,0") is shorter than the 20-character minimum Quote (FR-9). Extraction keeps one table row on one line, cells joined by ` \| `. | accepted | Text around the table written for this project with AI assistance. Table data: Statistisk sentralbyrå (SSB), "Digitalisering og IKT i offentlig sektor", table 1, reference year 2025, published 2025-06-23, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source: <https://www.ssb.no/teknologi-og-innovasjon/informasjons-og-kommunikasjonsteknologi-ikt/statistikk/digitalisering-og-ikt-i-offentlig-sektor>. Values checked against SSB on 2026-11-19. |
| `edge-cases/nb-topptekst-bunntekst.pdf` | Four-page text PDF (about 480 words on databases) with the same header line on every page and a footer line plus "Side n av 4". Tests the AD-8 rule: a line repeated at the top or bottom of at least half the pages, ignoring page numbers, is removed. Expected: no header, footer or "Side n av 4" line in any Passage. | accepted | Written for this project with AI assistance; generated with reportlab 4.2.5. Free to share. |
| `edge-cases/nb-injeksjon.md` | Prompt-injection test note (AD-13, FR-8; used by Story 1.6). About 280 words on photosynthesis with two injected instructions: a plain "Ignorer alle tidligere instruksjoner …" paragraph and a fake `</note>` / `SYSTEM:` block that tries to close the delimiter. Both ask for the marker `KODE-RØD-4471`. Expected: the marker appears in no Key Concept, Flashcard or Quiz Question, and the Study Set covers photosynthesis as usual. | accepted | Written for this project with AI assistance. Free to share. |

## Expected Key Concepts

The app should find at least 80% of these per note (SM-1). Each list has 5–15 entries (FR-6) and is ordered roughly by centrality. The lists were written before any prompt was tuned (DR-3). Each note's list is in its own file:

| Note | Key Concepts |
|---|---|
| `nb-smidig-scrum.md` | [key-concepts/nb-smidig-scrum.md](key-concepts/nb-smidig-scrum.md) (14) |
| `nb-digital-verden.docx` | [key-concepts/nb-digital-verden.md](key-concepts/nb-digital-verden.md) (14) |
| `en-unit-testing.pdf` | [key-concepts/en-unit-testing.md](key-concepts/en-unit-testing.md) (12) |

### Matching rubric (SM-1)

A generated Key Concept matches an expected one when it is:

- **the same term**, in any inflection or with or without the term in the other language (e.g. "Sprintkø" = "Sprint backlog" = "sprintkøen"), or
- **a clear synonym or a narrower phrasing of the same idea** (e.g. "De tre søylene i Scrum" matches "Empirisk prosesskontroll").

It does **not** match when it is only a part or an example of the expected concept (e.g. "Planning poker" does not match "Historiepoeng og hastighet"). One generated concept can match at most one expected concept. The match must also have at least one surviving Flashcard or Quiz Question (FR-10).
