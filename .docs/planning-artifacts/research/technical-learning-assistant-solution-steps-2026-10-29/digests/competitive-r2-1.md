# Competitive digest, round 2 (2026-10-29)

Round 2 targeted the gaps left by round 1: citations in NotebookLM Explain, per-item source links across the market, and Quizlet and Knowt free-tier caps. These results are already merged into the matrix in competitive-r1-1.md (refs N5, N6, Q3, K2). This file records the round-2 evidence and the final verdict. Accessed for all: 2026-10-29.

## Matrix delta (vs r1)

| Competitor | Step 2 source link | Step 3 explain | Change |
|---|---|---|---|
| NotebookLM | partial, upgraded: Explain shows citations back to the sources for cards and quiz items (secondary sources) | yes | per-item traceability exists, but only on demand (one click), not as a visible link by default |
| Evernote AI flashcard generator | partial: source references (slide number, chapter, DOI) on the card back | no evidence | new competitor for traceability |
| RemNote | no: a user feature request asks to see the source PDF side by side with AI cards | no evidence | evidence that the gap exists |
| Quizlet | no evidence | Plus-only Q-Chat | free upload cap still unverified |
| Knowt | no evidence | Kai (paid) | free AI caps still disputed |

## Claims

| Claim | URL | Publisher | Pub date | Accessed | Confidence | Class |
|---|---|---|---|---|---|---|
| NotebookLM Explain gives an answer grounded in the sources, with citations, and opens the source in the chat area; works for wrong quiz answers too | https://9to5google.com/2025/09/08/notebooklm-flashcards-quizzes/ ; https://chromeunboxed.com/massive-notebooklm-update-adds-ai-powered-flashcards-quizzes-and-a-personal-tutor-mode/ | 9to5Google; Chrome Unboxed | 2025-09 (older than 3 months) | 2026-10-29 | medium | feature |
| After cards became editable (Jun 22 2026), Explain still uses source references | https://pasqualepillitteri.it/en/news/5978/notebooklm-flashcards-customizable-shareable | pasqualepillitteri.it | ~2026-06 (older than 3 months) | 2026-10-29 | medium | feature |
| NotebookLM: "Every generated card cites the specific source passage"; Google account required | https://aisotools.com/blog/best-ai-flashcard-generators-2026 | aisotools (comparison page) | updated May 2026 | 2026-10-29 | low-medium (comparison page, may overclaim) | feature |
| Evernote's AI flashcard generator puts source references (slide numbers, chapters, DOIs) on the card back | https://evernote.com/chat-with-ai-assistant/ai-flashcard-generator-for-universities | Evernote (marketing) | undated | 2026-10-29 | low-medium | feature |
| RemNote users are asking to see the source PDF next to AI flashcard generation to check quality | https://feedback.remnote.com/p/make-it-easier-to-check-sources-for-ai-generated-flashcards | RemNote feedback board | undated | 2026-10-29 | medium | sentiment |
| Quizlet: Magic Notes renamed Study Guides; Plus $35.99/yr or $7.99/mo; free upload cap not published | https://tech.yahoo.com/general/articles/quizlet-160943143.html ; https://nibble-app.com/blog/quizlet-cost | Yahoo Tech; Nibble | 2026 | 2026-10-29 | low-medium | pricing |
| Knowt: AI cards "a bit too wordy"; older report that the AI misses 10 to 20 terms when converting a PDF | https://tooliverse.ai/tools/knowt ; r/knowt (2022, stale) | tooliverse; Reddit | 2026; 2022 | 2026-10-29 | low | sentiment |
| NotebookLM is reportedly renamed "Gemini Notebook" (Jul 2026); the help page title confirms the "Gemini Notebook" branding | https://support.google.com/notebooklm/answer/16206563 | Google Help | undated | 2026-10-29 | high (title) / medium (date) | feature |

## Leads
- Test NotebookLM by hand: does a citation appear on the card itself, or only after Explain? Can Explain be asked to "explain simpler"?
- Check the Evernote and RemNote card-source features in their official docs.

## Looked for but not found
- An official Google document describing citations in flashcards or quizzes.
- Any tool with 80/20 or "most important 20%" extraction as a product feature.
- A major tool that runs without an account.

## Differentiator verdict (final)
- **80/20 focus:** partly occupied. No competitor markets it, but NotebookLM (count + focus prompt, official) and Quizlet ("main points" outline) can be steered toward it. It can only defend the product if the selection is visibly explained (for example, "why this is central").
- **Closed loop in one tool:** occupied. NotebookLM documents upload, cards and quiz, Explain, results, and retry missed, free with a Google account. Quizlet covers most of it behind Plus.
- **Source-traceable items:** partly occupied. NotebookLM gives citations on demand through Explain (secondary sources); Evernote puts references on the card back. A visible, clickable source passage on every card and quiz item by default was not found. This is the strongest remaining angle, together with no login.
- **Additional angle (unclaimed):** no login plus progress stored in the browser. The majors require accounts; only small tools capped at about 10 cards work without signup.
