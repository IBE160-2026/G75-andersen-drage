# Input reconciliation: research.md vs PRD + addendum

**Input:** `../../research/technical-learning-assistant-solution-steps-2026-10-29/research.md` (R1–R8, open questions, caveats)
**Compared against:** `prd.md`, `addendum.md` (2026-11-05)
**Excluded by instruction:** the fuzzy "weak" quote tier from R3 (rejected by Decision D3).

## Covered well

- R2 core (schema output, re-validate, refusal/max_tokens, retry once, clear error) -> FR-8, addendum.
- R3 core (Passage ID + verbatim Quote, code-side check, no Citations + structured output) -> FR-9, addendum.
- R4 (do not drop correct items permanently) -> FR-18 (shaky first, ~20% known, least recently shown).
- R5 (lead with verified source and no account) -> §1 Vision, FR-12, UJ-1.
- R8 / open question on model quality -> §10 OQ1, addendum "run a quality comparison".
- Research caveat "LLM output is a draft" -> §7 Non-Goals (Quote Check proves source, not correctness).

## Gaps

### G1. R6 is dropped: 80/20 and Explain Simpler are not framed as design heuristics (high)
Research: no empirical evidence for the 80/20 principle in learning, and none for on-demand "explain simpler"; present them as design heuristics and cite the testing effect [1][2][3] for the core loop (R6, Executive summary "Biggest caveat").
PRD: §1 Vision states "turns the most central 20%" as product fact; FR-16 and SM-C1 ("The 80/20 profile caps the output on purpose") carry no caveat. No DR asks the README/report to frame 80/20 and ELI5 as heuristics or to ground the loop in the testing effect. The addendum does not mention R6 at all.
Suggested fix: add a line to §1 or §7 that 80/20 and Explain Simpler are design choices, not research findings, and a DR (or extend DR-1/DR-5) requiring the report/README to cite the testing-effect sources for the quiz-first loop.

### G2. R7 is weakened: export is only "Should", and the Safari eviction risk is missing from the PRD (medium)
Research: browser storage is best-effort. Safari can delete script-written storage after **7 days without interaction**, and private windows lose it at session end. A JSON export/import is "a cheap safeguard". R7 bundles both: offer export, and warn about this in the README.
PRD: FR-21 covers private mode/quota ("Progress is not being saved") but not silent Safari eviction, which is the case where data loss is *not* visible. That conflicts with the §4.9 principle "Losing data must be visible, never silent". FR-22 export is demoted to Should (§8.2). The README warning appears only in the addendum, which is not a requirement, and DR-1 does not include it.
Addendum misstatement: "Safari and private browsing can delete the stored data" drops the 7-day-inactivity condition. Also, "IndexedDB may suit Study Sets better, depending on their size (R7)" is attributed to R7, but R7 says localStorage. The IndexedDB remark comes from the storage section [29] and is tied to storing whole documents. FR-21 does store the Extracted Text, so the size question is real, but it should not be cited as R7.
Suggested fix: add the Safari/private-mode README warning as a consequence of FR-21 or DR-1, and either promote FR-22 to v1 or record why the safeguard is deferred.

### G3. R8 caveats on provider terms and prices are only partly carried, and one cost claim is overgeneralized (medium)
Research: (a) Gemini free-tier content is used to improve Google's products, which conflicts with the consent notice for real students' notes. It is acceptable only for development with demo notes. (b) Prices change on announced dates (Gemini 3.6/3.8 Flash double on 2027-01-01, GPT-5.6 Sol promo ends 2026-11-21). Re-check them before the architecture is final, and check the chosen model's row by eye before quoting it in the report. (c) The ~$0.002 figure applies to Haiku 5.5 / `gpt-6-luna` at about 5k in and 3k out **per generation**.
PRD: §10 OQ1 lists "Gemini Flash-Lite" as a candidate without the free-tier/data-use caveat. FR-5 Consent names the provider but says nothing about which tier is used or the provider's data-use terms, and NFR-2 covers only the Proxy's own retention. The price re-check and the eyeball check of the pricing row are dropped everywhere.
Addendum: "Cheap models cost about $0.002 per Note" is not supported as written. `gemini-3.1-flash-lite` ($0.25 / $1.50) comes to about $0.006 for the same tokens, and Explain Simpler calls add to the per-Note cost.
Suggested fix: in FR-5 or NFR-2, require a paid/no-training tier for real Notes and state this in the Consent text. Add a price re-check to OQ1. Reword the addendum to "about $0.002 per generation on Haiku 5.5 / gpt-6-luna".

### G4. R1 risk dropped: mammoth needs a worker and timeout for untrusted input (medium)
Research: the mammoth README warns that some documents cause high CPU/memory use and recommends a worker plus timeout for untrusted input [16].
Addendum: only "wrap every parser in try/catch". A try/catch does not catch a hang or memory blow-up, so NFR-8 Stability and FR-3 ("the app does not crash") are exposed. Research also says to re-check library versions at the start of implementation (staleness map), which neither document carries.
Suggested fix: add "run .docx/.pdf parsing in a Web Worker with a timeout, and map a timeout to 'File could not be read'" to the addendum's extraction section.

### G5. R2 provider schema limits are not carried, so FR-6/FR-7 counts cannot rely on the schema (low-medium)
Research: Anthropic rejects min/max length constraints and supports `minItems` only as 0/1. Gemini silently strips length constraints [22][24].
PRD/addendum: FR-7 requires exactly four options and 1–2 Flashcards per concept, and FR-6 requires 5–15 Key Concepts. The addendum says "validate again in code" but does not warn that these cardinality rules cannot live in the provider schema. FR-7 handles a bad Quiz Question by dropping it, but nothing says what happens when the Key Concept count falls outside 5–15, or when a concept gets 3+ Flashcards.
Suggested fix: note in the addendum that all count and length rules are enforced in the local Zod/Pydantic schema only, and define the handling for out-of-range Key Concept counts in FR-6.

## Minor / not flagged as gaps

- Addendum "Detect scanned PDFs by counting characters per page (R1)": R1 says "reject near-empty PDFs". The per-page metric and the 100-char threshold are PRD choices (§11), which is acceptable, but they are not research findings.
- Research open questions not carried: hand-testing NotebookLM's Explain citations, and Quizlet features/prices. These matter for the report's differentiation claim, not for the PRD.
- The Karpicke & Roediger generalisation caveat (word pairs, one lab) is not repeated. It is relevant only if the report cites it as justification for FR-18.
