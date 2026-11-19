---
title: Reconciliation review — ARCHITECTURE-SPINE vs. PRD, addendum, UX spines, reference notes
reviewed: ARCHITECTURE-SPINE.md (updated 2026-11-19) + .memlog.md
inputs: prd.md (final 2026-11-12), addendum.md, EXPERIENCE.md (final 2026-11-12), DESIGN.md (front matter), reference-notes/README.md
date: 2026-11-19
lens: what in the inputs did not land at architecture altitude, and where the spine contradicts an input
---

# Reconciliation review

## Verdict

**Revise before epics.** The spine is sound in shape (stack, logic split, contract, storage, Demo path, privacy) and resolves the three architecture-tagged `[OPEN]` items in EXPERIENCE.md (component library, `lang` attribute, Consent storage location). It has no critical defect, but it has **9 high findings**: two direct contradictions of confirmed PRD values (FR-11 90 s budget, FR-1 encoding fallback), one seam that cannot be built as written (Fixture recording from Python while Normalization lives only in TypeScript), a missing identity (Item ID) that four requirements depend on, and several failure paths (NFR-8, FR-15, error codes, cache lookup) that are left for epics to invent independently, which is exactly what a spine is meant to prevent.

Counts: critical 0 · high 9 · medium 14 · low 8.

## Findings

Each finding: **severity · source · problem · suggested fix (AD rule wording)**.

---

### High

#### R-1 · high · Generation time budget contradicts FR-11 (90 s) and is cut by the Next.js rewrite

- **Source:** PRD FR-11 ("The request times out after 90 seconds"), PRD §11 (confirmed value), EXPERIENCE.md State Patterns › Generating ("Times out at 90 s"), NFR-4.
- **Problem:** AD-7 sets `GENERATION_TIMEOUT_S=60` *per attempt* with one retry, so the student can wait 120 s plus model time before `err.generation`, against a confirmed 90 s. The memlog (timeouts decision) does not record this as a deviation (DR-4). In addition, AD-5 routes every call through a Next.js rewrite; Next's rewrite proxy has its own default proxy timeout (`experimental.proxyTimeout`, 30 s by default — verify against Next 16.4), which would cut a 60 s generation and a 30 s Simpler call short with a socket error, independent of the Proxy's own timeouts. The browser has no stated overall timeout either, so a hung connection has no bound.
- **Fix (amend AD-7, AD-5):** "The generation budget is **90 s end to end**, measured in the browser from submission. The browser aborts the request with `AbortController` at 90 s and shows `err.generation`. The Proxy splits its budget across the two attempts: `GENERATION_TIMEOUT_S` is the per-attempt limit and `2 × GENERATION_TIMEOUT_S + overhead ≤ 85 s` (start value 40 s); the retry is skipped when less than `GENERATION_TIMEOUT_S` remains. The Simpler budget is 15 s end to end (NFR-4) with `SIMPLER_TIMEOUT_S` sized the same way, or no retry for `/api/simpler`. `next.config` sets the rewrite proxy timeout above the browser budget (≥ 95 s). Any departure from 90 s is recorded as a PRD update (DR-4)."

#### R-2 · high · Fixture recording cannot produce browser-identical Passages and Note Hashes

- **Source:** AD-3 (Normalization, Passage splitting, Note Hash exist only in TypeScript), AD-8 (each reference note must hash to its Fixture's `noteHash`), AD-12 (`proxy/scripts/record_fixtures.py` records Fixtures), FR-23, DR-2.
- **Problem:** `record_fixtures.py` is Python, but the Passages and Note Hash it must send to the model can only be produced by the TypeScript pipeline (`extract/` + `core/`). As written, the script would have to re-implement extraction and Normalization in Python, which AD-3 forbids and which would make the Fixture-hash test fail on the first drift. The seam between the two runtimes for recording is undefined.
- **Fix (amend AD-12):** "Fixture recording is a two-step pipeline. (1) A Node script `web/scripts/export-passages.ts` runs the real `extract/` + `core/` code on each file in `reference-notes/` and writes `{noteHash, passages}` JSON. (2) `proxy/scripts/record_fixtures.py` reads that JSON, calls the live model through the same `llm.py` path, and writes `proxy/fixtures/{noteHash}.json` with the raw response, `model`, `promptVersion` and the Simpler responses (see R-4). No Python code splits or normalizes Note text."

#### R-3 · high · FR-1 encoding fallback is impossible with `File.text()`

- **Source:** PRD FR-1 ("A `.txt` or `.md` file that is not valid UTF-8 is decoded with a fallback encoding, and `warn.encoding` is shown"); EXPERIENCE.md `warn.encoding`.
- **Problem:** AD-8 specifies `.md` and `.txt` via `File.text()`. `File.text()` always decodes as UTF-8 and silently substitutes U+FFFD; it cannot detect invalid UTF-8, so `warn.encoding` can never fire and Norwegian `æ/ø/å` from a Windows-1252 file become replacement characters — which also changes the Note Hash and breaks Quotes.
- **Fix (amend AD-8):** "`.md` and `.txt` are read with `File.arrayBuffer()` and decoded with `new TextDecoder('utf-8', {fatal: true})`; on a decoding error they are decoded with `TextDecoder('windows-1252')` and the extraction result carries the warning key `warn.encoding`. A UTF-8 BOM is stripped before Normalization."

#### R-4 · high · No Item identity

- **Source:** PRD FR-15 (resume at first unanswered Item; answered questions kept and scored), FR-18 (last-used Quiz Question per concept, rotation), FR-21 (stores last-used Quiz Question), FR-23 (Simpler Explanations served from Fixtures), FR-22 (export/import restores Items and progress), EXPERIENCE.md Banner ('Fortsett' resumes at the first unanswered Item).
- **Problem:** AD-9 defines Note Hash, Passage ID, Key Concept ID and cache key, but no Item ID. Round progress, Quiz Question rotation, Demo-mode Simpler lookup and import all need a stable reference to one Flashcard or Quiz Question. Without a spine rule, epics will use array indexes in one place and content hashes in another, and progress will attach to the wrong Item after a regeneration.
- **Fix (add to AD-9):** "**Item ID** = `{type}-{keyConceptId}-{n}` (`fc`, `qq`, `sp`), `n` = 1-based order within its concept as returned by the Proxy after trimming, assigned in `core/` before the Quote Check (so IDs do not shift when Items are dropped). Item IDs are unique within a Study Set and are only valid with its cache key. Round progress and last-used Quiz Question store Item IDs; after a regeneration (new cache key) stored Item IDs are discarded, Mastery States are kept per AD-9. Demo Simpler Fixtures are keyed by `{noteHash}` + Item ID."

#### R-5 · high · Cache lookup cannot work as written; opening a stored Note must not need the Proxy

- **Source:** PRD FR-4 (cache key = Note Hash + prompt version + model; cache hit makes no AI call), FR-25 (opening a row makes no AI call), EXPERIENCE.md State Patterns › Offline ("local study of stored Notes continues"); memlog Proxy API decision ("/api/status … feeds FR-4 cache key").
- **Problem:** AD-9 says the cache key is "taken from the response metadata, never from `/api/status`". That is right for *writing*, but to *detect* a cache hit before calling the Proxy, the browser needs the current `promptVersion` and `model` — which only `/api/status` provides. The spine contradicts its own memlog here. It is also unstated what happens when a stored Note is opened from 'Dine notater' while the Proxy is down, the key is missing, or the model has changed since: the PRD expects the stored Study Set to open with no AI call.
- **Fix (amend AD-9):** "The cache key is **written** from the response (or Fixture) metadata. It is **looked up** with `promptVersion` and `model` from `/api/status` (live) or from the Fixture metadata (demo). Opening a Note from 'Dine notater' or Arkiv uses the most recently stored valid Study Set for that Note Hash, whatever its key, and makes no Proxy call. Only supplying content again (upload/paste, FR-4) compares against the current key and regenerates on a mismatch."

#### R-6 · high · Error code catalogue missing; `err.rateLimited` is not a Microcopy key and contradicts FR-11

- **Source:** PRD FR-11 (429, 5xx, timeouts and network failures show `err.generation`), FR-16 (`simpler.fail`), NFR-9 (message keys from EXPERIENCE.md › Microcopy), EXPERIENCE.md Microcopy (no `err.rateLimited`).
- **Problem:** AD-5 returns `err.rateLimited`; AD-6 says every `code` is a Microcopy key. No such key exists, and FR-11 requires a 429 to show `err.generation`. Nor does the spine say which codes each endpoint may return, what the browser shows for a network failure (no HTTP response at all), or that every `/api/simpler` failure ends as `simpler.fail` (not `err.generation`).
- **Fix (add to AD-6):** "Error catalogue: `/api/study-set` → `err.noKey` (503), `err.demoOnly` (404, demo unknown hash), `err.generation` (502/504/429 — the 429 from the rate limiter also uses `err.generation`), `err.badRequest` (400, internal only). `/api/simpler` → any failure is shown as `simpler.fail` with the Item's Quote. The `api/` client maps a network error, an abort, a non-JSON body or an unknown code to `err.generation` (or `simpler.fail` for Simpler). Every code the browser can show exists in `messages.ts`; a test asserts the Proxy's code enum ⊆ Microcopy keys."

#### R-7 · high · NFR-8 failure paths: double submit and leaving mid-generation are not owned

- **Source:** PRD NFR-8 (double submit sends one generation; reload mid-generation caches nothing), NFR-5 (budget), FR-11 (second upload disabled while pending), FR-16 (one call per request), EXPERIENCE.md Button (`aria-disabled` while pending), `gen.back`.
- **Problem:** AD-10 covers "no partial Study Set cached", but nothing in the spine guarantees *one request* when submit or 'Prøv igjen' is pressed twice, or says what happens to a late response after the student pressed 'Tilbake til start' or opened another Note. A UI-only `aria-disabled` is not enough (two tabs, fast double key press before re-render).
- **Fix (add to AD-11 or new AD):** "`api/` is single-flight: at most one `/api/study-set` request per Note Hash and at most one `/api/simpler` per Item ID are in flight; a second call returns the pending promise. Every request carries an `AbortSignal`; leaving Genererer aborts it, and a response that arrives for a Note that is no longer the open `NoteSession` is discarded, never written. Playwright tests double submit, double 'Prøv igjen' and reload mid-generation (NFR-8)."

#### R-8 · high · FR-15 interruption: the Round is not a persisted entity, and writes are not atomic

- **Source:** PRD FR-15 (each answer saved at once; after reload answered questions kept and scored, Round marked *incomplete*), FR-13 (marks update Mastery), FR-18 (last-shown time), EXPERIENCE.md Banner (`banner.interrupted` "{n} av {m} besvart", 'Fortsett' resumes at first unanswered Item, 'Ny runde' keeps answered Items scored).
- **Problem:** AD-10 says "Round progress is written after every answer", but the spine does not say that the composed Round (concept list, Item order, chosen Quiz Question per concept) is persisted when it starts, which is the only way 'Fortsett' can resume the same Round and the banner can show "{n} av {m}". It also does not say that a mark/answer, the Mastery update and the Round progress are one write; a reload between two separate writes double-applies or loses a signal.
- **Fix (amend AD-10):** "A Round is stored as a record `{roundId, noteHash, cacheKey, startedAt, itemIds[], answers[], status: active|complete|abandoned}` written when the Round starts; last-shown times are updated in the same transaction. Each Flashcard mark or Quiz answer is written in **one IndexedDB transaction** together with the resulting Mastery State. On load, an `active` Round is shown as *incomplete*; 'Ny runde' sets it to `abandoned` without touching recorded answers."

#### R-9 · high · Passage splitting needs line structure that Normalization removes

- **Source:** PRD Glossary › Normalization ("collapsed whitespace and line breaks"), Glossary › Passage (split by paragraph, then by sentence beyond a limit), AD-8 pipeline order, AD-8 table rule (one row = one line), reference-notes README (headings, lists, tables, code sample).
- **Problem:** AD-8 orders the pipeline as Extracted Text → Normalization → Passages. If Normalization collapses line breaks first, there are no paragraph boundaries left to split on, and the AD-8 rule "one table row becomes one line" is erased by the next step. The source panel then shows one wall of text. The Deferred table hands "exact Normalization and Passage-splitting rules" to `core/`, but the *order* and the paragraph-boundary contract are architecture.
- **Fix (amend AD-8):** "Pipeline order: Extracted Text (lines) → paragraph split on blank lines (each table row and list item is its own paragraph) → per-paragraph Normalization (collapse whitespace *within* the paragraph) → sentence split over the limit → Passages. The Note Hash is computed over the normalized Passages joined with `\n\n`. The source panel renders Passages, never the raw text."

---

### Medium

#### R-10 · medium · Summary Point floor and concept count after browser-side drops are unassigned

- **Source:** PRD FR-7 ("If fewer than 5 Summary Points remain after drops, the generation counts as failed under FR-8 and the student sees 'Prøv igjen'"; Summary Points dropped "in the same way as an Item that fails the Quote Check"), AD-9 (concept ID collision drops the later concept and its Items).
- **Problem:** AD-3 gives the Proxy the Summary Point word limit and FR-10 minimums to the browser, but the "< 5 Summary Points after Quote Check drops" rule needs the Quote Check, which only the browser can run. AD-9 can also drop concepts below 5 after the Proxy accepted the count. Neither case is assigned; neither is in the FR-10 minimums AD-3 lists, and the PRD says it "counts as failed under FR-8", which elsewhere implies a retry the browser is forbidden to make (AD-7).
- **Fix (amend AD-3/AD-7):** "The browser's post-check (`core/`) fails a Study Set when, after Quote Check and ID de-duplication, fewer than 5 Summary Points, fewer than 5 Key Concepts, fewer than 5 Flashcards or fewer than 5 Quiz Questions remain. A Summary-Point or concept shortfall shows `err.generation`, a Flashcard/Quiz shortfall `err.tooFewItems`; none is retried automatically and none is cached. (Record the no-auto-retry reading of FR-7 as a PRD note, DR-4.)"

#### R-11 · medium · Origin check rejects same-origin GETs; rate-limit scope undefined

- **Source:** PRD NFR-3, addendum › Proxy (check `Origin`, in-memory counter per origin), AD-5, memlog wiring decision ("Proxy origin check must accept what Next forwards").
- **Problem:** Browsers do not send an `Origin` header on same-origin `GET` requests, so `GET /api/status` fails a strict Origin check. The memlog flags "what Next forwards" as open; the spine does not settle it. It also does not say whether `/api/status` and Demo requests count toward the 10/min limit — a fast Demo walkthrough with several 'Forklar enklere' presses (UJ-3, examiner) could hit 429.
- **Fix (amend AD-5):** "The Proxy accepts a request when `Origin` equals `ALLOWED_ORIGIN`, or when `Origin` is absent and the method is `GET`. The rate limit counts only `POST` requests with `mode: "live"`; `/api/status` and Demo requests are not counted. (Record this reading of NFR-3 in the memlog.)"

#### R-12 · medium · Explain Simpler grounding contract is incomplete

- **Source:** PRD FR-16 (Simpler Explanation with its own Quote that passed the Quote Check, else `simpler.fail` with the Item's Quote), FR-23 (Simpler served from Fixtures), Glossary › Simpler Explanation.
- **Problem:** AD-6 sends one Passage to `/api/simpler`, but the spine does not say that the Simpler Quote must cite that same Passage ID, that the browser re-checks it against its own stored Passage (not text echoed back by the Proxy), whether Simpler Explanations are persisted, or how Demo Fixtures hold them (see R-4).
- **Fix (add to AD-6):** "A `SimplerExplanation` cites exactly the Passage ID it was sent. The browser runs the Quote Check against its stored Passage of that ID; a failure, a different Passage ID or any request error shows `simpler.fail` with the Item's Quote. Simpler Explanations are not persisted in v1. Demo Fixtures contain one recorded Simpler response per Flashcard and Quiz Question, keyed by Item ID; a missing entry returns `simpler.fail`."

#### R-13 · medium · FR-22 import validation not specified

- **Source:** PRD FR-22 (invalid or incompatible file rejected with `import.invalid`; existing progress left untouched), EXPERIENCE.md State Patterns › Import invalid.
- **Problem:** The spine only defines the export shape (Consistency Conventions). Import needs a runtime validator (generated TS types are compile-time only), a compatibility rule, a Note Hash integrity check, and all-or-nothing write semantics — otherwise "existing progress untouched" is not guaranteed.
- **Fix (amend AD-10):** "Import is validated before any write: JSON parses; `schemaVersion` is known; the shape passes the runtime validator in `storage/` (the same one used to detect corrupt stored data); the Note Hash recomputed from the imported Extracted Text equals the stored `noteHash`; every Item passes the Quote Check. Any failure → `import.invalid` and nothing is written. A valid import replaces that Note's records in one IndexedDB transaction."

#### R-14 · medium · Browser has no runtime validator for stored data

- **Source:** PRD FR-21 (unknown or corrupt data reset safely with `storage.reset`, no crash), addendum › Structured output (Zod or Pydantic).
- **Problem:** AD-10 requires detecting corrupt data, but AD-4's generated types give no runtime check, and the Stack has no validation library on the browser side. Each epic would hand-roll checks.
- **Fix (amend AD-10 + Stack):** "`storage/` validates every record it reads with one runtime schema per record type (Zod, generated or hand-written beside the record type — not a duplicate of API contract types); a failing record is dropped and reported once as `storage.reset`." Add Zod to the Stack table.

#### R-15 · medium · FR-8 prompt-injection defence is not an architecture rule

- **Source:** PRD FR-8 ("The Note is passed to the model as delimited data… a test Note with an injected instruction…"), §1.3.
- **Problem:** Prompt wording is deferred, but *how Note text enters the prompt* is a structural safety rule, and the injection test is not bound by AD-18 (it needs a live model, so it cannot run in the keyless CI).
- **Fix (add to AD-13 or AD-7):** "Note text reaches the model only as data: Passages are serialized as JSON inside the user message under a fixed delimiter, never interpolated into the system prompt; the system prompt states that content inside the delimiter is data. A reference test note with an injected instruction is part of the DR-3 live run (and recorded as a Fixture so CI asserts the injected token is absent from the stored Study Set)."

#### R-16 · medium · NFR-5 asks the architecture to state expected cost; NFR-4 not reconciled

- **Source:** PRD NFR-5 ("The architecture states the expected cost per Note"), NFR-4 (first Flashcard ≤ 60 s for 3,000 words; Simpler ≤ 15 s), addendum › Model choice (~$0.002/Note Haiku 5.5 or gpt-6-luna, ~$0.006 Flash-Lite).
- **Problem:** NFR-4 and NFR-5 are not in `binds`, and the spine states no cost. `SIMPLER_TIMEOUT_S=30` already exceeds the 15 s Simpler target.
- **Fix:** Add NFR-4, NFR-5 to `binds`; add to AD-13: "Expected cost per generation ≤ 2 calls ≈ $0.002–0.006 per Note at 2026-11 prices (≤ $0.012 with retry); Explain Simpler ≈ one tenth of that per call; re-measured in the model comparison. NFR-4 is measured in the model comparison on the 3,000-word reference note and the timings set the `.env` timeouts."

#### R-17 · medium · FastAPI's default validation errors and library loggers can leak Note text

- **Source:** NFR-2 (no request/response bodies in logs), AD-14, AD-6 (every error is `{code}`).
- **Problem:** FastAPI's default `RequestValidationError` handler returns 422 with the offending `input` echoed in `detail` (Note text in the response, and in any logged error), which also breaks the `{code}` contract. Unhandled exceptions print tracebacks that may include request data; `httpx`/`openai`/pydantic-ai loggers and pydantic-ai's optional Logfire instrumentation can log prompts.
- **Fix (amend AD-14):** "The Proxy overrides the `RequestValidationError` and generic exception handlers to return `{code}` without echoing input; uvicorn's access log is replaced by the guard's own log line; `httpx`, `openai` and `pydantic_ai` loggers are set to `WARNING`; Logfire/OTel instrumentation is not installed. The NFR-2 marker test also covers a malformed request and a provider error."

#### R-18 · medium · Consent gate: Radix Dialog defaults contradict the UX, and the gate has no single choke point

- **Source:** EXPERIENCE.md Dialog ("Native modal dialog"; "Consent gate cannot be dismissed without a choice"; delete dialog initial focus 'Avbryt'), Toggle ("Native checkbox with `role="switch"`"), PRD FR-5 ("No generation request is sent until Consent is recorded").
- **Problem:** AD-15 uses Radix Dialog and Switch where EXPERIENCE.md says native `<dialog>` and a native checkbox. Radix Dialog closes on Esc and outside click by default, which would let the Consent gate be dismissed without a choice. Separately, FR-5's "no request until Consent" is enforced nowhere specific; any screen calling `api/` could bypass it.
- **Fix (amend AD-15, AD-12):** "Radix Dialog and Switch replace the native elements named in EXPERIENCE.md; the EXPERIENCE.md behaviour rules still apply. The Consent dialog sets `onEscapeKeyDown` and `onPointerDownOutside` to `preventDefault`. — The `api/` client refuses a `mode: "live"` request unless `storage/` reports Consent `accepted`, returning `consent.declined`; this is the only Consent check for network calls."

#### R-19 · medium · `/api/status` failure path at startup is undefined

- **Source:** PRD FR-5 (Consent names the provider), FR-24, EXPERIENCE.md State Patterns › Offline, Consent & Privacy (provider name `[OPEN]` → AD-13).
- **Problem:** The Consent dialog on first open needs `provider` from `/api/status`. If the Proxy is not up yet (Compose start order) or down, the spine says nothing: no provider name, unknown `keyConfigured`, possibly a blocked first screen.
- **Fix (amend AD-6):** "The browser calls `/api/status` with a short retry (3 tries, 1 s apart) at startup. Until it answers, the Consent text uses the static fallback provider name 'OpenRouter' from `messages.ts`, and live submit is disabled with `err.generation`; Demo Mode and stored Notes remain usable. Compose declares a healthcheck on `proxy` and `web` `depends_on: condition: service_healthy`."

#### R-20 · medium · Demo sample notes have no delivery path to the browser

- **Source:** PRD FR-23 (student picks a bundled sample note; recognized by Note Hash), UJ-3, EXPERIENCE.md Demovelger, reference-notes/README.md (the reference notes are the sample notes).
- **Problem:** Demovelger must feed the actual sample files through `extract/` so their hash matches the Fixture, but the spine does not say where the browser gets them. `reference-notes/` is outside the `web` build context.
- **Fix (amend AD-12 + Structural Seed):** "The three reference notes are copied into `web/public/samples/` at build time (Compose build context includes `reference-notes/`), with a manifest `{file, title, language}`. Choosing a sample fetches the file and runs the normal pipeline; no shortcut hash table exists."

#### R-21 · medium · Quiz option uniqueness is a text comparison assigned to the Proxy

- **Source:** PRD FR-7 ("exactly four unique options and exactly one correct option… dropped in the same way as an Item that fails the Quote Check"); AD-3 ("The Proxy never normalizes or compares Note text").
- **Problem:** AD-3 puts "options per question" in the Proxy, but "unique" requires comparing option strings, and whether "Ja" and "ja " are duplicates depends on Normalization, which lives only in the browser.
- **Fix (amend AD-3):** "The Proxy checks option count (4) and correct-index range. Option uniqueness is checked in `core/` after Normalization, and a duplicate drops the Quiz Question like a Quote Check failure."

#### R-22 · medium · No harness for SM-1 to SM-3, the model comparison, and the DR-3 run

- **Source:** PRD DR-3 (documented run measuring SM-1 to SM-3), SM-3 (pass rate), Open Question 1 / AD-13 (comparison on the reference notes before prompt tuning), reference-notes/README.md (purposes 1 and 3).
- **Problem:** AD-13 depends on a comparison "on the reference notes", and DR-3 on a measurement run, but no component owns computing the Quote Check pass rate per note and model. Fixtures are raw responses, so the TS Quote Check could compute SM-3 from them directly.
- **Fix (amend AD-12/AD-18):** "`web/scripts/evaluate.ts` runs `core/` validation and Quote Check over any set of recorded raw responses (Fixtures or comparison runs) and writes a per-note report: concepts, Items generated/passed (SM-3), and a sample list for the SM-2 spot check. The model comparison records one response set per candidate model with `record_fixtures.py --model`."

#### R-23 · medium · FR-21 storage contents incomplete: Note title, Demo Mode, shortcuts, theme default

- **Source:** PRD FR-25 (row shows the Note's title), FR-23 (Demo Mode switchable at any time), EXPERIENCE.md Innstillinger ('Hurtigtaster', 'Demomodus' toggles, persisted), Foundation (theme default follows `prefers-color-scheme`; manual toggle overrides), Generation progress (filename · words · Passages).
- **Problem:** AD-10's lists omit the Note title/source file name, word count, Demo Mode state and the shortcuts setting. AD-15 sets `data-theme` from localStorage but never says the default follows the OS when nothing is stored.
- **Fix (amend AD-10, AD-15):** "Note record also holds `title` (file name without extension, or the first line of pasted text, ≤ 80 chars), `sourceType`, `wordCount`, `passageCount`. Settings also hold `demoMode` and `shortcuts`. — With no stored theme, the pre-render script sets `data-theme` from `prefers-color-scheme`; while the dark-mode flag is off, it always sets light."

---

### Low

#### R-24 · low · Permanent delete across cache-keyed Study Sets
- **Source:** PRD FR-26 (delete removes Extracted Text, Study Set, Mastery States, Round progress; re-supply gives all concepts *new*).
- **Problem:** AD-10 keys Study Sets by cache key, other data by Note Hash; a delete keyed by Note Hash leaves old-model Study Sets behind.
- **Fix:** "Every IndexedDB store has a `noteHash` index; delete and archive operate on all records with that Note Hash in one transaction."

#### R-25 · low · Consent storage consequence for UJ-2 failure path not stated
- **Source:** EXPERIENCE.md UJ-2 failure ("Whether the Consent gate reappears depends on where Consent is stored `[OPEN]`").
- **Problem:** AD-10 resolves the location (localStorage) but not the consequence, so the `[OPEN]` is not visibly closed.
- **Fix:** Add to AD-10: "If the browser clears storage, the Consent gate reappears on next open; if localStorage is unavailable, Consent is held in memory and asked once per session. This closes the EXPERIENCE.md UJ-2 `[OPEN]`." Mark the three architecture `[OPEN]` items as closed in the memlog with AD references.

#### R-26 · low · Consent copy accuracy with ZDR routing
- **Source:** EXPERIENCE.md Consent & Privacy (B) "the provider does not train on Notes (paid tier)"; memlog OpenRouter verification ("the actual inference host may be a cloud provider").
- **Problem:** With `{zdr: true}` the inference host may be Google Vertex, Bedrock or Azure, not the model's maker. AD-13 says Consent names "OpenRouter and the model's maker", which may be inaccurate about who processes the Note.
- **Fix:** AD-13: "`/api/status.provider` is 'OpenRouter'; 'Les mer' (B) states that OpenRouter routes only to endpoints with zero data retention and no training, and names the model. The exact Consent string is approved by Tor."

#### R-27 · low · Key Concept slug rules for Norwegian letters
- **Source:** PRD Glossary › Key Concept (ID from normalized name), reference-notes expected concepts (æ/ø/å, "Sprintkø").
- **Problem:** AD-9 says "slug" without saying whether non-ASCII letters survive; a naive ASCII slug merges "kø"/"ko" and increases collision drops.
- **Fix:** AD-9: "Slug = lowercase, NFKC, Unicode letters and digits kept, every other run replaced by `-`."

#### R-28 · low · Concept reference inside Items not stated
- **Source:** AD-6 ("Concept entries carry names, never IDs"), PRD Glossary (every Flashcard/Quiz Question belongs to exactly one Key Concept).
- **Fix:** AD-6: "Items are nested under their concept in `StudySet` (no cross-reference by name); `core/` derives IDs from the parent concept."

#### R-29 · low · `.env` must reach only the Proxy container
- **Source:** NFR-1.
- **Fix:** AD-14: "`compose.yaml` passes `.env` via `env_file` to `proxy` only; `web` has no `env_file` and no `NEXT_PUBLIC_*` variables." Optionally `NEXT_TELEMETRY_DISABLED=1`.

#### R-30 · low · README obligations that the spine creates
- **Source:** PRD FR-21 (README documents last-write-wins and the storage warning), DR-1, AD-8 (OMML limitation).
- **Fix:** One line in AD-2 or Deferred: "README documents: `docker compose up`, Demo default, test command, OMML limitation, last write wins across tabs, browser storage deletion warning."

#### R-31 · low · Capability map and `binds` drift
- **Source:** spine Capability map (FR-11–FR-16 governed by AD-6, AD-11, AD-15 only), front-matter `binds` (no NFR-4, NFR-5).
- **Fix:** Add AD-7 and AD-10 to the FR-11–FR-16 row (FR-11 timeouts, FR-15 persistence); add NFR-4/NFR-5 once R-16 lands.

## Closed by the spine (no action)

- EXPERIENCE.md `[OPEN]` component library → AD-15. `[OPEN]` Note-language `lang` → AD-16. `[OPEN]` provider name in Consent → AD-13 (wording, see R-26). `[OPEN]` Consent storage → AD-10 (consequence, see R-25).
- FR-3 parse time limit (left to architecture) → AD-8, 15 s Worker.
- Addendum storage question (localStorage vs IndexedDB) → AD-10.
- PRD Open Question 1 → AD-13 (provisional model, mechanism bound).
- Tone/voice: no raw provider errors reaches the UI → AD-6 + Consistency Conventions › Errors.
- Should cutoff with hidden entry points → AD-17.
- Reference-note extraction learnings (table rows, OMML, PDF headers) → AD-8.
