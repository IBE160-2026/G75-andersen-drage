# Addendum to the PRD: Architecture input

This addendum collects technical direction gathered during the PRD work. It is input for `bmad-architecture`, which makes the final choices, and it is not a set of requirements. Sources are coded in parentheses: research recommendations (R1–R8), Decision D1–D9 and Review fix E1–E13 (both resolve in `.memlog.md`; PRD §12 maps them to requirements), and PRD requirements (FR-n, NFR-n). A bullet with no source code is the PM's judgment.

## Text extraction (FR-1, FR-3)

- Extract text in the browser, so that unreadable files are rejected before any network call. The research names these candidates: `unpdf`/pdf.js for PDF, `mammoth` for `.docx`, and `File.text()` for `.txt` and `.md` (R1).
- Detect scanned PDFs by counting characters per page (R1).
- Wrap every parser in try/catch, and show `err.unreadable` (EXPERIENCE.md › Microcopy) for any parser error.
- The `mammoth` documentation warns that some files can cause high CPU or memory use. Run parsing in a Web Worker with a timeout, because try/catch does not catch a hang (FR-3, Review fix E7).
- Check the library versions again when implementation starts (R1).

## Structured output (FR-8)

- Use the provider's schema-constrained JSON mode where it exists, and validate again in code with Zod or Pydantic (R2).
- Treat refusals and `max_tokens` stops as failures, and retry them once.
- Anthropic accepts only 0 or 1 for `minItems`, and Gemini strips length constraints, so enforce all counts in local validation (FR-7, Review fix E6).

## Quote Check (FR-9)

- Anthropic Citations cannot be combined with structured output (the API returns HTTP 400 for the combination), so the app does its own Quote Check (R3).
- Apply the same Normalization to the Passage and to the Quote, then check that the normalized Quote appears as a substring of the normalized Passage. Only an exact match counts. The research suggested a "weak" tier for fuzzy matches, but Decision D3 rejected it.

## Storage (FR-4, FR-21, Decision D5)

- R7 recommends storing progress in localStorage, wrapped in try/catch. Whether Study Sets fit in localStorage or need IndexedDB depends on their size, and the architecture decides.
- Use keys namespaced per Note, such as `progress:<noteHash>`, and include a schema version in the stored data.
- Size the store for the per-Note data FR-21 lists beyond the Study Set: last-shown time and last-used Quiz Question per Key Concept, and last-practiced time, archive state and Importance Level per Note (FR-18, FR-25 to FR-27).
- Include the prompt version and model ID in the cache key for stored Study Sets (FR-4, Decision D2).
- Warn in the app and the README that Safari deletes stored data after 7 days without a visit, and that private browsing deletes it when the window closes (R7, Review fix E5).

## Proxy (NFR-1 to NFR-3)

- The Proxy runs locally only, started with the app by the README command (DR-1). It is not publicly hosted, which keeps cost and abuse risk on the local machine.
- Bind the Proxy to localhost, and check the `Origin` header.
- Rate-limit requests with a simple in-memory counter per origin: the 11th request within one minute gets HTTP 429 (NFR-3).
- Log only status codes and timings, never request or response bodies.

## Model choice (Open Question 1)

- Choose on quality and on how reliably the model follows a JSON schema, not on price (R8). One generation costs about $0.002 per Note with Haiku 5.5 or gpt-6-luna, and about $0.006 with Gemini Flash-Lite. Explain Simpler calls cost extra.
- Avoid the Gemini free tier for real Notes, because of its data-use terms (R8, Review fix E13).
- Before deciding, run a quality comparison on the reference notes and check prices again.
