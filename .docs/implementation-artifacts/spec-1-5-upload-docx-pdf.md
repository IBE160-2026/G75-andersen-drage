---
title: 'Story 1.5: Upload .docx and text-based PDF Notes'
type: 'feature'
created: '2026-11-23'
status: 'done'
route: 'dispatch'
baseline_commit: '0243d22f28534cb3d0b928e00379418deb0b9483'
review_loop_iteration: 1
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `.docx` and `.pdf` are accepted types, but a stub returns `err.unreadable` (FR-1). Scanned PDFs must be caught before any AI call (FR-3), and the reference notes and edge cases later stories rely on are incomplete (DR-3).

**Approach:** Replace the stub in the worker: `.docx` via `mammoth` + `htmlparser2`, PDF via `unpdf`, both giving paragraphs to the 1.4 Passage pipeline. Add `err.scanned`, the missing edge cases and per-note Key Concepts files, and test every reference note and edge case. Refs: FR-1, FR-3 · AD-8, AD-9, AD-13 · DR-3.

## Boundaries & Constraints

**Always:** extraction stays in the worker (no DOMParser; parser errors never reach React); `.docx`/PDF paragraphs go through `toPassages` (`web/core/passages.ts`), so Normalization, Passage limit, word count and Note Hash are 1.4's; `.txt`/`.md` hashes unchanged, `NORMALIZATION_VERSION` stays 1; 15 s timeout and main-thread type/size checks still apply; `mammoth`, `htmlparser2`, `unpdf` pinned exactly (architecture Stack table: 1.13 / 12.0 / 2.2) with the lock file updated; all strings from `messages.ts`.

**Never:** OCR or other scanned-PDF support; storing the Note (1.9); any `api/` request; paste area (3.4); Demo Mode or Fixtures (1.13/1.14); recovering Word equations (OMML lost in v1, documented).

**Decisions (2026-11-23):** `err.scanned` ships verbatim: "Skannede PDF-er støttes ikke. Bruk en PDF med tekst, eller lim inn teksten." Each reference note's expected Key Concepts move to their own file, `reference-notes/key-concepts/<note-name>.md`; `reference-notes/README.md` links to them and keeps the SM-1 rubric. The corrupt/password-protected case is three files: a corrupt `.docx`, a corrupt `.pdf` and a PDF that needs a user password; no password-protected `.docx`. Spec kept whole.

## I/O & Edge-Case Matrix

| Input | Result |
|-------|--------|
| `reference-notes/nb-digital-verden.docx`, `reference-notes/en-unit-testing.pdf` | Passages within FR-3; `note.meta` shown |
| table `.docx` (`edge-cases/nb-tabell-digitale-tjenester.docx`) | each row one line, cells joined by ` | ` |
| PDF with repeated header/footer and "Side n av 4" (`edge-cases/nb-topptekst-bunntekst.pdf`) | none of those lines in any Passage |
| PDF with two text columns or a side column (items on the same baseline split by a wide gap) | each column read top to bottom before the next; a side-column heading is its own paragraph (decided 2026-11-23) |
| PDF averaging < 100 characters of Extracted Text per page | `err.scanned` |
| corrupt `.docx`, corrupt `.pdf`, PDF needing a user password; text bytes named `.docx`/`.pdf` | `err.unreadable`; app keeps working |
| `.docx`/PDF under 150 / over 15 000 words (`edge-cases/nb-norge-too-long.pdf`) | `err.tooShort` / `err.tooLong` |
| `.docx` with no text | `err.noText` |
| worker > 15 s | `err.unreadable` |
| any rejection | no request to `/api/study-set` |

</frozen-after-approval>

## Code Map

- `web/extract/text.ts` -- stub at `:52-53`; outer try/catch maps throws to `err.unreadable`.
- `web/core/passages.ts` -- use `toPassages(paragraphs)` (`:101`), not `toParagraphs`, so `#`/`-` in Word/PDF text stay text.
- `web/extract/client.ts` -- 15 s timeout already tested (1.4); `worker.ts`, `app/page.tsx` unchanged.
- Bundling -- Next bundles the worker via `new URL("./worker.ts", import.meta.url)`; `unpdf` lazy-imports serverless PDF.js; mammoth uses its `browser` field. Only e2e against `next start` proves it.
- `web/extract/text.test.ts:110-112`, `e2e/upload.spec.ts:223-227` -- misnamed text stays `err.unreadable`; retitle.
- `.docs/planning-artifacts/ux-designs/ux-G75-andersen-drage-2026-11-10/EXPERIENCE.md:129`, `.docs/implementation-artifacts/epic-1-context.md:72` -- `err.scanned` still marked draft.

## Tasks & Acceptance

**Execution:**
- [x] `web/package.json` + lock -- `npm view <pkg> time --json`; pin mammoth 1.13.0, unpdf 2.2.1, htmlparser2 12.0.x (newest patch ≥ 14 days old).
- [x] `web/i18n/messages.ts`, `ExtractErrorKey` in `web/extract/text.ts` -- `err.scanned`.
- [x] `reference-notes/edge-cases/`, `.gitattributes` -- add `nb-feil-type.rtf` (`err.type`), `nb-tom.docx` (`err.noText`), `nb-for-kort.docx` (`err.tooShort`), `nb-skannet.pdf` (image only, `err.scanned`), `nb-odelagt.docx` (truncated zip), `nb-odelagt.pdf` (broken header), `nb-passord.pdf` (user password) — the last three `err.unreadable` — and `nb-windows-1252.txt` (≥ 150 words, accepted with `warn.encoding`). Make them once in a throwaway container (python-docx, reportlab, qpdf; not project dependencies). Add `reference-notes/edge-cases/* -text`.
- [x] `reference-notes/key-concepts/{nb-smidig-scrum,nb-digital-verden,en-unit-testing}.md`, `reference-notes/README.md` -- lists moved verbatim (`#` heading + numbered list); README links them, keeps the rubric, lists each edge case with purpose, source, expected key.
- [x] `web/extract/docx.ts` + test -- pure `htmlToParagraphs(html)` (tests with HTML strings: empty and merged cells, nested list, footnote) and `docxParagraphs(bytes)`.
- [x] `web/extract/pdf.ts` + test -- pure `pageLines`, `removeRepeatedLines`, `toPdfParagraphs`, `textCharsPerPage` over `{str, transform, width, height}[]` per page (synthetic tests: two-line footer, page break, side column, empty and rotated items); `pdfPages(bytes)` via `getDocumentProxy`.
- [x] `web/extract/text.ts` + test -- route `.docx`/`.pdf`; key order per Design Notes; `encodingFallback` false.
- [x] `web/extract/reference-notes.test.ts` -- each note: Passages within FR-3 + Note Hash snapshot; each edge case: its key; each Key Concepts file: 5–15 entries.
- [x] `e2e/Dockerfile`, `e2e/upload.spec.ts` -- copy all of `reference-notes/`; real `.docx`/`.pdf` → `note.meta`; `nb-skannet.pdf` → `err.scanned`; `nb-odelagt.docx` then a valid `.pdf` → `note.meta`; during `nb-norge-too-long.pdf`, `page.evaluate` answers within 200 ms, then `err.tooLong`.
- [x] `README.md` ("Last opp notat"), EXPERIENCE.md, `epic-1-context.md` -- formats; OMML and Word headers/footers not extracted; `err.scanned` approved.

**Acceptance Criteria:**
- Given the repository, when 1.5 is done, then `reference-notes/` holds the three notes, a Key Concepts file each, and one edge-case file per rejection case plus the injection note.
- Given Vitest, when it runs, then every reference note extracts to Passages without error and every edge case gives its expected key.
- Given a corrupt or password-protected file, when it is processed, then `err.unreadable` shows, the error never reaches React, and the app keeps working.
- Given `docker compose run --rm --build test` with no key, when run, then all three suites pass against the production build.

## Implementation Notes

- PDF.js in a Web Worker: the serverless build's `WorkerMessageHandler` registers itself on any worker scope (`self.postMessage` + `onmessage`) when its module is evaluated and posts a "ready" message, which `client.ts` took as a malformed answer (`err.unreadable` for every PDF in the production bundle; Node/Vitest was unaffected). `definePDFJSModule` is called in `pdf.ts` with a loader that hides `self.postMessage` while `unpdf/pdfjs` loads and then restores its original descriptor (it is an own property of the worker global). `worker.ts` and `client.ts` stay unchanged.
- `pageLines`: a line takes the y and h of its tallest item, and the join test uses the larger of the two heights, so a superscript citation (`[1]`, sorted first by y) neither starts its own line nor shifts the line spacing used for paragraph breaks. Lines split by a > 2 h gap share a y and are left out of the median line spacing.
- Pins: mammoth 1.13.0, htmlparser2 12.0.0 (only 12.0.x), unpdf 2.2.1 as specified. unpdf 2.2.1 was published 2026-11-15, 8 days before install, so it is younger than the 14-day rule; 2.2.0 is equally young.
- Edge-case files were generated once in a `python:3.13-slim` container with python-docx 1.2.0, reportlab 4.4.4, Pillow 11.3.0 and Debian's qpdf; the generator script is not in the repository. `nb-passord.pdf` uses AES-256 with user password `hemmelig`.
- Note Hash snapshots (NORMALIZATION_VERSION 1): `nb-smidig-scrum.md` 2e473642…, `nb-digital-verden.docx` f8e36750…, `en-unit-testing.pdf` f0357a90… (was 06ffddba… before the column rule; 4408 words, 106 Passages) The e2e test asserts the browser bundle gives the same hashes as Vitest.
- Columns (review pass 1): a page where no line splits at a > 2 h gap is read exactly as before. Otherwise the start x of the split segments is clustered into column bands (a new band when more than 2 × the median line height right of the previous start); every segment goes to the band it starts in (tolerance 2 × median h), and a segment reaching past the next band's start is full width and closes the block above it. In a block, columns are emitted left to right, each top to bottom; the first line of each later column (`colStart`) follows the page-break rule (it continues a paragraph whose last line lacks `.!?:`). A column holding a single line beside a column with several is a side-column heading (`alone`) and is its own paragraph. Rotation is now a rotated baseline only (|b| > 0.001 × hypot(a, b)), so sheared (synthetic italic) items stay.
- Bundle: `fileType` and the extraction types live in parser-free `web/extract/types.ts` (re-exported by `text.ts`); `client.ts` imports that, and `text.ts` loads `./docx` and `./pdf` with `import()` only for their type, so the Start page bundle carries no parser.

## Spec Change Log

- **2026-11-23, review pass 1 (intent_gap EC5/BH8):** Tor decided that multi-column PDFs are read column by column, with side-column headings as their own paragraphs (new matrix row in the frozen block). As for 1.4, he chose to keep the green implementation and fix this together with the patch findings instead of the revert-and-replan loopback. Known-bad state avoided: lines from two columns interleaved in one Passage.

## Review Triage Log

Review pass 1 (2026-11-23): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| EC5, BH8 | Two-column PDFs interleave; side-column headings glue onto the body paragraph | medium | `pageLines` splits same-y segments into lines, but `toPdfParagraphs` orders them by y only, so left/right column lines alternate; a split line never breaks a paragraph. The spec rules ("new line when > 2h") produce this; column order is a behaviour the intent does not settle. | intent_gap |
| EC10, BH11 | Parsers ship in the main bundle and load for `.txt`/`.md` | medium | `client.ts:3` imports `fileType` from `text.ts`, which statically imports `docx.ts`/`pdf.ts` (and runs `definePDFJSModule`), so Start loads mammoth, htmlparser2 and unpdf. Fix: parser-free module for `fileType`/types, dynamic `import()` per type in `parse`. | patch |
| EC1 | Sheared (synthetic italic) items dropped as rotated | medium | `isRotated` = `t[1] !== 0 \|\| t[2] !== 0`; shear sets `t[2]`, so oblique words vanish from Passages. Only a rotated baseline (`b`, beyond float noise) should count. | patch |
| VG1, BH9 | "At least half the pages" threshold untested | medium | Pre-verified: no case with 2 ≤ n < pages; dropping `n * 2 >= current.length` keeps every test green. | patch |
| VG2 | 0-page PDF → `err.unreadable` untested | low | Pre-verified; one stubbed test. | patch |
| VG3 | Scanned threshold boundary untested | low | Pre-verified; `<` vs `<=` undetected. | patch |
| BH10 | `postMessage` workaround untested | low | Only runs in the production worker; a fake-`self` unit test covers restore and delete. (No crash path: the worker posts only after `extractNote` resolves.) | patch |
| BH12, EC11, VG-other | Responsiveness e2e can flake (`sawBusy`, unbounded loop) | low | Fails if extraction ends before the first poll; loop has no deadline. | patch |
| BH3 | README source column claims python-docx/reportlab for `.rtf`/`.txt` | low | Copy-paste; direct doc correction. | patch |
| BH13 | Footnote bodies land as the last Passages | low | mammoth puts them at the end; undocumented. One README line. (Trailing space in cells: false — Normalization trims.) | patch |
| EC4 | PDFs without ToUnicode give garbage text that is accepted | maybe-false | Would be medium if common; needs a sample of student PDFs to settle. | defer |
| BH2 | unpdf 2.2.1 younger than 14 days | low | The frozen block requires 2.2 and 2.2.0 is equally young; the fix edits this spec. | reject |
| BH4 | Edge-case generator not committed | low | The spec chose one-off generation; the fix edits this spec. | reject |
| BH5, EC12 | No `err.size` file, no PDF `err.noText` file | false | epics.md lists the cases; size is tested with synthetic buffers (a > 10 MB file in git is unwanted). | reject |
| BH6, EC3 | Scanned check counts raw items incl. headers/watermarks | low | Deliberate Design Notes rule (raw, before removal); changing it edits this spec. | reject |
| BH7 | "specification-based" loses its hyphen | low | 1.4 hyphen-rejoin rule; changing it edits the 1.4/1.5 rules. | reject |
| BH14 | Docx vs PDF error handling asymmetric | false | Both paths end as `err.unreadable`; no user-visible difference. | reject |
| EC2 | Only rotated text → `err.noText` | low | Rare; would need a new rule. | reject |
| EC6 | Fake bold (doubled strings) | low | Rare; needs a dedupe heuristic. | reject |
| EC7 | Huge PDF times out as `err.unreadable`, not `err.tooLong` | false | The frozen matrix maps worker > 15 s to `err.unreadable`. | reject |
| EC8 | Zip bomb `.docx` | low | Local single-user app, user's own file; needs a size-scan guard. | reject |
| EC9 | Stray text in nested tables | low | Rare; needs a cell-lookup rewrite. | reject |
| BH1, VG-other | Spec `in-review` vs sprint `in-progress` | false | The workflow syncs sprint status at presentation. | reject |

## Design Notes

`docx.ts`/`pdf.ts` carry the `passages.ts` header (rule change → bump `NORMALIZATION_VERSION`; the hash snapshots catch it). Copy bytes before parsing (`buffer.slice(byteOffset, byteOffset + byteLength)`). **Key order:** type → parse failure or 0 pages (`err.unreadable`) → PDF scanned → `err.noText` → `err.tooShort` → `err.tooLong`.

**`.docx`:** `mammoth.convertToHtml({arrayBuffer, buffer})` (browser and Node read different fields), walked with `htmlparser2` (`decodeEntities`). One paragraph per `p`, `h1–h6`, `li`, table row; an `li` ends at a nested list, `p` or table, and nested `li`s are their own. Row = `td`/`th` texts (blocks in a cell joined by a space, empty cells `""`, merged cells once) joined by ` | `. `br` → `"\n"`; stray text joins the current paragraph; drop footnote back-links (`href` `#footnote-ref…`/`#endnote-ref…`), keep `[n]`; `img` gives nothing.

**PDF:** drop items with `str === ""`; rotated items (`t[1]` or `t[2]` ≠ 0) count only for the scanned check. `h = item.height || hypot(t[2], t[3])`, else the page median.
1. **Lines:** descending y (`t[5]`); an item joins a line within `0.5h` of its first item's y; inside a line by x, a space when the gap > `0.15h`, a new line when > `2h` (side columns).
2. **Repeated lines**, before paragraphs: top 2 and bottom 2 lines per page; key = trimmed lowercase, digit runs → `#`, once per page; remove keys on ≥ 2 pages with `count × 2 ≥ numPages`; repeat until stable. Accepted: numbered running heads go too.
3. **Paragraphs:** break at a gap ≥ `1.3 ×` the page's median line spacing (document median if < 2 lines); a page break ends the paragraph unless its last line lacks `.!?:`; lines join with `"\n"`.
4. **Scanned:** non-whitespace characters of all items before step 2 ÷ `numPages` < 100 → `err.scanned`. No page cap; images never decoded.

If the lazy PDF.js import fails in the worker chunk, call `definePDFJSModule(() => import("unpdf/pdfjs"))` at worker start.

## Verification

**Commands:**
- `docker compose run --rm --build test` -- exit 0, all suites incl. axe.

**Manual checks:**
- Drop `nb-digital-verden.docx` and `en-unit-testing.pdf`; the Passage count in `note.meta` looks plausible.
