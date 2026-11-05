---
title: Input reconciliation — brief vs PRD
input: ../../briefs/brief-G75-andersen-drage-2026-09-24/brief.md
compared: prd.md, addendum.md (2026-11-05)
created: 2026-11-05
---

# Reconciliation: Product Brief → PRD

Scope: content in the brief that the PRD or addendum drops without saying so, contradicts or weakens. Changes the PRD made on purpose and logged as decisions are **not** flagged: paste text and the Readiness Score moved into v1 (D1), exact-match Quote Check (D3), no automatic regeneration (D4), long Notes rejected (D7), plus one-time Consent (D8) and the cache key (D2). Where a logged decision still leaves a related gap, the gap is described on its own terms.

Severity: **High** = it hurts how the deliverable is positioned or graded, or downstream docs will lose it. **Medium** = useful content is lost or blurred. **Low** = wording or rationale only.

---

## G1. Competitive positioning and differentiators dropped (High)

- **Input says** (brief §"What Makes This Different", l.42–50): ChatGPT, Quizlet and Anki already do summaries and flashcards well. NotebookLM already offers the *whole loop*, free, and with citations, so "a closed study loop is not what sets this app apart". It names three differentiators: (1) a **verified** source passage on every item, shown **by default**, checked in code; (2) **no account**, compared with NotebookLM/Quizlet (account needed) and Anki (no AI); (3) the **80/20 profile throughout**. It closes with: "This is not a moat in a commercial sense. Its value lies in fitting one specific situation — and, for IBE160, in the engineering behind it."
- **PRD says/lacks:** there is no competitor or differentiation section. NotebookLM, Quizlet and ChatGPT are never named. Anki appears only once, under Non-Users. The three differentiators are present only as features (FR-12 "Quote visible without any extra click", FR-21 no account, SM-C1). Nothing marks them as *the reasons the product exists*, so UX and architecture may treat "Quote by default" as an ordinary detail and trade it away. The honest "not a moat" framing is gone. The course feedback (`tilbakemelding-product-brief.md` point 2) praised exactly this honesty.
- **Suggested fix:** add a short §1.1 "Positioning". State that the loop itself is not unique (NotebookLM). List the three differentiators and link each one to its FR/SM (FR-9/FR-12/SM-2, FR-21/UJ-1, FR-6/FR-7/SM-C1). Keep the "not a moat; value in fit and engineering" sentence. Mark FR-12's "by default" as differentiator-critical, so it cannot be traded away in UX.

## G2. 80/20 framed as a design choice, not research, is lost; the "20%" reads literally (High)

- **Input says** (brief l.48): "The 80/20 limit is a design choice, not a research finding — the app's learning value rests on self-testing, which is well documented." The problem section (l.24) also places the learning value in self-testing as opposed to passive re-reading.
- **PRD says/lacks:** §1 says the app "turns the most central 20% into a short summary…". This presents 20% as a measurable quantity, with no caveat that 80/20 is a heuristic. No requirement defines what "20%" means: FR-6 uses 5–15 concepts, and FR-7 uses a 25% summary cap. The claim that self-testing (retrieval practice) is the real basis for learning value is missing. An examiner could ask "where is the evidence for 80/20?" and the PRD gives no answer.
- **Suggested fix:** in §1, reword to "the most central content (an 80/20 *design choice*, not a research claim)" and add one sentence: "The learning value rests on self-testing and repetition (retrieval practice), which is well documented (research.md)." Optionally add a glossary entry, "80/20 profile = output deliberately capped by FR-6/FR-7 limits", so that "20%" is not read as a metric.

## G3. Problem statement dropped (Medium)

- **Input says** (brief §"The Problem", l.20–28): students re-read passively, which is weaker than self-testing. They spend time formatting notes. They use general AI chat ad hoc, "no consistent format, no focus on what is central, no way to repeat what they got wrong". The cost is lost time, and some skip review altogether because the up-front effort feels too large.
- **PRD says/lacks:** only the one-line hook in §1 ("rarely lack material…"). SM-6 says it "validates the problem statement", but the PRD has no problem statement for it to validate. §0 says the PRD "does not repeat" the brief, but SM-6 and the JTBD now point at content that is no longer in the document.
- **Suggested fix:** add a 3–4 bullet "Problem" paragraph under §1, or have SM-6 point explicitly to brief §"The Problem". Make SM-6 test the specific claims: time to the first self-test, compared with organizing by hand.

## G4. Future direction weakened: spaced repetition becomes a permanent non-goal (Medium)

- **Input says** (brief §Vision, l.117–119): the next step is "depth rather than breadth": first the Should items, "later a real spaced-repetition schedule that decides *when* a known concept comes back". Further out come audio recaps and video recommendations. v1 is about "proving the core loop: upload → core → test → repeat what is shaky".
- **PRD says/lacks:** §1 is titled "Vision" but is a product summary with no future direction. §7 states without qualification "It is not a spaced-repetition scheduler", and §2.2 sends such users to Anki. Together these read as a permanent stance, which contradicts the brief, where it is the planned next step. The "depth over breadth" principle and the one-line loop formula are both dropped. Audio and video survive only as an out-of-scope bullet.
- **Suggested fix:** qualify §7 as "not a spaced-repetition scheduler **in v1**". Add a short "Beyond v1" note: depth before breadth, a real SR schedule next (the Leitner-lite states from FR-17 are the foundation), audio and video later because they need extra services. Optionally quote the loop formula in §1.

## G5. Fixture uses narrowed: offline fallback and exam presentation dropped (Medium)

- **Input says** (brief §Technical Direction, l.111): fixtures for **the reference notes** serve "demo mode, an offline fallback, the exam presentation, and automated tests in CI".
- **PRD says/lacks:** FR-23 covers Demo Mode for **one sample note** only. DR-2 covers tests. The PRD never says whether the sample note is one of the DR-3 reference notes, or whether fixtures exist for all reference notes. Using fixtures as an offline fallback when the provider or network fails (FR-11 only shows a retry error), or as a safety net during the exam presentation, is not mentioned.
- **Suggested fix:** in FR-23 or DR-3, state that the sample note is one of the reference notes, and that recorded fixtures are kept for every reference note. Add a one-line delivery note (a DR or a §8 remark) that Demo Mode is the fallback for the live presentation. Decide explicitly whether an offline fallback for live use is in or out of scope.

## G6. Key Concept stability across sessions weakened (Low, partly deliberate)

- **Input says** (brief Success Criteria l.64 and l.69): "the key concepts for a note stay the same between rounds and sessions", and a returning student "continues with the same key concepts and mastery states".
- **PRD says/lacks:** FR-6 qualifies this with "for the same cache key". FR-4 and §11 accept that a prompt or model change may change concept IDs and drop progress. This follows from D2, but the effect on users is new: progress can be lost silently when the developer changes a prompt. FR-21 requires visible notices for data loss caused by storage problems, but not for this case.
- **Suggested fix:** keep D2, but add a consequence to FR-4: when regeneration drops progress for any concept, the student sees a notice (consistent with FR-21's "never silent"). State in the README or DR-1 that prompt and model changes reset progress for changed concepts.

## G7. Rationale for bringing known concepts back is gone (Low)

- **Input says** (brief l.38): known concepts return "rather than being dropped (retrieval-practice research shows that dropping items after one correct answer sharply reduces long-term retention)".
- **PRD says/lacks:** FR-18 keeps the rule (about 20% known concepts, at least 1) without the reason. Someone tuning later could cut it as waste, since SM-C1 favours fewer Items.
- **Suggested fix:** add a one-line rationale to FR-18 with a pointer to research.md.

## G8. Minor wording and framing losses (Low)

- **"Am I ready?"**: the brief's user-facing framing of the Readiness Score (l.92) is missing from FR-19. Suggest keeping it as candidate UI copy for UX.
- **"ELI5"**: the brief's label for Explain Simpler (l.36) is dropped. This is harmless, but UX may want the reference.
- **AI in the process**: the brief lists planning, development, testing and QA (l.18). PRD §1 says only "development process". DR-4 and DR-5 cover this in practice. Suggest using the brief's fuller list in §1.
- **"Does not prove correctness" towards the student**: the brief (l.46) frames the Quote as letting "the student check every item against their own source". PRD §7 keeps the caveat as a non-goal, but no FR or UX note tells the *student* that a Quote shows where an item comes from, not that it is correct. Consider an optional UX note.
- **Should list changed**: PRD adds FR-22 Export/import as a Should. It is in neither the brief nor the decision log in the PRD. This is an addition, not a gap, but it should be traced to a source (review finding or decision).

---

## Checked and consistent (no action)

"Supplement, not replacement" (PRD §1 and §7). Supported formats and exclusions. Quote by default and highlighting (FR-12). Language of output (FR-7, NFR-9). JSON validation (FR-8). Mastery states and Leitner-lite (FR-17). Readiness and Panic definitions. Consent before sending (FR-5). Key and no retention in the Proxy (NFR-1, NFR-2). README and demo for the examiner (DR-1, FR-23). Reference notes with at least one in Norwegian (DR-3). Deadline. Sources (PRD §0 lists all brief sources and adds the grading guide).
