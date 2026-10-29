# Technical research digest — round 2 (leads and gaps)

Researcher: technical subagent · Run date: 2026-10-29 · Sources read: 6 pages + 2 search-result sets
Format: claim | URL | publisher | pub_date | accessed | confidence | class

## T1 — Text extraction

- mammoth latest on npm registry = 1.13.0 (registry `latest` tag; internal timestamp suggests ~late Sept 2026, not a labelled date) | https://registry.npmjs.org/mammoth/latest | npm registry | ~2026-09 (inferred, unlabelled) | accessed 2026-10-29 | medium | version
- pypdf docs: no OCR — "pypdf will also never be able to extract text from images"; image-only pages give "minimal or visually empty" text; whitespace is "very hard to guarantee"; in tables "every single letter could be absolutely positioned"; ligatures (e.g. "ﬀ" vs "ff") and linearisation order (figure text mid-paragraph) are listed as open problems | https://pypdf.readthedocs.io/en/stable/user/extract-text.html | pypdf project | undated (stable docs) | accessed 2026-10-29 | high | failure
- pdf.js `getTextContent` returns text items built from content-stream text operators — described as lossy; stream order may not equal reading order | https://dev.to/bonzai2carn/the-three-tier-pdf-extraction-model-demystifying-pdfjs-52bc | DEV Community (blog) | undated | accessed 2026-10-29 | low (secondary) | failure
- Ligatures not copied/highlighted correctly in pdf.js-based Zotero reader; reported upstream, unfixed at time of thread | https://forums.zotero.org/discussion/109922/built-in-pdf-reader-doesnt-recognize- | Zotero forums | undated (likely >1 year — flag stale) | accessed 2026-10-29 | low | failure
- Commercial extractor docs (Apryse) state reading order is not guaranteed to match human order; ligature expansion (fi, ff, fl, ffi, ffl) is an explicit processing step — confirms these are general PDF problems, not library bugs | https://docs.apryse.com/web/guides/extraction/text-extract | Apryse | undated | accessed 2026-10-29 | medium | failure

## T2 — Structured JSON
- No new evidence this round. OpenAI and Gemini pricing pages were not fetched — no prices cited for them.

## T3 — Traceability / quote verification

- Practitioner pattern: plain code assertion that each quoted string appears in the source; flag otherwise; LLM judge only for paraphrases | https://www.producttalk.org/glossary-ai-hallucination/ | Product Talk | undated | accessed 2026-10-29 | low (search summary, page not read) | pattern
- Open-source checker `llmground`: exact match = grounded, fuzzy-only (default threshold 0.85) = "weak"/review, else ungrounded; argues fuzzy hits shouldn't count as verified | https://pypi.org/project/llmground/ | PyPI | undated | accessed 2026-10-29 | low (search summary) | pattern
- TimeStampEval: fuzzy matching alone trails exact by 4–10 points; RapidFuzz candidate narrowing + LLM verification of short snippet improved accuracy | https://arxiv.org/html/2511.11594v1 | arXiv | 2025-11 | accessed 2026-10-29 | low (search summary) | pattern
- Citation excerpts' exact-match rates vary widely across models; unmatched excerpts split into formatting differences, paraphrases and hallucinations | https://arxiv.org/pdf/2608.03675 | arXiv (VetScore) | 2026-08 | accessed 2026-10-29 | low (search summary) | failure
- Quotes under ~20 chars skipped in one commercial verifier — short strings recur and match spuriously | https://knowledge.eve.legal/articles/8513363598-quote-verification | Eve Legal | undated | accessed 2026-10-29 | low | pattern
- (From round 1, high) Anthropic Citations return API-extracted `cited_text` + char offsets guaranteed to point into the document, but cannot be combined with structured outputs (400).

## T4 — Browser storage libraries

- idb: promise wrapper mirroring IndexedDB, ~1.19 kB brotli, async iterators, `tx.done`; README CDN examples use `idb@8`; ISC; 7.4k stars | https://github.com/jakearchibald/idb | Jake Archibald (GitHub) | undated | accessed 2026-10-29 | medium (version inferred) | version
- localForage: wraps IndexedDB / WebSQL / localStorage; README badge references 1.10.0; 215 open issues, 36 open PRs; no release dates visible — maintenance status unverified | https://github.com/localForage/localForage | localForage (GitHub) | undated | accessed 2026-10-29 | low | version

## Leads (not chased — budget)
- pdf.js GitHub issues for "ligature" / text ordering (primary evidence for pdf.js pitfalls).
- Dexie.js current version (not fetched).
- Gemini document grounding / File Search citations (not fetched).
- OpenAI and Gemini official pricing pages.

## Looked for but not found
- Primary pdf.js documentation of reading-order or ligature behaviour.
- A standard benchmark for hallucinated-quote rates.
- Release dates for unpdf, idb, localForage.
- Unverified belief (not evidenced this run): WebSQL is removed from modern browsers, which would make localForage's WebSQL driver dead weight.

## Bottom line per question (final, rounds 1+2)
- T1: Do extraction in the browser: unpdf/pdfjs-dist (PDF.js 6.4.299, monthly releases) for PDF, mammoth 1.13.0 `extractRawText` for .docx, `File.text()` for .txt/.md. Normalise text (NFKC for ligatures, join hyphenated line breaks, collapse whitespace) BEFORE chunking and sending. Treat <~50 chars per page as "scanned/empty" and reject with a message (no library does OCR). Python (pypdf 6.21.4 BSD; PyMuPDF 2.0 AGPL) only if a backend exists anyway.
- T2: Use native schema-constrained output (Anthropic `output_config.format` GA / OpenAI `strict` / Gemini `response_format`) with Zod or Pydantic helpers; still handle refusal and max_tokens stop reasons, validate locally (Gemini strips length constraints), retry once on failure. Anthropic Haiku 5.5 costs $0.10/$0.50 per MTok (≤100k prompt).
- T3: Simplest robust design: split text into numbered chunks, have the model return `chunk_id` + verbatim `quote` per item in structured JSON, then verify in code — exact substring after normalisation = verified, high-threshold fuzzy (~0.85–0.9) = "weak", else drop/regenerate. Anthropic Citations give guaranteed offsets but are incompatible with structured outputs (HTTP 400).
- T4: Progress (scores, card states, a few KB) fits localStorage (~5 MiB, synchronous, wrap in try/catch). Use IndexedDB via idb (~1.2 kB) only if storing the documents/generated sets. All browser storage is best-effort; Safari may wipe after 7 days without interaction; private mode loses data at session end — offer JSON export/import.
- Overall: a single-page app with browser-side extraction, a thin server proxy holding the API key, schema-constrained output + code-side quote verification, and localStorage progress has the fewest dependencies.
