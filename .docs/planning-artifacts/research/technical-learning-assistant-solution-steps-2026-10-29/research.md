---
title: 'Research: the five Solution steps of the AI learning assistant'
type: 'technical + academic-lit + competitive'
topic: 'Solution steps (upload, 80/20 core, flashcards + ELI5, scored quiz, repeat wrong answers, local storage)'
decision: 'Validate the five Solution steps in the product brief, inform the architecture document, and test the claimed differentiation'
source: 'native run (parallel web research, 3 researchers + 1 verifier)'
status: complete
claims_verified: 6
claims_unverified: 9
claims_overturned: 0
preset: 'standard'
validation: 'normal'
created: '2026-10-29'
updated: '2026-10-29'
---

# Research: the five Solution steps of the AI learning assistant

**Decision this research serves:** whether the five steps in *The Solution* (brief, 2026-10-29) hold up — technically, against learning research, and against existing tools — and what the architecture document should take from it.

## Executive summary

**The loop is technically straightforward and well grounded in learning research, but two parts of the brief need changing: the "repeat only wrong answers" rule and the differentiation claim.**

1. **Buildable with few dependencies.** All four file formats can be extracted in the browser (PDF.js/unpdf, mammoth) [18][19][16]. All three major LLM providers offer schema-constrained JSON [22][23][24], and Haiku 5.5 costs fractions of a cent per note [25]. localStorage is enough for saving progress [28]. One constraint shapes the design: Anthropic's built-in Citations cannot be combined with structured output [26]. Traceability therefore has to be done as a chunk ID plus a word-for-word quote, checked in code.
2. **Self-testing is the strongest part, and the summary the weakest.** Practice testing beats re-reading (g ≈ 0.50) [1][2], and summaries are rated low-utility [3]. However, dropping correctly answered questions from testing cuts one-week recall from ~80 % to 33–36 % [6]. Step 5 should bring wrong answers back *first*, not *only* wrong answers.
3. **The "closed loop" is no longer unique.** NotebookLM documents the same loop, including Explain and "Only cards you missed", free with a Google account [30]. What remains open is a **visible, code-verified source passage on every item** and **use without login** [33][36][38].

**Biggest caveat:** the 80/20 principle and "Explain simpler" have no empirical evidence behind them in learning research. Present them as design choices, not research-backed claims.

## 1. Technical: how each step can be built

### Step 1 — Upload and text extraction

All four formats can be extracted **in the browser**, so the server never has to touch the file:

- **PDF:** PDF.js is actively released roughly monthly (v6.4.299, 2026-10-03) [18]; `unpdf` wraps the same PDF.js build with a simple `extractText()` API for browsers and Node, MIT-licensed [19] (version/date not shown — medium confidence).
- **.docx:** `mammoth` `extractRawText` returns plain text in Node or browser [16]; latest npm version 1.13.0 [17] (date inferred, medium). Its README warns that some documents cause high CPU/memory and recommends a worker + timeout for untrusted input [16].
- **.txt / .md:** read directly with the browser's `File.text()` (standard API; not separately sourced).
- **Python alternative**, if a backend exists anyway: pypdf 6.21.4 (BSD) [41]; PyMuPDF is AGPL — a licence to note.

Known pitfalls that are properties of PDF, not of any one library: reading order may differ from visual order, ligatures (ﬁ, ﬀ) and whitespace are unreliable, and image-only pages yield no text [20][21]. No library does OCR [20], so a near-empty extraction should be treated as a scanned PDF and rejected — which matches the brief's "out of scope: scanned PDFs". **Normalise text (Unicode NFKC, rejoin hyphenated line breaks, collapse whitespace) before chunking** — this also matters for step 2's quote check.

### Step 2 — Structured JSON from the LLM

All three major providers now offer **schema-constrained output** with Zod/Pydantic helpers: Anthropic `output_config.format` (GA) [22], OpenAI `strict` JSON schema [23], Gemini `response_format` [24]. This fits the brief's success criterion "fixed JSON format validated in code" directly. Still required in code:

- handle `refusal` and `max_tokens` stops, which can return non-conforming or truncated output [22][23];
- re-validate locally: Anthropic rejects some constraints (no min/max length, `minItems` only 0/1) [22], and Gemini silently strips length constraints [24];
- retry once, then show a clear error.

**Cost:** the cheap model tiers of all three providers cost about the same. Standard tier, USD per million tokens, from the official pricing pages (accessed 2026-10-29):

| Provider | Model | Input | Output | Conditions |
|---|---|---|---|---|
| Anthropic | Haiku 5.5 | $0.10 | $0.50 | prompts ≤ 100k tokens; $0.50 / $2.50 above [25] |
| OpenAI | `gpt-6-luna` | $0.10 | $0.50 | ≤ 272k input tokens; $0.20 / $0.75 above [42] |
| OpenAI | `gpt-5-nano` | $0.05 | $0.40 | older generation, cheapest listed [42] |
| Google | `gemini-3.1-flash-lite` | $0.25 | $1.50 | paid tier [43] |
| Google | `gemini-2.5-flash-lite` | $0.10 | $0.40 | paid tier, older generation [43] |
| Google | `gemini-3.6-flash` / `3.8-flash` | $0.75 | $3.75 | **doubles to $1.50 / $7.50 from 2027-01-01** [43] |

A typical note (about 5k tokens in and 3k tokens out per generation) costs about **$0.002** on Haiku 5.5 or `gpt-6-luna`. Cost does not decide the choice; output quality, structured-output support and the traceability constraint above do. Two points for the architecture doc:

- **Gemini has a free tier** [43]. However, the page gives no numeric limits, and content on the free tier is used to improve Google's products, while for most models the paid tier isn't. That conflicts with the brief's notice that notes are sent to an external model. It's fine for development against demo notes, but not for real students' notes without saying so.
- **Prices change on announced dates.** Gemini 3.6/3.8 Flash double on 2027-01-01, and GPT-5.6 Sol's promotional price runs "at least through November 21, 2026" [42][43]. Re-check before the architecture doc is final.

Output quality was not compared in this research. The prices above were transcribed from the pricing pages with a page-summary tool, so check the chosen model's row by eye before quoting it in the report.

### Step 2b — Source traceability

This is the most important technical finding: **Anthropic's Citations feature (guaranteed character offsets into the source) cannot be combined with structured outputs — the API returns HTTP 400** [26]. So the app must choose.

Recommended pattern: split the normalised text into numbered chunks; the model returns `chunk_id` + a verbatim `quote` for each flashcard/question inside the structured JSON; the code then checks the quote against the source — exact match after normalisation = verified, high-threshold fuzzy match = "weak", otherwise drop or regenerate [27] (practitioner evidence, low confidence; the pattern itself is simple string matching). This makes the success criterion "**every** item linked to its passage" testable in code rather than trusted to the model.

### Local storage of progress

Progress (scores, wrong answers) is a few KB: `localStorage` (~5 MiB per origin, throws `QuotaExceededError` when full) is enough [28]. IndexedDB via the ~1.2 kB `idb` wrapper only if whole documents or generated sets are stored [29]. Caveat for the README: browser storage is best-effort — Safari can delete script-written storage after 7 days without interaction, and private windows lose it at session end [28]. A JSON export/import is a cheap safeguard.

## 2. Academic: what the evidence says about the study loop

### Self-testing (steps 3–4) — strongly supported

Practice testing beats re-studying: g = 0.50 [0.42, 0.58] in Rowland's meta-analysis [1], g ≈ 0.50 across 222 classroom studies (bias-corrected 0.475) and g = 0.33 specifically against re-studying [2]. Dunlosky et al. rate practice testing as one of only two "high utility" techniques, and summarisation, highlighting and re-reading as "low utility" [3]. Re-studying feels better in the short term but loses at 2 days and 1 week [5]. This is the core justification for the app: **the quiz and flashcards are where the learning happens; the summary is the weakest part.**

### Feedback and repeating wrong answers (step 4–5) — supported, with one important correction

- Showing the correct answer after each question usually increases the effect (g 0.73 vs ≈0.39 [1]; 0.54 vs 0.37 [2]); one meta-analysis found no difference (0.63 vs 0.60) [4]. Either way, feedback does not hurt — the brief's "correct answer shown for each question" is right.
- **But "a new round with only the wrong answers" removes correctly answered questions from testing, and that is the condition the evidence warns against.** In Karpicke & Roediger, keeping recalled items in the tests gave ~80 % recall after one week; dropping them from testing gave 33–36 %. Dropping them from *re-study* cost nothing [6]. (One lab, word pairs — medium for generalisation.)
- The evidenced protocol is *successive relearning*: practise until correct, then return to the same items in later sessions [7] (largely one research group; treat exact parameters as a lead).

### LLM-generated material (step 2) — usable drafts, not trusted output

- LLM-made multiple-choice questions can approach human quality, but only with specific procedures and expert review [9][10]; weak distractors are a known failure [11] (preprint).
- The only learning-outcome study of AI-generated flashcards found no exam gain, though 74 % of students reported saving time [12] (preprint — low-medium).
- Summarisation hallucination is an active benchmark area [13]; no rate was verified this run.

### ELI5 and the 80/20 principle — no evidence base

- Generating answers yourself beats reading them (generation effect, d ≈ 0.40) [8]. Reading AI summaries showed no learning gain over transcripts in a 2025 study [14]. Evidence on simplified texts is mixed [15]. **No study was found on on-demand "explain simpler" buttons.**
- **No empirical test of the Pareto/80-20 principle in learning was found** — only practitioner blogs and conceptual articles. The brief should present 80/20 as a design heuristic (deliberately limited output for a student short on time), not as a research finding.

## 3. Competitors: how others cover the five steps

| Tool | 1 Upload | 2 Summary + cards + quiz | Source per item | 3 Explain | 4 Scored quiz | 5 Retry wrong | Login | Price |
|---|---|---|---|---|---|---|---|---|
| **NotebookLM / "Gemini Notebook"** | yes [31] | yes, with count, difficulty, free-text focus prompt [30] | via Explain, on demand [33] (secondary) | yes, "Explain" [30] | results screen; scoring not documented [30] | yes, "Only cards you missed" [30] | Google account [31] | free tier (~10 generations/day, unverified); AI Pro $19.99/mo [32] |
| **Quizlet** | yes, Study Guides (ex Magic Notes) [35] | outline + cards + practice test [35] | not found | Q-Chat, Plus only | yes [35] | reported [35] | account | Plus ≈ $7.99/mo, $35.99/yr — sources conflict [40] |
| **Knowt** | yes (AI summarisers on Ultra) [34] | partial | not found | Kai tutor (paid) | partial | partial | sign-up | Basic free (no AI listed); Ultra $149.99/yr or $24.99/mo [34] |
| **Anki** | via third-party add-ons (some stale) | cards only | not found | no | no | spaced repetition (not re-verified) | — | free |
| **Evernote AI flashcards** | yes | cards | references on card back [36] (marketing) | — | — | — | account | — |
| **Small no-signup tools** (PanQuiz etc.) | yes | ~10 cards cap [38] | no | no | PanQuiz quiz mode [38] | no | **none** | free, capped |

**Differentiator verdict** (against the brief's *What Makes This Different*):

| Claimed differentiator | Verdict | Why |
|---|---|---|
| Closed study loop | **Occupied** | NotebookLM documents upload → cards/quiz → Explain → results → retry missed, free with a Google account [30][39] |
| 80/20 profile | **Partly occupied** | Nobody markets it, but NotebookLM's count + focus prompt [30] gets a user close; defensible only if the app shows *why* an item counts as central |
| Traceable output | **Partly occupied — strongest remaining angle** | NotebookLM cites on demand via Explain [33]; Evernote puts references on the card back [36]; RemNote users ask for exactly this [37]. A visible, verified source passage on every item by default was not found |
| *(not claimed)* No login, progress in browser | **Unoccupied among the major tools** | All major tools require an account; only small capped tools work without one [38] |

## Cross-dimension insights

- **Traceability is where the technical work and the product's distinctive feature meet.** It is the strongest remaining differentiator against NotebookLM [33][36][37]. It is also the part that requires real engineering, because the provider's built-in citations are unavailable with structured output [26]. Code-side quote verification turns "every item is linked to its source" from a product promise into a testable success criterion. It also partly answers the academic finding that LLM-generated questions need checking before they are trusted [9][10].
- **The research favours the app's *test* half over its *summary* half.** Practice testing is high-utility, while summaries and passive reading of AI summaries show little or no learning gain [3][14]. NotebookLM and Quizlet already lead with summaries and study guides [30][35], so a quiz-first design is both better supported by the evidence and more distinct from them.
- **"Retry only wrong answers" is both the competitor feature [30] and the evidence-weak variant [6].** Keeping correctly answered items in later rounds improves the learning effect and moves the app away from NotebookLM's exact behaviour.

## Recommendations

| # | Recommendation | Consumes it | Confidence basis |
|---|---|---|---|
| R1 | Extract text in the browser (unpdf/pdfjs-dist, mammoth `extractRawText`, `File.text()`), normalise it, and reject near-empty PDFs as scanned | Architecture doc | high (primary docs [16][18][20]) |
| R2 | Use the provider's schema-constrained output and re-validate in code with Zod/Pydantic. Handle refusal and max_tokens stops, retry once, then show a clear error | Architecture doc; success criterion on JSON | high [22][23][24] |
| R3 | Traceability: numbered chunks, then `chunk_id` plus a word-for-word `quote` per item, checked in code (exact match = verified, fuzzy match = weak, otherwise regenerate). Do not plan on Anthropic Citations together with structured output | Architecture doc; brief's traceability criterion | high on the constraint [26]; low on fuzzy thresholds [27] |
| R4 | Change step 5 from "only the questions they answered incorrectly" to "wrong answers first, plus earlier correct ones in later rounds". At minimum, don't remove correct items permanently | **Brief: The Solution step 5 and Success Criteria** | high on the finding [6]; medium on generalisation (one lab, word pairs) |
| R5 | Rewrite *What Makes This Different*: drop "closed study loop" as a differentiator; lead with "every item shows a verified source passage" and "no account needed" | **Brief: What Makes This Different** | high that NotebookLM covers the loop [30]; medium that no one shows a verified passage by default (absence after 2 rounds) |
| R6 | Describe 80/20 and ELI5 as design heuristics in the report and README, not as research-backed; cite the testing effect [1][2][3] for the core loop instead | Brief / IBE160 report | medium (absence of evidence) |
| R7 | Store progress in localStorage with try/catch. Offer a JSON export, and note in the README that browser data can be deleted (Safari, private mode) | Architecture doc; README | high [28] |
| R8 | Choose the provider on quality and structured-output behaviour, not price: Haiku 5.5 and `gpt-6-luna` cost the same ($0.10 / $0.50), and a note costs about $0.002. Avoid the Gemini free tier for real notes (content used to improve Google's products) | Architecture doc (open question on LLM provider) | high for prices [25][42][43]; quality not compared |

## Open questions

- **Output quality of the cheap models** on this task (picking central content, quotes that are word-for-word) was not compared. A small test on 2–3 reference notes before the architecture decision would settle it.
- **NotebookLM's Explain citations and quiz scoring** are documented only in secondary sources [33]. Ten minutes of testing NotebookLM by hand would settle whether a source shows on the card itself.
- **The Quizlet help centre** blocked fetching (HTTP 403), so Quizlet features and prices are medium-low confidence. Check them by hand.
- **Whether the Karpicke & Roediger result [6] holds for concept questions** (it used word pairs) is a lead for the report. It is not needed for the design.
- **Hallucination rates for summaries** were not verified [13]. They're only needed if the report quotes a number.

## Source appendix

| # | Supports | Publisher | Pub date | Accessed | Confidence |
|---|---|---|---|---|---|
| 1 | Testing effect g = 0.50; feedback moderator | [Rowland, Psychological Bulletin 140(6)](https://doi.org/10.1037/a0037559) | 2014 | 2026-10-29 | high |
| 2 | Classroom testing effect g ≈ 0.50, vs restudy 0.33; feedback 0.54 vs 0.37 | [Yang et al., Psychological Bulletin 147(4)](https://doi.org/10.1037/bul0000309) | 2021 | 2026-10-29 | high |
| 3 | Practice testing high utility; summarisation/rereading low | [Dunlosky et al., Psych. Science in the Public Interest 14(1)](https://doi.org/10.1177/1529100612453266) | 2013 | 2026-10-29 | high |
| 4 | Feedback n.s. (0.63 vs 0.60); MC formats effective | [Adesope et al., Review of Educational Research 87(3)](https://doi.org/10.3102/0034654316689306) | 2017 | 2026-10-29 | medium |
| 5 | Testing > restudy at 2 days / 1 week | [Roediger & Karpicke, Psychological Science 17(3)](https://doi.org/10.1111/j.1467-9280.2006.01693.x) | 2006 | 2026-10-29 | high |
| 6 | Dropping recalled items from testing: ~80 % vs 33–36 % at 1 week | [Karpicke & Roediger, Science 319](https://doi.org/10.1126/science.1152408) | 2008 | 2026-10-29 | high |
| 7 | Successive relearning protocol | [Rawson & Dunlosky, Current Directions in Psych. Science](https://doi.org/10.1177/09637214221100484) | 2022 | 2026-10-29 | medium |
| 8 | Generation effect d ≈ 0.40 | [Bertsch et al., Memory & Cognition](https://doi.org/10.3758/BF03193441) | 2007 | 2026-10-29 | high |
| 9 | LLM MCQs usable with expert review | [PLOS ONE systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12758716/) | 2026 | 2026-10-29 | medium |
| 10 | LLM items equivalent only under validated procedure | [Frontiers in Education](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1837523/full) | 2026 | 2026-10-29 | medium |
| 11 | Weak LLM distractors (preprint) | [arXiv 2506.04851](https://arxiv.org/pdf/2506.04851) | 2025 | 2026-10-29 | low-medium |
| 12 | AI Anki cards: no exam gain, 74 % time saving (preprint) | [medRxiv](https://www.medrxiv.org/content/10.1101/2025.05.13.25327518v1.full.pdf) | 2025 | 2026-10-29 | low-medium |
| 13 | Summarisation hallucination benchmark | [Bao et al., FaithBench, NAACL 2025](https://aclanthology.org/2025.naacl-short.38/) | 2025 | 2026-10-29 | high (existence) |
| 14 | AI summaries vs transcripts: no learning difference | [Computers and Education: AI](https://www.sciencedirect.com/science/article/pii/S2666920X25001523) | 2025 | 2026-10-29 | medium |
| 15 | Simplified texts: mixed effect | [Language Learning & Technology](https://www.lltjournal.org/item-detail/1186/) | 2025 | 2026-10-29 | low-medium |
| 16 | mammoth extractRawText; untrusted-input warning | [mammoth.js README (GitHub)](https://github.com/mwilliamson/mammoth.js) | undated | 2026-10-29 | high |
| 17 | mammoth 1.13.0 | [npm registry](https://registry.npmjs.org/mammoth/latest) | ~2026-09 | 2026-10-29 | medium |
| 18 | PDF.js v6.4.299, monthly releases | [Mozilla pdf.js releases](https://github.com/mozilla/pdf.js/releases) | 2026-10-03 | 2026-10-29 | high |
| 19 | unpdf extractText, MIT | [UnJS unpdf README](https://github.com/unjs/unpdf) | undated | 2026-10-29 | medium |
| 20 | No OCR; ligature/whitespace/order problems | [pypdf docs](https://pypdf.readthedocs.io/en/stable/user/extract-text.html) | undated | 2026-10-29 | high |
| 21 | Reading order not guaranteed; ligature expansion | [Apryse docs](https://docs.apryse.com/web/guides/extraction/text-extract) | undated | 2026-10-29 | medium |
| 22 | Anthropic structured outputs GA; limits; refusal/max_tokens | [Anthropic docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | undated | 2026-10-29 | high |
| 23 | OpenAI strict JSON schema; refusals | [OpenAI docs](https://developers.openai.com/api/docs/guides/structured-outputs) | undated | 2026-10-29 | high |
| 24 | Gemini response_format; strips length constraints | [Google AI docs](https://ai.google.dev/gemini-api/docs/structured-output) | 2026-10-21 | 2026-10-29 | high |
| 25 | Haiku 5.5 $0.10 / $0.50 per MTok | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) | undated | 2026-10-29 | high |
| 26 | Citations + structured outputs → HTTP 400 | [Anthropic citations docs](https://platform.claude.com/docs/en/build-with-claude/citations) | undated | 2026-10-29 | high |
| 27 | Exact = grounded, fuzzy ≥ 0.85 = weak | [llmground (PyPI)](https://pypi.org/project/llmground/) | undated | 2026-10-29 | low |
| 28 | localStorage ~5 MiB; eviction; Safari 7-day; private mode | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | 2026-01-05 | 2026-10-29 | high |
| 29 | idb ~1.2 kB wrapper | [idb (GitHub)](https://github.com/jakearchibald/idb) | undated | 2026-10-29 | medium |
| 30 | NotebookLM flashcards/quiz: count, difficulty, prompt, Explain, retry missed | [Google Help](https://support.google.com/notebooklm/answer/16958963) | undated (©2026) | 2026-10-29 | high |
| 31 | NotebookLM upload, Google account, "Gemini Notebook" title | [Google Help](https://support.google.com/notebooklm/answer/16206563) | undated (©2026) | 2026-10-29 | high |
| 32 | NotebookLM limits / AI Pro price | [Google Help](https://support.google.com/notebooklm/answer/16213268) + third-party | undated | 2026-10-29 | low-medium |
| 33 | Explain gives grounded answer with citations | [9to5Google](https://9to5google.com/2025/09/08/notebooklm-flashcards-quizzes/) | 2025-09-08 | 2026-10-29 | medium |
| 34 | Knowt plans and prices | [Knowt](https://knowt.com/plans) | undated | 2026-10-29 | high |
| 35 | Quizlet Study Guides, practice test | [Yahoo Tech](https://tech.yahoo.com/general/articles/quizlet-160943143.html) | undated | 2026-10-29 | medium-low |
| 36 | Evernote: references on card back | [Evernote (marketing)](https://evernote.com/chat-with-ai-assistant/ai-flashcard-generator-for-universities) | undated | 2026-10-29 | low-medium |
| 37 | RemNote users request source next to AI cards | [RemNote feedback board](https://feedback.remnote.com/p/make-it-easier-to-check-sources-for-ai-generated-flashcards) | undated | 2026-10-29 | medium |
| 38 | No-signup tools, ~10-card caps | [PanQuiz](https://panquiz.com/en/tools/pdf-to-flashcards/) | undated | 2026-10-29 | medium |
| 39 | NotebookLM flashcards/quizzes launch | [Google Blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-app-quizzes-flashcards/) | 2025-11-06 | 2026-10-29 | high |
| 40 | Quizlet price conflict | [Nibble (competitor blog)](https://nibble-app.com/blog/quizlet-cost) | 2026 | 2026-10-29 | low |
| 41 | pypdf 6.21.4, BSD | [PyPI](https://pypi.org/project/pypdf/) | 2026-10-28 | 2026-10-29 | high |
| 42 | OpenAI standard-tier prices (`gpt-6-luna`, `gpt-5-nano` etc.); GPT-5.6 Sol promo date | [OpenAI pricing](https://developers.openai.com/api/docs/pricing) | undated (latest note 2026-07-30) | 2026-10-29 | high |
| 43 | Gemini paid-tier prices, free tier and data use, 2027 price change | [Google AI pricing](https://ai.google.dev/gemini-api/docs/pricing) | 2026-10-28 | 2026-10-29 | high |

## Staleness map

Computed with `recon_kit.py staleness` from the claims ledger (windows in months: pricing 3, features 3, versions 1, API limits 3, AI landscape 3, browser ecosystem 6, ML state of the art 6).

| Claim | Class | Published | Re-check by |
|---|---|---|---|
| mammoth 1.13.0 [17] | version | ~2026-09 | 2026-10-30 |
| PDF.js v6.4.299 [18] | version | 2026-10-03 | 2026-11-03 |
| LLM MCQ quality [9][10] | ML state of the art | 2026 | 2026-12-01 |
| GPT-5.6 Sol promo price [42] | pricing | 2026-10 | 2026-11-21 (announced end) |
| Gemini 3.6/3.8 Flash prices [43] | pricing | 2026-10-28 | 2027-01-01 (announced doubling) |
| Haiku 5.5 [25], OpenAI [42] and Gemini [43] prices, NotebookLM [30][32] and Knowt [34] prices/features, Citations limit [26], structured outputs [22][23][24] | pricing / feature / limit | 2026-10 | 2027-01-29 |
| **Already stale:** NotebookLM Explain citations [33] (2025-09), MDN storage page [28] (2026-01), AI-flashcard study [12] (2025-05) | — | — | now |

Earliest re-check: **library versions at the start of implementation**. A Refresh run re-checks this list.
