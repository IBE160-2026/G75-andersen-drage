---
title: Review findings carried into the PRD
source: bmad-review of brief.md, 2026-11-05 (lenses: adversarial, edge-case-hunter, structure, prose)
brief: brief.md
---

# Review Findings Carried into the PRD

The review of `brief.md` on 2026-11-05 produced 82 findings. Findings that changed what the product is were fixed in the brief itself (commit `6e930ec`): concept IDs on every item, note identity by content hash in v1, multiple-choice quiz, output in the note's language, a fallback for "Explain simpler", quantity criteria, corrected competitor claims, and the structure and prose edits.

The findings below were deliberately left out of the brief. They are requirement-level detail and should become functional requirements, acceptance criteria, or explicit decisions in the PRD (or the architecture, where noted). Each item names the gap and a suggested guard.

## 1. Mastery state rules

- **Transitions are undefined.** Define a state-transition table, e.g. new + correct → known, new + wrong → shaky, known + wrong → shaky, shaky + correct → known (or known only after N consecutive correct).
- **Conflicting signals.** A card marked "knew it" but a wrong quiz answer on the same concept, or mixed results across items of one concept. Decide a rule, e.g. "any wrong answer in a round → shaky" or "latest signal wins".
- **Ordering of *new* concepts** relative to shaky and known is unspecified. Suggested order: shaky, then new, then known concepts that are due.
- **When known concepts return** ("later rounds") is undefined. Define it, e.g. every K rounds or a fixed share of each round.
- **Nothing shaky.** Define the next round when every concept is known or no concept is shaky.
- **Concept with no surviving items.** If every item for a concept is dropped by the quote check, the concept stays *new* forever. Exclude it from rounds and readiness, or regenerate.

## 2. Grounding and the quote check

- **Matching rule.** Define normalization before comparison: Unicode NFKC, collapsed whitespace and line breaks, unified quotation marks, hyphenation from PDF extraction.
- **Quote must be in the cited passage**, not just somewhere in the note.
- **Passage ID must exist**; reject or regenerate items that cite a missing or out-of-range ID.
- **Minimum quote length**, so an empty or one-word quote cannot pass trivially.
- **Quote spanning two passages.** Either require the quote to lie within one passage or allow a list of passage IDs.
- **Model translates or paraphrases the quote.** Instruct the model to quote verbatim in the source language.
- **Floor on surviving items.** If fewer than N flashcards or M quiz questions survive, show a clear message and offer a retry. Also set a target pass rate for items on the reference notes.
- **A real quote does not prove a correct answer.** Add a manual spot check on the reference notes: the answer must follow from the cited passage.

## 3. Content criteria precision

- **Coverage check (≥80%).** Define how a generated item "covers" a listed concept: matching concept ID or term, a synonym list, or a documented manual rubric. Fix the concept lists in the repo before tuning generation.
- **Very short notes.** Set a minimum note length, or skip the summary-length rule below it.
- **Semantically broken but valid JSON.** Validate that the correct option index is in range and that options are unique.

## 4. Files and input

- **Maximum file size** and **maximum note length** (pages, words, or tokens), with a clear rejection message. Decide whether longer notes are rejected or split into chunks (architecture).
- **Empty extraction.** Whitespace-only file, or `.docx`/PDF that yields no text → "No readable text found".
- **Scanned PDF detection**, e.g. too few characters per page → "Scanned PDFs are not supported".
- **Corrupt, password-protected, or misnamed files** → catch parser errors and show "File could not be read".
- **Encoding.** Plain text or Markdown that is not UTF-8 (æøå garbled). Decode with a fallback and warn.

## 5. Local storage

- **Namespace progress per note**, e.g. key `progress:<noteHash>`, so notes do not overwrite each other.
- **localStorage unavailable or full** (private mode, quota). Catch errors and warn "Progress not saved".
- **Old or corrupted stored data.** Store a schema version; migrate or reset safely instead of crashing.
- **Same note open in two tabs.** Listen for `storage` events, or accept last-write-wins and document it.

## 6. Runtime and the language model

- **Timeouts, rate limits (429), 5xx, and network failure** → a retryable error message, never a hanging spinner.
- **Waiting state** during generation, plus error and empty states (also asked for by the teacher; cover in UX).
- **Quiz abandoned or page reloaded mid-quiz.** Persist answers per question; score answered questions and mark the round incomplete.
- **Double upload while generating.** Disable upload while a request is pending, or abort the previous request.
- **Prompt injection from the note.** Wrap the note in delimiters, tell the model to treat it as data, and rely on schema validation.
- **Cost and latency bounds.** Maximum number of calls per upload (regenerate-once can double it) and an acceptable wait time from upload to the first flashcard. This also gives a measurable criterion for the problem the brief states (lost time).

## 7. Backend proxy and privacy

- **No request logging.** The proxy logs status and error codes only, never request or response bodies. Verify by test or code review.
- **Access control.** Bind to localhost or check `Origin`, and rate-limit, so others cannot use the API key.
- **Missing API key with demo mode off** → a clear message ("No API key; use demo mode"), not a provider error.
- **Consent.** Decide whether the user must confirm the external-LLM notice (naming the provider) before the first upload, and what happens if they decline (disable upload, offer demo mode).

## 8. Demo mode and running the app

- **Own file in demo mode.** If the uploaded note is not the sample, show "Demo mode supports only the sample note" instead of mismatched stored responses.
- **One command** in the README starts both the frontend and the proxy.

## 9. "Should" items

- **Readiness score with zero concepts** → show nothing rather than NaN.
- **Panic mode on a note with fewer than 10 concepts** → use all concepts.
- **Note-identity hash.** Hash the extracted text, not the file bytes. If stored generated results are reused, include prompt version and model ID in the key so a prompt or model change does not reuse stale results.

## 10. Process

- **Deadline.** Resolved 2026-11-05: the deliverable is due on 15 December 2026, and the brief is updated. Use it to size the "Should" list in sprint planning.
- **Usefulness.** Consider a short self-test log by Tor (or another student) comparing the app with manual preparation.
