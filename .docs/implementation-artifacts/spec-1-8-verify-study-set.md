---
title: 'Story 1.8: Verify the Study Set in the browser (Quote Check and minimums)'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: '786b10b5454233ec34dc5081b85d2a945def7ff0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Proxy returns a schema-valid `StudySet`, but nothing proves its Quotes exist in the Note, no Item has a stable ID, and the post-drop floors have no owner, so the app could show invented content.

**Approach:** One pure function `core/verifyStudySet(raw, passages)` assigns IDs, runs the Quote Check and option uniqueness, applies the floors and returns `{ok: false, code}` or `{ok: true, set: VerifiedStudySet}` — the only shape later stories store or render. Refs: FR-6, FR-7, FR-9, FR-10 · AD-3, AD-9, AD-16, AD-19 · DR-2.

## Boundaries & Constraints

**Always:** order per AD-19: IDs + duplicate drop → Quote Check + option uniqueness → floors (`err.generation` checked before `err.tooFewItems`). IDs assigned from the raw order before any drop, so they never shift. Quote and Passage compared with `core/normalize`; only an exact substring of the *cited* Passage passes. Pure: no clock, randomness, I/O or throw for any schema-valid input. `core/` source files import only `./…`.

**Never:** shape (Zod) re-validation of `raw` — callers pass contract data; fuzzy matching; regeneration; changes to `proxy/`, `schemas.py` or `schema.d.ts`; storage or UI wiring (Story 1.9).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| happy | 5 concepts, each 1 fc + 1 qq, 5 sp, all quotes valid | `ok: true`, every concept `covered: true` |
| IDs | concept "Fotosyntese i C4-planter" with 2 fc, 2 qq; 6 sp | `k-fotosyntese-i-c4-planter`, `….fc1`, `….fc2`, `….qq1`, `….qq2`, `sp1…sp6` |
| collision | "Celle-ånding" then "celle ånding" | second concept and its Items dropped |
| empty slug | name `"???"` | concept and its Items dropped |
| bad Passage | `passageId: "p99"` | Item dropped |
| wrong Passage | quote is in p3, cites p2 | Item dropped |
| spans Passages | quote = end of p1 + start of p2 | Item dropped |
| normalization | quote has `“ ”`, soft hyphen, double spaces; Passage has `" "` | passes |
| length | normalized quote 19 / 20 / 300 / 301 code points | drop / pass / pass / drop |
| options | `["A", "a", …]` vs `["A", "A ", …]` | first kept (case-sensitive), second dropped |
| ID stability | fc1 fails, fc2 passes | survivor keeps `.fc2` |
| not covered | concept loses all fc and qq | kept, `covered: false`, empty item lists |
| floors | 4 concepts after dedupe, or 4 sp after Quote Check | `{ok: false, code: "err.generation"}` |
| floors | 4 fc or 4 qq survive in total | `{ok: false, code: "err.tooFewItems"}` |
| language | `"nb"`, `"NB-no"`, `"en_US"`, `"xx"`, `""` | `nb`, `nb`, `en`, `und`, `und` |
| cache key | any `ok` result | `cacheKey` = `${noteHash(passages)}:${promptVersion}:${model}` |

</frozen-after-approval>

## Code Map

- `web/core/normalize.ts` -- `normalize()`; reuse for Quotes, options and concept names. Passages are already normalized (pipeline output).
- `web/core/noteHash.ts` -- `noteHash(passages)` (sync) for the cache key.
- `web/core/types.ts` -- `Passage`; add `RawStudySet` (structural, like `GateStatus` in `gate.ts`) and `VerifiedStudySet`.
- `web/api/schema.d.ts` -- `components["schemas"]["StudySet"]`: camelCase `concepts[].{name, centralityRank, flashcards[], quizQuestions[]}`, `summaryPoints[]`, `language`, `model`, `promptVersion`; Items carry `passageId`, `quote`. Do not edit.
- `proxy/app/rules.py` -- already enforces 5–15 concepts, 4 options, in-range `correctIndex`, ≤ 2 Items per kind, ranks 1..n; do not repeat these.
- `web/i18n/messages.ts` -- lacks `err.generation` and `err.tooFewItems`; EXPERIENCE.md Microcopy L138, L140 has the strings.
- `web/core/gate.test.ts` -- test pattern, incl. "codes are message keys".

## Tasks & Acceptance

**Execution:**
- [x] `web/core/types.ts` -- add `RawStudySet` (+ raw Item types) and `VerifiedStudySet`: concepts `{id, name, centralityRank, covered, flashcards: {id, front, back, passageId, quote}[], quizQuestions: {id, question, options, correctIndex, passageId, quote}[]}`, `summaryPoints: {id, text, passageId, quote}[]`, `model`, `promptVersion`, `language`, `cacheKey`.
- [x] `web/core/ids.ts` -- `keyConceptId(name)`, `cacheKey(noteHash, promptVersion, model)`; the one place AD-9 IDs are built.
- [x] `web/core/language.ts` -- `checkLanguage(tag)` with the allow-list (Design Notes).
- [x] `web/core/verifyStudySet.ts` -- `verifyStudySet(raw, passages)` and `quoteCheck(passageId, quote, passagesById)`.
- [x] `web/core/verifyStudySet.test.ts`, `ids.test.ts`, `language.test.ts` -- every matrix row; returned codes are message keys; a type-level check that `components["schemas"]["StudySet"]` is assignable to `RawStudySet`.
- [x] `web/core/boundary.test.ts` -- every non-test `core/*.ts` imports only `./` paths.
- [x] `web/i18n/messages.ts` -- add `err.generation`, `err.tooFewItems` (first sentence of the Microcopy row; buttons are separate keys).

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` without a key, when run, then Vitest (incl. the new suites), pytest and Playwright pass.
- Given `npm run typecheck` in `web/`, when run, then it passes.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Source | Finding | Verdict | Route / evidence |
|---|--------|---------|---------|------------------|
| 1 | EC, BH | Boundary test accepts `./../…` specifiers | low | patch: reject `..` segments |
| 2 | EC, BH | Boundary test not recursive | low | rejected: `core/` has no subfolders; guards undemonstrated state |
| 3 | VG, BH | ID stability untested for `.qq{n}` and `sp{n}` | medium | patch: two tests |
| 4 | VG | Stored normalized Quote untested for qq and sp | medium | patch: test |
| 5 | VG | `covered` untested for a quiz-only concept | medium | patch: test |
| 6 | BH | "empty slug" assertion vacuous; collision/empty-slug tests check only Flashcards | low | patch: exact ID list, qq check |
| 7 | BH | Error codes not tied to message keys at type level | low | patch: type assertion |
| 8 | — | `quoteCheck` comment cites FR-7, not FR-9 | low | patch |
| 9 | EC | `correctIndex` out of range kept | false | Proxy `QuizQuestion` has `ge=0, le=3`; Never: no shape re-validation |
| 10 | EC | Empty `options` counts as unique | false | Proxy requires exactly 4 options |
| 11 | EC, BH | Option blank after Normalization (e.g. only soft hyphen) kept | low | rejected: Proxy rejects whitespace-only; soft-hyphen-only option is implausible; fix adds a guard |
| 12 | EC, BH | Slug splits on combining marks (`İstanbul` → `k-i-stanbul`) | low | rejected: AD-9 says letters and digits only; IDs are internal and deterministic |
| 13 | EC | Duplicate Passage IDs: last wins | false | pipeline numbers `p1…pn`; Proxy rejects duplicates |
| 14 | EC | Duplicate identical Items both kept | low | rejected: not a spec rule; adds dedupe logic |
| 15 | EC | Mid-word substring passes | false | FR-9: exact substring is the rule (D3 rejected fuzzy tiers) |
| 16 | EC, BH | `quoteCheck` assumes normalized Passages | low | rejected: Passages are pipeline output by contract (AD-8); documented in the comment |
| 17 | BH | `language` typed `string`, not a literal union | low | rejected: no named consumer harm yet |
| 18 | BH | Concept order undefined | false | Proxy sorts by rank (`rules.py`); order and ranks are kept |
| 19 | BH | "odd input" test runs with no Passages | low | rejected: it tests no-throw, which it shows |
| 20 | BH | Diff omits spec and sprint-status | false | intentional: reviewers see code only |

## Design Notes

- **Slug** (AD-9): `normalize(name).toLowerCase()`, already NFKC; runs of anything outside `[\p{L}\p{N}]` → `-`; leading/trailing `-` trimmed. An empty slug drops the concept (an ID of `k-` would collide across Notes' odd names).
- **Stored quote** is the normalized Quote, so Story 1.12 can find it in the (normalized) Passage with `indexOf`.
- **Length** counted in code points (`[...q].length`), not UTF-16 units.
- **Ranks** kept as the Proxy sent them; gaps after a duplicate drop are harmless (order only).
- **Language allow-list** (not named in planning docs; chosen here): primary subtag of the trimmed tag (split on `-`/`_`), lowercased, must be one of `nb nn no da sv fi is en de fr es it nl pl`; otherwise `und`. Output is the primary subtag only.
- **Floors:** "concepts" counts all concepts after dedupe (covered or not); Item minimums count surviving Flashcards / Quiz Questions across all concepts.

## Verification

**Commands:**
- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
- `cd web && npx vitest run core && npx tsc --noEmit` -- green.
