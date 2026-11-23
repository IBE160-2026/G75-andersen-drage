---
title: 'Story 1.4: Upload a text or Markdown Note and reject unusable input'
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

**Problem:** Start cannot take a Note, and later stories need an extraction pipeline and Note identity (FR-1 `.txt`/`.md`, FR-3). Unusable input must be rejected in the browser before any AI call.

**Approach:** A drop zone on Start; a Web Worker that decodes `.txt`/`.md` and runs the one AD-8 pipeline (lines → paragraphs → Normalization → sentence split → Passages `p1…pn`); Note Hash and word count in `core/`; every FR-3 text-file rejection inline at the zone. Refs: FR-1, FR-3 · AD-3, AD-8, AD-9 · UX-DR23–25.

## Boundaries & Constraints

**Always:** pipeline rules, word count and Note Hash live once in `web/core/` (pure, no DOM); same text → same Passages and hash whatever the file name; type (extension, case-insensitive) and size checked on the main thread before reading; input and drops ignored while processing; worker killed at 15 s → `err.unreadable`; errors via `ErrorMessage` with `aria-describedby` + `aria-invalid`, focused on show; labelled native `<input type="file">`; all strings from `messages.ts`; `normalizationVersion = 1`.

**Never:** storing the Note (1.9); generation or any `api/` request; `.docx`/PDF extraction, `err.scanned` or new dependencies (1.5); paste area (3.4); Demo Mode (1.14); 'Dine notater'.

**Decisions (2026-11-23):** Microcopy ships verbatim from the EXPERIENCE.md table — `start.dropzone` "Slipp en fil her eller velg fil" ("[velg fil]" marks the link-styled part), `start.dropzone.types` ".txt .md .docx .pdf · maks 10 MB", `err.type`, `err.size`, `err.noText`, `err.unreadable`, `err.tooShort`, `err.tooLong`, `warn.encoding`, keeping "… eller lim inn teksten." although paste arrives in 3.4. Spec kept whole.

## I/O & Edge-Case Matrix

| Input | Result |
|-------|--------|
| UTF-8 `.txt`/`.md`, 150–15 000 words | Passages, word count, Note Hash; `role="status"` line `note.meta` "{filnavn} · {ord} ord · {avsnitt} avsnitt" (1.9 reuses it) |
| `NOTAT.TXT`, `a.MD` | accepted as `.txt`/`.md` |
| `.docx`, `.pdf` | accepted type; stub → `err.unreadable` until 1.5 |
| UTF-8 with BOM | BOM stripped; same hash as without |
| windows-1252 bytes | decoded as `windows-1252`; non-blocking `warn.encoding` (`role="status"`) |
| `.doc`, `.rtf`, no extension | `err.type`, file never read |
| > 10 × 1024 × 1024 bytes | `err.size`, file never read |
| 0 bytes / whitespace only | `err.noText` |
| < 150 / > 15 000 words | `err.tooShort` / `err.tooLong` |
| worker > 15 s | terminated, `err.unreadable`, page responsive |
| `a.txt` and `b.md`, same bytes | identical Note Hash |
| error shown, then a valid file | error and `aria-invalid` cleared |
| any rejection | no request to `/api/study-set` |

</frozen-after-approval>

## Code Map

- `web/app/page.tsx` -- keep `EmptyState` + `ConsentNotice`; zone after the empty-state line, error below it (mockup key-start c/d).
- `web/components/ErrorMessage/ErrorMessage.tsx` -- reuse (`id`, `role="alert"`, `tabIndex={-1}`).
- `web/components/Screen/Screen.tsx` -- focuses h1 on mount; error focus only on user action.
- `web/i18n/messages.ts` -- add keys; `format()` for placeholders.
- `web/extract/.gitkeep` -- replace with worker + client.
- `web/vitest.config.ts` -- already covers `extract/**/*.test.ts`; env `node` has `crypto.subtle` and `windows-1252` `TextDecoder`.
- `web/core/tokens.test.ts` -- hard-coded-text and `var(--…)` guards apply to new files.
- `e2e/seed.ts` -- `seedConsent(page, "accepted")` before `goto`.
- `reference-notes/nb-smidig-scrum.md` -- real `.md` for a pipeline smoke test.

## Tasks & Acceptance

**Execution:**
- [ ] `web/core/normalize.ts` + test -- `normalize(text)`: NFKC → hyphen rejoin → collapse whitespace → unify quotes (1.8 Quote Check reuses it).
- [ ] `web/core/passages.ts` + test -- `toParagraphs`, `toPassages`, `countWords`, `NORMALIZATION_VERSION`, `PASSAGE_LIMIT`.
- [ ] `web/core/noteHash.ts` + test -- SHA-256 lowercase hex of Passage texts joined by `"\n\n"`.
- [ ] `web/core/types.ts` -- `Passage {id, text}`, `ExtractedNote {fileName, passages, wordCount, normalizationVersion, encodingFallback}`.
- [ ] `web/extract/text.ts` + test -- `decodeText(bytes)` (fatal UTF-8, BOM strip, 1252 fallback flag); `extractNote(...)` returns a result or error key, never throws.
- [ ] `web/extract/worker.ts`; `web/extract/client.ts` + test -- `checkFile(file)`; `extractInWorker(file, {createWorker, timeoutMs = 15000})`, terminates on timeout or error.
- [ ] `web/components/DropZone/` -- label around a visually hidden input + drop target; `aria-disabled` while processing; first file of a drop only.
- [ ] `web/app/page.tsx`, `web/i18n/messages.ts` -- wire up; keys per Decisions + `note.meta`.
- [ ] `e2e/upload.spec.ts` -- every matrix row except the hang, via `setInputFiles` buffers; no `/api/study-set` request; axe with an error shown at desktop and 320 px.
- [ ] `.docs/deviations.md` D-5 (new/split keys); mark approved EXPERIENCE.md rows; one README line on files and limits.

**Acceptance Criteria:**
- Given `docker compose run --rm test` with no key, when run, then all three suites pass.
- Given Vitest, when it runs, then Normalization, Passage splitting, Note Hash and every rejection are unit-tested, including `.txt`/`.md` hash equality.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

**Pipeline rules (fixed by tests, AD-8):** split lines on `\r?\n`; a blank line ends a paragraph; lines join, except a list item (`-`, `*`, `+`, `1.`, `1)`) or heading starts a new paragraph. Drop `#`, bullet and `>` markers; keep ordered numbers and inline markup. Hyphen rejoin: `letter-` at line end + lowercase next line → joined, unless the next word is `og`/`eller`/`and`/`or`. Quotes `“ ” „ ‟ « » ″` → `"`, `‘ ’ ‚ ‛ ′` → `'`. `PASSAGE_LIMIT = 800` chars: longer paragraphs packed greedily by sentence (split after `.!?…` + space before uppercase, digit or quote; regex, no `Intl.Segmenter`, so Node and browser agree); an over-long sentence stays whole. Words = whitespace tokens with a `\p{L}` or `\p{N}`, counted on final Passages. Any rule or `PASSAGE_LIMIT` change alters the hash → bump `NORMALIZATION_VERSION`. Accepted: splits after "f.eks."/"bl.a." before an uppercase word.

## Verification

**Commands:**
- `docker compose run --rm --build test` -- exit 0, all suites incl. axe.

**Manual checks:**
- Pick and drop a file at 320 px, keyboard only; focus ring visible on the zone.
