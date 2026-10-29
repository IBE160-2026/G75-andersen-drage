# Academic literature digest — round 2 (leads, verification, contradictions)

Round 2 work: extracted primary full-text numbers for Rowland 2014, Yang et al. 2021, Karpicke & Roediger 2008 (pdftotext on publisher/author PDFs), and chased A4 (AI summaries vs learning; simplification). All accessed 2026-10-29.

Format: claim | URL/DOI | authors + venue | year | peer-reviewed/preprint | accessed | confidence | class

## A1 — verification
- Confirmed from full text: Rowland 2014 random-effects g = 0.50 [0.42, 0.58]; Yang 2021 g = 0.499, bias-corrected 0.475 | 10.1037/a0037559; 10.1037/bul0000309 | Psychological Bulletin | 2014; 2021 | peer-reviewed | 2026-10-29 | high | survey
- Contradiction on format: Rowland finds recall-type initial tests > recognition (0.61 vs 0.29); Adesope finds MC/mixed formats larger; Yang classroom finds no significant recall vs recognition difference (0.541 vs 0.607 with feedback) | same + 10.3102/0034654316689306 | — | — | peer-reviewed | 2026-10-29 | medium | survey. Design implication: MC quiz format is defensible for classroom-style use; mixing in short-answer/cued recall is supported by lab data.

## A2 — verification and contradictions
- Karpicke & Roediger 2008 design (verified): 40 Swahili-English pairs; four conditions ST, SNT (drop from study), STN (drop from test), SNTN (drop from both). 1-week recall ~80% (ST, SNT) vs 36% (STN) and 33% (SNTN). "Repeated study after one successful recall did not produce any measurable learning a week later." | https://doi.org/10.1126/science.1152408 | Karpicke & Roediger, Science | 2008 | peer-reviewed | 2026-10-29 | high (one lab, one material type -> treat generalisation as a lead) | empirical
- Design implication: "repeat only the wrong answers" is fine for RESTUDY, but items answered correctly once should stay in the retrieval rotation (spaced), not be dropped; successive relearning (criterion + spaced relearning sessions) is the closest evidenced protocol (Rawson/Dunlosky lab — largely one research group, so lead-level for exact parameters).
- Feedback moderation contradiction: Rowland 0.73 vs ~0.39 and Yang 0.537 vs 0.374 favour feedback; Adesope 0.63 vs 0.60 n.s. | DOIs as above | — | — | peer-reviewed | 2026-10-29 | medium | survey

## A3 — no new sources this round (budget); see round 1. Freshness flag: FaithBench (NAACL 2025) and Vectara/FaithJudge (EMNLP 2025) are >6 months old relative to 2026-10-29; model-specific hallucination rates from aggregators were not verified against Vectara's own pages.

## A4 — follow-up
- AI-generated summaries of educational videos vs transcripts: no difference in retention or transfer across two experiments (N = 101, N = 215) | https://www.sciencedirect.com/science/article/pii/S2666920X25001523 | Computers and Education: Artificial Intelligence (authors not retrieved) | 2025 | peer-reviewed | 2026-10-29 | medium (snippet level) | null-finding
- Learning from LLM summaries produced shallower knowledge than learning via web search (N ~ 1,104) | https://www.psypost.org/learning-from-ai-summaries-leads-to-shallower-knowledge-than-web-search/ | PsyPost news report of a study (original paper not retrieved) | 2025 | secondary/news | 2026-10-29 | low (lead) | empirical
- Teachers graded one ChatGPT summary above 30 summaries by 15-year-olds on content and style (quality, not learning) | https://www.sciencedirect.com/science/article/pii/S1871187123001487 | Thinking Skills and Creativity ("ChatGPT: The brightest student in the class") | 2023 | peer-reviewed | 2026-10-29 | low-medium | empirical
- Text simplification: mixed. Simplified texts improve comprehension for lower-proficiency L2 readers (Crossley et al. line of work); a 2025 L2 study found AI- and human-simplified texts no easier than originals once topic familiarity was controlled | https://www.lltjournal.org/item-detail/1186/ | Language Learning & Technology | 2025 | peer-reviewed | 2026-10-29 | low-medium | null-finding
- No meta-analysis found on simplified / "explain like I'm 5" re-explanations and learning; no study found on learner-chosen on-demand re-explanation buttons | — | — | — | — | 2026-10-29 | medium (absence) | null-finding
- Pareto/80-20: confirmed absence — no empirical test in learning science found across two queries | — | — | — | — | 2026-10-29 | medium (absence) | null-finding

## Leads
- Direct experiment "LLM summary read vs student writes own summary" on learning outcomes: not found; generation-effect theory (Bertsch 2007, d ~ 0.40) predicts own generation wins.
- Original paper behind the PsyPost "AI summaries -> shallower knowledge" report (likely PNAS Nexus or similar) — retrieve before citing.
- Crossley et al. 2014 simplification study — retrieve primary.

## Looked for but not found
- Meta-analysis of text simplification on comprehension/learning.
- Evidence for any "80/20" efficiency claim in studying.
- Peer-reviewed LLM-flashcard study with learning outcomes (only medRxiv preprint, null result).

## Bottom line per question
- A1: Practice testing > restudy, g ~ 0.50 (lab and classroom), g = 0.33 vs restudy in class; strongest-rated technique in Dunlosky 2013. High confidence.
- A2: Give corrective feedback (usually ~+0.15-0.35 g); keep correctly answered items in spaced retrieval rather than dropping them (80% vs 33-36% at 1 week); successive relearning is the evidenced protocol.
- A3: LLM quizzes are usable drafts but need verification; distractors and hallucinations are the known failure modes; flashcard learning gains unproven (preprint null result).
- A4: Passive reading of AI summaries shows null-to-negative learning effects; generation effect favours making students produce answers/summaries. Simplification evidence is mixed; Pareto has no empirical basis found.
