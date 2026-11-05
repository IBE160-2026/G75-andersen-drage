---
title: PRD — AI-Based Learning Assistant for Students
status: draft
created: 2026-11-05
updated: 2026-11-05
---

# PRD: AI-Based Learning Assistant for Students

*Working title. No product name has been chosen.*

## 0. Document Purpose

This PRD defines what v1 of the learning assistant must do. It is the input for the UX specification, the architecture document, and the epics and stories, which all reference its stable IDs: UJ-n for journeys, FR-n for functional requirements, NFR-n for cross-cutting quality requirements, DR-n for course delivery requirements and SM-n for success metrics.

It builds on the following documents and does not repeat them:
- the final product brief (`../../briefs/brief-G75-andersen-drage-2026-09-24/brief.md`),
- the review findings carried into the PRD (`../../briefs/brief-G75-andersen-drage-2026-09-24/review-findings-for-prd-2026-11-05.md`),
- the brainstorm intent (`../../../brainstorming/brainstorm-product-brief-g75-2026-10-29/brainstorm-intent.md`),
- the technical research (`../../research/technical-learning-assistant-solution-steps-2026-10-29/research.md`),
- the IBE160 grading guide for Part 1 (`../../input/Sensorveiledning IBE160 - Del 1 applikasjon og prosess.pdf`).

The vocabulary is anchored in §3 Glossary. Values first proposed as assumptions and since confirmed are listed in §11. Technical detail that belongs to architecture, such as library candidates, storage mechanics and proxy hardening, is kept in `addendum.md`.

## 1. Vision

Students under exam pressure rarely lack material. What they lack is time to find what matters in it. This app takes a student's own **Note**, identifies its **Key Concepts**, and turns the most central 20% into a short summary, **Flashcards** and a scored multiple-choice **Quiz**. The next **Round** then focuses on what the student has not yet mastered. The app supports active recall and repetition. It is a supplement to studying, not a replacement for it.

Every study item shows the **Passage** of the student's own note it comes from, and the app checks in code that the quoted text really is there. No account is needed. Progress stays in the browser, and the same note picks up where the student left off.

The app is also the solo deliverable for IBE160 Programming with AI (Høgskolen i Molde), due **15 December 2026**. It must therefore demonstrate deliberate use of AI in both the product and the development process. An examiner must be able to run it from the README without an API key.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** "I have my own notes and an exam soon. Show me what matters most, check whether I know it, and make me spend my remaining time on what I got wrong."
- **Emotional:** "I want to feel less overwhelmed. I want a manageable core instead of the whole syllabus, and a clear signal of how ready I am."
- **Trust:** "I don't want to learn something the AI made up. Let me see where in my own notes each item comes from."
- **Contextual:** "I don't want to create yet another account just to study for one exam."

### 2.2 Non-Users (v1)

- Students who want complete coverage of a syllabus. The app deliberately covers only the central part.
- Teachers who author content for a class. The app has no sharing and no multiple users.
- Users who need long-term spaced-repetition scheduling. Anki does this better.

### 2.3 Key User Journeys

- **UJ-1. Sara gets the core of a lecture note the evening before an exam.**
  Sara is a second-year student with one evening left. She opens the app in her browser, and no login is needed. Before her first upload she confirms that her text will be sent to an external AI service. She uploads `forelesning-7.pdf`. A progress indicator runs for less than a minute. Then she sees eight Key Concepts, a short summary and a "Start round" button. She works through the Flashcards, marking each one "knew it" or "didn't know". On one card she taps "Explain simpler". Then she takes the Quiz. **Climax:** she gets a score of 6 of 9, sees the correct answers, and clicks a source reference that highlights the exact sentence in her own note that the question was built from. **Resolution:** two Key Concepts are now *shaky*, and the app offers a new Round that starts with them.
  **Edge case:** her PDF is a scan with no text. The app says "Scanned PDFs are not supported" before any AI call is made.

- **UJ-2. Sara comes back the next morning.**
  Sara opens the app in the same browser and uploads the same note again. The app recognizes the content, makes no new AI call, and shows the same Key Concepts with yesterday's Mastery States and a **Readiness Score** of 63%. She starts a Round. The shaky concepts come first, followed by one concept she already knew. **Edge case:** she closed the tab mid-quiz yesterday. The answered questions were kept and scored, and that Round is marked incomplete.

- **UJ-3. The examiner runs the app from the README.**
  The examiner clones the repository on a clean machine, follows the README, and starts the app with one command and no API key. **Demo Mode** loads the sample note with recorded responses, and the whole loop works: upload, core, flashcards, quiz, next Round. The examiner then tries to upload their own file and is told "Demo mode supports only the sample note". They run the tests with the command given in the README.

## 3. Glossary

- **Note**: one text the student supplies by file upload or by pasting. It is identified by its **Note Hash**. One Note has many Passages, Key Concepts and Items.
- **Extracted Text**: the plain text the app gets out of a Note's file after **Normalization**. It is shown in the app's text view. The original layout is not rendered.
- **Normalization**: a fixed transformation applied to both the Extracted Text and every Quote before they are compared: Unicode NFKC, collapsed whitespace and line breaks, unified quotation marks, and rejoined end-of-line hyphenation.
- **Note Hash**: a hash of the normalized Extracted Text. It is not computed from the file bytes. It is the Note's identity in the browser.
- **Passage**: a numbered segment of the Extracted Text. It has a **Passage ID** that is unique within the Note.
- **Quote**: a verbatim excerpt that an Item cites as its source, together with one Passage ID.
- **Quote Check**: the code-side verification that a Quote, after Normalization, occurs inside the cited Passage. An Item that fails it is never shown.
- **Key Concept**: one of the central ideas of a Note, with a stable ID and a **Centrality Rank**. Every Flashcard and Quiz Question belongs to exactly one Key Concept.
- **Item**: any generated study element that cites a Quote. The Item types are **Summary Point**, **Flashcard**, **Quiz Question** and **Simpler Explanation**.
- **Study Set**: everything generated for a Note in one generation: its Key Concepts, Summary Points, Flashcards and Quiz Questions.
- **Mastery State**: the state of a Key Concept for this browser, which is *new*, *shaky* or *known*.
- **Round**: one pass of Flashcards followed by a Quiz over a selection of Key Concepts.
- **Readiness Score**: the number of known Key Concepts divided by the number of eligible Key Concepts, shown as a percentage.
- **Explain Simpler**: an on-demand request for a plain-language explanation of a Flashcard or a Quiz answer. It returns a Simpler Explanation.
- **Demo Mode**: a mode that serves recorded responses (**Fixtures**) for the bundled sample note, with no API key and no network call to the AI provider.
- **Proxy**: the app's own small backend that forwards calls to the AI provider. It holds the API key and stores no user data.
- **Consent**: the student's one-time confirmation that Note content will be sent to an external AI provider.

## 4. Features

### 4.1 Note Input

**Description:** the student supplies a Note by uploading a file or by pasting text. Extraction runs in the app before any AI call, so bad input is rejected for free. A Note that is too short, too long, empty or unreadable is rejected with a specific message. Realizes UJ-1 and UJ-2.

#### FR-1: Upload a file

The student can upload one file of type `.txt`, `.md`, `.docx` or a text-based `.pdf`. The app extracts and normalizes its text.

**Consequences (testable):**
- The four supported types produce Extracted Text, and the Extracted Text is shown in the text view.
- Any other extension, including `.doc`, is rejected with "Unsupported file type" and the list of supported types.
- A file larger than the maximum file size (10 MB) is rejected before it is parsed.
- A `.txt` or `.md` file that is not valid UTF-8 is decoded with a fallback, and a warning is shown that characters such as æ, ø and å may be wrong.

#### FR-2: Paste text

The student can paste text as an alternative to uploading a file. The pasted text then follows the same rules as Extracted Text. (Decision D1: in v1.)

**Consequences (testable):**
- Pasted text goes through the same Normalization, length limits and Note Hash as an uploaded file.
- Pasting the same text that was earlier uploaded as a `.txt` file reconnects to the same Note.

#### FR-3: Reject unusable input

The app rejects input that cannot produce a useful Study Set, and shows a message that says why.

**Consequences (testable):**
- A Note with no text, or only whitespace, after extraction is rejected with "No readable text found".
- A PDF whose average text per page is below a threshold (100 characters per page) is rejected with "Scanned PDFs are not supported".
- A corrupt, password-protected or misnamed file is rejected with "File could not be read", and the app does not crash.
- A Note shorter than the minimum length (150 words) is rejected with "The note is too short to find key concepts in".
- A Note longer than the maximum length (15,000 words) is rejected with a message that states the limit. v1 does not split long Notes into chunks (Decision D7).
- No AI call is made for a rejected Note.

#### FR-4: Recognize a known Note

When the same content is supplied again in the same browser, the app reconnects to the stored Study Set and progress instead of generating again. Realizes UJ-2.

**Consequences (testable):**
- The Note Hash is computed from the normalized Extracted Text. The same text in a different file format or with a different file name gives the same Note Hash.
- The cache key for a stored Study Set combines the Note Hash, the prompt version and the model ID (Decision D2). A change of prompt or model leads to a new generation, and existing Mastery States are kept for Key Concepts whose IDs still match. After regeneration with a new prompt or model, Key Concept IDs may change. Progress for concepts that disappear is dropped.
- When a reconnection hits the cache, no AI call is made.

### 4.2 Consent and Privacy

**Description:** Note content leaves the browser only through the Proxy, and only after the student has agreed to it. Realizes UJ-1.

#### FR-5: One-time Consent

Before the first Note is sent for generation, the student must confirm a notice. The notice says that the content is sent to an external AI provider and names the provider. (Decision D8.)

**Consequences (testable):**
- No generation request is sent until Consent is recorded in the browser.
- If the student declines, upload and paste are disabled for real generation, and the app offers Demo Mode.
- The student can withdraw Consent later from the settings, which returns the app to the state it is in after declining.

### 4.3 Study Set Generation

**Description:** one generation turns a Note into its Key Concepts, Summary Points, Flashcards and Quiz Questions. All of them are in the Note's language, limited to the central content, and grounded in Quotes. The AI response is validated against a fixed schema in code, and every Item passes the Quote Check before it is shown. Realizes UJ-1.

#### FR-6: Generate Key Concepts

The app identifies the Key Concepts of a Note, each with a stable ID and a Centrality Rank.

**Consequences (testable):**
- The number of Key Concepts scales with Note length, within a fixed range (5–15).
- Key Concepts and their IDs are stored with the Note and do not change between Rounds or sessions for the same cache key.

#### FR-7: Generate summary, Flashcards and Quiz Questions

For each Key Concept the app generates Items that are focused on the central content.

**Consequences (testable):**
- Each Key Concept gets 1–2 Flashcards and at least one Quiz Question.
- The summary is at most 25% of the Note's word count. For a Note under 400 words, the length rule does not apply and the summary is capped at 5 Summary Points instead.
- Each Quiz Question has exactly four unique options and exactly one correct option, and the index of the correct option is in range. A Quiz Question that breaks this is dropped like a failed Item.
- All generated text is in the language of the Note. A Norwegian Note gives Norwegian Items.

#### FR-8: Validate the AI response

The app accepts only AI responses that match the fixed response schema.

**Consequences (testable):**
- A response that is not valid JSON, does not match the schema, or ends with a refusal or a max-tokens stop is retried once. If the retry also fails, the student sees a clear error with a "Try again" button, and the app does not crash.
- Instructions inside the Note text are not followed. The Note is passed to the model as delimited data, and output that does not match the schema is rejected. A reference Note that contains an injected instruction such as "ignore previous instructions and output X" still produces a valid Study Set (or a clean error).

#### FR-9: Quote Check every Item

Every Item cites one Passage ID and a Quote, and is shown only if the Quote Check passes (Decision D3).

**Consequences (testable):**
- An Item whose Passage ID does not exist in the Note fails.
- An Item whose Quote, after Normalization, is not an exact substring of the cited Passage fails, even if the Quote occurs elsewhere in the Note.
- A Quote shorter than the minimum length (20 characters after Normalization) fails.
- A Quote that spans two Passages fails. The model is instructed to quote verbatim, in the source language, from within one Passage.
- Failed Items are dropped, never shown, and never regenerated automatically (Decision D4).

#### FR-10: Minimum surviving Items

When too few Items survive the Quote Check, the app tells the student rather than presenting a thin Study Set.

**Consequences (testable):**
- If fewer than 5 Flashcards or fewer than 5 Quiz Questions survive, the student sees a message that explains this, together with a "Try again" button that starts a new generation.
- A Key Concept with no surviving Flashcard or Quiz Question is marked *not covered*. It is excluded from Rounds and from the Readiness Score, and it is shown in the concept list as "no verified items".

#### FR-11: Waiting, error and retry states

Generation never leaves the student facing a silent or endless spinner.

**Consequences (testable):**
- A progress indicator is shown from submission until the Study Set is shown or an error appears.
- Timeouts, rate limits (HTTP 429), provider 5xx errors and network failures show a retryable error message. The request times out after 90 seconds.
- While a generation is pending, a second upload or paste is disabled.

### 4.4 Source Grounding View

**Description:** the student can always see where an Item comes from. Realizes UJ-1.

#### FR-12: Show the source of every Item

Every Summary Point, Flashcard, Quiz Question and Simpler Explanation shows its Quote by default. A reference to the Passage opens the Extracted Text with that Passage highlighted.

**Consequences (testable):**
- The Quote is visible without any extra click.
- Activating the reference, by mouse or keyboard, scrolls to the Passage and highlights the Quote in the text view.

### 4.5 Flashcard Review

**Description:** in a Round the student goes through Flashcards one at a time. Realizes UJ-1.

#### FR-13: Review Flashcards

The student sees the front of a card, reveals the back, and marks the card "knew it" or "didn't know".

**Consequences (testable):**
- Each mark updates the Mastery State of the card's Key Concept according to FR-17.
- Reveal and marking work by keyboard alone.

### 4.6 Quiz

**Description:** after the Flashcards, the student answers Quiz Questions for the Round's Key Concepts. Scoring is done in code, not by the AI. Realizes UJ-1 and UJ-2.

#### FR-14: Take the Quiz

The student answers multiple-choice Quiz Questions and gets a score.

**Consequences (testable):**
- Scoring is a deterministic function of the selected and correct options. It has unit tests and no AI call.
- After the Quiz, the student sees the score, and for each question their answer, the correct answer and the Quote.
- Each answer updates the Mastery State according to FR-17.

#### FR-15: Survive interruption

A Round that is abandoned or reloaded is not lost.

**Consequences (testable):**
- Each answer is saved as soon as it is given.
- After a reload, the answered questions are kept and scored, and the Round is marked *incomplete*. The student can resume it or start a new Round.

### 4.7 Explain Simpler

**Description:** on a Flashcard or on a Quiz answer, the student can ask for a plain-language explanation. The explanation must be grounded like every other Item.

#### FR-16: Request a Simpler Explanation

The student can request Explain Simpler on any Flashcard and on any Quiz answer. The result is a Simpler Explanation with a Quote that has passed the Quote Check, or the message "Could not make a verified simpler explanation", shown together with the original Quote.

**Consequences (testable):**
- An explanation whose Quote fails the Quote Check is never shown.
- The explanation is in the Note's language and avoids jargon.
- Each request is one AI call, and it is never made automatically.

### 4.8 Mastery and Rounds

**Description:** each Key Concept has a Mastery State that drives what the next Round contains. The design is a three-box Leitner-lite, not a spaced-repetition scheduler. Realizes UJ-1 and UJ-2. (Decision D6.)

#### FR-17: Update the Mastery State

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

A new Round contains Key Concepts in this order: shaky first, then new, then a fixed share of known concepts.

**Consequences (testable):**
- Concepts not covered (FR-10) are never included.
- Known concepts make up about 20% of the Round, at least 1 when any known concepts exist, with the ones least recently shown chosen first.
- If no concept is shaky or new, the Round is a review of known concepts, and the student is told "All key concepts are known — this is a review round".
- Shaky concepts are never left out of a Round.

#### FR-19: Readiness Score

The app shows the Readiness Score for the current Note. (Decision D1: in v1.) Realizes UJ-2.

**Consequences (testable):**
- The score is known ÷ eligible, where eligible excludes concepts that are not covered.
- With zero eligible concepts, no score is shown (not 0% and not "NaN").

#### FR-20: Panic Mode *(Should)*

The student can choose "Exam in one hour", which limits the Round to the 10 Key Concepts with the highest Centrality Rank.

**Consequences (testable):**
- A Note with fewer than 10 eligible Key Concepts uses all of them.

### 4.9 Local Persistence

**Description:** without an account, the browser is the only store. Losing data must be visible, never silent. Realizes UJ-2. (Decision D5.)

#### FR-21: Persist per Note

The Note's Extracted Text, Study Set, Mastery States and Round progress survive a browser restart, and are stored separately for each Note Hash.

**Consequences (testable):**
- Two different Notes never overwrite each other's progress.
- Stored data carries a schema version. Data with an unknown or corrupt format is reset safely with a notice, and the app does not crash.
- If storage is unavailable or full (for example in private mode, or when the quota is exceeded), the app keeps working for the session and shows "Progress is not being saved".
- When the same Note is open in two tabs, the last write wins. This is documented in the README.

#### FR-22: Export and import progress *(Should)*

The student can export a Note's progress and Study Set as a JSON file and import it again.

### 4.10 Demo Mode

**Description:** Demo Mode lets anyone run the whole loop without an API key. Realizes UJ-3.

#### FR-23: Run with Fixtures

In Demo Mode the app serves the sample note's Study Set and Simpler Explanations from Fixtures, and makes no call to the AI provider.

**Consequences (testable):**
- The full loop from UJ-1 works in Demo Mode with no API key configured.
- Uploading anything other than the sample note shows "Demo mode supports only the sample note".
- Fixture data goes through the same schema validation and Quote Check as live responses.

#### FR-24: Missing key

If no API key is configured and Demo Mode is off, the app shows "No API key configured — use demo mode or add a key to .env". It does not show a raw provider error.

## 5. Cross-Cutting Non-Functional Requirements

- **NFR-1: Secrets.** The API key exists only in the Proxy's environment. It never reaches the browser, the repository or its history. `.env` is git-ignored, and `.env.example` documents every variable without real values.
- **NFR-2: No data retention in the Proxy.** The Proxy stores no Note content and logs only status codes, timings and error codes, never request or response bodies. This is checked by a test or a documented code review.
- **NFR-3: Proxy access.** The Proxy accepts requests only from the app's own origin or from localhost, and applies a rate limit, so that others cannot use the key. Details are in `addendum.md`.
- **NFR-4: Latency.** For a Note of about 3,000 words, the first Flashcard is shown within 60 seconds of submission with the chosen model. Explain Simpler responds within 15 seconds.
- **NFR-5: Cost.** One generation uses at most 2 AI calls (the first try and one retry). Explain Simpler uses one call per request. A cache hit uses none. The architecture states the expected cost per Note.
- **NFR-6: Accessibility.** The app meets basic WCAG 2.1 AA expectations: readable contrast, full keyboard operation of every flow, visible focus, labelled form controls, and text alternatives for non-text elements.
- **NFR-7: Responsive layout.** Every flow is usable from a 360 px wide phone screen up to desktop width.
- **NFR-8: Stability.** Bad input, repeated clicks, reloads and network failures never crash the app or leave it in a state the student cannot leave without clearing storage.
- **NFR-9: Language.** The user interface is in Norwegian (Decision D9). Generated content follows the Note's language. Error messages in this PRD are written in English for the record and are shown in Norwegian.

## 6. Delivery Requirements (IBE160)

These requirements exist because the app is graded under the IBE160 Part 1 guide. The criterion weights are given in parentheses.

- **DR-1: One-command start (README, 10%).** The README lets someone who does not know the project install and run the app on a clean machine. It gives the prerequisites with versions, the exact commands, one command that starts both the frontend and the Proxy, a description of the configuration, and a screenshot. Demo Mode is the documented default path.
- **DR-2: Automated tests (QA, 15%).** One documented command runs the automated tests without an API key, using Fixtures. As a minimum, the tests cover Normalization and the Quote Check (FR-9), schema validation (FR-8), the Mastery table (FR-17), Round composition (FR-18), scoring (FR-14), the Readiness Score (FR-19) and the input rejections (FR-3).
- **DR-3: Content verification on reference notes (QA, 15%).** 2–3 reference notes that may be shared publicly (at least one in Norwegian) are kept in the repo with their expected Key Concepts. A documented test run against them measures SM-1 to SM-3, including a manual spot check that the answers follow from the cited Passages.
- **DR-4: Traceability (Process, 30%).** Stories reference FR-IDs, and commits and pull requests reference stories. Deviations from this PRD are recorded in the PRD (as an update) or in the sprint documents, with a reason.
- **DR-5: Saved AI sessions (Process, 30%).** Prompts and AI sessions that drove decisions or code are kept in the repo (`.logs/` and the memlogs). They include examples where an AI suggestion was rejected or corrected.
- **DR-6: Repository hygiene (5%).** `.gitignore` excludes dependencies, build output and `.env`. There are no stray files in the root.

## 7. Non-Goals (Explicit)

- The app is not a general AI chat. It does nothing outside the Note-to-Round loop.
- It is not a replacement for studying, and it does not claim that its answers are correct. The Quote Check proves that the source exists, not that the answer is right.
- It is not a multi-user product: no accounts, no sharing and no server-side storage.
- It is not a spaced-repetition scheduler.
- It is not a document viewer. The original layout is not rendered.

## 8. MVP Scope

### 8.1 In Scope (v1)

- FR-1 to FR-19, FR-21, FR-23 and FR-24, NFR-1 to NFR-9, and DR-1 to DR-6.
- This includes paste text (FR-2) and the Readiness Score (FR-19), which were moved up from "Should" in the brief (Decision D1).

### 8.2 Should (if time allows)

- FR-20 Panic Mode.
- FR-22 Export and import of progress as JSON.

### 8.3 Out of Scope for v1

- `.doc` files, scanned PDFs (OCR), audio and video.
- Splitting long Notes into chunks (Decision D7). They are rejected instead.
- Free-text answers and grading by AI.
- Automatic regeneration of failed Items (Decision D4).
- A fuzzy or "weak" Quote match tier (Decision D3).
- Accounts, multiple users, sharing, and sync across browsers.
- Audio recaps and video recommendations (the brief's Vision).

## 9. Success Metrics

Measured on the reference notes (DR-3) unless stated otherwise.

**Primary**
- **SM-1: Concept coverage.** At least 80% of the expected Key Concepts of each reference note are matched by a generated Key Concept with at least one surviving Flashcard or Quiz Question. Matching is judged with a documented manual rubric (same term, or a clear synonym). Validates FR-6, FR-7 and FR-10.
- **SM-2: Grounding.** 100% of the Items shown have passed the Quote Check (an automated test). In the manual spot check, at least 90% of the sampled Items have an answer that follows from the cited Passage. Validates FR-9, FR-12 and FR-16.
- **SM-3: Pass rate.** At least 80% of the generated Items pass the Quote Check on each reference note. Validates FR-9 and the prompt quality.
- **SM-4: Runnable by the examiner.** On a clean machine, someone following the README reaches a completed Demo Mode Round within 15 minutes. Validates FR-23 and DR-1.

**Secondary**
- **SM-5: Loop correctness.** Every automated test from DR-2 passes in CI. Validates FR-14 and FR-17 to FR-19.
- **SM-6: Time saved.** In a short self-test log, Tor compares preparing one note with the app against preparing it by hand (time to the first self-test and his subjective usefulness). Validates the problem statement.

**Counter-metrics (do not optimize)**
- **SM-C1: Number of Items.** More Flashcards or Quiz Questions is not better. The 80/20 profile caps the output on purpose. Counterbalances SM-1.
- **SM-C2: Pass rate through looser matching.** SM-3 must not be raised by weakening Normalization or the minimum Quote length. Counterbalances SM-3.

## 10. Open Questions

1. Which AI provider and model? This is decided in the architecture, based on a quality comparison on the reference notes (open issue: Haiku 5.5, gpt-6-luna, Gemini Flash-Lite). The Consent notice (FR-5) names the chosen provider.
2. Which product name? It is needed for the UI and the README before the delivery.
3. Which reference notes, and which expected Key Concepts for each? They must be fixed in the repo before generation prompts are tuned (DR-3).

## 11. Confirmed Assumptions

These values were proposed during drafting and confirmed by Tor on 2026-11-05. They can be adjusted after testing on real Notes; any change is recorded as a PRD update.
- §4.1 FR-1: the maximum file size is 10 MB.
- §4.1 FR-3: the scanned-PDF threshold is 100 characters per page on average.
- §4.1 FR-3: the minimum Note length is 150 words.
- §4.1 FR-3: the maximum Note length is 15,000 words.
- §4.1 FR-4: after regeneration with a new prompt or model, progress for Key Concepts whose IDs changed is dropped.
- §4.3 FR-6: a Note has 5–15 Key Concepts, depending on its length.
- §4.3 FR-7: below 400 words the summary is capped at 5 points instead of 25% of the word count.
- §4.3 FR-9: the minimum Quote length is 20 characters after Normalization.
- §4.3 FR-10: at least 5 Flashcards and 5 Quiz Questions must survive the Quote Check.
- §4.3 FR-11: a generation request times out after 90 seconds.
- §4.8 FR-18: known concepts make up about 20% of a Round, at least 1, with the least recently shown chosen first.
- §5 NFR-4: the first Flashcard is shown within 60 s, and Explain Simpler responds within 15 s.
- §5 NFR-5: a generation uses at most 2 AI calls.
- §9 SM-2: at least 90% of the spot-checked Items are correct.
- §9 SM-3: at least 80% of the generated Items pass the Quote Check.
