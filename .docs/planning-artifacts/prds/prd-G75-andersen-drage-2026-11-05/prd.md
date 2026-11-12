---
title: PRD — AI-Based Learning Assistant for Students
status: final
created: 2026-11-05
updated: 2026-11-12
---

# PRD: AI-Based Learning Assistant for Students

*Product name: Torsas læringsassistent (§11).*

## 0. Document Purpose

This PRD defines what v1 of the learning assistant must do. It is the input for the UX specification, the architecture document, and the epics and stories, which all reference its stable IDs: UJ-n for journeys, FR-n for functional requirements, NFR-n for cross-cutting quality requirements, DR-n for course delivery requirements and SM-n for success metrics.

It builds on the following documents and does not repeat them:
- the final product brief (`../../briefs/brief-G75-andersen-drage-2026-09-24/brief.md`)
- the review findings carried into the PRD (`../../briefs/brief-G75-andersen-drage-2026-09-24/review-findings-for-prd-2026-11-05.md`)
- the brainstorm intent (`../../../brainstorming/brainstorm-product-brief-g75-2026-10-29/brainstorm-intent.md`)
- the technical research (`../../research/technical-learning-assistant-solution-steps-2026-10-29/research.md`)
- the IBE160 grading guide for Part 1 (`../../input/Sensorveiledning IBE160 - Del 1 applikasjon og prosess.pdf`)
- the UX experience spine (`../../ux-designs/ux-G75-andersen-drage-2026-11-10/EXPERIENCE.md`), which defines the screens and the **message keys** (for example `err.scanned`) that this PRD references (NFR-9)

The vocabulary is anchored in §3 Glossary. Values first proposed as assumptions and since confirmed are listed in §11. Technical detail that belongs to architecture, such as library candidates, storage mechanics and proxy hardening, is kept in `addendum.md`. §1.3 names three load-bearing differentiators that downstream documents must keep.

Requirements carry no inline decision references; §12 Change log maps each requirement to the decision or review fix behind it. **R1–R8** are recommendations in the technical research.

## 1. Problem, Vision and Positioning

### 1.1 Problem

Before an exam, the bottleneck is not access to material. It is deciding what to focus on and turning it into something students can test themselves with. Students often:
- re-read notes passively instead of testing themselves, although self-testing retains material better (this benefit, known as the testing effect, is well documented);
- spend their limited time organizing and formatting notes rather than studying the parts that matter most;
- use general AI chat tools ad hoc, with no consistent format, no focus on what is central, and no way to repeat what they got wrong.

The cost is time lost to low-value repetition. Some students skip review altogether, because preparing study material feels like too much up-front effort.

### 1.2 Vision

This app gives a student with little time a way through the material. It takes the student's own **Note**, identifies its **Key Concepts**, and turns its most central content into a short summary of 5–10 **Summary Points**, **Flashcards** and a scored multiple-choice **Quiz**. The next **Round** then focuses on what the student has not yet mastered. The app supports active recall and repetition. It is a supplement to studying, not a replacement for it. Every Item shows its source in the student's own Note, and no account is needed (§1.3).

The app is also the solo deliverable for IBE160 Programming with AI (Høgskolen i Molde), due **15 December 2026**. It must therefore demonstrate deliberate use of AI in both the product and the development process. An examiner must be able to run it from the README without an API key.

### 1.3 Positioning

General AI chat (ChatGPT) and dedicated apps (Quizlet, Anki) already do summaries and flashcards well. Google NotebookLM already offers the whole loop for free with a Google account: upload, flashcards and quiz, an "Explain" button, retrying missed cards, and source citations. A closed study loop is therefore not what sets this app apart. Three things do, and they are **load-bearing**: UX and architecture must not trade them away.

1. **A verified source on every Item, shown by default.** Every Summary Point, Flashcard, Quiz Question and Simpler Explanation shows its Quote without an extra click, as soon as showing it no longer gives the answer away (FR-12), and the Quote Check proves in code that the Quote exists in the cited Passage (FR-9; see §7 on what this does not prove). Together, the visible Quote and the Quote Check let the student check every Item against their own source.
2. **No account.** The app works without login, and progress stays in the browser (FR-21). NotebookLM and Quizlet require an account. Anki works without one but generates nothing with AI.
3. **An 80/20 profile throughout.** Every output is deliberately limited to the most central content (FR-6, FR-7, FR-18). The 80/20 limit is a design choice for a student with little time, not a research finding. The app's learning value rests on self-testing (§1.1). Explain Simpler is likewise a design heuristic, not an evidence-based method.

This positioning is not a moat in a commercial sense. Its value lies in fitting one specific situation and, for IBE160, in the engineering behind it.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** "I have my own notes and an exam soon. Show me what matters most, check whether I know it, and make me spend my remaining time on what I got wrong."
- **Emotional:** "I want to feel less overwhelmed. I want a manageable core instead of the whole syllabus, and a clear signal of how ready I am."
- **Trust:** "I don't want to learn something the AI made up. Let me see where in my own notes each item comes from."
- **Contextual:** "I don't want to create yet another account just to study for one exam."

### 2.2 Non-Users (v1)

- Students who want complete coverage of a syllabus. The app deliberately covers only the central part.
- Teachers who author content for a class. The app has no sharing and no multiple users.
- Users who need long-term spaced-repetition scheduling. v1 has none (§8.4).

### 2.3 Key User Journeys

- **UJ-1. Sara gets the core of a lecture note the evening before an exam.**
  Sara is a second-year student with one evening left. She opens the app in her browser; no login is needed. On this first open, before anything else, she confirms that her Notes will be sent to an external AI provider. She uploads `forelesning-7.pdf`. A progress indicator runs for less than a minute. Then she sees eight Key Concepts, a short summary and a "Start round" button (`overview.start`). She works through the Flashcards, marking each one "knew it" or "didn't know" (`card.reveal / marks`). On one Flashcard she taps "Explain simpler". Then she takes the Quiz: eight questions, one for each Key Concept, because each of her concepts has a surviving Quiz Question (FR-18). **Climax:** she gets a score of 5 of 8, sees the correct answers, and clicks a source reference that highlights the exact sentence in her own Note that the question was built from. **Resolution:** three Key Concepts are now *shaky*, and the app offers a new Round that starts with them.
  **Edge case:** her PDF is a scan with no text. The app shows `err.scanned` ("scanned PDFs are not supported") before any AI call is made.

- **UJ-2. Sara comes back the next morning.**
  Sara opens the app in the same browser. 'Dine notater' lists `forelesning-7` with the time she last practiced it and a **Readiness Score** of 63% (5 of 8 known). She opens it from the list; the app makes no new AI call and shows the same Key Concepts with yesterday's Mastery States. (Uploading the same file again would reach the same place, FR-4.) She starts a Round. It holds her three shaky concepts first, followed by one concept she already knew. **Edge case:** she closed the tab mid-quiz yesterday. The answered questions were kept and scored, and that Round is marked incomplete.

- **UJ-3. The examiner runs the app from the README.**
  The examiner clones the repository on a clean machine, follows the README, and starts the app with one command and no API key. At the Consent notice they choose the demo. **Demo Mode** offers the bundled sample notes with recorded responses. The examiner picks the Norwegian one, and the whole loop works: upload, core, Flashcards, Quiz, next Round. The examiner then tries to upload their own file and sees `err.demoOnly` ("demo mode supports only the sample notes"). They run the tests with the command given in the README.

## 3. Glossary

- **Note**: one text the student supplies by file upload or by pasting. It is identified by its **Note Hash**. One Note has many Passages, Key Concepts and Items.
- **Extracted Text**: the plain text the app gets out of a Note's file after **Normalization**. It is shown in the app's text view. The original layout is not rendered.
- **Normalization**: a fixed transformation applied to both the Extracted Text and every Quote before they are compared: Unicode NFKC, collapsed whitespace and line breaks, unified quotation marks, and rejoined end-of-line hyphenation.
- **Note Hash**: a hash of the normalized Extracted Text. It is not computed from the file bytes. It is the Note's identity in the browser.
- **Passage**: a numbered segment of the Extracted Text. The text is split into Passages by paragraph, and a paragraph longer than a fixed limit is split further at sentence boundaries. Each Passage has a **Passage ID** (P1, P2 …) that is unique within the Note and stable for the same Note Hash.
- **Quote**: a verbatim excerpt that an Item cites as its source, together with one Passage ID.
- **Quote Check**: the code-side verification that a Quote, after Normalization, occurs inside the cited Passage. An Item that fails it is never shown.
- **Key Concept**: one of the central ideas of a Note, with a stable ID and a **Centrality Rank**. The ID is assigned by the app from the concept's normalized name, not by the AI model, so the same concept keeps its ID when a Study Set is regenerated. Every Flashcard and Quiz Question belongs to exactly one Key Concept.
- **Centrality Rank**: the order of a Key Concept's importance within its Note (1 = most central). It is set by the AI model in the generation (FR-6) and stored with the Study Set. It breaks ties in FR-18 and selects the concepts in Panic Mode (FR-20).
- **Item**: any generated study element that cites a Quote. The Item types are **Summary Point**, **Flashcard**, **Quiz Question** and **Simpler Explanation**.
- **Summary Point**: one statement of the Note's summary, at most 40 words, with its Quote (FR-7).
- **Flashcard**: an Item with a front (a question or term) and a back (the answer and its Quote) for one Key Concept (FR-13).
- **Quiz Question**: a multiple-choice Item for one Key Concept, with exactly four options, one of them correct (FR-7, FR-14).
- **Simpler Explanation**: a plain-language Item returned by Explain Simpler for one Flashcard or Quiz answer, with its own Quote (FR-16).
- **Study Set**: everything generated for a Note in one generation: its Key Concepts, Summary Points, Flashcards and Quiz Questions.
- **Not covered**: a Key Concept with no surviving Flashcard or Quiz Question after the Quote Check. It is excluded from Rounds and the Readiness Score (FR-10).
- **Eligible**: a Key Concept that has at least one surviving Flashcard or Quiz Question, that is, one that is not *not covered*. A concept with surviving Flashcards but no surviving Quiz Question is eligible (FR-18).
- **Mastery State**: the state of a Key Concept in this browser: one of *new*, *shaky* or *known*.
- **Round**: one pass of Flashcards followed by a Quiz over a selection of Key Concepts (FR-18).
- **Round size**: the maximum number of Key Concepts in a Round: 10 (FR-18).
- **Incomplete Round**: a Round that was left or reloaded before its Quiz was finished. Its answered questions are kept and scored (FR-15).
- **Last-shown time**: the time a Key Concept was last included in a Round. It is stored per Key Concept (FR-21) and orders selection in FR-18.
- **Readiness Score**: the number of known Key Concepts divided by the number of eligible Key Concepts, shown as a percentage rounded to the nearest whole percent (halves round up, FR-19).
- **Explain Simpler**: an on-demand request for a plain-language explanation of a Flashcard or a Quiz answer. It returns a Simpler Explanation.
- **Panic Mode**: the "Exam in one hour" option, in which a Round covers the most central eligible Key Concepts instead of the FR-18 selection (FR-20).
- **Demo Mode**: a mode that serves recorded responses (**Fixtures**) for the bundled sample notes (the reference notes), with no API key and no network call to the AI provider.
- **Proxy**: the app's own small backend that forwards calls to the AI provider. It runs locally with the app, holds the API key and stores no user data.
- **Consent**: the student's one-time confirmation that Note content will be sent to an external AI provider.
- **'Dine notater'**: the start screen that lists the non-archived Notes stored in this browser (FR-25).
- **Arkiv**: the archive of Notes the student has set aside; archived Notes keep their history until permanently deleted (FR-26).
- **Importance Level**: a Note attribute from 1 (most important) to 3, default 2, that orders 'Dine notater' (FR-27).
- **Message key**: the ID of a UI string in EXPERIENCE.md › Microcopy, such as `err.scanned`. Requirements and tests reference the key, not the text (NFR-9).
- **Innstillinger**: the settings screen. It holds the controls placed there by FR-5 (withdraw or give Consent), FR-21 (storage warning), FR-22 (export and import), FR-23 (Demo Mode) and FR-26 (delete warning).

## 4. Features

### 4.1 Note Input

**Description:** the student supplies a Note by uploading a file or by pasting text. Extraction runs in the app before any AI call, so bad input is rejected without an AI call. A Note that is too short, too long, empty or unreadable is rejected with a specific message. Realizes UJ-1 and UJ-2.

#### FR-1: Upload a file

The student can upload one file of type `.txt`, `.md`, `.docx` or a text-based `.pdf`. The app extracts and normalizes its text.

**Consequences (testable):**
- The four supported types produce Extracted Text, and the Extracted Text is shown in the text view.
- Any other extension, including `.doc`, is rejected with `err.type` (names the supported types).
- A file larger than the maximum file size (10 MB) is rejected with `err.size` before it is parsed.
- A `.txt` or `.md` file that is not valid UTF-8 is decoded with a fallback encoding, and `warn.encoding` is shown (æ, ø and å may be wrong).

#### FR-2: Paste text

The student can paste text as an alternative to uploading a file. The pasted text then follows the same rules as Extracted Text.

**Consequences (testable):**
- Pasted text goes through the same Normalization, length limits and Note Hash as an uploaded file.
- Pasting the same text that was earlier uploaded as a `.txt` file reconnects to the same Note.

#### FR-3: Reject unusable input

The app rejects input that cannot produce a useful Study Set, and shows a message that says why.

**Consequences (testable):**
- A Note that contains no text or only whitespace after extraction is rejected with `err.noText`.
- A PDF whose Extracted Text averages fewer than 100 characters per page is rejected with `err.scanned`.
- A corrupt, password-protected or misnamed file is rejected with `err.unreadable`, and the app does not crash.
- File parsing has a time limit (set in the architecture document). A parser that hangs or exceeds the limit is stopped, and the file is rejected with `err.unreadable`. The page stays responsive while a file is parsed.
- A Note shorter than the minimum length (150 words) is rejected with `err.tooShort`.
- A Note longer than the maximum length (15,000 words) is rejected with `err.tooLong`, which states the limit. v1 does not split long Notes into chunks.
- No AI call is made for a rejected Note.

#### FR-4: Recognize a known Note

When the same content is supplied again in the same browser, the app reconnects to the stored Study Set and progress instead of generating again. Realizes UJ-2.

**Consequences (testable):**
- The Note Hash is computed from the normalized Extracted Text. The same text in a different file format or with a different file name gives the same Note Hash.
- The cache key for a stored Study Set combines the Note Hash, the prompt version and the model ID. A change of prompt or model leads to a new generation, after which Key Concept IDs may change. Mastery States are kept for Key Concepts whose IDs still match, and progress for Key Concepts whose IDs disappear is dropped.
- When a reconnection hits the cache, no AI call is made.
- If the Note is archived (FR-26), supplying it again restores it from Arkiv into 'Dine notater' with its history: Study Set, Mastery States and Round progress.
- Only a Study Set that passed schema validation (FR-8) and meets the minimum number of surviving Items (FR-10) is stored. A failed or below-minimum generation is never cached, so a later upload of the same Note generates again.

### 4.2 Consent and Privacy

**Description:** Note content leaves the browser only through the Proxy, and only after the student has agreed to it. Realizes UJ-1 and UJ-3.

#### FR-5: One-time Consent

On the first app open, before any other screen, the student sees the Consent notice (`consent.title`, `consent.body`). The notice says that Note content is sent to an external AI provider and names the provider.

**Consequences (testable):**
- No generation request is sent until Consent is recorded in the browser.
- Once a decision is recorded, the notice is not shown again on later opens.
- Accepting (`consent.accept`) leads to 'Dine notater' (FR-25).
- Declining (`consent.decline`) leads to the Demo Mode picker. Live generation stays off, and the start screen shows `consent.declined` with a way to accept later.
- After declining, upload and paste stay available but never reach the AI provider: the input is still validated (FR-3) and then rejected with `err.demoOnly` in Demo Mode, or with `consent.declined` otherwise.
- The student can withdraw Consent later in Innstillinger, which returns the app to the same state as after declining.
- Consent is checked before the API key: when Consent is declined and no API key is configured, the app shows `consent.declined`, not `err.noKey` (FR-24).

### 4.3 Study Set Generation

**Description:** one generation turns a Note into its Key Concepts, Summary Points, Flashcards and Quiz Questions. All of them are in the Note's language, limited to the central content, and grounded in Quotes. The AI response is validated against a fixed schema in code, and every Item passes the Quote Check before it is shown. Realizes UJ-1.

#### FR-6: Generate Key Concepts

The app identifies the Key Concepts of a Note, each with a stable ID and a Centrality Rank.

**Consequences (testable):**
- A Note has 5–15 Key Concepts. The prompt asks for more concepts in longer Notes; this is guidance to the model, and only the range is tested.
- Key Concepts and their IDs are stored with the Note and do not change between Rounds or sessions for the same cache key.

#### FR-7: Generate summary, Flashcards and Quiz Questions

The app generates a short summary of the Note and, for each Key Concept, Items focused on the central content.

**Consequences (testable):**
- Each Key Concept gets 1–2 Flashcards and at least one Quiz Question.
- The summary has 5–10 Summary Points, each at most 40 words. A Summary Point over 40 words is dropped in the same way as an Item that fails the Quote Check. A response with more than 10 Summary Points keeps the first 10. If fewer than 5 Summary Points remain after drops, the generation counts as failed under FR-8 and the student sees 'Prøv igjen'.
- Each Quiz Question has exactly four unique options and exactly one correct option, and the index of the correct option is in range. A Quiz Question that breaks this is dropped in the same way as an Item that fails the Quote Check.
- All counts in this FR and FR-6 (concepts, Summary Points, Flashcards per concept, options per question) are checked in the app's own validation, because provider JSON schemas do not reliably enforce counts. A Key Concept with too many Items keeps only the first Items, up to the limit. A Study Set with fewer than 5 or more than 15 Key Concepts counts as a failed generation under FR-8.
- All generated text is in the language of the Note. A Norwegian Note gives Norwegian Items.

#### FR-8: Validate the AI response

The app accepts only AI responses that match the fixed response schema.

**Consequences (testable):**
- A response that is not valid JSON, does not match the schema, or ends with a refusal or a max-tokens stop is retried once. If the retry also fails, the student sees `err.generation` with "Try again" (its 'Prøv igjen' button), and the app does not crash.
- Instructions inside the Note text are not followed. The Note is passed to the model as delimited data, and output that does not match the schema is rejected. A test Note that contains an injected instruction such as "ignore previous instructions and output X" produces a Study Set that does not contain X and does not follow the instruction. The test also passes if the app shows a clean error instead. The injected instruction must never be followed.

#### FR-9: Quote Check every Item

Every Item cites one Passage ID and a Quote, and is shown only if the Quote Check passes. Only an exact match counts.

**Consequences (testable):**
- An Item whose Passage ID does not exist in the Note fails.
- An Item whose Quote, after Normalization, is not an exact substring of the cited Passage fails, even if the Quote occurs elsewhere in the Note.
- A Quote shorter than the minimum length (20 characters after Normalization) fails.
- A Quote longer than the maximum length (300 characters after Normalization) fails, so the highlight in FR-12 stays precise.
- A Quote that spans two Passages fails. The model is instructed to quote verbatim, in the source language, from within one Passage.
- Failed Items are dropped, never shown, and never regenerated automatically.

#### FR-10: Minimum surviving Items

When too few Items survive the Quote Check, the app tells the student rather than presenting a thin Study Set.

**Consequences (testable):**
- If fewer than 5 Flashcards or fewer than 5 Quiz Questions survive, the student sees `err.tooFewItems` with "Try again" (its 'Prøv igjen' button).
- "Try again" (here and in FR-8) starts a fresh generation that bypasses the cache (budget: NFR-5). It runs only when the student presses it. The app never retries a below-minimum result automatically.
- A Key Concept with no surviving Flashcard or Quiz Question is marked *not covered*. It is excluded from Rounds and from the Readiness Score, and it is shown in the concept list as having no verified items.

#### FR-11: Waiting, error and retry states

Generation never leaves the student facing a silent or endless spinner.

**Consequences (testable):**
- A progress indicator is shown from submission until the Study Set is shown or an error appears.
- Timeouts, rate limits (HTTP 429), provider 5xx errors and network failures show `err.generation`, which offers "Try again" and a way back to the start screen. The request times out after 90 seconds.
- While a generation is pending, a second upload or paste is disabled.
- **Empty states:** every screen that can be empty says what to do next. On a first visit with no Note, 'Dine notater' shows `start.empty` (upload, paste or Demo Mode). When a Round would have no concepts (no Key Concept is covered), the app shows `err.noConcepts` with "Try again". This is a defensive guard: the FR-10 floor (at least 5 surviving Quiz Questions) normally makes it unreachable, so its test injects a Study Set directly. The concept list follows FR-10.

### 4.4 Source Grounding View

**Description:** the student can always see where an Item comes from. Realizes UJ-1.

#### FR-12: Show the source of every Item

Every Item shows its Quote by default, without an extra click, as soon as showing it no longer gives the answer away. A reference to the Passage opens the Extracted Text with that Passage highlighted.

**Consequences (testable):**
- Summary Points and Simpler Explanations show their Quote at once.
- A Flashcard shows its Quote on the back, as soon as the card is revealed. The Passage reference is visible on the front as well.
- A Quiz Question shows its Quote as soon as it is answered, and on the result screen. The Passage reference is visible under the question before answering.
- Activating the reference, by mouse or keyboard, scrolls to the Passage and highlights the Quote in the text view.

### 4.5 Flashcard Review

**Description:** in a Round the student goes through Flashcards one at a time. Realizes UJ-1.

#### FR-13: Review Flashcards

The student sees the front of a Flashcard, reveals the back, and marks the Flashcard "knew it" or "didn't know" (`card.reveal / marks`).

**Consequences (testable):**
- Each mark updates the Mastery State of the Flashcard's Key Concept according to FR-17.
- Reveal and marking work by keyboard alone.

### 4.6 Quiz

**Description:** after the Flashcards, the student answers Quiz Questions for the Round's Key Concepts. Scoring is done in code, not by the AI. Realizes UJ-1 and UJ-2.

#### FR-14: Take the Quiz

The student answers multiple-choice Quiz Questions and gets a score.

**Consequences (testable):**
- The Quiz has one Quiz Question for each concept in the Round that has a surviving Quiz Question (FR-18). It can therefore have fewer questions than the Round has concepts, and the score is out of the number of questions asked.
- Scoring is a deterministic function of the selected and correct options. It has unit tests and no AI call.
- After the Quiz, the student sees the score and, for each Quiz Question, their answer, the correct answer and the Quote.
- Each answer updates the Mastery State of the Quiz Question's Key Concept according to FR-17.

#### FR-15: Survive interruption

A Round that is abandoned or reloaded is not lost.

**Consequences (testable):**
- Each answer is saved as soon as it is given.
- After a reload, the answered questions are kept and scored, and the Round is marked *incomplete* (`banner.interrupted`). The student can resume it or start a new Round.

### 4.7 Explain Simpler

**Description:** on a Flashcard or on a Quiz answer, the student can ask for a plain-language explanation. The explanation must be grounded like every other Item.

#### FR-16: Request a Simpler Explanation

The student can request Explain Simpler on any Flashcard and on any Quiz answer. The result is a Simpler Explanation with a Quote that has passed the Quote Check, or `simpler.fail` (no verified simpler explanation), which is shown together with the Quote of the Flashcard or Quiz Question.

**Consequences (testable):**
- A Simpler Explanation whose Quote fails the Quote Check is never shown.
- The Simpler Explanation is in the Note's language. Whether it avoids jargon is judged in the SM-2 spot check, not in an automated test.
- Each request is one AI call, and it is never made automatically.

### 4.8 Mastery and Rounds

**Description:** each Key Concept has a Mastery State that drives what the next Round contains. The design is a three-box Leitner-lite, not a spaced-repetition scheduler. Realizes UJ-1 and UJ-2.

#### FR-17: Update the Mastery State

Each Flashcard mark and each Quiz answer updates the Mastery State of its Key Concept as follows:

| Current state | Signal | New state |
|---|---|---|
| new | correct ("knew it" or a correct answer) | known |
| new | wrong ("didn't know" or a wrong answer) | shaky |
| shaky | correct | known |
| shaky | wrong | shaky |
| known | correct | known |
| known | wrong | shaky |

**Consequences (testable):**
- When a Flashcard and a Quiz Question for the same Key Concept give opposite signals, the latest signal wins.
- The table is implemented as one pure function with a unit test for every row.

#### FR-18: Compose the next Round

A new Round holds at most **10 Key Concepts** (the Round size). When at least one eligible concept is shaky or new, the Round contains those concepts plus a small share of known concepts. It is ordered shaky first, then new, then known; within each state, concepts keep their selection order.

**Consequences (testable):**
- Concepts not covered (FR-10) are never included. A concept with surviving Flashcards but no surviving Quiz Question is eligible and can be included.
- **Shaky and new:** all shaky and new concepts are included, up to 8, so the Round never exceeds the Round size. If there are more, shaky concepts are chosen before new ones, and within each state the least recently shown first. Ties in last-shown time are broken by Centrality Rank.
- **Known share:** with *n* shaky and new concepts in the Round, `max(1, round(0.2 × n))` known concepts are added, least recently shown first (2 in a full Round of 10). If fewer known concepts exist, all of them are added.
- **Test case:** a Note with 8 eligible concepts, 3 shaky and 5 known, gives a Round of 4: the 3 shaky concepts, then the 1 least recently shown known concept.
- **Items per concept:** each concept in the Round contributes all its surviving Flashcards and, if it has at least one surviving Quiz Question, one Quiz Question. When a concept has several Quiz Questions, the question used rotates from Round to Round (the least recently used is picked). A concept with surviving Flashcards but no surviving Quiz Question joins the Round with its Flashcards only, so the Quiz may have fewer questions than the Round has concepts (FR-14).
- **Test case (Flashcards only):** a Round of 4 concepts in which one concept has Flashcards but no surviving Quiz Question shows the Flashcards of all 4 concepts and a Quiz of 3 questions.
- If no concept is shaky or new, the Round is a review of known concepts (up to the Round size, least recently shown first), and the student sees `round.review`.
- Round composition is one pure function of (Mastery States, last-shown times, last-used Quiz Question per concept, Centrality Ranks, surviving Flashcards and Quiz Questions per concept) with unit tests for each rule above. Its inputs are stored by FR-21.

#### FR-19: Readiness Score

The app shows the Readiness Score for the current Note. Realizes UJ-2.

**Consequences (testable):**
- The score is known ÷ eligible, where eligible excludes concepts that are not covered. A concept with Flashcards but no Quiz Question is eligible.
- The score is shown as a whole percent, rounded to the nearest (halves round up; 5 of 8 = 62.5% shows as 63%).
- With zero eligible concepts, no score is shown (not 0% and not "NaN").
- When at least one Key Concept is not covered, the app shows that count next to the score as a gap note (`readiness`, `readiness.gapOne`), so a high score cannot hide gaps. With no uncovered concepts, no gap note is shown.

#### FR-20: Panic Mode *(Should)*

The student can choose "Exam in one hour". The Round's concepts are then the 10 most central eligible Key Concepts (by Centrality Rank), instead of the selection in FR-18.

**Consequences (testable):**
- Within the Panic Mode selection, the order is shaky, then new, then known, as in FR-18. Shaky concepts outside the top 10 are left out of a Panic Mode Round, and this is the one exception to FR-18's shaky-first rule.
- A Note with fewer than 10 eligible Key Concepts uses all of them.
- Items per concept follow FR-18: all surviving Flashcards and, if the concept has one, one rotating Quiz Question.
- EXPERIENCE.md › Microcopy has no Panic Mode string yet; its message key is defined in the stories.

### 4.9 Local Persistence

**Description:** without an account, the browser is the only store. Losing data must be visible, never silent. Realizes UJ-2.

#### FR-21: Persist per Note

The Note's Extracted Text, Study Set, Mastery States and Round progress survive a browser restart, and are stored separately for each Note Hash.

The stored data also holds what FR-18 and FR-25 to FR-27 need:
- per Key Concept: its last-shown time and its last-used Quiz Question (FR-18);
- per Note: when it was last practiced (FR-25), its archive state (FR-26) and its Importance Level (FR-27).

**Consequences (testable):**
- Two different Notes never overwrite each other's progress.
- Stored data carries a schema version. Data with an unknown or corrupt format is reset safely with `storage.reset`, and the app does not crash.
- If storage is unavailable or full (for example in private mode, or when the quota is exceeded), the app keeps working for the session and shows `storage.unavailable`.
- The app and the README warn that some browsers can delete stored data without asking: Safari after about 7 days without a visit, and private browsing when the window closes. The warning (`storage.warning`) is shown once in the app, and it is visible in Innstillinger afterwards.
- When the same Note is open in two tabs, the last write wins. This is documented in the README.

#### FR-22: Export and import progress *(Should)*

The student can export a Note's progress and Study Set as a JSON file and import it again.

**Consequences (testable):**
- Importing an exported file in another browser restores the same Key Concepts, Items and Mastery States.
- An invalid or incompatible file is rejected with `import.invalid`, and existing progress is left untouched.

### 4.10 Demo Mode

**Description:** Demo Mode lets anyone run the whole loop without an API key. Fixtures are recorded for every reference note (DR-3). The same Fixtures serve Demo Mode, the automated tests (DR-2), and a fallback during the exam presentation if the network or the provider fails. Realizes UJ-3.

#### FR-23: Run with Fixtures

In Demo Mode the student picks one of the bundled sample notes, which are the reference notes. The app then serves that note's Study Set and Simpler Explanations from Fixtures, and makes no call to the AI provider.

**Consequences (testable):**
- The full loop from UJ-1 works in Demo Mode with no API key configured, for every bundled sample note.
- Uploading or pasting anything other than a bundled sample note shows `err.demoOnly`. A sample note is recognized by its Note Hash.
- Fixture data goes through the same schema validation and Quote Check as live responses.
- Demo Mode can be switched on in the app at any time, even when an API key is configured.

#### FR-24: Missing key

If no API key is configured and Demo Mode is off, the app shows `err.noKey` (use Demo Mode or add a key to `.env`). It does not show a raw provider error.

**Consequences (testable):**
- With no key and Demo Mode off, submitting a Note shows `err.noKey`, and no request reaches the AI provider.
- If Consent is declined, `consent.declined` takes precedence over `err.noKey` (FR-5).

### 4.11 Note Library

**Description:** the start screen 'Dine notater' lists the Notes stored in this browser, so a returning student opens a Note without uploading it again. The student can archive Notes they no longer need and order the list by importance. Realizes UJ-2.

#### FR-25: 'Dine notater'

After the Consent decision, the app opens on 'Dine notater', which lists every non-archived Note stored in this browser and offers upload, paste and Demo Mode.

**Consequences (testable):**
- Each row shows the Note's title, when it was last practiced (`row.lastPractised`), its Readiness Score with the gap note when any concept is not covered (FR-19) and, with FR-27, its Importance Level.
- Opening a row shows that Note's overview with its stored Study Set and Mastery States. No AI call is made.
- Supplying the same content again by upload or paste still reconnects to the same Note (FR-4).
- With no stored Notes, the list shows `start.empty` (FR-11).
- Without FR-27, the list is ordered by last practiced, most recent first.

#### FR-26: Archive, restore and delete *(Should)*

The student can archive a Note from 'Dine notater', restore it from Arkiv, and permanently delete it from Arkiv.

**Consequences (testable):**
- Archiving needs no confirmation. The Note leaves 'Dine notater' and appears in Arkiv, and `archive.toast` offers "Undo" ('Angre'), which returns it to the list unchanged.
- An archived Note keeps its Study Set, Mastery States and Round progress. Restoring it, or supplying the same content again (FR-4), returns it to 'Dine notater' with that history intact.
- Permanent delete is offered only in Arkiv. By default it asks for confirmation (`delete.confirm`), with focus starting on "Cancel" ('Avbryt').
- The confirmation can be turned off with "Don't ask again" ('Ikke spør igjen', in `delete.confirm`) in the dialog or with the delete-warning setting (`settings.deleteWarning`), and turned on again in Innstillinger.
- Permanent delete removes the Note's Extracted Text, Study Set, Mastery States and Round progress. Supplying the same content afterwards generates a new Study Set with all concepts *new*.
- Archive state is stored per Note Hash (FR-21). An empty Arkiv shows `archive.empty`.

#### FR-27: Importance Level *(Should)*

Each Note has an Importance Level from 1 (most important) to 3, default 2, which the student sets on its row in 'Dine notater'.

**Consequences (testable):**
- A new Note gets level 2.
- 'Dine notater' is ordered by Importance Level (1 first), then by last practiced, most recent first.
- Changing the level re-orders the list at once, announces the new position (`importance.changed`), and survives a reload (FR-21).
- The level affects only the list order, not Round composition or the Readiness Score.

## 5. Cross-Cutting Non-Functional Requirements

- **NFR-1: Secrets.** The API key exists only in the Proxy's environment. It never reaches the browser, the repository or its history. `.env` is git-ignored, and `.env.example` documents every variable without real values.
- **NFR-2: No data retention in the Proxy.** The Proxy stores no Note content and logs only status codes, timings and error codes, never request or response bodies. This is verified by an automated test: a request carrying a marker string passes through the Proxy, and the test asserts that the marker appears in no log output and no file the Proxy writes.
- **NFR-3: Proxy access.** The Proxy runs locally only, started with the app (DR-1); it is not publicly hosted. It accepts requests only from the app's own origin on localhost, and rejects the 11th request within one minute from one origin with HTTP 429, so that others cannot use the key. Details are in `addendum.md`.
- **NFR-4: Latency.** For a Note of about 3,000 words, the first Flashcard is shown within 60 seconds of submission with the chosen model. Explain Simpler responds within 15 seconds.
- **NFR-5: Cost.** One generation uses at most 2 AI calls (the first try and one retry). Each "Try again" (FR-10) is a new generation with its own budget of 2 calls, started only by the student. Explain Simpler uses one call per request. A cache hit uses none. The architecture states the expected cost per Note.
- **NFR-6: Accessibility.** The app meets WCAG 2.1 AA for these criteria: readable contrast, full keyboard operation of every flow, visible focus, labelled form controls, and text alternatives for non-text elements. It is verified in two ways: an automated axe check of the main screens with no serious or critical violations, which runs in the test suite, and a documented manual keyboard checklist that walks UJ-1 without a mouse.
- **NFR-7: Responsive layout.** Every flow is usable from a 320 px wide viewport (WCAG 1.4.10 Reflow) up to desktop width.
- **NFR-8: Stability.** Bad input, repeated clicks, reloads and network failures never crash the app or leave it in a state the student cannot recover from without clearing storage. At a minimum, these scenarios are tested:
  - **Reload mid-generation:** after the reload the Note can be submitted again, and no partial Study Set is cached (FR-4, FR-11).
  - **Double submit:** pressing submit or "Try again" twice sends one generation, not two (FR-11, NFR-5).
  - **Storage full or unavailable:** the app keeps working for the session and shows `storage.unavailable` (FR-21).
- **NFR-9: Language.** The user interface is in Norwegian bokmål. Generated content follows the Note's language. UI strings are defined in EXPERIENCE.md › Microcopy and referenced in this PRD by message key (for example `err.scanned`); tests assert the key, or the string the key maps to, not an English text. Any English wording next to a key is a gloss only. Quoted UI strings use sentence case and may write Glossary terms in lowercase.

## 6. Delivery Requirements (IBE160)

These requirements exist because the app is graded under the IBE160 Part 1 guide. Each DR names its grading criterion and that criterion's weight in parentheses. Several DRs share one criterion and its weight. By criterion: README: DR-1; Process: DR-4, DR-5, DR-7; QA: DR-2, DR-3, DR-8; Repository: DR-6; all criteria: DR-9.

- **DR-1: One-command start (README, 10%).** The README lets someone who does not know the project install and run the app on a clean machine. It gives the prerequisites with versions, the exact commands, one command that starts both the frontend and the Proxy, a description of the configuration, and a screenshot. Demo Mode is the documented default path. The Proxy runs locally only, started by this command; it is not publicly hosted (NFR-3).
  The README also gives the examiner a way into the project:
  - what the app does and who it is for;
  - an overview of the folder structure;
  - links to the planning documents (brief, PRD, UX, architecture, epics), the AI session logs (`.logs/`), the QA evidence, and the tests;
  - **team status:** G75 is delivered solo by Tor Lysebo Andersen. The other registered member, Lasse S. Drage, dropped out before the product brief was written (September 2026) and has not contributed. This lets the examiner read the commit history correctly. The "Medlemmer" section of the current template README is updated to match.
- **DR-2: Automated tests (QA, 15%).** One documented command runs the automated tests without an API key, using Fixtures. At a minimum, the tests cover Normalization and the Quote Check (FR-9), schema validation (FR-8), the Mastery table (FR-17), Round composition (FR-18), scoring (FR-14), the Readiness Score (FR-19) and the input rejections (FR-3).
  The tests run automatically in CI (GitHub Actions) on every pull request and on `main`. A failing run blocks merge.
- **DR-3: Content verification on reference notes (QA, 15%).** The repo keeps 2–3 reference notes that may be shared publicly (at least one in Norwegian), with their expected Key Concepts. A documented test run against them measures SM-1 to SM-3, including a manual spot check that the answers follow from the cited Passages.
- **DR-4: Traceability (Process, 30%).** Stories reference FR-IDs, and commits and pull requests reference stories. Deviations from this PRD are recorded in the PRD (as an update) or in the sprint documents, with a reason.
- **DR-5: Saved AI sessions (Process, 30%).** Prompts and AI sessions that drove decisions or code are kept in the repo (`.logs/` and the memlogs). They include examples where an AI suggestion was rejected or corrected.
  Each session log names the story or FR it worked on and the commit or pull request it led to, so the AI use can be traced to concrete changes.
- **DR-6: Repository hygiene (Repository, 5%).** `.gitignore` excludes dependencies, build output and `.env`. There are no stray files in the root.
- **DR-7: Workflow (Process, 30%).** Each story is built on its own branch and merged through a pull request whose title or description names the story ID and its FR-IDs. Commits are small, scoped to one change, and have descriptive messages. Work is spread over the period up to the deadline, not concentrated in a few large commits. Open items and bugs are tracked as GitHub issues.
- **DR-8: Code review of AI-generated code (QA, 15%).** Every pull request is reviewed before merge (`bmad-code-review` at a minimum, because the project is solo). The review findings and how they were resolved are visible in the pull request. Defects found in AI-generated code are recorded in a QA log (`.docs/qa-log.md`) with what was wrong, how it was found, and how it was fixed.
- **DR-9: Pre-delivery check (all criteria).** No later than 12 December 2026:
  - a fresh clone of `main` is installed and run in a clean environment by following only the README, and the result is logged;
  - the PRD, UX, architecture and epics are updated to match the delivered app;
  - every feature that was dropped or changed from this PRD is listed with a reason.

## 7. Non-Goals (Explicit)

- The app is not a general AI chat. It does nothing outside the Note-to-Round loop.
- It is not a replacement for studying, and it does not claim that its answers are correct. The Quote Check proves that the source exists, not that the answer is right.
- It is not a multi-user product: no accounts, no sharing and no server-side storage.
- It is not a spaced-repetition scheduler in v1. A real schedule is the first step beyond v1 (§8.4).
- It is not a document viewer. The original layout is not rendered.

## 8. MVP Scope

### 8.1 In Scope (v1) and Cut Order

v1 is built in three tiers, and each FR belongs to exactly one tier. Each tier starts only when the one before it works end to end. NFR-1 to NFR-9 and DR-1 to DR-9 apply to every tier.

1. **Core (must be finished):** FR-1, FR-3, FR-5, FR-6 to FR-14, FR-17, FR-18, FR-23 and FR-24. This is the loop UJ-3 demonstrates: Consent or the demo choice, upload, Study Set with verified Quotes, Flashcards, Quiz, Mastery, next Round, Demo Mode. Core also covers generation from a real Note, because FR-5 records Consent.
2. **Then:** FR-2, FR-4, FR-15, FR-16, FR-19, FR-21 and FR-25. FR-25 is built together with FR-4.
3. **Should (§8.2):** FR-20, FR-22, FR-26 and FR-27. They are built only after Tier 2 works end to end, and only until the Should cutoff (§8.2).

**Cut order.** If time runs out, FRs are cut in this order: (1) FR-20, (2) FR-22, (3) FR-26, (4) FR-27, (5) FR-15, (6) FR-2, (7) FR-25. The four Should FRs go first. FR-15, FR-2 and FR-25 are built in Tier 2 but are the only non-Should FRs that may be cut. Core FRs and the other Tier 2 FRs (FR-4, FR-16, FR-19, FR-21) are never cut.

**Scope trade-off.** The 2026-11-12 update added FR-25 to FR-27, which brings v1 from 24 to 27 FRs against the scope warning in the feedback. FR-25 replaces re-upload as the return path in UJ-2. If it is cut, the student re-uploads the Note and FR-4 reconnects to the stored Study Set and progress, so UJ-2 still works without the list, and the app opens on the upload screen after the Consent decision.

**Before epics:** Open Questions 1 (model) and 3 (reference notes and expected Key Concepts) must be resolved before the epics are created, because the Consent notice, NFR-4 and SM-1 to SM-3 depend on them.

### 8.2 Should (if time allows)

- FR-20 Panic Mode.
- FR-22 Export and import of progress as JSON.
- FR-26 Archive, restore and permanent delete.
- FR-27 Importance Level.

**Cutoff: 2026-12-01.** A Should item that does not work end to end by then is cut, and its entry point is hidden, never left dead. Dropped items are listed under DR-9.

### 8.3 Out of Scope for v1

See also §7 Non-Goals.

- `.doc` files, scanned PDFs (OCR), audio and video.
- Splitting long Notes into chunks. They are rejected instead.
- Free-text answers and grading by AI.
- Automatic regeneration of failed Items.
- A fuzzy or "weak" Quote match tier.
- Accounts, multiple users, sharing, and sync across browsers.
- Public hosting of the Proxy (NFR-3).
- Audio recaps and video recommendations (§8.4).

### 8.4 Beyond v1

If the core loop works well, the next step is depth rather than breadth:
- the Should items in §8.2, if they did not fit in v1;
- a real spaced-repetition schedule that decides *when* a known Key Concept comes back, replacing the fixed known share in FR-18;
- further out, the same material in other formats, such as a podcast-style audio recap or recommendations for existing videos that explain a topic or a missed Quiz Question. These need extra external services and are deliberately left out of v1.

## 9. Success Metrics

Measured on the reference notes (DR-3) unless stated otherwise.

**Primary**
- **SM-1: Concept coverage.** At least 80% of the expected Key Concepts of each reference note are matched by a generated Key Concept with at least one surviving Flashcard or Quiz Question. Matching is judged with a documented manual rubric (same term, or a clear synonym). Validates FR-6, FR-7 and FR-10.
- **SM-2: Grounding.** 100% of the Items shown have passed the Quote Check (an automated test). In the manual spot check, at least 90% of the sampled Items have an answer that follows from the cited Passage. Validates FR-9, FR-12 and FR-16.
- **SM-3: Pass rate.** At least 80% of the generated Items pass the Quote Check on each reference note. Validates FR-9 and the prompt quality.
  **If SM-3 is missed:** first tune the prompt; then try another model (Open Question 1). Lowering the 80% threshold, or loosening Normalization or the minimum Quote length, requires a PRD update with a recorded reason (DR-4, SM-C2).
- **SM-4: Runnable by the examiner.** On a clean machine, someone following the README reaches a completed Demo Mode Round within 15 minutes. Validates FR-23 and DR-1.

**Secondary**
- **SM-5: Loop correctness.** Every automated test from DR-2 passes in CI. Validates FR-14 and FR-17 to FR-19.
- **SM-6: Time saved.** In a short self-test log, Tor compares preparing one note with the app against preparing it by hand (time to the first self-test and how useful it felt). SM-6 is qualitative: it has no pass threshold, and the result is only logged. Validates the problem statement (§1.1).

**Counter-metrics (do not optimize)**
- **SM-C1: Number of Items.** More Flashcards or Quiz Questions is not better. The 80/20 profile caps the output on purpose. Counterbalances SM-1.
- **SM-C2: Pass rate through looser matching.** SM-3 must not be raised by weakening Normalization or the minimum Quote length. Counterbalances SM-3.

## 10. Open Questions

1. Which AI provider and model? This is decided in the architecture, based on a quality comparison on the reference notes (candidates: Haiku 5.5, gpt-6-luna, Gemini Flash-Lite). The Consent notice (FR-5) names the chosen provider. The chosen tier must not use submitted Notes for training. This rules out the Gemini free tier for real Notes (R8). **Must be resolved before epics** (§8.1).
2. *Resolved 2026-11-12:* the product name is Torsas læringsassistent (§11).
3. Which reference notes, and which expected Key Concepts for each? Owner: Tor. They must be in the repo before generation prompts are tuned (DR-3). **Must be resolved before epics** (§8.1).

## 11. Confirmed Assumptions

These values were proposed during drafting and confirmed by Tor on 2026-11-05, or on 2026-11-12 where marked. They can be adjusted after testing on real Notes; any change is recorded as a PRD update.
- Product name: Torsas læringsassistent (2026-11-12; closes Open Question 2).
- §4.1 FR-1: the maximum file size is 10 MB.
- §4.1 FR-3: the scanned-PDF threshold is 100 characters per page on average.
- §4.1 FR-3: the minimum Note length is 150 words.
- §4.1 FR-3: the maximum Note length is 15,000 words.
- §4.1 FR-4: after regeneration with a new prompt or model, progress for Key Concepts whose IDs changed is dropped.
- §4.3 FR-6: a Note has 5–15 Key Concepts, depending on its length.
- §4.3 FR-7: the summary has 5–10 Summary Points, each at most 40 words (2026-11-12).
- §4.3 FR-7: fewer than 5 Summary Points left after drops is a failed generation, shown with 'Prøv igjen' (2026-11-12).
- §4.3 FR-9: the minimum Quote length is 20 characters after Normalization.
- §4.3 FR-10: at least 5 Flashcards and 5 Quiz Questions must survive the Quote Check.
- §4.3 FR-11: a generation request times out after 90 seconds.
- §4.8 FR-18: a Round adds `max(1, round(0.2 × n))` known concepts to its *n* shaky and new concepts, least recently shown first (2026-11-12).
- §4.8 FR-18: at most 8 shaky and new concepts are included in a Round, so the Round never exceeds Round size 10 (2026-11-12).
- §4.11 FR-25: without FR-27, 'Dine notater' is ordered by last practiced, most recent first (2026-11-12).
- §4.11 FR-27: a Note's Importance Level is 1–3, default 2 (2026-11-12).
- §5 NFR-3: the Proxy rate limit is 10 requests per minute per origin; the 11th gets HTTP 429 (2026-11-12).
- §5 NFR-4: the first Flashcard is shown within 60 seconds, and Explain Simpler responds within 15 seconds.
- §5 NFR-5: a generation uses at most 2 AI calls.
- §5 NFR-7: the narrowest supported viewport is 320 px (2026-11-12).
- §8.1: FR-16 Explain Simpler is in the "Then" tier (2026-11-12).
- §8.1: FR-25 is last (7th) in the cut order (2026-11-12).
- §9 SM-2: in the spot check, at least 90% of the sampled Items have an answer that follows from the cited Passage.
- §9 SM-3: at least 80% of the generated Items pass the Quote Check.
- §9 SM-6: no pass threshold; the self-test is qualitative and only logged (2026-11-12).

## 12. Change Log

Decision and review-fix IDs resolve in `.memlog.md` (in this folder). **Decision D1–D9** are scope and design decisions made while drafting. **Review fix A, B, C1–C6, D1–D5, E1–E13** are fixes accepted after the review of the draft; the Review fix D-series is separate from the Decision D-series.

**2026-11-05: PRD created and finalized.** Requirement → source:
- Decision D1: FR-2 and FR-19 moved into v1 (§8.1). D2: FR-4 cache key. D3: FR-9 exact match only, no fuzzy tier (§8.3). D4: FR-9 no automatic regeneration (§8.3). D5: §4.9 browser-only persistence. D6: §4.8 Leitner-lite. D7: FR-3 no chunking (§8.3). D8: FR-5 Consent. D9: NFR-9 Norwegian UI.
- Review fix A: FR-18 known share. B: FR-4 cache only valid Study Sets. C1: DR-7. C2: DR-8. C3: DR-2 CI. C4: DR-5. C5: DR-1. C6: DR-9. D1: §1.1 Problem. D2: §1.3 Positioning (NotebookLM, three load-bearing differentiators, not a moat). D3: §1.3 80/20 and Explain Simpler framed as design heuristics, self-testing as the basis (R6). D4: §7 no spaced repetition in v1, §8.4 Beyond v1. D5: §4.10 Fixtures for tests and fallback.
- Review fix E1: Passage (§3). E2: Key Concept ID (§3). E3: FR-9 maximum Quote length. E4: FR-19 not-covered count. E5: FR-21 storage warning. E6: FR-7 counts in local validation. E7: FR-3 parse time limit. E8: FR-1 maximum file size. E9: FR-11 empty states. E10: FR-8 prompt injection test. E11: NFR-6 verification. E12: SM-2 spot-check threshold. E13: Open Question 1 no-training tier.

**2026-11-12: Update from PRD feedback (`tilbakemelding-prd.md`) and final UX spines.**
- UX adopted: FR-12 Quote timing on Flashcards and Quiz Questions; FR-5 and UJ-1 Consent at first app open; new FR-25 'Dine notater', and UJ-2 opens the Note from it; new FR-26 Arkiv and FR-27 Importance Level (Should); product name closes Open Question 2; NFR-7 floor 320 px.
- Feedback 4.1: §8 cut order (Core / Then / Cut first), Should cutoff 2026-12-01, Open Questions 1 and 3 before epics.
- Feedback 4.2: FR-18 Round rule (shaky and new plus a known share); UJ-2 and the FR-18 test case follow.
- Feedback 4.3: FR-7 summary as 5–10 Summary Points of at most 40 words, aligned in §1.2.
- Feedback 4.4: requirements reference message keys from EXPERIENCE.md › Microcopy (NFR-9).
- Feedback 4.5: NFR-2 automated test, NFR-3 rate limit with HTTP 429, NFR-8 three scenarios.
- Feedback §6: the Proxy runs locally only (DR-1, NFR-3).
- Mechanical: UJ-1 quiz count matches 8 Key Concepts; glossary terms added; inline decision references moved to this log.

**2026-11-12: Follow-ups after the rubric review (`review-rubric.md`).**
- Decisions by Tor: FR-18 a concept with Flashcards but no surviving Quiz Question joins the Round with Flashcards only (FR-14, FR-20, glossary Eligible follow); §8.1 Core gains FR-5 and FR-13; SM-3 fallback (prompt, then model, then threshold only by PRD update); FR-25 is cuttable, with re-upload through FR-4 as the fallback (§8.1 scope trade-off).
- §8.1 tiers and cut order rewritten: each FR in one tier, Should FRs placed, cut order numbered, cutoff 2026-12-01.
- FR-21 lists the stored fields FR-18 and FR-25 to FR-27 need; the FR-18 function signature includes Quiz Question rotation and surviving Items.
- Values confirmed earlier on 2026-11-12 (FR-7, FR-18, FR-25, NFR-3, FR-16 tier) moved into §11.
- Low findings: FR-5 input after declining Consent; FR-6 range only; FR-7 count before drops; FR-11 `err.noConcepts` as a defensive guard; FR-16 jargon judged in SM-2; FR-18 order within a state; FR-19 rounding and gap note only when the count is above 0; NFR-6 wording; message keys next to UI labels; glossary 'Dine notater', Eligible, Incomplete Round, Last-shown time, Innstillinger; Review fix D1–D4 mapped above.

**2026-11-12: Final confirmations by Tor and editorial polish; status final.** FR-7 fewer than 5 Summary Points after drops fails; FR-5 and FR-24 `consent.declined` takes precedence over `err.noKey`; FR-4 and FR-26 re-supplying an archived Note restores it with history; SM-6 qualitative with no threshold; FR-20 message key defined in stories; FR-25 last in cut order (§11); structure and prose polish with no requirement changes.
