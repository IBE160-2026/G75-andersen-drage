---
title: 'Story 1.4: Upload a text or Markdown Note and reject unusable input'
type: 'feature'
created: '2026-11-23'
status: 'ready'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Start has no way to supply a Note, and there is no extraction pipeline or Note identity for later stories to build on (FR-1 `.txt`/`.md`, FR-3). Unusable input must be rejected in the browser before any AI call.

**Approach:** Add the drop zone on Start, a Web Worker that decodes `.txt`/`.md` and runs the one AD-8 pipeline (lines → paragraphs → Normalization → sentence split → Passages `p1…pn`), Note Hash and word count in `core/`, and every FR-3 rejection that applies to text files, shown inline at the drop zone. Refs: FR-1, FR-3 · AD-3, AD-8, AD-9 · UX-DR23, UX-DR24, UX-DR25.

## Boundaries & Constraints

**Always:** Normalization, paragraph and Passage rules, word count and Note Hash live once in `web/core/` (pure, no DOM), and the worker calls them; one pipeline for `.txt` and `.md` (same text → same Passages and hash, whatever the name or extension); type and size are checked on the main thread before any file read, with the extension compared case-insensitively (`.TXT` = `.txt`); while processing, both the input and drops on the zone are ignored; the worker is terminated at 15 s → `err.unreadable`; errors use `ErrorMessage` tied to the input with `aria-describedby` + `aria-invalid`, focused on show; the input is a labelled native `<input type="file">`; every string from `messages.ts`; `normalizationVersion = 1`.

**Never:** no storage of the Note (IndexedDB/`idb` is 1.9); no generation, Genererer screen or `api/` POST; no `.docx`/PDF extraction, `err.scanned` or new dependencies (1.5); no paste text area (3.4); no 'Prøv demomodus' or Demo Mode (1.14); no 'Dine notater' list.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid text | UTF-8 `.txt`/`.md`, 150–15 000 words | Passages, word count, Note Hash; `note.meta` "{filnavn} · {ord} ord · {avsnitt} avsnitt" via `role="status"` | — |
| Upper-case extension | `NOTAT.TXT`, `a.MD` | accepted like `.txt`/`.md` | — |
| Word/PDF before 1.5 | `.docx`, `.pdf` | accepted type (not `err.type`), stub returns `err.unreadable` | 1.5 replaces the stub |
| BOM | UTF-8 with BOM | BOM stripped; same hash as without | — |
| Not UTF-8 | windows-1252 bytes | decoded as `windows-1252`, `warn.encoding` via `role="status"` | non-blocking |
| Wrong type | `.doc`, `.rtf`, no extension | `err.type` | file never read |
| Too big | > 10 MB (10 × 1024 × 1024 bytes) | `err.size` | file never read |
| Empty | 0 bytes or whitespace only | `err.noText` | — |
| Too short / long | < 150 / > 15 000 words | `err.tooShort` / `err.tooLong` | — |
| Hang | worker > 15 s | worker terminated, `err.unreadable` | page responsive |
| Same text, two names | `a.txt` and `b.md`, same bytes | identical Note Hash | — |
| New choice | error shown, then a valid file | error and `aria-invalid` cleared | — |
| Any rejection | — | no request to `/api/study-set` | — |

</frozen-after-approval>

## Open Questions

All three resolved 2026-11-23 (option A on each):

1. **Resolved: A.** **What Start shows after a valid file (before 1.9 adds generation).** Options: **A (recommended)** a `role="status"` line with the Note meta "{filnavn} · {ord} ord · {avsnitt} avsnitt" (new key `note.meta`, the same format Genererer shows, so 1.9 reuses it); **B** nothing visible (the result exists only for tests), so the student cannot tell the file was accepted.
2. **Resolved: A.** **`.docx` and `.pdf` until 1.5.** They are accepted types (not `err.type`). Options: **A (recommended)** the input accepts them and they show `err.unreadable` until 1.5 replaces the stub (wrong advice for a day or two, no new string); **B** a temporary new string such as "Word og PDF kommer snart." (new key, removed in 1.5).
3. **Resolved: approve as written** — including the "… eller lim inn teksten." endings of `err.noText`/`err.unreadable`, although the paste text area only arrives in 3.4. **Microcopy approval.** These EXPERIENCE.md drafts would ship as written: `start.dropzone` "Slipp en fil her eller velg fil" + ".txt .md .docx .pdf · maks 10 MB" (split into `start.dropzone` with "[velg fil]" marking the link-styled part and `start.dropzone.types`); `err.type`, `err.size`, `err.noText`, `err.unreadable`, `err.tooShort`, `err.tooLong`, `warn.encoding` exactly as in the Microcopy table. Options: **approve as written** / **change** named strings.

## Code Map

- `web/app/page.tsx` -- Start: keep `EmptyState` + `ConsentNotice`; add the drop zone after the empty-state line (mockup key-start frame c/d: zone, then error below it).
- `web/components/ErrorMessage/ErrorMessage.tsx` -- reuse; has `id`, `role="alert"`, `tabIndex={-1}`.
- `web/components/Screen/Screen.tsx` -- focuses h1 on mount; the error focus must not fight it (only on a user action).
- `web/i18n/messages.ts` -- add keys; `format()` exists for placeholders.
- `web/extract/.gitkeep` -- replace with the worker and its client.
- `web/vitest.config.ts` -- already includes `extract/**/*.test.ts`; environment `node` (has `crypto.subtle`, `TextDecoder` with `windows-1252`).
- `web/core/tokens.test.ts` -- hard-coded-text and `var(--…)` guards cover new components and CSS.
- `e2e/seed.ts` -- `seedConsent(page, "accepted")` before `goto` for every new e2e test.
- `.docs/deviations.md` -- D-5 for new or split keys.
- `reference-notes/nb-smidig-scrum.md` -- real `.md` input for a pipeline smoke test.

## Tasks & Acceptance

**Execution:**
- [ ] `web/core/normalize.ts` + test -- `normalize(text)`: NFKC → rejoin end-of-line hyphenation → collapse whitespace → unify quotation marks; reused by the Quote Check in 1.8.
- [ ] `web/core/passages.ts` + test -- `toParagraphs(lines)`, `toPassages(paragraphs)`, `countWords(text)`, `NORMALIZATION_VERSION = 1`, `PASSAGE_LIMIT`.
- [ ] `web/core/noteHash.ts` + test -- `noteHash(passages)` SHA-256 lowercase hex of texts joined by `"\n\n"`.
- [ ] `web/core/types.ts` -- `Passage {id, text}`, `ExtractedNote {fileName, passages, wordCount, normalizationVersion, encodingFallback}`.
- [ ] `web/extract/text.ts` + test -- `decodeText(bytes)` (fatal UTF-8, BOM strip, `windows-1252` fallback flag) and `extractNote(...)` running the core pipeline and returning a result with a key, never throwing.
- [ ] `web/extract/worker.ts` -- worker entry; `web/extract/client.ts` + test -- `checkFile(file)` (type, size), `extractInWorker(file, {createWorker, timeoutMs = 15000})` with terminate on timeout or error.
- [ ] `web/components/DropZone/` -- label wrapping a visually hidden native input + drop target; `aria-describedby`/`aria-invalid`; disabled (`aria-disabled`) while processing; one file (first of a drop).
- [ ] `web/app/page.tsx`, `web/i18n/messages.ts` -- wire; keys per Open Question 3, plus `note.meta` (Open Question 1).
- [ ] `e2e/upload.spec.ts` -- every matrix row except Hang via `setInputFiles` buffers; asserts no `/api/study-set` request; axe with an error shown at desktop and 320 px.
- [ ] `.docs/deviations.md` D-5; EXPERIENCE.md mark approved rows; `README.md` one line on supported files and limits.

**Acceptance Criteria:**
- Given `docker compose run --rm test` with no key, when run, then all three suites pass.
- Given Vitest, when it runs, then Normalization, Passage splitting, Note Hash and every rejection have unit tests, including `.txt`/`.md` hash equality.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

**Pipeline rules (decided, not user-visible; fixed by tests per AD-8 risk table):** lines split on `\r?\n`; a blank line ends a paragraph; consecutive lines join into one paragraph, except a line starting a list item (`-`, `*`, `+`, `1.`/`1)`) or a Markdown heading starts a new one. Heading markers `#`, bullet markers and `>` are dropped; ordered numbers and inline markup stay. Hyphen rejoin: `letter-` at line end + lowercase letter at next line start → joined without hyphen, unless the next word is `og`/`eller`/`and`/`or`. Quotes: `“ ” „ ‟ « » ″` → `"`, `‘ ’ ‚ ‛ ′` → `'`. `PASSAGE_LIMIT = 800` characters: longer paragraphs are packed greedily by sentence (regex split after `.!?…` + space before an uppercase letter, digit or quote; deterministic, no `Intl.Segmenter`, so Node and browser hash alike); a single longer sentence stays whole. Words = whitespace tokens with at least one `\p{L}` or `\p{N}`, counted on the final Passages (after Normalization and hyphen rejoin), so the 150/15 000 limits and `note.meta` use the same number. Any change to these rules or to `PASSAGE_LIMIT` changes the Note Hash and must bump `NORMALIZATION_VERSION`. Known, accepted behavior: the sentence regex also splits after abbreviations such as "f.eks." or "bl.a." when an uppercase word follows; do not "fix" this without a version bump.

## Verification

**Commands:**
- `docker compose run --rm --build test` -- exit 0, all suites incl. axe.

**Manual checks:**
- Drop and pick a file at 320 px with keyboard only; the focus ring shows on the zone.
