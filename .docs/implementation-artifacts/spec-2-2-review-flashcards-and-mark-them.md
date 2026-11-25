---
title: 'Story 2.2: Review Flashcards and mark them'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_commit: '4bd41c416973603de622ed979f6637b13f5af97d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Round screen shows only a static first Flashcard front; there is no reveal, no marking, no Mastery update and no way through the cards.

**Approach:** Pure `core/updateMastery`, one-transaction `storage/recordFlashcardMark`, and an interactive Flashcard region on the Round screen (reveal → mark → next card), with the Story 1.12 reference jump. Refs: FR-12, FR-13, FR-17 · AD-3, AD-11, AD-21 · NFR-6 · UX-DR11, UX-DR12, UX-DR13, UX-DR18, UX-DR21.

## Boundaries & Constraints

**Always:**
- `updateMastery(state, signal)`: any state + correct → `known`; + wrong → `shaky` (latest signal wins). Pure, one test per table row (6).
- Flashcard region (`section`, `aria-labelledby` the Item `h2`): concept chip (concept name pill, card top), front in `card-front` serif, `SourceRef` "Kilde: Pn" (usable before reveal), no Quote. 'Snu kortet' (primary) reveals: question stays, answer in `card-back`, 1 px dashed `line` divider, Quote block (as Notatoversikt) with its `SourceRef`; focus moves to the answer (`tabindex="-1"`). Then 'Kunne det ikke' (secondary) and 'Kunne det' (primary).
- A mark: UI computes `updateMastery`; `recordFlashcardMark` in one `readwrite` transaction appends `{itemId, knew, answeredAt}` to the Round's `answers` and puts the concept's `conceptProgress.state`. Rejects (nothing written) unless the Round is `active` and `itemId` is the next unanswered Item; the same `itemId` already answered → ok, no write (double press).
- While saving, both marks `aria-disabled` (`Button pending`); failure: stay revealed, `err.generation` inline `role="alert"` in the marks' `aria-describedby`, marks work again. Never throw to React.
- After a saved mark: chip shows the updated state, next card's front shows, focus on its `h2`; mobile tabs reset to 'Studier' per card. Reload resumes at the first unanswered card, front side.
- Reference jump return context: `return.label` "Viser {Pn} fra kort {x}", action 'Tilbake til kortet'.
- After the last Flashcard (Tor, 2026-11-25): a Round with Quiz Questions shows a Quiz-part shell like 2.1's card shell — `h2` "Spørsmål 1 av y" (`round.item.question`, `tabindex="-1"`, focused) and the first Quiz Question stem as plain text, no options; a Round without Quiz Questions gets `status: "complete"` + `completedAt` in the last mark's transaction and the UI goes to Notatoversikt (until Resultat, 2.4).
- DOM test environment (Tor, 2026-11-25, carries VG3): add `happy-dom` as a dev dependency for component tests (per-file environment, node stays the default); add the `Screen` effect test (an equal new `{key, vars}` does not refocus the `h1`; a changed value updates `document.title`) and a Flashcard focus test (reveal → answer, saved mark → next `h2`).
- New keys `card.reveal` 'Snu kortet', `card.unknown` 'Kunne det ikke', `card.known` 'Kunne det', `return.from.card` "kort {x}", `return.card` 'Tilbake til kortet', `round.item.question` "Spørsmål {x} av {y}" — texts from EXPERIENCE.md Microcopy (approved 2026-11-25) and UX-DR15; key names recorded as D-20.

**Never:** keyboard shortcuts or keyboard hints (4.1), 'Forklar enklere' (3.6), Quiz UI, scoring or Resultat (2.3–2.4), `lastPractisedAt` (3.1), a DB version bump, `waitForTimeout`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| Mark known | card 1, state `new`, 'Kunne det' | answer stored, state `known`, card 2 front, focus `h2` |
| Mark unknown | state `known`, 'Kunne det ikke' | state `shaky` |
| Two cards, one concept | mark card 1 known, card 2 unknown | state `shaky` (latest wins) |
| Double press | same `itemId` twice | one answer stored |
| Out of order / not active | wrong `itemId`, or Round `abandoned` | rejected, nothing written |
| Write fails | transaction rejects | stays revealed, `err.generation`, nothing stored |
| Reload mid-Round | 2 of 5 answered | "Kort 3 av 5", front |
| Last card, Quiz follows | last mark saved | "Spørsmål 1 av y" shell, focus on it; reload shows the same |
| Last card, no Quiz | last mark saved | Round `complete` + `completedAt` (same transaction), Notatoversikt |

</frozen-after-approval>

## Code Map

- `web/core/round.ts:6-21` -- `MasteryState`, `RoundAnswer` (extend to `{itemId, knew, answeredAt}`; 2.3 adds its own variant). Add `updateMastery` in a new `core/mastery.ts` + test; `core/boundary.test.ts` guards imports.
- `web/storage/db.ts:82-96` -- `RoundRecordSchema.answers` (tighten for the flashcard variant, keep `looseObject`); `startRound` :265-317 is the transaction + `abortQuietly` pattern for `recordFlashcardMark`. Tests in `storage/db.test.ts` (fake-indexeddb).
- `web/components/Round/Round.tsx` -- `roundFlashcards`, index = `answers.length` (:58); progress line :66-82; replace the static front :89-96 with a `Flashcard` component (`components/Flashcard/`). `Round.test.ts` exists (node env, `renderToStaticMarkup`).
- `web/app/notat/[noteHash]/runde/[roundId]/page.tsx` -- loads records once; marks must update `round` and `progress` in state from the stored result (no reload).
- `web/components/ReferenceJump/ReferenceJump.tsx` -- `SourceRef` (unique `id`, `returnContext`) unchanged; `StudyLayout` gets `key` per Item to reset tabs.
- `web/components/NoteOverview/NoteOverview.module.css:37-70` -- Quote block styles to share (move to a `QuoteBlock` component or shared CSS); `Button` (`pending`).
- DESIGN.md › Components › Flashcard (:597), `card-back` (:541), `back-divider` (:305); mockup `mockups/key-flashcards.html` (a)/(b).
- `e2e/round.spec.ts` -- `records`, `openOverview`, `cardHeading`, `cardRegion`, `axeBlocking`; `e2e/seed.ts` `readStore`.
- `web/i18n/messages.ts:102-117` -- new keys; `.docs/deviations.md` D-20.

## Tasks & Acceptance

**Execution:**
- [x] `web/package.json`, `web/vitest.config.*`, `web/components/Screen/Screen.test.tsx` -- `happy-dom` dev dependency (lockfile), `Screen` effect test (carried VG3).
- [x] `web/core/mastery.ts` + test -- `updateMastery`, 6 rows.
- [x] `web/core/round.ts`, `web/storage/db.ts` + test -- answer type/schema, `recordFlashcardMark`; test append + state, reject rules, idempotent repeat, rollback.
- [x] `web/i18n/messages.ts` -- keys.
- [x] `web/components/Flashcard/` (+ focus test), `QuoteBlock`, `Round.tsx`, Round page -- region, reveal, marks, pending/error, focus, jump context, per-Item tab reset, Quiz-part shell, complete → Notatoversikt.
- [x] `e2e/round.spec.ts` -- keyboard-only run through all cards (Tab/Enter/Space) to the Quiz shell, stored states, reload resume, jump + 'Tilbake til kortet', write failure, no-Quiz Round → `complete` + Notatoversikt, axe on front, back and Quiz shell at 1280 and 320 px; update the 2.1 tests that assert a static front.
- [x] `.docs/deviations.md` D-20; `README.md` Flashcard sentence.

**Acceptance Criteria:**
- Given a Flashcard front, when I press 'Snu kortet', then the answer, dashed divider and Quote block show and focus is on the answer.
- Given a revealed card, when I mark it, then one transaction stores the answer and Mastery State, the chip updates, and focus is on the next card's `h2`.
- Given keyboard only, when I work through all cards, then reveal and both marks work and axe finds no serious/critical violation at 1280 and 320 px.
- Given "Kilde: Pn" on a card, when I activate it, then the jump runs and 'Tilbake til kortet' returns focus to that reference.

## Carried items

- `deferred-work.md › spec-2-1` VG3 (`Screen` effect component test, needs a DOM env; "likely 2.2") and `issues.md` 2026-11-25 story-2-1: carried (Always › DOM test environment; first task).
- `deferred-work.md › spec-2-1` R3 guard and Quiz-only Round: target 2.3, not this story.
- `sprint-status.yaml` item 9 (Demo without Consent): not this story.

## Implementation Notes

- `happy-dom` 21.0.4 is opted into per file (`// @vitest-environment happy-dom`); `vitest.config.ts` keeps `node`. `Screen.test.tsx` fails when the effect deps are reverted to `[title, note]` (checked).
- `updateMastery` lives in `core/mastery.ts`; the UI computes the new state and `recordFlashcardMark` writes it, so `storage/` stays free of rules. The new state does not depend on the old one (latest wins), so a stale chip cannot write a wrong state.
- `recordFlashcardMark` completes the Round when the answer fills `itemIds` (generic: 2.3's last answer can reuse the rule). The Round page already shows `note.missing` for a complete Round.
- The reveal state is held by `RoundScreen` (`revealedId`), not by `Flashcard`: on mobile a jump to 'Kilde' unmounts the card, and a local state put it back on its front (found by the 320 px e2e). Focus goes to the answer only on the reveal click.
- `StudyLayout` is keyed by the current Item ID, which resets the tabs and the return control per Item.
- The Quote block moved to `components/QuoteBlock/` (Notatoversikt and the Flashcard back). The Quiz shell keeps the page title "Runde {n} · …"; the quiz title and the hidden ": quiz" are Story 2.3.
- Playwright treats `aria-disabled` buttons as not actionable, so the pending e2e presses Enter on the focused mark instead of clicking.
- A db fixture used a quiz-style answer `{itemId, choice}`; with the tightened answer schema it is now a Flashcard answer. Story 2.3 adds the Quiz variant to `RoundAnswer` and the schema.

## Spec Change Log

## Review Triage Log

Pass 1 (2026-11-25): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG).

| ID | Finding | Verdict | Evidence | Route |
|----|---------|---------|----------|-------|
| EC1/BH4 | Item-focus effect uses a first-run flag; Strict Mode runs it twice and the `h2` steals focus from the `h1` on mount | medium | Next's App Router runs Strict Mode in dev (`next.config.ts` does not turn it off), so `--profile dev` opens every Round on "Kort x av y" instead of "Runde n". | patch: compare with the last `answered` in a ref; Strict Mode test in `RoundScreen.test.tsx` (fails on the old flag) |
| EC2/BH5 | A Round abandoned elsewhere (other tab, regenerate) gives `err.generation` on every mark, with no way forward | low | Real, but needs a second tab or a regenerate mid-Round; a reload shows `note.missing`. The fix needs a new error kind and branch in UI and storage. | reject |
| EC3 | The completing mark clears `pending` before `router.push`, so the marks can fire again during navigation | low | Real: a second press resolves ok (repeat of the last answer) and pushes again. Direct reorder. | patch |
| EC4 | `roundPosition` "done" while the Round is still active shows an empty screen | false | The transaction that answers the last Item sets `complete` (`recordFlashcardMark`), and the page shows `note.missing` for a complete Round; no writer leaves an all-answered active Round. | reject |
| EC5/BH11a | Concept chip renders empty when the concept is missing | false | `conceptId` comes from `roundFlashcards` / `roundQuizQuestions`, built from `studySet.concepts`, so the concept always exists. | reject |
| EC6/BH3 | Storage accepts a Quiz Question ID as a Flashcard mark | low | Only the UI calls it and never with a Quiz Item, but the storage invariant was looser than the AD-9 ID form; a direct correction (`.fc` prefix). | patch |
| EC7/EC10/BH6 | The repeat check runs before the status check: a repeat on an abandoned Round, or of any earlier answer, resolves ok (another concept's row possible) | low | Real at `db.ts` (`answers.some`). Direct reorder: ownership and `abandoned` first, repeat only of the last answer. | patch (+ 2 db tests) |
| EC8/BH2 | Write path does not validate `answeredAt` / `state`; a bad value would make the Round unreadable | low | The only caller passes `toISOString()` and a typed `MasteryState`; the fix adds a guard for state never shown reachable. | reject |
| EC9/BH1/VG-o1 | The stricter `answers` schema makes `saveGeneratedNote` skip abandoning an active Round with a differently shaped answer | low | Latent: every writer stores `{itemId, knew, answeredAt}` today. Story 2.3 extends `RoundAnswer` and the schema together (Implementation Notes). | reject |
| VG1 | Per-Item reset (`key={itemId}` on `StudyLayout`) is not verified: the return control could linger on the next card | medium (pre-verified) | No test jumps and then marks; removing the key passes every test. | patch: e2e asserts no "Viser P1 fra kort 1" and no `mark` on card 2 |
| VG2/BH11b | Progress bar fill untested; it restarts per part (100 % → 1/y at the Quiz shell) | low (pre-verified) | `aria-hidden`, visual only; the Quiz part is a shell until 2.3. | defer → 2.3 (`deferred-work.md`) |
| VG-o2 | Spec Tasks name `web/vitest.config.*`, which did not change | false | Per-file `// @vitest-environment` needs no config change; the fix would edit this spec. | reject |
| BH7 | `sprint-status.yaml` says in-progress while the spec is in-review | false | Step 5 of this workflow syncs sprint status to review. | reject |
| BH8 | README: the old "Feiler lagringen …" sentence now reads as if about the last card | low | Real ambiguity right after the new text; direct wording fix. | patch |
| BH9 | Lockfile not in the reviewed diff | false | Excluded from the diff on purpose; `git diff web/package-lock.json` adds only `happy-dom` and its deps (`whatwg-mimetype`, `ws`, `entities`, types), no removals. | reject |
| BH10 | `failed` is not tied to the card; no test after a jump on mobile | low | `failed` lives in `RoundScreen`, so it survives the card remount and clears on the next mark; adding the test is beyond a direct fix for an unlikely path. | reject |
| BH12 | No test that `revealedId` survives the remount or that a remount does not refocus the answer | false | The 320 px e2e jumps from the back, returns with Esc and asserts focus on the reference with the marks present; it failed before the fix. | reject |
| BH13 | e2e header comment is one long line; inline fault injection; prototype not restored | low | Long line real (189 chars), direct fix. The prototype patch lives in the test's own page and ends with it. | patch (header only) |

## Verification

**Commands:**
- `docker compose run --rm test` -- expected: Vitest and Playwright green.

**Manual checks:**
- Round screen › Flashcard front and back by keyboard at 1280 px: Tab order 'Kilde: Pn' → 'Snu kortet'; after reveal focus on the answer, then reference → 'Kunne det ikke' → 'Kunne det'; visible focus everywhere; after a mark, focus on "Kort x+1 av y".
- Round screen at 320 px, front and back: no horizontal scroll, nothing clipped, marks ≥ 44 px; 'Kilde: Pn' → 'Kilde' tab → Esc returns to the reference on 'Studier'.
- Reload mid-Round: same "Kort x av y", front side, chip shows the stored state.
- After the last card: focus on "Spørsmål 1 av y"; at 320 px no horizontal scroll.
