# Epic 2 Context: Practise in Rounds

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Close the Core learning loop on the verified Study Set from Epic 1: from Notatoversikt the student starts a Round, marks Flashcards ('Kunne det' / 'Kunne det ikke'), answers Quiz Questions with immediate feedback and the source Quote, and sees a scored Resultat whose rows link back to the highlighted sentence in the Note. Every mark and answer updates the concept's Mastery State, so the next Round targets what is not yet known. Completes UJ-1 and the examiner's Demo path (UJ-3, no key). Core tier, never cut. Milestone M2 (Epic 2 done): 2026-12-04, then a fresh-clone rehearsal. Resume, Readiness Score, 'Dine notater', Explain Simpler and shortcuts are later epics.

## Stories

- Story 2.1: Start a Round from Notatoversikt
- Story 2.2: Review Flashcards and mark them
- Story 2.3: Answer Quiz Questions
- Story 2.4: Resultat with score and sources
- Story 2.5: The next Round targets my weak spots

## Requirements & Constraints

- **Mastery update** (pure, one test per row): new/shaky/known + correct → known; + wrong → shaky. Correct = 'Kunne det' or a right answer. Latest signal wins.
- **Round composition** (pure): ≤ 10 concepts, never *not covered*; shaky then new up to 8 (least recently shown first, ties by Centrality Rank); plus `max(1, round(0.2 × n))` known; per concept all surviving Flashcards plus the least recently used Quiz Question; all known → review Round of ≤ 10, `review: true`, shown as `round.review`.
- **Scoring:** correct out of questions asked (a Quiz can have fewer questions than concepts); deterministic, no AI call, unit-tested.
- **Persistence:** each answer saved immediately, in the same transaction as its Mastery State; state survives closing the tab.
- **Demo e2e:** the full loop on the Norwegian sample with no key; the next Round starts with the concepts marked wrong; nothing reaches the provider.
- **NFRs:** WCAG 2.1 AA with full keyboard use; axe clean (serious/critical) on Flashcard, Quiz and Resultat at desktop and 320 px; a pending button is `aria-disabled`; all UI text bokmål from Microcopy keys.
- **Delivery:** green CI; one branch + PR per story; README updated when behaviour changes; UI specs carry Manual checks; carried items pulled in per `.docs/standards/`.

## Technical Decisions

- **Layering:** `core/` is pure (time and randomness passed in): `composeRound`, `updateMastery`, `score`. Flow: UI event → `core/` → `storage/` (only storage code) → render, via the `NoteSession` context. No global state library.
- **Stores** (exist since Epic 1, each with a `noteHash` index): `conceptProgress` keyed `[noteHash, keyConceptId]` with `state`, `lastShownAt`, `lastUsedQuizQuestionId` (missing row = new); `rounds` keyed `roundId` with `noteHash`, `cacheKey`, `number`, `review`, `conceptIds`, `itemIds`, `optionOrder`, `answers`, `status: active | complete | abandoned`, `startedAt`, `completedAt`.
- **Transactions:** Round start writes the Round, last-shown times and last-used question together; each mark/answer is one transaction with its Mastery State; an active Round is never recomposed; finishing sets `complete` + `completedAt`.
- **Quiz options:** `optionOrder` fixed at composition; answers store the original index and scoring compares it with `correctIndex`.
- **Inputs:** only `VerifiedStudySet` (concepts, `covered`, Item IDs `{keyConceptId}.fc{n}` / `.qq{n}`). Readiness is never stored.
- **Open from the Epic 1 retro:** item 5 (regenerate keeps user fields, deletes the old set, prunes `conceptProgress`, one transaction) — own fix PR after 2.1; R3 (browser Study Set guard looser than the contract) — Story 2.3.
- **Conventions:** glossary terms in identifiers; ISO 8601 UTC; results with error keys, never throw to React; no Note content in the console; CSS Modules with tokens (`mastery-*`, `correct-*`, `wrong-*`); no `waitForTimeout` in e2e.

## UX & Interaction Patterns

- **Layout:** Round and Resultat reuse the Notatoversikt split (study panel first in DOM, source panel left on desktop) and the 'Studier'/'Kilde' tabs on mobile, reset to 'Studier' per Item.
- **Headings:** titles "Runde {n} · {notat} · …", "Runde {n}, quiz · …", "Resultat · …"; `h1` "Runde {n}" (": quiz" visually hidden) or "Resultat". Progress line "Runde n · Kort x av y" / "· Spørsmål x av y" = `h1` + Item `h2`; 6 px `aria-hidden` bar; current concept's Mastery chip ('ny' / 'usikker' / 'kan', text, never colour alone).
- **Flashcard:** region `h2` "Kort {x} av {y}"; front = question (`card-front` serif) + "Kilde: Pn", no Quote; 'Snu kortet' reveals answer + Quote and focuses the answer; marks save and advance to the next card heading; after the last card → Quiz, or Resultat if no questions.
- **Quiz Question:** region `h2` "Spørsmål {x} av {y}", no card; stem, "Kilde: Pn", options A–D; choosing answers at once: ✓ on correct, ✗ on a wrong choice, `quiz.correct` / `quiz.wrong` via `aria-live="polite"`, then the Quote; other options `aria-disabled` with full ink contrast; focus stays on the choice; `quiz.next` ('Se resultatet' on the last).
- **Resultat:** `result.score`; per row `h2` "Spørsmål {x}", question, `result.yours` with ✓/✗ (text-backed), `result.correct` on misses, Quote + reference; 'Tilbake til oversikten' with updated chips; 2.5 adds the next Round.
- **Reference jump:** the Epic 1 component with labels 'Tilbake til kortet' / 'spørsmålet' / 'resultatet'; usable before reveal/answer; Esc returns focus to the reference.
- **Focus:** screen change → `h1` + `document.title`; Item change → Item `h2` (`tabindex="-1"`).
- **Microcopy:** approved keys include `overview.start`, `round.review`, `card.reveal / marks`, `quiz.*`, `result.*`, `return.label`, `mastery.new`; any new string gets a key + `.docs/deviations.md` entry, approved at the spec checkpoint. Informal "du", sentence case, no exclamation marks.

## Cross-Story Dependencies

- 2.1 → `composeRound`, Round record, Round screen shell; 2.2 → `updateMastery` (reused by 2.3); 2.4 needs 2.3's answers; 2.5 needs 2.4's completion and 2.1's rotation data.
- Reuses Epic 1: reference jump (1.12), Notatoversikt layout/tabs (1.11), `VerifiedStudySet` (1.8), Demo Mode + Fixtures (1.14).
- Later epics read these records: Readiness (3.2) reads `conceptProgress`; resume (3.5) relies on `active` Rounds; Explain Simpler (3.6) adds to Flashcard back and answered question; 'Dine notater' (3.1) reads `lastPractisedAt`; Panic Mode (4.6) reuses the items-per-concept rule; shortcuts (4.1) attach to the Flashcard and Quiz regions.
