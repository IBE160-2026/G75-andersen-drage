---
title: 'Story 1.5: Upload .docx and text-based PDF Notes'
type: 'feature'
created: '2026-11-23'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
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
- [ ] `web/package.json` + lock -- `npm view <pkg> time --json`; pin mammoth 1.13.0, unpdf 2.2.1, htmlparser2 12.0.x (newest patch ≥ 14 days old).
- [ ] `web/i18n/messages.ts`, `ExtractErrorKey` in `web/extract/text.ts` -- `err.scanned`.
- [ ] `reference-notes/edge-cases/`, `.gitattributes` -- add `nb-feil-type.rtf` (`err.type`), `nb-tom.docx` (`err.noText`), `nb-for-kort.docx` (`err.tooShort`), `nb-skannet.pdf` (image only, `err.scanned`), `nb-odelagt.docx` (truncated zip), `nb-odelagt.pdf` (broken header), `nb-passord.pdf` (user password) — the last three `err.unreadable` — and `nb-windows-1252.txt` (≥ 150 words, accepted with `warn.encoding`). Make them once in a throwaway container (python-docx, reportlab, qpdf; not project dependencies). Add `reference-notes/edge-cases/* -text`.
- [ ] `reference-notes/key-concepts/{nb-smidig-scrum,nb-digital-verden,en-unit-testing}.md`, `reference-notes/README.md` -- lists moved verbatim (`#` heading + numbered list); README links them, keeps the rubric, lists each edge case with purpose, source, expected key.
- [ ] `web/extract/docx.ts` + test -- pure `htmlToParagraphs(html)` (tests with HTML strings: empty and merged cells, nested list, footnote) and `docxParagraphs(bytes)`.
- [ ] `web/extract/pdf.ts` + test -- pure `pageLines`, `removeRepeatedLines`, `toPdfParagraphs`, `textCharsPerPage` over `{str, transform, width, height}[]` per page (synthetic tests: two-line footer, page break, side column, empty and rotated items); `pdfPages(bytes)` via `getDocumentProxy`.
- [ ] `web/extract/text.ts` + test -- route `.docx`/`.pdf`; key order per Design Notes; `encodingFallback` false.
- [ ] `web/extract/reference-notes.test.ts` -- each note: Passages within FR-3 + Note Hash snapshot; each edge case: its key; each Key Concepts file: 5–15 entries.
- [ ] `e2e/Dockerfile`, `e2e/upload.spec.ts` -- copy all of `reference-notes/`; real `.docx`/`.pdf` → `note.meta`; `nb-skannet.pdf` → `err.scanned`; `nb-odelagt.docx` then a valid `.pdf` → `note.meta`; during `nb-norge-too-long.pdf`, `page.evaluate` answers within 200 ms, then `err.tooLong`.
- [ ] `README.md` ("Last opp notat"), EXPERIENCE.md, `epic-1-context.md` -- formats; OMML and Word headers/footers not extracted; `err.scanned` approved.

**Acceptance Criteria:**
- Given the repository, when 1.5 is done, then `reference-notes/` holds the three notes, a Key Concepts file each, and one edge-case file per rejection case plus the injection note.
- Given Vitest, when it runs, then every reference note extracts to Passages without error and every edge case gives its expected key.
- Given a corrupt or password-protected file, when it is processed, then `err.unreadable` shows, the error never reaches React, and the app keeps working.
- Given `docker compose run --rm --build test` with no key, when run, then all three suites pass against the production build.

## Implementation Notes

## Spec Change Log

## Review Triage Log

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
