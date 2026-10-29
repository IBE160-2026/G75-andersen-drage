---
title: Product Brief
status: final
created: 2026-09-24
updated: 2026-10-29
---

# Product Brief: AI-Based Learning Assistant for Students

*Working title — no product name chosen yet.*

## Executive Summary

Students under exam pressure rarely lack material — they lack time to find what matters in it. Turning lecture notes and reading material into something they can review and test themselves on is slow, repetitive work, and most students either do it by hand or improvise with general-purpose tools like ChatGPT.

This project is an AI-based learning assistant built around the 80/20 principle — the idea that roughly 20 % of the material gives 80 % of the understanding. A student uploads their own notes, and the application identifies the most central content and turns it into a short summary, flashcards, and a scored quiz. Questions the student gets wrong come back for another round, and any flashcard or quiz answer can be re-explained in simpler terms. The app is explicitly a *supplement*, not a replacement for studying — it supports active recall and repetition rather than doing the learning for the student.

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
2. **Get the core**: the app extracts the most central content and generates a short summary, a set of flashcards, and quiz questions — all focused on the key 20 % of the material, not everything in it. Each item shows which part of the note it came from.
3. **Review flashcards** one by one. If a card doesn't make sense, **"Explain simpler"** (ELI5) re-explains it in plain language without jargon.
4. **Take the quiz** and get a score, with the correct answer shown for each question. "Explain simpler" is available on quiz answers too.
5. **Repeat what was wrong**: the student can start a new round where the questions they answered incorrectly come first, until they get them right. Questions they already answered correctly are not dropped for good — they come back in later rounds, because research on retrieval practice shows that removing items from testing after one correct answer sharply reduces long-term retention.

Progress (quiz results and wrong answers) is stored locally in the browser, so a student can come back to the same material later without an account. Before upload, the app makes clear that the content is sent to an external language model.

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
- **Every** flashcard and quiz question is linked to the passage of the note it is based on
- The language model's responses follow a fixed JSON format that is validated in code; invalid responses are handled with a clear error message, not a crash
- After a quiz, the student sees their score and can start a new round where the questions they answered incorrectly come **first**; correctly answered questions return in later rounds rather than being dropped
- "Explain simpler" returns a plain-language explanation for any flashcard or quiz answer
- Unsupported or empty files are rejected with a clear message
- The examiner can run the app locally by following the README, using demo mode without an API key

## Scope

**In for v1:**
- Upload of plain text / Markdown, Word (`.docx`), and text-based PDF
- 80/20-focused summary, flashcards, and quiz questions, each traceable to the source
- Flashcard review
- Quiz with score and repetition of wrongly answered questions
- "Explain simpler" (ELI5) on flashcards and quiz answers
- Local storage of progress in the browser (no login)
- Demo mode with stored responses for a sample note, plus `.env.example` for using your own API key
- Notice that content is sent to an external language model

**Explicitly out for v1:**
- Legacy Word `.doc` files, scanned PDFs, and non-text material (audio, video, lecture recordings)
- User accounts, multi-user and sharing features
- Spaced-repetition scheduling algorithms beyond putting wrong answers first and bringing correct ones back in later rounds
- Audio recaps and video recommendations (see Vision)

## Technical Direction

- **Language model**: one LLM provider via API, with structured JSON output validated in code. The concrete provider, model, and cost estimate are chosen and justified in the architecture document.
- **Runnable without the developer's key**: demo mode with stored responses for a sample note; otherwise, the user supplies their own key via `.env` (never committed; `.env.example` in the repo).
- **Test data**: reference notes that are allowed to be shared publicly, each with a list of expected key concepts.

## Open Questions

- What is the exact deadline for the course deliverable?
- Which LLM provider and model gives acceptable quality and cost? (decided in the architecture document)

## Vision

If the core loop works well, the next step is depth rather than breadth: better grounding of generated content in the source material and review that adapts more closely to what the student gets wrong. Further out, the same material could be offered in other formats — a podcast-style audio recap, or recommendations for existing videos that explain a topic or a missed quiz question. These require extra external services and are deliberately left out of v1, which is about proving the core loop: upload → core → test → repeat mistakes.
