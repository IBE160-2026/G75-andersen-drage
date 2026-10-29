# Technical research digest — round 1 (broad)

Researcher: technical subagent · Run date: 2026-10-29 · Sources read: 12 primary pages
Format: claim | URL | publisher | pub_date | accessed | confidence | class

## T1 — Text extraction (.docx, text-PDF, .txt/.md)

- mammoth.js `extractRawText` returns plain text (paragraphs separated by two newlines); runs in Node (`{path}`/`{buffer}`) and browser (`{arrayBuffer}`, standalone `mammoth.browser.js`) | https://github.com/mwilliamson/mammoth.js | mwilliamson (GitHub README) | undated | accessed 2026-10-29 | high | pattern
- mammoth does no sanitisation; docs may contain `javascript:` links; some documents can cause high CPU/memory — README advises isolating (separate thread + timeout) for untrusted input | https://github.com/mwilliamson/mammoth.js | mwilliamson | undated | accessed 2026-10-29 | high | failure
- mammoth latest version/date NOT visible on README (Releases empty; npmjs.com returned 403) | https://github.com/mwilliamson/mammoth.js | — | — | accessed 2026-10-29 | low | version
- pdf.js latest release v6.4.299 (03 Oct, year not shown — inferred 2026, within 1 month); previous v6.3.289 (29 Aug), v6.2.108 (28 Jul) → active monthly cadence | https://github.com/mozilla/pdf.js/releases | Mozilla | 2026-10-03 (year inferred) | accessed 2026-10-29 | high | version
- unpdf ships a serverless build of PDF.js v6.4.299; `extractText(pdf, {mergePages})` returns `{totalPages, text}` (per-page array or merged string); runs in Node 24+, Bun, browsers, Workers; needs global `Iterator` (Safari 18.4+); MIT; README positions it as maintained alternative to pdf-parse | https://github.com/unjs/unpdf | UnJS (GitHub README) | undated | accessed 2026-10-29 | medium (version/date not shown) | version
- pypdf 6.21.4 released 2026-10-28; Python >=3.9; BSD-3; `page.extract_text()` | https://pypi.org/project/pypdf/ | PyPI | 2026-10-28 | accessed 2026-10-29 | high | version
- PyMuPDF 2.0 released 2026-10-19; Python 3.11+; licence AGPL-3.0 or commercial (Artifex) | https://pypi.org/project/PyMuPDF/ | PyPI | 2026-10-19 | accessed 2026-10-29 | high | version
- PyMuPDF: scanned PDFs contain no extractable text (needs OCR); custom font encodings without proper char map -> garbled or empty output; not thread-safe (use multiprocessing) | https://pypi.org/project/PyMuPDF/ | PyPI/Artifex | 2026-10-19 | accessed 2026-10-29 | high | failure

## T2 — Structured JSON from LLM APIs

- Anthropic structured outputs are GA (no beta header): `output_config.format = {type:"json_schema", schema}`; constrained decoding guarantees valid JSON matching schema; old `output_format` + beta header deprecated | https://platform.claude.com/docs/en/build-with-claude/structured-outputs | Anthropic | undated | accessed 2026-10-29 | high | pattern
- Anthropic exceptions: `stop_reason: "refusal"` or `"max_tokens"` may yield non-conforming/incomplete output; enum/const may differ in case | same | Anthropic | undated | accessed 2026-10-29 | high | failure
- Anthropic schema limits: no recursive schemas, no numeric min/max, no minLength/maxLength, minItems only 0/1, additionalProperties must be false; unsupported -> 400; first request per schema slower (grammar compile, cached 24 h) | same | Anthropic | undated | accessed 2026-10-29 | high | limit
- Anthropic SDK helpers: Python `client.messages.parse(output_format=PydanticModel)`; TS `zodOutputFormat(zodSchema)` -> typed `parsed_output`; helpers strip unsupported constraints but re-validate them locally | same | Anthropic | undated | accessed 2026-10-29 | high | pattern
- OpenAI Responses API: `text.format = {type:"json_schema", strict:true, schema}`; helpers Pydantic `responses.parse(text_format=...)`, JS `zodTextFormat`; refusals come back as `refusal` content item (not schema-conforming); check `status: incomplete` | https://developers.openai.com/api/docs/guides/structured-outputs | OpenAI | undated | accessed 2026-10-29 | high | pattern
- Gemini: `response_format` with `mime_type: application/json` + `schema`; Pydantic/Zod in SDKs; output syntactically valid JSON following schema but "values still need validation"; minLength/maxLength/uniqueItems etc. silently stripped; complex schemas -> 400 INVALID_ARGUMENT | https://ai.google.dev/gemini-api/docs/structured-output | Google | 2026-10-21 (last updated) | accessed 2026-10-29 | high | pattern
- Gemini structured output combined with tools (Search grounding, File Search, function calling) = preview, Gemini 3 series only | same | Google | 2026-10-21 | accessed 2026-10-29 | medium | limit
- Anthropic pricing (base, per MTok in/out): Haiku 5.5 $0.10/$0.50 (prompts <=100k tokens; $0.50/$2.50 above); Haiku 4.5 $1/$5; Sonnet 5.5 $2/$10; Sonnet 4.6 $3/$15; Batch API -50% | https://platform.claude.com/docs/en/about-claude/pricing | Anthropic | undated | accessed 2026-10-29 | high | pricing

## T3 — Source traceability / grounding

- Anthropic Citations (GA, all active models): documents as plain text (sentence chunks, 0-indexed char offsets `start_char_index`/`end_char_index`), PDF (sentence chunks, 1-indexed page numbers), or custom content (your own blocks, block-index citations, no further chunking) | https://platform.claude.com/docs/en/build-with-claude/citations | Anthropic | undated | accessed 2026-10-29 | high | pattern
- Citations "guaranteed to contain valid pointers to the provided documents"; `cited_text` is extracted by the API and not billed as output tokens; slight input-token increase | same | Anthropic | undated | accessed 2026-10-29 | high | pattern
- **Citations and structured outputs are incompatible**: citations on any document plus `output_config.format` -> HTTP 400 | same | Anthropic | undated | accessed 2026-10-29 | high | limit
- Scanned PDFs without extractable text are not citable (image citations unsupported) | same | Anthropic | undated | accessed 2026-10-29 | high | limit

## T4 — Browser storage

- Web Storage (localStorage) ~5 MiB per origin (MDN also states 10 MiB max across local+session); exceeding throws `QuotaExceededError` | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | MDN | 2026-01-05 (last modified) | accessed 2026-10-29 | high | limit
- IndexedDB shares origin quota with Cache/OPFS: Chromium up to 60% of disk; Firefox best-effort min(10% disk, 10 GiB); Safari 17+ ~60% per origin | same | MDN | 2026-01-05 | accessed 2026-10-29 | high | limit
- Default storage is best-effort: LRU eviction under pressure, all-or-nothing per origin; `navigator.storage.persist()` requests persistence (Firefox prompts; Chrome/Safari decide silently) | same | MDN | 2026-01-05 | accessed 2026-10-29 | high | limit
- Safari ITP deletes script-written storage after 7 days without user interaction; private-browsing data usually deleted at session end | same | MDN | 2026-01-05 | accessed 2026-10-29 | high | failure

## Leads (for round 2)
- pdf.js text-content pitfalls (reading order, `hasEOL`, ligatures, hyphenation) — not yet evidenced.
- pypdf docs page on extraction limitations / layout mode.
- Verified quote matching: hallucinated-quote failure mode, fuzzy-match approach.
- Gemini grounding: is it web-search only, or document-grounded?
- idb / Dexie / localForage current versions & maintenance.
- mammoth current version (npm blocked; try another registry view).

## Looked for but not found (round 1)
- mammoth and unpdf version numbers / release dates (README pages show none; npmjs.com 403).
- OpenAI and Gemini official pricing (not fetched — not cited).

## Bottom line per question (provisional)
- T1: Browser-side viable: pdf.js/unpdf (6.4.299, active) + mammoth `extractRawText`; .txt/.md via File.text(). Detect scanned/empty PDFs by near-zero extracted chars.
- T2: All three providers offer schema-constrained JSON with Zod/Pydantic helpers; still handle refusal / max_tokens and validate client-side.
- T3: Anthropic Citations give verified char offsets but cannot be combined with structured outputs — choose one, or use structured output + own quote verification.
- T4: Progress data is small -> localStorage suffices; IndexedDB only if storing documents; storage is best-effort.
- Cost: Haiku 5.5 at $0.10/$0.50 per MTok -> fractions of a cent per generation.
