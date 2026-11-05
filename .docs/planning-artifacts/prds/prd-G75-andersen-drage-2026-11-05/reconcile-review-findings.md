---
title: Reconciliation of review findings against the PRD
created: 2026-11-05
source: ../../briefs/brief-G75-andersen-drage-2026-09-24/review-findings-for-prd-2026-11-05.md
checked_against: prd.md, addendum.md
---

# Reconciliation: Review Findings vs. PRD

Each of the 43 items in the review findings is checked against `prd.md` and `addendum.md`.
Status: **Covered** = an FR/NFR/DR/glossary entry or decision settles it testably; **Partial** = addressed, but a part of the item is still open; **Missing** = not addressed.

**Totals: 40 covered, 3 partial, 0 missing.**

| # | Item | Status | Where | Note |
|---|---|---|---|---|
| 1.1 | Mastery transitions undefined | Covered | FR-17 (table), D6 | Single correct moves to known. The "N consecutive correct" option was not chosen, and that is fine. |
| 1.2 | Conflicting signals | Covered | FR-17 consequences | "Latest signal wins" applies to card vs. quiz and to mixed items of one concept. |
| 1.3 | Ordering of *new* concepts | Covered | FR-18 | Shaky, then new, then a share of known. |
| 1.4 | When known concepts return | Partial | FR-18, §11 | About 20% of a Round, least recently shown first. **The Round size is not defined** (how many concepts, or whether all shaky and new are always included), so "20% of the Round" has no clear base. Combined with "shaky never left out", a large Round has no cap. |
| 1.5 | Nothing shaky | Covered | FR-18 | Review round with the message "All key concepts are known". |
| 1.6 | Concept with no surviving items | Covered | FR-10 | Marked *not covered* and excluded from Rounds and Readiness. |
| 2.1 | Normalization rule | Covered | §3 Normalization, FR-9, addendum | NFKC, whitespace, quotation marks, hyphenation. |
| 2.2 | Quote must be in cited passage | Covered | §3 Quote Check, FR-9 | Explicitly fails even if the quote occurs elsewhere. |
| 2.3 | Passage ID must exist | Covered | FR-9 | The item is dropped (D4: no regeneration). |
| 2.4 | Minimum quote length | Covered | FR-9, §11 | 20 characters after Normalization. |
| 2.5 | Quote spanning two passages | Covered | FR-9 | Fails. Must lie within one Passage. |
| 2.6 | Model translates or paraphrases | Covered | FR-9 | Instructed to quote verbatim in the source language. Exact match enforces it. |
| 2.7 | Floor on surviving items + target pass rate | Covered | FR-10, SM-3, §11 | At least 5 flashcards and 5 questions, "Try again". Pass-rate target 80%. |
| 2.8 | Real quote does not prove correct answer | Covered | DR-3, SM-2, §7 | Manual spot check, at least 90%. |
| 3.1 | Coverage check definition | Covered | SM-1, DR-3, §10 Q3 | Documented manual rubric (same term or clear synonym). Concept lists fixed in the repo before tuning. |
| 3.2 | Very short notes | Covered | FR-3 (min 150 words), FR-7 (under 400 words: at most 5 points) | |
| 3.3 | Semantically broken but valid JSON | Covered | FR-7 | Four unique options, one correct, index in range, otherwise dropped. Not listed explicitly in the DR-2 test minimum. |
| 4.1 | Max file size and note length | Partial | FR-1 (10 MB), FR-3 (15,000 words), D7 | The length limit has a message. **The file-size rejection has no specified message**: FR-1 says only "rejected before it is parsed". Chunking was decided against (D7). |
| 4.2 | Empty extraction | Covered | FR-3 | "No readable text found". |
| 4.3 | Scanned PDF detection | Covered | FR-3, §11, addendum | Fewer than 100 characters per page on average. |
| 4.4 | Corrupt, password-protected or misnamed files | Covered | FR-3, addendum | "File could not be read", no crash. |
| 4.5 | Encoding | Covered | FR-1 | Fallback decoding plus a warning about æøå. |
| 5.1 | Namespace progress per note | Covered | FR-21, addendum | Keyed per Note Hash. |
| 5.2 | Storage unavailable or full | Covered | FR-21 | "Progress is not being saved". |
| 5.3 | Old or corrupted stored data | Covered | FR-21, addendum | Schema version. Safe reset with a notice. Migration is not required, which is an acceptable choice. |
| 5.4 | Same note in two tabs | Covered | FR-21 | Last write wins, documented in the README. |
| 6.1 | Timeouts, 429, 5xx, network | Covered | FR-11 | Retryable error. 90 s timeout. |
| 6.2 | Waiting, error and empty states | Partial | FR-11, NFR-8 | Waiting and error states are covered. **Empty states are not specified** (first visit with no Note, no Study Set yet, or a Round with nothing to show). This is left to UX without a PRD hook. |
| 6.3 | Quiz abandoned or reloaded | Covered | FR-15, UJ-2 | Answers saved at once, scored, Round marked incomplete, resumable. |
| 6.4 | Double upload while generating | Covered | FR-11 | Upload and paste disabled while pending. |
| 6.5 | Prompt injection from the note | Covered | FR-8 | Delimited data plus schema validation, with an injection test on a reference note. |
| 6.6 | Cost and latency bounds | Covered | NFR-4, NFR-5, SM-6 | 60 s to the first flashcard. At most 2 calls per generation. Note that a user-triggered "Try again" (FR-10/FR-11) starts a new generation outside that bound. |
| 7.1 | No request logging | Covered | NFR-2, addendum | Checked by a test or a code review. |
| 7.2 | Proxy access control | Covered | NFR-3, addendum | Localhost or Origin check, plus an in-memory rate limit. |
| 7.3 | Missing API key with demo off | Covered | FR-24 | Exact message specified. |
| 7.4 | Consent | Covered | FR-5, D8, UJ-1 | Names the provider. Declining disables real generation and offers Demo Mode. Consent can be withdrawn. |
| 8.1 | Own file in demo mode | Covered | FR-23, UJ-3 | Message specified. How the sample is recognized (presumably by Note Hash) is not stated. Minor. |
| 8.2 | One command starts frontend and proxy | Covered | DR-1, UJ-3 | |
| 9.1 | Readiness with zero concepts | Covered | FR-19 | No score is shown. |
| 9.2 | Panic mode with fewer than 10 concepts | Covered | FR-20 | Uses all eligible concepts. |
| 9.3 | Note-identity hash, cache key | Covered | §3 Note Hash, FR-4 (D2), addendum | Hash of the normalized text. Key includes the prompt version and model ID. |
| 10.1 | Deadline / sizing the Should list | Covered | §1 Vision, §8.2 | 15 Dec 2026 recorded. Sizing the Should list belongs to sprint planning. |
| 10.2 | Usefulness self-test | Covered | SM-6 | |

## Gaps to Resolve

1. **Round size (1.4):** define how many Key Concepts a Round contains, or state that it is all shaky and new plus about 20% known, so that FR-18's percentage has a base and long Notes don't produce oversized Rounds.
2. **Empty states (6.2):** add a consequence (e.g., to FR-11 or a new FR) for the first-visit and no-content states, so UX has a requirement to trace to.
3. **File-size message (4.1):** give FR-1's 10 MB rejection a specific message that states the limit, as FR-3 does for word count.
4. *(Minor)* DR-2's test minimum does not list the FR-7 option-validity checks, and FR-23 does not say how the sample note is recognized.
