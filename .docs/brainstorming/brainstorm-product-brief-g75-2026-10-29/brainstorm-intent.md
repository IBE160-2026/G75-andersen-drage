---
title: Brainstorm Intent — input to PRD
source: .memlog.md (brainstorm 2026-10-29)
brief: ../../planning-artifacts/briefs/brief-G75-andersen-drage-2026-09-24/brief.md
---

# Brainstorm Intent: Additions to the PRD

The product brief is the baseline. These seven additions came out of the brainstorm, and the user chose to take all of them into the PRD. They extend the brief's v1 scope.

## 1. Grounding with passage IDs and quote check
- The note is split into numbered passages before it is sent to the language model.
- Every summary point, flashcard, quiz question and "Explain simpler" answer cites a passage ID and a short quote.
- Code checks that each quote exists in the note. Items that fail the check are dropped or regenerated once.
- Clicking a reference highlights the passage in the original note.
- *Why:* trust for the student, testability, and traceability for the examiner.

## 2. Mastery state per key concept
- Each key concept has one state: new, shaky or known (a Leitner-lite with three boxes, not a full spaced-repetition algorithm).
- The state is updated by flashcard buttons ("knew it" / "didn't know") and by quiz answers.
- New rounds put shaky concepts first, and known concepts still come back in later rounds. This matches step 5 of the brief as updated on 2026-10-29 from the retrieval-practice research.

## 3. Readiness score
- "Am I ready?" = known key concepts ÷ all key concepts for the note, shown as a percentage on the deck.

## 4. Cache by file hash
- Generated results are stored locally, keyed by a hash of the note's content.
- Uploading the same content again reuses the results, with no new LLM call or cost.

## 5. Backend proxy for the API key
- The API key never reaches the browser. A small backend with no database forwards calls to the language model.
- This refines the brief's "no login, local storage": the backend holds no user data.

## 6. Paste-text input
- As an alternative to file upload, the student can paste text directly.

## 7. Panic mode
- One option, "Exam in one hour", limits the deck to the 10 most central concepts (flashcards and quiz).

## Notes for the PRD
- The brief's success criteria still apply. Grounding (1) makes "every item is linked to its passage" checkable in code.
- Test fixtures (recorded LLM responses) should support demo mode, an offline fallback, the exam presentation and CI. This came up in the brainstorm and is recommended, but it was not one of the seven choices above.
