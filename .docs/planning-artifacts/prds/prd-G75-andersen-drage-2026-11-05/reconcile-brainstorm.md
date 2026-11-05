---
title: Input reconciliation — brainstorm intent vs PRD
input: ../../../brainstorming/brainstorm-product-brief-g75-2026-10-29/brainstorm-intent.md
compared: prd.md, addendum.md
date: 2026-11-05
---

# Reconciliation: Brainstorm Intent → PRD

All seven brainstorm ideas are present in the PRD. Two deliberate choices are carried correctly and are **not** gaps:
- Panic Mode is a Should item (FR-20, §8.2).
- The cache key is the Note Hash (normalized Extracted Text, not file bytes) + prompt version + model ID (FR-4, Decision D2, addendum "Proxy").

Also carried correctly: the brainstorm allowed "dropped or regenerated once" for failed Items. The PRD picks "dropped, never regenerated" (FR-9, D4). That is one of the brainstorm's own options, so it is not a loss.

## Gaps

### G1. Panic Mode contradicts Round composition, and its scope is unclear (idea 7)
- Brainstorm: "Exam in one hour" limits **the deck** (flashcards and quiz) to the 10 most central concepts.
- PRD FR-20 limits **the Round** to the top 10 by Centrality Rank. FR-18 says "Shaky concepts are never left out of a Round". A shaky concept ranked 11th or lower makes the two rules conflict. FR-20 also does not say whether Panic Mode lasts across Rounds (a deck filter, as the brainstorm puts it) or applies to one Round, how it orders concepts within the top 10 (does shaky-first still apply?), or whether the Readiness Score is computed over the 10 or over all concepts.
- Suggestion: state in FR-20 that Panic Mode is a persistent filter on the Note's eligible concepts. Inside it, FR-18 applies to the top 10 only, and FR-18's "never left out" clause gets an exception for concepts outside the filter. Also say which Readiness Score is shown.

### G2. Fixtures cover only Demo Mode and CI. Offline fallback and the exam presentation are missing (Notes for the PRD)
- Brainstorm: the recorded responses should support demo mode, **an offline fallback**, **the exam presentation** and CI.
- PRD: FR-23 (Demo Mode, sample note only) and DR-2 (tests without a key) cover demo mode and CI. Nothing covers falling back to Fixtures when the live provider or network fails, and nothing ensures a reliable live demo at the exam presentation. The brainstorm called this "recommended, not one of the seven", but the PRD neither adopts it nor rejects it.
- Suggestion: add one line. Either the FR-11 error state offers "Switch to demo mode", or §8.3 records that offline fallback is out of scope, with a reason.

### G3. "Short quote" lost its upper bound (idea 1)
- Brainstorm: each Item cites a passage ID and **a short quote**, and clicking it highlights the source. The aim is precise traceability.
- PRD FR-9 sets only a minimum (20 characters). There is no maximum, so a model could quote a whole Passage. That still passes the Quote Check, but it weakens "highlights the exact sentence" (UJ-1) and makes the grounding less precise for the examiner. SM-C2 guards against looser matching but not against over-long quotes.
- Suggestion: add a maximum Quote length (for example one sentence, or about 200–300 characters) as a Quote Check rule or as a prompt rule with a measured share, and list it in §11.

### G4. The Readiness Score denominator changed from "all" to "eligible" without making that visible (idea 3)
- Brainstorm: known ÷ **all** Key Concepts for the Note.
- PRD FR-19: known ÷ **eligible** (not-covered concepts are excluded). The refinement is sensible, but it can inflate the "Am I ready?" signal. A note where half the concepts failed the Quote Check could show 100%. The brainstorm's honest-signal intent (and the emotional JTBD in §2.1) is weakened unless the exclusion is shown.
- Suggestion: next to the score, show "N key concepts have no verified items" whenever N > 0.

## Minor (no action required)
- Idea 5 says "a small backend **with no database**". NFR-2 and §7 say "no data retention" and "no server-side storage", which is equivalent in effect. The phrase "no database" could be added to NFR-2 as a constraint for the architecture.
- Idea 4 is headed "Cache by file hash". The PRD deliberately hashes normalized text instead. This is consistent with the stated intent. The brainstorm heading is just outdated.
