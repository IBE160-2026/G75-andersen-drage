---
title: Product Brief
status: draft
created: 2026-09-24
updated: 2026-09-24
---

# Product Brief: AI-Based Learning Assistant for Students

*Working title — no product name chosen yet.*

## Executive Summary

Students spend a large share of study time not learning new material but reprocessing what they already have — turning lecture notes and reading material into something they can actually review, test themselves on, and remember. This is slow, repetitive work that AI is well suited to help with, yet most students currently do it by hand or by improvising with general-purpose tools like ChatGPT.

This project is an AI-based learning assistant: students upload their own notes or course material, and the application generates study aids from it — summaries, flashcards, and quiz questions, with a podcast-style audio recap as a stretch goal. The app is explicitly a *supplement*, not a replacement for studying — it supports active learning and repetition rather than doing the learning for the student.

It is also the deliverable for IBE160 (Programming with AI, Høgskolen i Molde), so it doubles as a demonstration of applying AI meaningfully in both the *product* (AI-generated study aids) and the *process* (AI-assisted development, testing, and quality assurance). `[ASSUMPTION]`

## The Problem

Turning raw course material into something you can actually study from — a summary, flashcards, self-test questions — is manual, repetitive, and easy to put off. Students often:

- Re-read notes passively instead of testing themselves, which is a weaker way to retain material
- Spend disproportionate time formatting/organizing notes rather than actually studying
- Improvise with general AI chat tools ad hoc, with no consistent format and no dedicated study workflow

The cost is time lost to low-value repetition and, for some students, avoiding review altogether because the up-front effort of preparing study material feels too high.

## The Solution

A focused web application `[ASSUMPTION: form factor]` where a student uploads their own notes or course material and gets back:

- **Summaries** of the uploaded material
- **Flashcards** for spaced repetition
- **Quiz questions** to self-test understanding
- **Audio recap** in a podcast-style conversational format *(stretch goal, not core v1)*

The experience is deliberately narrow: one upload, multiple study formats, generated directly from the student's own material rather than generic pre-made content — so what comes out is actually relevant to what they're studying.

## What Makes This Different

General AI chat tools (ChatGPT) and note tools (NotebookLM) can already produce summaries or Q&A ad hoc, and dedicated apps (Quizlet, Anki) already do flashcards well. The honest differentiator here is not a unique underlying capability — it's:

- **One integrated workflow** purpose-built for exam prep from a student's own material, instead of stitching together several separate tools by hand
- **The deliverable itself**: this is a built application, not a prompt technique — for IBE160 the value is in demonstrating the engineering (uploads, generation pipeline, testing, AI-assisted dev process), not in inventing a capability that doesn't exist elsewhere `[ASSUMPTION]`

This is not a moat in a commercial sense, and the brief should not pretend otherwise — the differentiator is fit and integration, not novel AI capability.

## Who This Serves

**Primary user**: students who have their own notes/course material and want to convert it into review-ready study aids without manually building flashcards or quiz questions by hand. `[ASSUMPTION: no institution- or course-specific targeting yet — assumed general student audience, with Tor and IBE160 peers as the natural first test users]`

Success for this user looks like: upload material once, get usable study aids back quickly, and use them to actually test their own recall — not just re-read a summary.

## Success Criteria

`[ASSUMPTION — course grading criteria not yet confirmed]`

- The application reliably takes uploaded notes and produces a summary, flashcards, and quiz questions that are recognizably grounded in the uploaded content (not generic/hallucinated)
- A student (Tor, as first user) can go from "just uploaded notes" to "actively reviewing generated flashcards/quiz" in a few minutes
- The project documents how AI was used across both the product and the development process, satisfying IBE160's course objectives
- Delivered solo, within the course timeline

## Scope

**In for v1:**
- Upload notes/course material
- Generate summary
- Generate flashcards
- Generate quiz questions

**Stretch, if time allows:**
- Podcast-style audio recap

**Explicitly out for v1** `[ASSUMPTION]`:
- Multi-user/collaboration features (sharing decks, class-wide content)
- Spaced-repetition scheduling algorithms (beyond basic flashcard review)
- Support for non-text source material (e.g., video/lecture recordings) unless notes are already text

## Open Questions

These were deferred to assumptions for this draft and should be resolved as the idea firms up:

- Does IBE160 mandate a specific tech stack, deliverable format, or grading rubric that should shape scope or architecture?
- Is there a narrower target user (e.g., a specific course's pensum) worth designing around, or should this stay general-purpose?
- What's the actual timeline/deadline for the course deliverable?

## Vision

If this works well as a course project, the natural next step is less about scope growth and more about depth: better grounding of generated content in the source material, a review workflow that adapts to what the student actually gets wrong (rather than static flashcards), and possibly extending beyond text notes to other study material formats. But that is future scope — v1 is about proving the core loop: upload → generate → actively review.
