# Competitive digest, round 1 (2026-10-29)

Scope: the planned loop is (1) upload notes, (2) AI picks the central ~20% and makes a summary, flashcards and quiz with per-item source links, (3) flashcard review with "explain simpler", (4) scored quiz, (5) retry only the wrong answers; no login. This round checks Quizlet, Anki, NotebookLM, Knowt, Gizmo, StudyFetch and some small no-signup tools.
Accessed for all sources: 2026-10-29. Rule: official help or plan pages count as truth; third-party pages are labelled and given lower confidence.

## Competitor x step matrix

| Competitor | 1 Upload | 2 Focused extract + summary + cards + quiz, source-linked | 3 Card review + explain | 4 Scored quiz | 5 Retry wrong only | Login | Price |
|---|---|---|---|---|---|---|---|
| NotebookLM (now also branded "Gemini Notebook") | yes [N1] | partial: flashcards + quizzes + reports, with difficulty, count and a free-text "focus" prompt [N2]; no fixed 80/20 rule; per-item citations only via Explain (secondary sources) [N5] | yes: "Explain" button [N2]; "simpler" only through the prompt | partial: results screen + hints; scoring not documented [N2] | yes for flashcards ("Only cards you missed") [N2][N3]; quiz offers "review or retake" [N2] | Google account required [N1][N6] | free tier, about 10 flashcard/quiz generations a day (unverified); AI Pro $19.99/mo [N4] |
| Quizlet | yes, notes/docs to Study Guides (formerly Magic Notes) [Q1] | partial: outline of main points + flashcards + practice [Q1]; no per-item source link found | partial: Q-Chat tutor is Plus-only [Q2]; no explain-simpler button found | yes: Practice Test [Q1] | yes: "wrong-only retries" (third-party) [Q1] | not verified | Plus about $7.99/mo or $35.99/yr; sources conflict [Q2][Q3] |
| Anki + AI add-ons | partial: PDF via add-ons and scripts (PDF2Anki, ankirai, autoanki) [A1] | partial: cards only; no summary or quiz; no source link found | no explain found | no native scored quiz found | built-in spaced repetition is known, but no evidence was fetched this run (unverified) | not verified | add-on prices not verified |
| Knowt | yes: PDF, video, image, PPT summarizers (paid) [K1] | partial: summaries (Ultra), notes to flashcards; no source link found | partial: Kai tutor; free "custom hints" on cards [K2] | partial: practice test (third-party) [K2] | partial: Learn mode (details not verified) | sign-up shown; whether it is required was not verified [K1] | Basic free; Ultra $149.99/yr (shown as $12.99/mo) or $24.99/mo [K1] |
| Gizmo | yes, PDF (third-party) [G1] | partial: cards + quiz | partial: AI tutor, 5 sessions/day free [G1] | yes, with a heart/lives model [G1] | not verified | not verified | about $6.99/mo; sources conflict [G1] |
| StudyFetch | yes, PDF [G1] | partial | partial: AI tutor | partial | not verified | not verified | about $5/mo Premium; sources conflict, no pricing page [G1] |
| Small no-signup tools (PanQuiz, Web-Highlights, flashcards.world, SlideSpeak, StudyX) | yes, PDF/Word, small caps [S1] | partial: cards (PanQuiz also has a quiz); free cap of about 10 cards | no explain found | PanQuiz quiz mode [S1] | not found | **no login** [S1] | free with small caps [S1] |

## Claims

| Claim | URL | Publisher | Pub date | Accessed | Confidence | Class |
|---|---|---|---|---|---|---|
| [N1] Flashcards/quizzes are Studio outputs; flashcards may be generated automatically when sources are added; a publicly shared notebook requires sign-in; the page is titled "Gemini Notebook" | https://support.google.com/notebooklm/answer/16206563 | Google Help | undated (©2026) | 2026-10-29 | high | feature |
| [N2] Customization: difficulty, count, free-text prompt (focus/audience/style); "Explain" button; quiz hints; Got it/Missed it; progress saved; end results with "Same / All / Only cards you missed"; review or retake; CSV export; scoring and citations not documented | https://support.google.com/notebooklm/answer/16958963 | Google Help | undated (©2026) | 2026-10-29 | high | feature |
| [N3] Apr 23 2026 update: save progress, mastered vs needs-review tracking, rerun missed cards, synced through the Google account | https://pasqualepillitteri.it/en/news/1391/notebooklm-april-2026-update-auto-label-flashcards | pasqualepillitteri.it (cites @GoogleForEdu) | 2026-04-25 (older than 3 months) | 2026-10-29 | medium | feature |
| [N4] Free tier about 10 flashcards/quizzes per day; AI Pro $19.99/mo; limits subject to change; compute-based limits from May 2026 | https://support.google.com/notebooklm/answer/16213268 (via search snippet) + elephas.app / freeacademy.ai | Google Help + third-party | undated | 2026-10-29 | low-medium (official column labels unclear) | pricing |
| [N5] Explain gives an answer grounded in the sources, with citations, for cards and quiz items; flashcards fully editable since Jun 22 2026 | https://9to5google.com/2025/09/08/notebooklm-flashcards-quizzes/ ; https://pasqualepillitteri.it/en/news/5978/notebooklm-flashcards-customizable-shareable | 9to5Google; pasqualepillitteri.it | 2025-09-08 (older than 3 months); ~2026-06 (older than 3 months) | 2026-10-29 | medium (secondary, no official doc) | feature |
| [N6] NotebookLM requires a Google account; "every card cites the source passage" | https://aisotools.com/blog/best-ai-flashcard-generators-2026 | aisotools (comparison page, may overclaim) | updated May 2026 (older than 3 months) | 2026-10-29 | low-medium | feature |
| [N7] Flashcards/quizzes launched in NotebookLM in Sep 2025; the official blog mentions topic, difficulty and count customization | https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-app-quizzes-flashcards/ | Google Blog | 2025-11-06 (older than 3 months) | 2026-10-29 | high | feature |
| [Q1] Study Guides (formerly Magic Notes): upload notes/docs, then outline + flashcards + practice; Practice Test supports wrong-only retries | https://tech.yahoo.com/general/articles/quizlet-160943143.html ; https://fabric.so/comparison/best-ai-study-app | Yahoo Tech; Fabric (comparison page) | undated | 2026-10-29 | medium-low (official help returned 403) | feature |
| [Q2] Plus $7.99/mo or $35.99/yr; Q-Chat is Plus-only | https://dupple.com/learn/best-ai-study-tools ; dev.to Q-Chat review | Dupple; dev.to | 2026 (month unclear) | 2026-10-29 | low-medium | pricing |
| [Q3] Price claims conflict (about $3/mo annual; Plus Unlimited $44.99/yr) | https://nibble-app.com/blog/quizlet-cost | Nibble (competitor blog) | 2026 | 2026-10-29 | low | pricing |
| [Q4] Trustpilot 1.4/5 in 2026, driven by paywall complaints | https://tooldirectory.ai/tools/quizlet | tooldirectory.ai | 2026-07-25 | 2026-10-29 | low | sentiment |
| [A1] AI card generation for Anki goes through third-party add-ons and scripts (PDF2Anki 3.0 from Feb 2024; ankirai CLI PDF to .apkg; autoanki via OpenAI) | https://github.com/jqhoogland/autoanki ; https://pypi.org/project/ankirai ; https://hunted.space/product/pdf2anki-3-0 | GitHub; PyPI; Hunted | 2024 to undated (stale) | 2026-10-29 | medium | feature |
| [K1] Basic free (no AI features listed); Ultra $149.99/yr (shown as $12.99/mo) or $24.99/mo; Ultra adds AI summarizers for PDF/video/image/PPT, lecture recorder, AI voice tutor | https://knowt.com/plans | Knowt (official) | undated | 2026-10-29 | high | pricing |
| [K2] Free plan includes notes, flashcards, free study modes, custom hints; free AI caps disputed (from "unlimited" to "monthly cap") | https://toolradar.com/tools/knowt/pricing ; https://tooliverse.ai/tools/knowt | toolradar; tooliverse | 2026-10-13 (toolradar) | 2026-10-29 | low-medium | pricing |
| [G1] Gizmo: hearts (15 on free), 5 AI tutor sessions/day free, about $6.99/mo; StudyFetch: about $5/mo Premium, no public pricing page | https://topai.tools/compare/gizmo-vs-study-fetch ; https://tldv.io/blog/studyfetch-review/ | topai.tools; tl;dv | 2026 (month unclear) | 2026-10-29 | low | pricing |
| [S1] No-signup PDF to flashcard tools exist: PanQuiz (5 pages, 10 MB, 10 cards, quiz mode), Web-Highlights (on-device, 30 MB), flashcards.world (1 deck of 10), SlideSpeak, StudyX | https://panquiz.com/en/tools/pdf-to-flashcards/ ; https://web-highlights.com/tools/pdf-flashcard-generator | vendor pages | undated | 2026-10-29 | medium (vendor claims) | feature |

## Leads
- An official NotebookLM page that documents citations in Explain, and how quizzes are scored (not found in the help center).
- The Quizlet help center blocks fetching (HTTP 403). Verify Study Guides formats and free caps manually.
- Knowt: which AI features remain on the free tier (the plans page lists none).

## Looked for but not found
- Any tool that explicitly limits extraction to the "most central 20%" or uses 80/20 framing.
- Any tool where every flashcard or quiz item shows a visible, clickable link to its source passage (the closest are NotebookLM's Explain citations and Evernote's card-back references).
- An "explain simpler" button (NotebookLM's Explain does not specify the level).

## Differentiator verdict (round 1)
- **80/20 focus:** partly occupied. No product markets it, but NotebookLM's free-text focus prompt and count setting [N2] and Quizlet's "main points" outline [Q1] make it something a user can get with a prompt. It is weak as a standalone claim.
- **Closed loop in one tool:** occupied. NotebookLM covers upload, cards and quiz, Explain, results, and "only cards you missed" in one free tool [N2][N3]. Quizlet covers most of it behind Plus.
- **Source-traceable items:** partly occupied. NotebookLM's Explain returns citations (secondary sources only [N5][N6]). No one was found showing a visible per-item source link by default.
- **Not claimed, but a real gap:** no-login use. All the major tools require an account; only small, capped tools work without signup [S1].
