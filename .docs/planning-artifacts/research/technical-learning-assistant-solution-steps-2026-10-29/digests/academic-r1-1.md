# Academic literature digest — round 1 (broad-first)

Decision served: grounding the design of an AI study assistant (upload notes -> LLM summary, flashcards, quiz; repeat wrongly answered questions; "explain simpler") in published research.
Accessed: 2026-10-29 for all sources. "Verified in full text" = numbers extracted by me from the paper's PDF text this run; otherwise abstract/search-snippet level.

Format: claim | URL/DOI | authors + venue | year | peer-reviewed/preprint | accessed | confidence | class

## A1. Testing effect / retrieval practice vs re-reading

- Repeated studying beat testing at 5-min retention, but prior testing gave "substantially greater retention" at 2 days and 1 week; restudy inflated students' confidence | https://doi.org/10.1111/j.1467-9280.2006.01693.x (PubMed 16507066) | Roediger & Karpicke, Psychological Science 17(3):249-255 | 2006 | peer-reviewed | 2026-10-29 | high (abstract) | empirical. NOTE: exact percentages NOT retrieved this run; do not quote numbers from memory.
- Random-effects mean testing effect vs restudy g = 0.50, CI [0.42, 0.58] (verified in full text) | https://doi.org/10.1037/a0037559 | Rowland, Psychological Bulletin 140(6) | 2014 | peer-reviewed | 2026-10-29 | high | survey (meta-analysis)
- Rowland moderators (verified in full text): feedback g = 0.73 [0.61, 0.86] vs no feedback (Yang et al. quote this as 0.39); retention interval >= 1 day g = 0.69 [0.56, 0.81] larger than same-day; cued recall initial test g = 0.61 vs recognition g = 0.29; published g = 0.58 vs unpublished g = 0.25 (publication-bias signal) | same | same | 2014 | peer-reviewed | 2026-10-29 | high | survey
- Classroom meta-analysis: 222 studies, 48,478 students, overall g = 0.499; PEESE bias-corrected g = 0.475 [0.329, 0.620] (verified in full text) | https://doi.org/10.1037/bul0000309 | Yang, Luo, Vadillo, Yu & Shanks, Psychological Bulletin 147(4) | 2021 | peer-reviewed | 2026-10-29 | high | survey
- Yang et al. comparisons (verified): quizzing vs no/filler g = 0.610; vs restudying g = 0.330; vs other elaborative strategies (e.g., note-taking, summarizing) g = 0.095, p = .062 (n.s.) | same | same | 2021 | peer-reviewed | 2026-10-29 | high | survey
- Practice tests beat restudying and all other comparison conditions; MC and mixed-format practice tests gave larger effects than recall formats; format match practice/final test helps | https://doi.org/10.3102/0034654316689306 | Adesope, Trevisan & Sundararajan, Review of Educational Research 87(3):659-701 | 2017 | peer-reviewed | 2026-10-29 | medium (abstract via search snippets; full text not opened) | survey
- Adesope figures as cited by Yang et al. 2021: vs restudying g = 0.51, vs filler/no activity g = 0.93; feedback n.s. (0.63 vs 0.60). Overall g = 0.61 reported only by secondary blog | Yang et al. 2021 citing Adesope 2017 | — | — | peer-reviewed (secondary citation) | 2026-10-29 | medium | survey
- Practice testing and distributed practice are the only two of ten techniques rated "high utility"; summarization, highlighting, rereading rated "low utility" | https://doi.org/10.1177/1529100612453266 (APS release: https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html) | Dunlosky, Rawson, Marsh, Nathan & Willingham, Psychological Science in the Public Interest 14(1) | 2013 | peer-reviewed | 2026-10-29 | high (APS press release + multiple summaries) | survey

## A2. Feedback and repeating errors

- Feedback after testing: Rowland g = 0.73 with vs smaller without; Yang classroom g = 0.537 with corrective feedback vs 0.374 without (verified in full text). Adesope found no feedback moderation (0.63 vs 0.60) — a contradiction across meta-analyses | DOIs above | Rowland 2014; Yang et al. 2021; Adesope et al. 2017 | — | peer-reviewed | 2026-10-29 | high that feedback does not hurt and usually helps; medium on magnitude | survey
- Dropping items after first correct recall from TESTING collapses retention: conditions keeping recalled items in tests (ST, SNT) ~80% recalled at 1 week; conditions dropping them from tests (STN, SNTN) 36% and 33%. Dropping from further STUDY had no cost. Students' predictions were uncorrelated with actual recall (verified in full text) | https://doi.org/10.1126/science.1152408 (PubMed 18276894) | Karpicke & Roediger, Science 319:966-968 | 2008 | peer-reviewed | 2026-10-29 | high for the finding; one lab, Swahili-English word pairs | empirical
- Successive relearning = practise to criterion (correct), then relearn to criterion in later spaced sessions | https://doi.org/10.1177/09637214221100484 | Rawson & Dunlosky (Current Directions in Psychological Science) | 2022 | peer-reviewed | 2026-10-29 | medium (abstract-level) | survey
- Successive relearning improved course-exam performance and long-term retention in classroom | Educational Psychology Review | Rawson, Dunlosky & Sciartelli | 2013 | peer-reviewed | 2026-10-29 | medium (title/snippet only) | empirical
- Higher initial criterion helps, but its effect shrinks as relearning sessions increase (Vaughn & Rawson 2011 and follow-up); practical rule of thumb "3 correct initially + 3 spaced relearning sessions" comes from secondary summary | https://www.retrievalpractice.org/archive/2018/successive-relearning ; https://link.springer.com/article/10.1007/s10648-023-09809-2 | Vaughn & Rawson; EdPsychRev 2023 review | 2011/2023 | peer-reviewed (original) / secondary summary | 2026-10-29 | low-medium | empirical

## A3. Quality of LLM-generated study material

- Systematic review + network meta-analysis (health professions): ChatGPT-4 "potentially the best resource" for drafting MCQs, but expert quality review still required; psychometric item indices largely unknown | https://pmc.ncbi.nlm.nih.gov/articles/PMC12758716/ | PLOS ONE (authors not retrieved) | 2026 | peer-reviewed | 2026-10-29 | medium | survey
- LLM items psychometrically equivalent to human items (difficulty, discrimination, reliability) only under a validated zero-shot procedure; neither captured practical/project knowledge | https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1837523/full | Frontiers in Education | 2026 | peer-reviewed | 2026-10-29 | medium (single study) | empirical
- Generic LLMs do not consistently produce distractors that satisfy experts | https://arxiv.org/pdf/2506.04851 | arXiv | 2025 | preprint | 2026-10-29 | low-medium | empirical
- Educator ratings of GPT-3.5/Llama 2/Mistral questions: n = 21 educators, 7 questions per model — too small to generalise | arXiv (via search) | 2024-25 | preprint | 2026-10-29 | low | empirical
- AI-generated Anki flashcards in pre-clerkship medicine: no significant exam-score difference (genetics p = .86; pharmacology p = .05); 74% reported time saving | https://www.medrxiv.org/content/10.1101/2025.05.13.25327518v1.full.pdf | medRxiv | 2025 | preprint | 2026-10-29 | low-medium | null-finding
- Summarization hallucination benchmark: FaithBench, summaries from 10 modern LLMs on 75 articles with human hallucination labels | https://aclanthology.org/2025.naacl-short.38/ | Bao et al., NAACL 2025 Short | 2025 | peer-reviewed | 2026-10-29 | high (exists); rates not extracted | empirical
- Vectara hallucination leaderboard / FaithJudge: ranks 130-160+ LLMs on hallucination in summarization; rates of best models reportedly ~0.6-1.8% on Vectara's test (from aggregator, unverified) | https://aclanthology.org/2025.emnlp-industry.54/ (arXiv 2505.04847) | Vectara, EMNLP 2025 Industry | 2025 | peer-reviewed (industry track) | 2026-10-29 | medium (paper) / low (specific rates) | empirical

## A4. Simplified explanations; generated vs own summaries; Pareto

- (a) Generation effect: generating > reading, overall d ~ 0.40 across 445 effect sizes / 86 studies; grows with retention interval | https://pubmed.ncbi.nlm.nih.gov/17645161/ (doi 10.3758/BF03193441) | Bertsch, Pesta, Wiscott & McDaniel, Memory & Cognition | 2007 | peer-reviewed | 2026-10-29 | high | survey
- (a) Summarization as a student strategy rated low utility (Dunlosky 2013), yet Yang 2021 found quizzing not significantly better than summarizing/note-taking (g = 0.095) — tension worth noting | see A1 | — | — | peer-reviewed | 2026-10-29 | medium | survey
- (b) Pareto/80-20 in learning: no empirical study testing it found; hits are conceptual, practitioner blogs, or quality-management Pareto charts | search results (elearningindustry.com etc.) | — | — | n/a | 2026-10-29 | medium (absence) | null-finding

## Leads
- Psychological Science replication suggesting restudy ineffectiveness in Karpicke & Roediger 2008 is partly a spacing confound (between-subjects); https://www.psychologicalscience.org/journals/psychological-science/0956797615617778/ — authors not retrieved.
- Rawson et al. 2020 cited as counterpoint on successive-relearning long-term effects (in EdPsychRev 2023 article).
- McCurdy et al. 2020 generation-effect meta-analysis (126 articles); text-generation meta-analysis EdPsychRev doi 10.1007/s10648-023-09758-w.

## Looked for but not found (round 1)
- Roediger & Karpicke 2006 exact retention percentages (abstract only).
- Rigorous evaluation of LLM-generated flashcards with learning outcomes in peer-reviewed venue.
- Any empirical test of the Pareto principle as a learning strategy.

## Bottom line per question (round 1)
- A1: Retrieval practice beats restudy robustly: g ~ 0.50 lab (Rowland 2014), g ~ 0.50 classroom, 0.33 vs restudy (Yang 2021); larger at delays >= 1 day.
- A2: Feedback usually adds benefit (0.73 vs 0.39; 0.54 vs 0.37), one meta-analysis disagrees. Dropping items from testing after one correct recall is harmful (80% vs 33-36%).
- A3: LLM MCQs can approach human quality but need human/expert review; distractors are the weak point; flashcard learning-outcome evidence is thin and preprint-only.
- A4: Generation effect (d ~ 0.40) implies student-generated work > passively read text; Pareto has no empirical learning basis found.
