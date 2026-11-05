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

This project is an AI-based learning assistant built around the 80/20 principle — the idea that roughly 20% of the material gives 80% of the understanding. A student uploads their own notes, and the application identifies the most central content, turns it into a short summary, flashcards, and a scored quiz, and then focuses the next round on what the student has not yet mastered. The app is explicitly a *supplement*, not a replacement for studying — it supports active recall and repetition rather than doing the learning for the student.

It is also the solo deliverable for IBE160 (Programming with AI, Høgskolen i Molde), so it demonstrates meaningful use of AI in both the *product* (AI-generated study aids) and the *process* (AI-assisted planning, development, testing, and quality assurance).

## The Problem

Before an exam, the bottleneck is not access to material but deciding what to focus on and turning it into something students can test themselves with. Students often:

- Re-read notes passively instead of testing themselves, which is a weaker way to retain material
- Spend their limited time organizing and formatting notes rather than studying the parts that matter most
- Use general AI chat tools ad hoc, with no consistent format, no focus on what is central, and no way to repeat what they got wrong

The cost is time lost to low-value repetition and, for some students, skipping review altogether because preparing study material feels like too much up-front effort.

## The Solution

A web application where the student works through one focused loop:

1. **Upload** a note or course text (plain text, Markdown, Word `.docx`, or text-based PDF).
2. **Get the core**: the app identifies the key concepts in the note and generates a short summary, a set of flashcards, and quiz questions — all focused on the key 20% of the material, not everything in it. Every item belongs to one key concept and cites the passage it comes from, verified against the note; clicking the reference highlights the passage in the app's text view of the note. All output is in the same language as the note.
3. **Review flashcards** one by one and mark each as "knew it" or "didn't know". If a card doesn't make sense, **"Explain simpler"** (ELI5, "explain like I'm five") re-explains it in plain language without jargon.
4. **Take the quiz**: multiple-choice questions with four options and one correct answer, scored in code. The student gets a score and sees the correct answer for each question. "Explain simpler" is available on quiz answers too.
5. **Repeat what is shaky**: each key concept has a mastery state — *new*, *shaky*, or *known* — updated by the flashcard buttons and the quiz answers. A new round puts shaky concepts first. Known concepts come back in later rounds rather than being dropped (retrieval-practice research shows that dropping items after one correct answer sharply reduces long-term retention).

No account is needed: progress stays in the browser, and before upload the student is told that the content is sent to an external language model.

## What Makes This Different

General AI chat tools (ChatGPT) and dedicated apps (Quizlet, Anki) already do summaries and flashcards well. Google NotebookLM goes further: it already offers the whole loop — upload, flashcards and quiz, an "Explain" button, and retrying missed cards — free with a Google account, and it can cite its sources. A closed study loop is therefore not what sets this app apart. The differentiators are:

- **A verified source passage on every study item**: every summary point, flashcard, quiz question, and "Explain simpler" answer shows the passage from the student's own note it is based on, by default rather than on request — and the app checks in code that the quoted passage actually exists in the note. This does not prove that an answer is correct, but it lets the student check every item against their own source
- **No account needed**: the app works without login, and progress is kept in the browser. NotebookLM and Quizlet require an account; Anki works without one but generates nothing with AI
- **An 80/20 profile throughout**: every output is deliberately limited to the most central content, built for a student with little time rather than for complete coverage. The 80/20 limit is a design choice, not a research finding — the app's learning value rests on self-testing, which is well documented

This is not a moat in a commercial sense. Its value lies in fitting one specific situation — and, for IBE160, in the engineering behind it.

## Who This Serves

**Primary user**: a student short on time before an exam who has their own notes for a course and wants to find and practice the most central content quickly. They are not looking for complete coverage — they want to know what matters most, check whether they know it, and spend their remaining time on what they got wrong. The first test user is Tor, using notes from current courses.

## Success Criteria

Content criteria are verified against 2–3 reference notes, each with 5–10 key concepts listed in advance. At least one reference note is in Norwegian:

- Flashcards and quiz together cover **at least 80%** of the pre-listed key concepts for each reference note
- Each key concept gets **1–2 flashcards** and **at least one quiz question**
- The summary is **at most 25%** of the word count of the source note
- **Every** summary point, flashcard, quiz question, and "Explain simpler" answer cites a passage ID and a quote, and **no** item whose quote is not found in the cited passage is shown to the student
- Every flashcard and quiz question belongs to exactly one key concept, and the key concepts for a note stay the same between rounds and sessions
- All output is in the same language as the note
- The language model's responses follow a fixed JSON format that is validated in code; invalid responses are handled with a clear error message, not a crash
- Every key concept has a mastery state (new / shaky / known) that is updated by flashcard buttons and quiz answers
- After a quiz, the student sees their score and can start a new round where shaky concepts come **first**; known concepts return in later rounds rather than being dropped
- A student who comes back to the same note later, in the same browser, continues with the same key concepts and mastery states
- The API key is never sent to the browser, and the backend proxy stores no user data
- "Explain simpler" returns either a verified plain-language explanation or a clear message that no verified explanation could be made, together with the cited passage
- Unsupported or empty files are rejected with a clear message
- The examiner can run the app locally by following the README, using demo mode without an API key

## Scope

**In for v1:**
- Upload of plain text / Markdown, Word (`.docx`), and text-based PDF
- 80/20-focused summary, flashcards, and multiple-choice quiz questions, in the language of the note
- Key concepts as the backbone: every flashcard and quiz question belongs to one concept, and the concept list is stored with the note
- Grounding: numbered passages, a passage ID and quote on every item, a quote check in code, and highlighting of the passage in the app's text view of the note
- Flashcard review with "knew it" / "didn't know"
- Quiz with score
- Mastery state per key concept (new / shaky / known), with shaky concepts first in new rounds
- "Explain simpler" (ELI5) on flashcards and quiz answers
- Note identity by content hash: the note, its key concepts, generated items, and progress are stored locally in the browser under a hash of the extracted text, so the same note reconnects to its progress (no login)
- Backend proxy for the language model API, with no database
- Demo mode with stored responses for a sample note, plus `.env.example` for using your own API key
- Notice that content is sent to an external language model

**Should (if time allows, after v1 works):**
- Readiness score: "Am I ready?" = known key concepts ÷ all key concepts for the note, shown as a percentage
- Paste text directly as an alternative to file upload
- Panic mode: "Exam in one hour" limits flashcards and quiz to the 10 most central concepts

How many of these are built depends on the course deadline (see Open Questions).

**Explicitly out for v1:**
- Legacy Word `.doc` files, scanned PDFs, and non-text material (audio, video, lecture recordings)
- Rendering the original PDF or Word layout; the app shows the extracted text
- Free-text quiz answers and grading by a language model
- User accounts, multi-user and sharing features
- Spaced-repetition scheduling beyond the three mastery states (v1's states work as a three-box Leitner-lite)
- Audio recaps and video recommendations (see Vision)

## Technical Direction

- **Language model**: one provider of large language models (LLMs) via API, with structured JSON output validated in code. The concrete provider, model, and cost estimate are chosen and justified in the architecture document.
- **Backend proxy**: a small backend without a database forwards calls to the language model, so the API key stays on the server and user data stays in the browser.
- **Runnable without the developer's key**: demo mode with stored responses for a sample note; otherwise, the user supplies their own key via `.env` (never committed; `.env.example` in the repo).
- **Test data**: reference notes that are allowed to be shared publicly, each with a list of expected key concepts. Recorded LLM responses (fixtures) for these notes serve demo mode, an offline fallback, the exam presentation, and automated tests in CI.

## Open Questions

- What is the exact deadline for the course deliverable? It decides how much of the "Should" list is built.

## Vision

If the core loop works well, the next step is depth rather than breadth: the "Should" items above, and later a real spaced-repetition schedule that decides *when* a known concept comes back. Further out, the same material could be offered in other formats — a podcast-style audio recap, or recommendations for existing videos that explain a topic or a missed quiz question. These require extra external services and are deliberately left out of v1, which is about proving the core loop: upload → core → test → repeat what is shaky.

## Sources

- Research on the solution steps, competitors, and retrieval practice: `.docs/planning-artifacts/research/technical-learning-assistant-solution-steps-2026-10-29/research.md`
- Brainstorm that added grounding, mastery state, the proxy, and the "Should" list (2026-10-29): `.docs/brainstorming/brainstorm-product-brief-g75-2026-10-29/brainstorm-intent.md`
- Review of this brief (2026-11-05, `bmad-review`: adversarial, edge-case-hunter, structure, prose); detailed edge cases are carried into the PRD: `review-findings-for-prd-2026-11-05.md`
