# Addendum to the PRD: Architecture Input

This addendum holds technical direction gathered during the PRD work. It is not a set of requirements. It is input for `bmad-architecture`, which makes the final choices. The sources are research.md (R1–R8) and the review findings.

## Text extraction (FR-1, FR-3)
- Extract text in the browser, so bad files are rejected before any network call. The research names these candidates: `unpdf`/pdf.js for PDF, `mammoth` for `.docx`, and `File.text()` for `.txt` and `.md` (R1).
- Detect scanned PDFs by counting characters per page (R1).
- Wrap every parser in try/catch and map its errors to "File could not be read".

## Structured output (FR-8)
- Use the provider's schema-constrained JSON mode where it exists, and validate again in code with Zod or Pydantic (R2).
- Treat refusals and `max_tokens` stops as failures that are retried once.
- Anthropic Citations cannot be combined with structured output (it returns HTTP 400), so the app does its own Quote Check (R3).

## Quote Check (FR-9)
- Apply the same Normalization to the Passage and to the Quote, then check with substring containment. Only an exact match counts. The research suggested a fuzzy "weak" tier, but Decision D3 rejected it.

## Storage (FR-21, Decision D5)
- localStorage is enough for progress. IndexedDB may suit Study Sets better, depending on their size (R7). The architecture decides which to use.
- Use keys namespaced per Note, such as `progress:<noteHash>`, and include a schema version in the stored data.
- Add a README warning that Safari and private browsing can delete the stored data (R7).

## Proxy (NFR-1 to NFR-3)
- Bind the proxy to localhost by default and check the `Origin` header.
- Rate-limit requests with a simple in-memory limit.
- Log only status codes and timings, never request or response bodies.
- Use the prompt version and model ID as part of the cache key (FR-4).

## Model choice (Open Question 1)
- Choose on quality and on how reliably the model follows a JSON schema, not on price (R8). Cheap models cost about $0.002 per Note.
- Avoid the Gemini free tier for real Notes, because of its data-use terms (R8).
- Run a quality comparison on the reference notes before deciding.
