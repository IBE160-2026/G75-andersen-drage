---
title: 'Story 2.3: Answer Quiz Questions'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_commit: '346d16232b551bf2baff328bc3a94564f0e4297c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After the last Flashcard the Round shows only a Quiz-part shell (heading and stem as plain text); Quiz Questions cannot be answered, so the Quiz signal never reaches the Mastery State.

**Approach:** A Quiz region on the Round screen (stem, reference, four options A–D in `optionOrder`), answered on selection through a one-transaction `storage/recordQuizAnswer` with `updateMastery`, inline feedback + Quote, and `quiz.next` to the next question. Refs: FR-12, FR-14, FR-17 · AD-11, AD-21 · NFR-6 · UX-DR11, UX-DR12, UX-DR14, UX-DR15.

## Boundaries & Constraints

**Always:**
- Quiz region (`section`, `aria-labelledby` the Item `h2` "Spørsmål {x} av {y}"), no card container: concept chip, stem in `card-front`, `SourceRef` "Kilde: Pn" under the stem (usable before and after answering), four full-width secondary option buttons labelled "A"–"D" + option text, in `optionOrder[itemId]` display order. No Quote before answering.
- Selecting an option: UI computes `correct = original index === correctIndex` and `updateMastery(state, correct ? "correct" : "wrong")`; `recordQuizAnswer` in one `readwrite` transaction appends `{itemId, choice, answeredAt}` (`choice` = original option index) and puts the concept's `conceptProgress.state`. Same reject / double-press / complete-on-last rules as `recordFlashcardMark` (`.qq` ownership; `choice` an integer in `0…optionOrder[itemId].length − 1`).
- While saving, all options `aria-disabled` (pending); failure: no feedback, `err.generation` inline `role="alert"` named by the options' `aria-describedby`, options work again. Never throw to React.
- After a saved answer: correct option `quiz-option.correct-*` + "✓", a wrong choice `quiz-option.wrong-*` + "✗" (marks `aria-hidden`, text-backed); other options `aria-disabled`, full `ink`, `line` border, never `ink-disabled`; focus stays on the chosen option; a persistent `aria-live="polite"` region announces `quiz.correct` "Riktig." or `quiz.wrong` "Feil. Rett svar er {svar}." (`{svar}` = the correct option's letter, EXPERIENCE.md Key Flow "Rett svar er C."); then the `QuoteBlock` with its `SourceRef`; then `quiz.next` (primary).
- `quiz.next` 'Neste spørsmål' shows the next question with focus on its `h2`, mobile tabs reset to 'Studier'. Reload shows the first unanswered question, unanswered.
- Last question (Tor, 2026-11-25): its answer sets `status: "complete"` + `completedAt` in the same transaction; the control reads `quiz.result` 'Se resultatet' and goes to Notatoversikt until Resultat (2.4); the completed Round's URL keeps `note.missing`.
- Progress bar (Tor, 2026-11-25, carries VG2): fills per part, `(x) / y` of the shown "Kort/Spørsmål x av y"; tested in both parts (e.g. "Spørsmål 1 av 4" → 25 %).
- Quiz part titles: page title "Runde {n}, quiz · {notat} · …", `h1` "Runde {n}" + visually hidden ": quiz". A title change must not move focus from the Item `h2` (last card → first question focuses "Spørsmål 1 av y").
- Return context: "Viser {Pn} fra spørsmål {x}", action 'Tilbake til spørsmålet'.
- A Round whose concepts have only Quiz Questions starts in the Quiz part ("Spørsmål 1 av y").
- `RoundAnswer` = Flashcard | Quiz variant, and `RoundRecordSchema.answers` accepts both, so `saveGeneratedNote` still abandons an active Round with Quiz answers.
- Browser Study Set guard (`api/studySet.ts`) matches the Proxy: `centralityRank` and `correctIndex` integers, `options` length 4, `0 ≤ correctIndex ≤ 3`.
- New keys (texts approved in EXPERIENCE.md › Microcopy 2026-11-25; key names to record as D-22): `round.title.quiz` "Runde {n}, quiz", `round.h1.quiz` ": quiz", `quiz.correct`, `quiz.wrong`, `quiz.next` 'Neste spørsmål', `quiz.result` 'Se resultatet', `return.from.question` "spørsmål {x}", `return.question` 'Tilbake til spørsmålet'.

**Never:** keyboard shortcuts 1–4 or hints (4.1), 'Forklar enklere' (3.6), scoring or the Resultat screen (2.4), `lastPractisedAt` (3.1), a DB version bump, `waitForTimeout`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| Right answer | state `new`, correct option | `{itemId, choice}` stored, state `known`, ✓, "Riktig.", Quote, focus on the option |
| Wrong answer | state `known`, wrong option | state `shaky`, ✗ on choice, ✓ on correct, "Feil. Rett svar er C." |
| Opposite signals | card 'Kunne det', then its question wrong | state `shaky` (latest wins) |
| Double press | same `itemId` twice | one answer stored |
| Out of order / not active / bad `choice` | wrong `itemId`, `abandoned`, `choice` 4 | rejected, nothing written |
| Write fails | transaction rejects | no feedback, `err.generation`, nothing stored, options work again |
| Reload after answering x | x of y answered | "Spørsmål x+1 av y", unanswered |
| Quiz-only Round | no Flashcards | starts on "Spørsmål 1 av y" |

</frozen-after-approval>

## Code Map

- `web/core/round.ts:20-25` -- add `QuizAnswer {itemId, choice, answeredAt}` to `RoundAnswer`; `core/mastery.ts` `updateMastery` reused as is.
- `web/storage/db.ts:82-96` -- `answers` schema: union of both variants (`looseObject`); `recordFlashcardMark` :351-402 -- factor the shared transaction (load, ownership, repeat-of-last, next-Item, complete-on-last, `abortQuietly`) and add `recordQuizAnswer`; tests in `storage/db.test.ts`.
- `web/components/Round/Round.tsx` -- `roundQuizQuestions`, `roundPosition`, `ITEM_HEADING_ID`, focus effect keyed on `answered` (:304-308): the answered question must stay on screen until `quiz.next`, so the shown Item comes from local state, not `answers.length`; focus moves on Item change, never on an answer. Replace the shell :398-405 (and `.card`/`.stem` in `Round.module.css`) with `components/QuizQuestion/`. `StudyLayout key` = shown Item ID.
- `web/components/Screen/Screen.tsx:33-39` -- the effect refocuses the `h1` whenever `docTitle` changes; split it so a title change updates `document.title` only (mount focuses the `h1`); extend `Screen.test.tsx`.
- `web/components/Flashcard/Flashcard.tsx` -- pattern for pending/failed/`ErrorMessage`/`SourceRef`/`QuoteBlock`; `components/Button` (`pending` gives `aria-disabled`; answered options need `aria-disabled` without the disabled style).
- `web/api/studySet.ts:27-41` -- guard tightening (R3); test in `api/studySet.test.ts`.
- DESIGN.md › Quiz Question (:599), tokens `quiz-option` (:311-322); mockup `mockups/key-quiz.html`.
- `e2e/round.spec.ts` -- `records({quiz})`, `startRound`, `markCard`, `questionHeading`, `axeBlocking`, `holdRoundPuts`; update the 2.2 Quiz-shell assertions.
- `web/i18n/messages.ts:102-117` -- keys; `.docs/deviations.md` D-22.

## Tasks & Acceptance

**Execution:**
- [x] `web/core/round.ts`, `web/storage/db.ts` + tests -- answer union, `recordQuizAnswer`; append + state, reject rules, bad `choice`, repeat, rollback, completing answer.
- [x] `web/api/studySet.ts` + test -- R3 guard.
- [x] `web/components/Screen/` + test -- title change without refocus.
- [x] `web/i18n/messages.ts` -- keys.
- [x] `web/components/QuizQuestion/` (+ happy-dom test: answer keeps focus, `quiz.next` focuses next `h2`, live text), `Round.tsx`, `Round.module.css` -- region, options, pending/error, feedback, live region, `quiz.next` / last control, quiz titles, jump context, quiz-only Round.
- [x] `e2e/round.spec.ts` -- keyboard-only Flashcards → all questions (right and wrong) → last control; stored answers and states; opposite signals; reload; jump + 'Tilbake til spørsmålet' before and after answering; write failure; quiz-only Round; bar fill in both parts; 'Se resultatet' → Notatoversikt with Round `complete`; axe on unanswered and answered question at 1280 and 320 px.
- [x] `.docs/deviations.md` D-22; `README.md` quiz sentence.

**Acceptance Criteria:**
- Given a Quiz Question, when it renders, then the region "Spørsmål x av y" shows stem, "Kilde: Pn" and options A–D in `optionOrder`, no Quote, and the progress line reads "Runde n · Spørsmål x av y".
- Given an unanswered question, when I select an option, then one transaction stores the answer and Mastery State, feedback and Quote show, the result is announced politely, and focus stays on my option.
- Given an answered question, when I press 'Neste spørsmål', then the next question shows with focus on its `h2`; on the last, the control reads 'Se resultatet'.
- Given keyboard only, when I answer every question, then everything works and axe finds no serious/critical violation at 1280 and 320 px.

## Carried items

- `deferred-work.md › spec-2-1` R3 guard: carried (Always › guard; task 2).
- `deferred-work.md › spec-2-1` BH9/VG4 and `issues.md` 2026-11-25 story-2-1 (Quiz-only Round): carried (Always, matrix row, e2e).
- `deferred-work.md › spec-2-2` VG2 and `issues.md` 2026-11-25 story-2-2 (progress bar fill): carried (Always › progress bar, per part; e2e asserts the fill).
- `issues.md` 2026-11-25 story-2-2 (extend `RoundAnswer` and the schema together): carried (Always › `RoundAnswer`).
- `issues.md` 2026-11-25 story-2-2 (recheck Round end, N1 in the manual pass, "when 2.3–2.5 are built"): deferred to 2.5, the last of the three.
- `issues.md` 2026-11-25 retro-tiltak-1 (`mockups/key-quiz` shows old `quiz.wrong` text): dropped here; a docs task for Story 5.3, not code.

## Implementation Notes

- The answer transaction is shared: `recordAnswer` in `storage/db.ts` holds load, ownership (`.fc` / `.qq`), repeat-of-last, next-Item, complete-on-last and `abortQuietly`; `recordFlashcardMark` and `recordQuizAnswer` are thin wrappers. `recordQuizAnswer` also rejects a missing `optionOrder` entry.
- The shown Item is local state in `RoundScreen` (`shown`), so an answered question stays on screen until `quiz.next`; focus moves on a change of `shown`, never on an answer.
- `Screen` splits its effect: `document.title` follows the title; the `h1` focus and the first-Tab skip-link rule run on mount only. Every other `Screen` has a fixed title or is keyed per route.
- `displayOrder` falls back to Study Set order when the stored order is not a permutation (only reachable with hand-edited storage).
- The ✓ / ✗ marks have no visually hidden label (no Microcopy key, D-22); the live line carries the result.

## Spec Change Log

## Review Triage Log

Pass 1 (2026-11-25): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG).

| ID | Finding | Verdict | Evidence | Route |
|----|---------|---------|----------|-------|
| EC7/BH1a | `displayOrder` comment says storage rejects a non-permutation order; it does not | low | Real at the comment; `recordQuizAnswer` checks only presence and `choice < length`. Direct comment fix. | patch |
| EC1 | A non-permutation `optionOrder` shows Study Set order while storage still accepts | false | `composeRound` stores `shuffledIndices(n)` for every Quiz Question, always a permutation; only hand-edited storage reaches it. | reject |
| EC2 | A missing `optionOrder` entry makes every option fail | false | Every `.qq` Item ID gets an `optionOrder` entry in the same `composeRound` loop; no writer removes one. | reject |
| EC3/BH1b | `choice` checked against the order's length, not the options' | false | The order is `shuffledIndices(question.options.length)`, so both lengths are equal. | reject |
| EC4/EC5 | Stored `correctIndex` out of range or > 4 options break the letter / ✓ | false | Every stored set passed the Proxy (4 options, 0–3) and now the browser guard too; the db read schema is looser, but no writer stores such a set. | reject |
| EC6 | A `Screen` whose `h1` renders after mount never gets focus | false | VG searched every `<Screen>`: all render their `h1` at mount. | reject |
| BH2 | A new progress row from a Quiz answer gets `lastUsedQuizQuestionId: null` | false | `startRound` creates a row for every eligible concept; a missing row needs a deleted row mid-Round (regenerate prunes only concepts not in the set and abandons the Round). | reject |
| BH3 | Spec and sprint-status not in the reviewed diff | false | Excluded on purpose: the spec goes to the edge-case layer only. | reject |
| BH4 | `Screen` no longer refocuses the `h1` on a title change on any screen | low | Real, but no other screen changes its title while mounted (NoteOverview and RoundScreen are keyed per route; VG). Adding a prop adds surface for no caller. | reject |
| BH5 | After the live line, nothing persistent says which option was chosen / correct | medium | Real: ✓/✗ are `aria-hidden` and the options carry no state, so a screen reader reviewing the options hears only "A …, unavailable". `aria-describedby` to the feedback line needs no new text. | patch |
| BH6 | The empty live `<p>` adds a flex gap under the options | low | Real on every unanswered question; direct CSS fix (`:empty` out of flow, still in the a11y tree). | patch |
| BH7 | 320 px test claims long text wraps; fixtures are short | low | Real: no long option in the fixture. Direct test-data change. | patch |
| BH8 | Guard boundary values (`correctIndex: 3`, 4 options) not shown accepted; duplicate options pass | false | The valid `STUDY_SET` fixture is accepted (VG, `studySet.test.ts:109`); duplicate options are not in the contract or the Proxy. | reject |
| BH9 | e2e locators scoped to `main`; unescaped `.` in the width regex | low | Developer-only; `.` only loosens a decimal match, and nothing else in `main` matches today. Scoping all helpers is more than a direct fix. | reject |
| BH10 | README misses per-part bar, quiz title, `note.missing` for a complete Round | low | Real omission of behaviour D-22 introduces; one sentence. Splitting the long README bullet is out of this story. | patch |
| VG-o1 | `RoundScreen.test.tsx:164` name overclaims (would pass with the old `Screen`) | low | Real: child effects run first. The `Screen` change is covered in `Screen.test.tsx`; rename only. | patch |

## Verification

**Commands:**
- `docker compose run --rm test` -- expected: Vitest and Playwright green.

**Manual checks:**
- Round screen › Quiz, unanswered, 1280 px: Tab order 'Kilde: Pn' → A → B → C → D; visible focus everywhere; a screen reader names the region "Spørsmål x av y".
- Quiz, answered wrong and right: focus stays on the chosen option; NVDA/Narrator announces "Riktig." / "Feil. Rett svar er …"; Tab reaches the Quote's reference, then 'Neste spørsmål'; after it, focus on "Spørsmål x+1 av y".
- Last card → first question: focus on "Spørsmål 1 av y", page title "Runde n, quiz · …".
- 320 px, unanswered and answered: no horizontal scroll, long option texts wrap, options ≥ 44 px; 'Kilde: Pn' → 'Kilde' tab → Esc returns to the reference on 'Studier'.
