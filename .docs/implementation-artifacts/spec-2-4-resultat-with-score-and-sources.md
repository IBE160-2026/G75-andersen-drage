---
title: 'Story 2.4: Resultat with score and sources'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_commit: 'd2386d0f23d52b9facbe1c04cbff77a9775214ca'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 'Se resultatet' only returns to Notatoversikt, a completed Round's URL shows `note.missing`, and every overview chip is hard-coded 'ny': the student never sees a score, what they missed, or their Mastery State.

**Approach:** Pure `core/score`; a Resultat screen at `/notat/{noteHash}/runde/{roundId}/resultat` for a `complete` Round; real chips on Notatoversikt from `conceptProgress`. Refs: FR-12, FR-14 · AD-3, AD-21 · NFR-6 · UX-DR11, UX-DR17, UX-DR19.

## Boundaries & Constraints

**Always:**
- `score(answers, questions)` → `{ correct, total }`: `total` = the Round's Quiz Questions; `correct` = Quiz answers with `choice === correctIndex`; Flashcard answers ignored; unanswered = wrong.
- Resultat loads only a `complete` Round owned by the note with resolving Items and ≥ 1 Quiz Question; otherwise `note.missing`. Reload shows the same Resultat. A complete Round's Round URL (with Quiz Questions) `replace`s to Resultat.
- 'Se resultatet' → Resultat; `h1` focused, title "Resultat · {notat} · …".
- Heading (Tor, 2026-11-25): `h1` "Resultat" then `result.score` as a paragraph (EXPERIENCE.md :77, mockup); deviation from the epics AC recorded in D-23.
- Quiz-free Round (Tor, 2026-11-25): unchanged, last mark → Notatoversikt, no Resultat.
- `StudyLayout` (tabs on mobile). Order: heading, score, primary 'Tilbake til oversikten', rows (mockup `key-result.html`).
- Row per Quiz Question in Round order: `section` labelled by `h2` "Spørsmål {x}"; question in serif; "✓/✗ Ditt svar: {letter}. {option}"; on a miss also "✓ Rett svar: {letter}. {option}"; letters per stored `optionOrder`; marks `aria-hidden`; `QuoteBlock` + `SourceRef` (unique `id`), return context "Viser {Pn} fra resultatet" / 'Tilbake til resultatet', focus returns to that reference. Tokens `result-row`, `mastery-known-fg` / `mastery-shaky-fg`.
- 'Tilbake til oversikten' → Notatoversikt; Round stays `complete` with its 2.3 `completedAt`.
- Notatoversikt chips: stored state for covered concepts, no row → 'ny', not covered unchanged; a failed progress read → 'ny', never an error.
- New keys (texts approved in EXPERIENCE.md › Microcopy; names in D-23): `result.title` "Resultat", `result.score` "{n} av {m} riktige", `result.back` 'Tilbake til oversikten', `result.yours` "Ditt svar:", `result.correct` "Rett svar:", `return.from.result` "resultatet", `return.result` 'Tilbake til resultatet'.

**Never:** next Round or Round-end changes (2.5), Readiness (3.2), Flashcard rows, DB version bump, new store or field, `waitForTimeout`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| Mixed | 2 of 4 right | "2 av 4 riktige"; "Rett svar:" only on the 2 misses |
| Fewer questions than concepts | 5 concepts, 3 questions | `total` 3 |
| Not complete | active / abandoned | `note.missing` |
| Complete Round URL | `/runde/{id}` | replaced by `.../resultat` |
| Progress read fails | error | chips 'ny' |

</frozen-after-approval>

## Code Map

- `web/core/round.ts:25-55` -- `QuizAnswer`, `isQuizAnswer`, `Round`; new `core/score.ts` + test beside it.
- `web/components/Round/Round.tsx` -- `next()` :210-217 → Resultat path; reuse `roundQuizQuestions` :42, `itemsResolve` :74; quiz-free path :171-174 unchanged.
- `web/app/notat/[noteHash]/runde/[roundId]/page.tsx` -- `loadRecords` :161; add the replace. New `.../resultat/page.tsx` (reuse `decodeParam`, `NoteMissing` from `app/notat/shared.tsx`).
- `web/app/notat/[noteHash]/page.tsx:55-60` + `NoteOverview.tsx` (`roundPath` :24, `StudyPanel` :125, chip :172-174) -- load `readConceptProgress` (`storage/db.ts:251`), pass as prop.
- New `web/components/Result/` -- reuse `Screen`, `StudyLayout`, `QuoteBlock`, `SourceRef`/`ReturnContext` (`ReferenceJump.tsx`), export `OPTION_LETTERS`/`displayOrder` from `QuizQuestion.tsx` (do not copy), `Button`. DESIGN.md › Resultat row :602.
- Tests to update: `e2e/round.spec.ts` tails :588-595, :744, :881-909; `QuizQuestion.test.tsx:199-211`; `RoundScreen.test.tsx:153-160`. Helpers: `openOverview`, `startRound`, `markAllCards`, `answerQuestion`, `axeBlocking`.
- `.docs/deviations.md` D-22 (:30) "until Resultat"; `README.md:69` quiz bullet.

## Tasks & Acceptance

**Execution:**
- [x] `web/core/score.ts` + test -- all right, all wrong, mixed, fewer questions, Flashcards ignored, unanswered.
- [x] `web/i18n/messages.ts`, `web/components/Result/` + happy-dom test -- rows, misses, letters, return focus.
- [x] Resultat page, Round page, `Round.tsx` + unit tests -- loader, replace, 'Se resultatet'.
- [x] Notatoversikt page + `NoteOverview.tsx` + test -- chips.
- [x] `e2e/round.spec.ts` -- keyboard full loop → Resultat (score, rows, misses); jump + return at 1280 and 320 px; reload; Round URL replace; back → chips + stored `complete`/`completedAt`; axe 1280/320; old tails.
- [x] `.docs/deviations.md` D-23 + amend D-22; `README.md`.

**Acceptance Criteria:**
- Given a finished Quiz, when I press 'Se resultatet', then Resultat shows score and rows as specified with focus on the `h1`.
- Given Resultat, when I press 'Tilbake til oversikten', then chips show the stored states.
- Given keyboard only at 1280 and 320 px, when I use Resultat, then all works and axe finds no serious/critical violation.

## Carried items

None found (searched `deferred-work.md`, open `issues.md` items, open sprint-status `action_items`). The Round-end recheck (N1) stays with 2.5.

## Implementation Notes

- The row `h2` "Spørsmål {x}" needed a key: `result.row` (text from EXPERIENCE.md › Page structure, Resultat row), recorded in D-23 beside the seven listed keys.
- Route helpers `notePath` / `resultPath` sit beside `roundPath` in `NoteOverview.tsx`; `resultReady` (in `components/Result/Result.tsx`) is the one Resultat guard, used by the Resultat page and by the Round page's `replace`.
- `h1` and the score paragraph sit above the split / tabs (like the Round progress line); 'Tilbake til oversikten' and the rows are the study panel.

## Spec Change Log

## Review Triage Log

Pass 1 (2026-11-25): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG).

| ID | Finding | Verdict | Evidence | Route |
|----|---------|---------|----------|-------|
| BH1/VG1 | 'Se resultatet' pushes Resultat over the Round URL; Back lands on the Round URL, which `replace`s to Resultat again, so Back seems dead; no e2e for Back | medium | Real: history becomes overview → Resultat → Resultat. `next()` on a complete Round should `replace`; e2e `goBack()` to Notatoversikt. | patch |
| BH3 | Focused `h1` reads only "Resultat"; the score is not announced on arrival | low | Real since D-23 moved the score out of the `h1`; `aria-describedby` from the `h1` to the score paragraph is a direct fix with no new text. | patch |
| BH5 | README no longer says a complete quiz-free Round's URL shows «Fant ikke notatet» | low | Real omission of the decided behaviour; one clause. | patch |
| BH7 | First-answer-per-question rule duplicated in `score()` and `ResultScreen` | low | Real: a change in one place makes the score and the rows disagree. Export one helper from `core/score.ts`, use it in both. | patch |
| BH2/EC4 | Task says "unit tests -- loader, replace", but page loaders are covered by e2e only | low | Real wording gap; no `app/` page has unit tests in this repo and e2e covers both loaders and the replace. Fix would be a spec edit or new page-test setup. | reject |
| BH4 | Resultat after regenerate (D-19) shows `note.missing`, not documented | low | Real but follows D-19 (old set deleted / Items gone) like the Round URL; rarely met. | reject |
| BH6 | sprint-status 2-4 `in-progress`, 2-3 `review` | false | 2-4 moves at step 5; 2-3 stays `review` until Tor's manual checks (issues.md 2026-11-25 story-2-3). | reject |
| BH8 | Unanswered / corrupt `choice` renders an empty "Ditt svar:" | false | A Round is `complete` only after its last Item is answered (`recordAnswer`), and `recordQuizAnswer` rejects out-of-range `choice`; only hand-edited storage reaches it. | reject |
| BH9 | Loader checks duplicate `resultReady` | false | Redundant checks, no behaviour or caller diverges; no named harm. | reject |
| BH10 | e2e lacks quiz-free and other-Note Resultat URLs, and a `demo:` Resultat | low | `resultReady` unit tests cover both conditions; `decodeParam` is shared with the Round page, whose demo URLs are e2e-tested. | reject |
| BH11 | Hard-coded `font-weight` in `Result.module.css` | false | Same pattern as Round, QuizQuestion, NoteOverview, StudyLayout CSS; the tokens file has no weight-only token for marks. | reject |
| BH12 | `progress` prop type written twice | false | No caller diverges; no named harm. | reject |
| BH13 | Fragile test selectors and a long comment line | low | Developer-only, tests pass; not a direct fix across helpers. | reject |
| BH14/EC5 | Tab order h1 → button and at 320 px not automated | low | Listed as manual checks (spec › Verification), as for 2.1–2.3. | reject |
| EC1 | Same-`cacheKey` regenerate with matching Item IDs rescores an old Resultat | low | Possible only via 'Prøv igjen' producing the same Item IDs with new answers; fix needs a snapshot on the Round (new field, Never). | reject |
| EC2 | Duplicate Quiz Question in `itemIds` | false | `composeRound` takes one Quiz Question per concept; no writer repeats an Item ID. | reject |
| EC3 | Effect reruns on `router` identity change | false | Next app router's `useRouter` instance is stable across renders. | reject |

## Verification

**Commands:**
- `docker compose --profile test build && docker compose run --rm test` -- expected: Vitest and Playwright green.

**Manual checks:**
- Resultat after a mixed Quiz, 1280 px: `h1` focused; Tab 'Tilbake til oversikten' → each 'Kilde: Pn'; visible focus; screen reader reads "Ditt svar"/"Rett svar" without marks.
- Row 'Kilde: Pn' → 'Tilbake til resultatet' and Esc return focus to it.
- 320 px: no horizontal scroll, text wraps; 'Kilde' tab → Esc back to the reference.
- 'Tilbake til oversikten': chips match the answers; reload Resultat shows the same score.
