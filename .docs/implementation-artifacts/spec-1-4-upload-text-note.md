---
title: 'Story 1.4: Upload a text or Markdown Note and reject unusable input'
type: 'feature'
created: '2026-11-23'
status: 'done'
route: 'dispatch'
baseline_commit: '478363173c390781cf08c5e952c073f2afad52df'
review_loop_iteration: 1
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
| UTF-16 with BOM (`FF FE` / `FE FF`) | decoded as UTF-16 LE/BE, BOM stripped; no `warn.encoding`; same hash as the UTF-8 file (decided 2026-11-23) |
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
- [x] `web/core/normalize.ts` + test -- `normalize(text)`: NFKC → hyphen rejoin → collapse whitespace → unify quotes (1.8 Quote Check reuses it).
- [x] `web/core/passages.ts` + test -- `toParagraphs`, `toPassages`, `countWords`, `NORMALIZATION_VERSION`, `PASSAGE_LIMIT`.
- [x] `web/core/noteHash.ts` + test -- SHA-256 lowercase hex of Passage texts joined by `"\n\n"`.
- [x] `web/core/types.ts` -- `Passage {id, text}`, `ExtractedNote {fileName, passages, wordCount, normalizationVersion, encodingFallback}`.
- [x] `web/extract/text.ts` + test -- `decodeText(bytes)` (fatal UTF-8, BOM strip, 1252 fallback flag); `extractNote(...)` returns a result or error key, never throws.
- [x] `web/extract/worker.ts`; `web/extract/client.ts` + test -- `checkFile(file)`; `extractInWorker(file, {createWorker, timeoutMs = 15000})`, terminates on timeout or error.
- [x] `web/components/DropZone/` -- label around a visually hidden input + drop target; `aria-disabled` while processing; first file of a drop only.
- [x] `web/app/page.tsx`, `web/i18n/messages.ts` -- wire up; keys per Decisions + `note.meta`.
- [x] `e2e/upload.spec.ts` -- every matrix row except the hang, via `setInputFiles` buffers; no `/api/study-set` request; axe with an error shown at desktop and 320 px.
- [x] `.docs/deviations.md` D-5 (new/split keys); mark approved EXPERIENCE.md rows; one README line on files and limits.

**Acceptance Criteria:**
- Given `docker compose run --rm test` with no key, when run, then all three suites pass.
- Given Vitest, when it runs, then Normalization, Passage splitting, Note Hash and every rejection are unit-tested, including `.txt`/`.md` hash equality.

## Implementation Notes

- **Note Hash without `crypto.subtle`:** the Compose test run serves the app from `http://web:3000`, which is not a secure context, so `crypto.subtle` is missing in the browser and worker (`--unsafely-treat-insecure-origin-as-secure` did not take effect in Playwright's Chromium). `core/sha256.ts` is a small pure SHA-256 (no dependency), checked against the FIPS vectors and `node:crypto`; `noteHash()` is therefore synchronous and works on any origin and in Node.
- **″ before NFKC:** NFKC turns ″ (U+2033) into two ′, so `normalize()` maps ″ → `"` first; the other rules run in the stated order.
- **Headings and tables:** a heading is a paragraph of its own (Markdown headings are one line). Following AD-8 ("table rows … are separate"), each line starting with `|` is a paragraph of its own, and delimiter rows (`|---|---|`) are dropped. Closing `#`s of a heading are stripped; thematic breaks and setext underlines (`---`, `***`, `___`, `===`, `- - -`, `* * *`) end the paragraph and are dropped; Passages with no letter or digit are dropped.
- **Review fixes:** UTF-16 LE/BE is decoded by its BOM (no fallback flag); `normalize()` first removes U+00AD, U+200B–U+200D, U+2060 and U+FEFF, rejoins a line-end U+2010 hyphen too, and maps ‴ ‶ ‷ to `"` before NFKC; the drop zone blocks the browser's default for file drags anywhere on the window.
- **Hash in the DOM:** the `role="status"` meta line carries `data-note-hash`, so e2e can compare hashes; nothing else reads it before 1.9.
- **"Never read":** e2e counts `new Worker` calls; the main thread never reads the file, so zero workers means the file was not read.
- **Reference note in the test image:** `e2e/Dockerfile` copies `reference-notes/nb-smidig-scrum.md` for the Vitest smoke test.
- **Numbers in `note.meta`:** formatted with `Intl.NumberFormat("nb-NO")` (thousands separated by a no-break space).

## Spec Change Log

- **2026-11-23, review pass 1 (intent_gap BH5/EC6):** Tor decided that UTF-16 files with a BOM are decoded as UTF-16 (new matrix row in the frozen block). He also chose to keep the green implementation and fix this together with the patch findings, instead of the workflow's revert-and-replan loopback. Known-bad state avoided: UTF-16 notes accepted as NUL-interleaved windows-1252 text.

## Review Triage Log

Review pass 1 (2026-11-23): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| BH5, EC6 | UTF-16 file (BOM `FF FE`/`FE FF`) decoded as windows-1252 | medium | Not valid UTF-8 → 1252 fallback; NUL-interleaved tokens still contain letters, so a 200-word UTF-16 note passes with garbage text and only `warn.encoding`. The frozen matrix maps every non-UTF-8 file to 1252; decode-as-UTF-16 vs reject is a choice the intent does not make. | intent_gap |
| BH8, EC3, EC4, EC5 | Markdown structure outside the rule list leaks into Passages | medium | `---`/`***`/`===` lines are joined into paragraph text; `- - -` leaves Passage `"- -"`; `## Tittel ##` keeps `##`; word-less Passages get IDs and count in `note.meta` "avsnitt". | patch |
| BH7 | Text after a table row is glued onto the row | low | `TABLE_ROW` flushes before a row only, so `"| a | b |\nTekst"` → one paragraph. | patch |
| BH3 | File dropped outside the zone opens in the browser | medium | Only the `<label>` prevents default on dragover/drop; a near-miss navigates away from the app. | patch |
| VG1, BH11 | Busy guard ("input and drops ignored while processing", `aria-disabled`) untested | medium | Pre-verified: no test overlaps two uploads or asserts `aria-disabled`; removing the guard keeps the run green. | patch |
| VG2 | Success → rejection clearing the Note meta untested | low | Pre-verified: no test runs `expectRejected` after `expectAccepted`. | patch |
| VG3 | `nb-NO` thousands grouping in `note.meta` untested | low | Pre-verified: only a 206-word exact assertion. One more e2e assertion fixes it. | patch |
| BH9 | `normalize()` keeps soft hyphen / zero-width chars; U+2010 line-end hyphen not rejoined | low | NFKC keeps U+00AD, U+200B–U+200D, U+2060, U+FEFF; `HYPHEN_BREAK` matches ASCII `-` only. One-line correction. | patch |
| EC10 | `‴ ‶ ‷` expand under NFKC | low | Same mechanism as ″; direct addition to the pre-NFKC mapping. | patch |
| BH2 | D-5 says EXPERIENCE.md gained `start.dropzone.types`/`note.meta` rows; it did not | low | EXPERIENCE.md hunk only adds *(approved)* tags. Direct doc correction. | patch |
| BH4 | No busy announcement; old error stays until the new result | low | Text extraction finishes in milliseconds, so the window is negligible; a fix needs new busy UI and strings. | reject |
| BH6 | `ORDERED` splits hard-wrapped lines starting "17. mai …" | low | Follows the Design Notes rule (`1.` starts a list item); changing it edits this spec. | reject |
| EC1 | CR-only line endings | low | Classic-Mac files only; the Design Notes fix `\r?\n`, so the fix edits this spec. | reject |
| EC2 | Code fences not handled | low | Fence lines become word-less Passages (removed by the BH8 patch); `#` inside code is rare in student notes; a fix needs fence state. | reject |
| BH12, EC9 | Worker not terminated on unmount | low | Text extraction answers in ms; the worker terminates on answer or at 15 s; React 18 ignores the late setState. A fix needs abort plumbing. | reject |
| BH13 | Drag highlight flickers over child spans | low | `dragleave`→`dragenter` on children re-sets `data-over` in the same frame; a fix needs a counter. | reject |
| BH10, EC7, EC8 | `isResult` accepts unknown error keys / `note: null` | false | The only sender is `worker.ts`, which posts `extractNote`'s typed result; the case is unreachable. | reject |
| BH1, VG-other | Spec `in-review` vs sprint `in-progress` | false | The workflow syncs sprint status at presentation; both values are intermediate. | reject |
| BH14 | `data-note-hash` in the DOM; keyboard test hard-codes `3px` | false | The hook is documented (Implementation Notes); a token change failing the test is visible, not a silent regression. | reject |
| EC11 | `PASSAGE_LIMIT` counts UTF-16 units | false | "Characters" is not defined as code points; `length` is identical in Node and browsers, which is what the hash needs. | reject |

## Design Notes

**Pipeline rules (fixed by tests, AD-8):** split lines on `\r?\n`; a blank line ends a paragraph; lines join, except a list item (`-`, `*`, `+`, `1.`, `1)`) or heading starts a new paragraph. Drop `#`, bullet and `>` markers; keep ordered numbers and inline markup. Hyphen rejoin: `letter-` at line end + lowercase next line → joined, unless the next word is `og`/`eller`/`and`/`or`. Quotes `“ ” „ ‟ « » ″` → `"`, `‘ ’ ‚ ‛ ′` → `'`. `PASSAGE_LIMIT = 800` chars: longer paragraphs packed greedily by sentence (split after `.!?…` + space before uppercase, digit or quote; regex, no `Intl.Segmenter`, so Node and browser agree); an over-long sentence stays whole. Words = whitespace tokens with a `\p{L}` or `\p{N}`, counted on final Passages. Any rule or `PASSAGE_LIMIT` change alters the hash → bump `NORMALIZATION_VERSION`. Accepted: splits after "f.eks."/"bl.a." before an uppercase word.

## Verification

**Commands:**
- `docker compose run --rm --build test` -- exit 0, all suites incl. axe.

**Manual checks:**
- Pick and drop a file at 320 px, keyboard only; focus ring visible on the zone.
