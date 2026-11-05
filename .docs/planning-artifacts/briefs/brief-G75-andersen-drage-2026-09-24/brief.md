---
title: Product Brief
status: final
created: 2026-09-24
updated: 2026-11-05
---

# Product Brief: AI-Based Learning Assistant for Students

*Working title — no product name chosen yet.*

## Executive Summary

Students under exam pressure rarely lack material — they lack time to find what matters in it. Turning lecture notes and reading material into something they can review and test themselves on is slow, repetitive work, and most students either do it by hand or improvise with general-purpose tools like ChatGPT.

This project is an AI-based learning assistant built around the 80/20 principle — the idea that roughly 20 % of the material gives 80 % of the understanding. A student uploads their own notes, and the application identifies the most central content and turns it into a short summary, flashcards, and a scored quiz. The app tracks which key concepts the student knows and which are still shaky, shaky concepts come first in the next round, and any flashcard or quiz answer can be re-explained in simpler terms. The app is explicitly a *supplement*, not a replacement for studying — it supports active recall and repetition rather than doing the learning for the student.

It is also the solo deliverable for IBE160 (Programming with AI, Høgskolen i Molde), so it demonstrates meaningful use of AI in both the *product* (AI-generated study aids) and the *process* (AI-assisted planning, development, testing, and quality assurance).

## The Problem

Before an exam, the bottleneck is not access to material but deciding what to focus on and turning it into something you can test yourself with. Students often:

- Re-read notes passively instead of testing themselves, which is a weaker way to retain material
- Spend their limited time organizing and formatting notes rather than studying the parts that matter most
- Improvise with general AI chat tools ad hoc, with no consistent format, no focus on what is central, and no way to repeat what they got wrong

The cost is time lost to low-value repetition and, for some students, skipping review altogether because preparing study material feels like too much up-front effort.

## The Solution

A web application where the student works through one focused loop:

1. **Upload** a note or course text (plain text, Markdown, Word `.docx`, or text-based PDF).
2. **Get the core**: the app extracts the most central content and generates a short summary, a set of flashcards, and quiz questions — all focused on the key 20 % of the material, not everything in it. Before generation, the note is split into numbered passages. Every summary point, flashcard, quiz question and "Explain simpler" answer cites a passage ID and a short quote, and code checks that the quote actually exists in the note; items that fail the check are regenerated once or dropped. Clicking a reference highlights the passage in the original note.
3. **Review flashcards** one by one and mark each as "knew it" or "didn't know". If a card doesn't make sense, **"Explain simpler"** (ELI5) re-explains it in plain language without jargon.
4. **Take the quiz** and get a score, with the correct answer shown for each question. "Explain simpler" is available on quiz answers too.
5. **Repeat what is shaky**: each key concept has a mastery state — *new*, *shaky* or *known* — updated by the flashcard buttons and the quiz answers. A new round puts shaky concepts first. Known concepts are not dropped for good — they come back in later rounds, because research on retrieval practice shows that removing items from testing after one correct answer sharply reduces long-term retention.

Progress (mastery state per key concept and quiz results) is stored locally in the browser, so a student can come back to the same material later without an account. Calls to the language model go through a small backend proxy, so the API key never reaches the browser; the proxy has no database and stores no user data. Before upload, the app makes clear that the content is sent to an external language model.

## What Makes This Different

General AI chat tools (ChatGPT) and dedicated apps (Quizlet, Anki) already do summaries and flashcards well. Google NotebookLM goes further: it already offers the whole loop — upload, flashcards and quiz, an "Explain" button, and retrying the cards you missed — free with a Google account. A closed study loop is therefore not what sets this app apart. The differentiators are:

- **A verified source passage on every item**: each flashcard and quiz question shows the exact passage from the student's own note it is based on, by default rather than on request — and the app checks in code that the quoted passage actually exists in the note, so the student can trust it and check it
- **No account needed**: the app works without login, and progress is kept in the browser; the major alternatives all require an account
- **An 80/20 profile throughout**: every output is deliberately limited to the most central content, built for a student with little time rather than for complete coverage. This is a design choice, not a research finding — the app's learning value rests on self-testing, which is well documented

This is not a moat in a commercial sense. The value is fit for one specific situation — and, for IBE160, the engineering behind it. The basis for this section is in `.docs/planning-artifacts/research/technical-learning-assistant-solution-steps-2026-10-29/research.md`.

## Who This Serves

**Primary user**: a student short on time before an exam who has their own notes for a course and wants to find and practise the most central content quickly. They are not looking for complete coverage — they want to know what matters most, check whether they know it, and spend their remaining time on what they got wrong. The first test user is Tor, using notes from current courses.

## Success Criteria

Content criteria are verified against 2–3 reference notes, each with 5–10 key concepts listed in advance:

- Flashcards and quiz together cover **at least 80 %** of the pre-listed key concepts for each reference note
- The summary is **at most 20–25 %** of the length of the source note
- **Every** summary point, flashcard, quiz question and "Explain simpler" answer cites a passage ID and a quote, and **no** item whose quote is not found in the note is shown to the student
- The language model's responses follow a fixed JSON format that is validated in code; invalid responses are handled with a clear error message, not a crash
- Every key concept has a mastery state (new / shaky / known) that is updated by flashcard buttons and quiz answers
- After a quiz, the student sees their score and can start a new round where shaky concepts come **first**; known concepts return in later rounds rather than being dropped
- The API key is never sent to the browser, and the backend proxy stores no user data
- "Explain simpler" returns a plain-language explanation for any flashcard or quiz answer
- Unsupported or empty files are rejected with a clear message
- The examiner can run the app locally by following the README, using demo mode without an API key

## Scope

**In for v1:**
- Upload of plain text / Markdown, Word (`.docx`), and text-based PDF
- 80/20-focused summary, flashcards, and quiz questions
- Grounding: numbered passages, a passage ID and quote on every item, a quote check in code, and highlighting of the passage in the note
- Flashcard review with "knew it" / "didn't know"
- Quiz with score
- Mastery state per key concept (new / shaky / known), with shaky concepts first in new rounds
- "Explain simpler" (ELI5) on flashcards and quiz answers
- Local storage of progress in the browser (no login)
- Backend proxy for the language model API, with no database
- Demo mode with stored responses for a sample note, plus `.env.example` for using your own API key
- Notice that content is sent to an external language model

**Should (if time allows, after v1 works):**
- Readiness score: "Am I ready?" = known key concepts ÷ all key concepts for the note, shown as a percentage
- Cache by content hash: uploading the same content again reuses stored results, with no new LLM call or cost
- Paste text directly as an alternative to file upload
- Panic mode: "Exam in one hour" limits flashcards and quiz to the 10 most central concepts

**Explicitly out for v1:**
- Legacy Word `.doc` files, scanned PDFs, and non-text material (audio, video, lecture recordings)
- User accounts, multi-user and sharing features
- Spaced-repetition scheduling algorithms beyond the three mastery states (a Leitner-lite with three boxes)
- Audio recaps and video recommendations (see Vision)

## Technical Direction

- **Language model**: one LLM provider via API, with structured JSON output validated in code. The concrete provider, model, and cost estimate are chosen and justified in the architecture document.
- **Backend proxy**: a small backend without a database forwards calls to the language model, so the API key stays on the server. This refines "no login, local storage": user data stays in the browser.
- **Runnable without the developer's key**: demo mode with stored responses for a sample note; otherwise, the user supplies their own key via `.env` (never committed; `.env.example` in the repo).
- **Test data**: reference notes that are allowed to be shared publicly, each with a list of expected key concepts. Recorded LLM responses (fixtures) for these notes serve demo mode, an offline fallback, the exam presentation and automated tests in CI.

The additions to the first version of this brief (grounding, mastery state, proxy and the "Should" list) come from the brainstorm on 2026-10-29: `.docs/brainstorming/brainstorm-product-brief-g75-2026-10-29/brainstorm-intent.md`.

## Open Questions

- What is the exact deadline for the course deliverable?
- Which LLM provider and model gives acceptable quality and cost? (decided in the architecture document)

## Vision

V1 already takes grounding and adaptive review a step beyond the alternatives: verified source passages and a mastery state per key concept. If the core loop works well, the next step is still depth rather than breadth: the "Should" items above, and later a real spaced-repetition schedule that decides *when* a known concept comes back. Further out, the same material could be offered in other formats — a podcast-style audio recap, or recommendations for existing videos that explain a topic or a missed quiz question. These require extra external services and are deliberately left out of v1, which is about proving the core loop: upload → core → test → repeat what is shaky.
