---
review: adversary
target: ../ARCHITECTURE-SPINE.md (status draft, updated 2026-11-19)
context: ../../../prds/prd-G75-andersen-drage-2026-11-05/prd.md
date: 2026-11-19
method: For each hole, two units one level down (epic or story) that each obey every AD to the letter, yet build incompatibly. Each hole gets a proposed AD rule (new or tightened) that closes it.
---

# Adversarial Review: Architecture Spine v1

## Verdict

**Not ready for epics as written.** The spine is strong on the process boundary (AD-3 to AD-7, AD-12 to AD-14) and on styling and tooling. Its weak side is the **shared data inside the browser**. It names the entities (Study Set, Mastery State, Round progress, export) but never fixes their shapes, their identities or who writes them. Two AI agents working on two stories, each obeying every AD, will invent different shapes for the same records. Three holes are critical:

1. Items have no identity (H-1).
2. A cache hit for FR-4 needs a key that AD-9 forbids computing before a call (H-2).
3. The stored Study Set has no defined post-Quote-Check shape (H-3).

The same-origin guard (H-6) and the timeout chain (H-7) are high and will break the demo path at runtime, not just on paper.

About 6 to 8 tightened or new ADs close every critical and high hole. Most are short shape definitions in `core/`, not new mechanisms.

## Summary table

| ID | Hole | Severity | Units in conflict |
| --- | --- | --- | --- |
| H-1 | No Item identity (Flashcard, Quiz Question, Summary Point) or Item→concept link | critical | Round composition story vs Round progress/resume story vs Simpler story |
| H-2 | FR-4 cache lookup is impossible under AD-9's "never from `/api/status`" | critical | Known-Note story vs generation epic |
| H-3 | Stored Study Set shape before/after Quote Check undefined; generated type vs browser type | critical | Generation/Quote Check story vs Round/Overview epic |
| H-4 | Summary Point floor and concept floor after browser-side drops have no owner | high | Proxy validation story vs Quote Check/FR-10 story |
| H-5 | Consent/Demo/key gate has no single owner and no defined order | high | Consent story vs upload story vs Demo story vs Simpler story |
| H-6 | Origin guard rejects same-origin GET; `localhost` vs `127.0.0.1` | high | Proxy guards story vs startup/status story |
| H-7 | Timeout chain: 2 × 60 s Proxy vs 90 s FR-11 vs Next rewrite timeout; Simpler retry vs NFR-5 | high | Proxy retry story vs API client story vs Simpler story |
| H-8 | Round progress shape, write timing of last-shown/last-used, non-atomic writes | high | Round composition story vs FR-15 interruption story vs Mastery story |
| H-9 | Schema-version bump wipes all data; additive fields from later stories | high | Storage story (Tier 2) vs Should stories (FR-26, FR-27) |
| H-10 | Mastery/per-concept record shape and two writers to one record | medium | Mastery story vs Round story vs FR-4 regeneration story |
| H-11 | Simpler Explanation: Quote Check target, storage, and Demo Fixture lookup | medium | Simpler story vs Demo/Fixture story |
| H-12 | Stored text: Extracted Text vs normalized Passages; Normalization change orphans Notes | medium | Extraction story vs persistence story vs source panel story |
| H-13 | Demo and live share cache key and Mastery; Demo mode setting not stored | medium | Demo story vs persistence story vs e2e story |
| H-14 | Quiz option order and answer index across reload | medium | Quiz UI story vs scoring/FR-15 story |
| H-15 | Rate limit 10/min breaks e2e and counts Demo and `/api/status` | medium | Proxy guards story vs Playwright story |
| H-16 | Note title not in any shape; changes per upload | medium | Library story vs upload story |
| H-17 | 'Dine notater' Readiness: recompute vs stored copy; NoteSession covers only one Note | medium | Library story vs NoteSession story |
| H-18 | Settings "read synchronously before first render" vs Next.js server render | medium | Consent/theme story vs app shell story |
| H-19 | Export format = internal records; import merge vs replace; which schemaVersion | medium (Should) | Export story vs storage story |
| H-20 | Centrality Rank validity and ties after drops | low | Proxy validation story vs Round composition story |
| H-21 | `language` allow-list owner, and Simpler `language` vs Study Set `language` | low | Proxy story vs i18n/AD-16 story |
| H-22 | "Last practiced" trigger undefined | low | Library story vs Round story |
| H-23 | Double submit dedupe owner (NFR-8) | low | API client story vs upload UI story |

---

## Critical

### H-1: Items have no identity, and Items have no defined link to their concept

**Pair.** *Story A: Round composition (FR-18)* stores "last-used Quiz Question per concept" as the array index of the question within the concept (`lastUsedQuizIndex: 1`). *Story B: FR-15 interruption* stores answers as `{questionText, selected}` because it has no ID to use. *Story C: Simpler (FR-16)* sends the whole Item object in `item` and keys any display state by the Flashcard front text.

All three obey AD-9, because AD-9 defines IDs for Notes, Passages and Key Concepts only. It defines none for Flashcards, Quiz Questions or Summary Points. Index-based IDs break as soon as the Quote Check drops an Item: is the index before or after the drop? Text-based keys break on a regeneration. FR-18 rotation, FR-15 resume and FR-22 export all need a stable Item reference.

AD-6 also says "Concept entries carry names, never IDs", but never says how an Item points at its concept: nested under it, by name, or by index. The AD-9 rule "the later one and its Items are dropped" assumes a link that is not defined.

**Proposed rule (extend AD-9):**
> **Item ID** is derived in `core/` after the Proxy response and before the Quote Check: `{keyConceptId}-f{n}` for Flashcards, `{keyConceptId}-q{n}` for Quiz Questions, `s{n}` for Summary Points, where `n` is the 1-based position in the response as received from the Proxy (after Proxy trimming, before any browser drop). IDs are never renumbered after drops. In the contract (AD-6), Flashcards and Quiz Questions are nested inside their concept entry; Summary Points are a top-level list. Every stored reference to an Item (Round progress, last-used Quiz Question, answers, export) uses the Item ID.

### H-2: A cache hit for FR-4 needs a key that AD-9 forbids computing before a call

**Pair.** *Story A: Known Note (FR-4)* must decide **without an AI call** whether a cached Study Set exists. *Story B: generation epic* follows AD-9: "Study Set cache key = `{noteHash}:{promptVersion}:{model}`, taken from the response metadata, never from `/api/status`."

Story A cannot know `promptVersion` and `model` until it has a response, so it either always calls (breaks FR-4 and NFR-5) or quietly uses `/api/status` (breaks AD-9). A third agent could take "the latest Study Set for this noteHash", which ignores a model change entirely.

The case of opening a Note from 'Dine notater' after a `PROMPT_VERSION` bump is also undefined. Should it show the stale set or regenerate?

**Proposed rule (replace the cache-key bullet in AD-9):**
> The cache key is written from response metadata. It is **looked up** with `promptVersion` and `model` from `/api/status` (fetched at startup). On a supplied Note (upload/paste): exact-key hit → reconnect, no call; miss → generate. On opening from 'Dine notater': show the Note's **current** Study Set (the last one written for its Note Hash), even when its key no longer matches `/api/status`. No automatic regeneration ever happens; regeneration happens only on re-supply or "Prøv igjen". Each Note record holds `currentStudySetKey`. In Demo mode the lookup uses the Fixture's recorded metadata (see H-13).

### H-3: The stored Study Set shape before and after the Quote Check is undefined

**Pair.** *Story A: generation + Quote Check (FR-9, FR-10)* obeys AD-4 ("no hand-written duplicate of a contract type"). It stores the generated `StudySet` type with failing Items removed and concepts with no Items removed too. *Story B: Overview/Round epic* needs "not covered" concepts shown in the concept list (FR-10) and excluded from the Readiness Score (FR-19), and expects them present with empty Item lists plus `keyConceptId` and a coverage flag.

A third agent stores the **raw** response and re-runs the Quote Check on every load, which is also AD-legal: "the shell calls the core". The three shapes are mutually incompatible, and the stored-records-as-export rule (H-19) makes the choice public.

AD-4 actively pushes agents toward the wrong answer. The browser-only, post-check type has no home, so an agent will either bend the generated type or hand-write a near-duplicate.

**Proposed rule (new AD, "Verified Study Set"):**
> The browser never stores or renders the contract `StudySet`. `core/verify.ts` exports one function `verifyStudySet(raw: StudySet, passages: Passage[]): VerifyResult` that assigns Key Concept IDs and Item IDs (AD-9), drops duplicate-ID concepts, runs the Quote Check, applies the FR-10 and Summary Point floors (H-4), and returns either `{ok: false, code}` or `{ok: true, set: VerifiedStudySet}`. `VerifiedStudySet` is defined once in `core/types.ts` as a browser type, not a contract duplicate: it keeps **every** concept, with `covered: boolean` and only surviving Items, and also holds `model`, `promptVersion`, `language` and `cacheKey`. Only `VerifiedStudySet` is persisted, rendered and exported. Raw responses are never stored.

---

## High

### H-4: The Summary Point floor and the concept floor after browser-side drops have no owner

**Pair.** *Story A: Proxy validation* drops Summary Points over 40 words and fails with retry when fewer than 5 remain (AD-3, AD-7). That is correct. *Story B: Quote Check + FR-10* checks only "fewer than 5 Flashcards or 5 Quiz Questions", which is exactly what FR-10 says.

FR-7, however, says a Summary Point is dropped "in the same way as an Item that fails the Quote Check", and that fewer than 5 **after drops** is a failed generation. Quote Check drops happen in the browser, after the Proxy has finished. So a set with 7 Summary Points from the Proxy and 3 after the Quote Check passes both stories and is cached, which breaks FR-4 ("only a Study Set that … meets the minimum").

The same gap applies to Key Concepts. AD-9 drops duplicate-ID concepts in the browser, which can take a 5-concept set down to 4. FR-7 says that is a failed generation, but AD-3 gives the 5–15 range check to the Proxy only.

What the browser shows in these cases is also undefined: `err.generation` (FR-8 wording) or `err.tooFewItems`? Neither can trigger a retry (AD-7). Finally, "a model output where a concept has 0 Flashcards": is that a schema failure (Proxy retry) or a drop? FR-7 says "each concept gets 1–2", and the spine is silent.

**Proposed rule (tighten AD-3/AD-7):**
> Floors are checked twice, by design. The Proxy checks text-independent floors **before** returning (≥5 and ≤15 concepts, ≥5 Summary Points after the 40-word drop, ≥1 Flashcard and ≥1 Quiz Question **per concept as generated**; a breach is a retry-able failure). `core/verifyStudySet` re-checks after browser drops: concepts after duplicate-ID drop (5–15), Summary Points after Quote Check (≥5), Flashcards and Quiz Questions (≥5 each). Any browser floor breach returns `err.tooFewItems`, is never cached, never retried automatically. A concept with zero Flashcards or zero Quiz Questions *in the model output* is a schema failure (Proxy); after the Quote Check it is legal (FR-18 eligibility).

### H-5: The Consent/Demo/key gate has no single owner and no defined order

**Pair.** *Story A: Consent (FR-5)* puts the Consent check in the `api/` client ("nothing but `api/` calls the network", so the gate goes there), which blocks every `POST`. *Story B: Demo (FR-23)* calls `POST /api/study-set` with `mode: "demo"` after the student declined Consent. FR-5 sends a declining student straight to the Demo picker, so Story A blocks the path Story B was built for.

*Story C: Simpler* reads Consent from `NoteSession` instead of localStorage, so a withdrawal in Innstillinger mid-session is not seen. *Story D: missing key (FR-24)* checks `keyConfigured` from `/api/status` in the upload screen, while the Proxy also returns `err.noKey`. The order of checks (Consent → Demo → key) is stated in AD-12 as a sentence, not as a function, and "Try again" and Simpler are additional entry points that each re-implement it.

**Proposed rule (new AD, "Send gate"):**
> `core/gate.ts` exports one pure function `canSend(settings, status, mode): {ok: true} | {ok: false, code}` with this order: if `mode === "demo"` → ok (the Proxy answers `err.demoOnly` for unknown hashes); else if Consent is not `accepted` → `consent.declined`; else if `!status.keyConfigured` → `err.noKey`; else ok. The `api/` client calls `canSend` with **fresh** settings from `storage/` before every `POST` (study-set, simpler, "Prøv igjen"); no screen calls `fetch` or decides the gate itself. The Proxy also returns `err.noKey` when the key is missing (defence in depth), but the browser never relies on it for ordering. Demo mode is a stored setting (`demoMode: boolean`, localStorage, AD-10 list).

### H-6: The Origin guard rejects same-origin GET, and `localhost` vs `127.0.0.1`

**Pair.** *Story A: Proxy guards* implements AD-5 literally: "accepts a request only when its `Origin` is the app's localhost origin". *Story B: startup* calls `GET /api/status` (AD-6). Browsers do not send an `Origin` header on same-origin GET requests (Chromium, Firefox), so Story A rejects Story B. Consent can then never name the provider (FR-5), and `err.noKey` cannot be detected.

Separately, `ALLOWED_ORIGIN=http://localhost:3000` rejects an examiner who opens `http://127.0.0.1:3000`, which the Compose port binding (AD-2) invites. Whether the Next.js rewrite forwards `Origin` unchanged is also unstated.

**Proposed rule (tighten AD-5):**
> Guard rule: reject if an `Origin` header is present and is not in `ALLOWED_ORIGINS` (default `http://localhost:3000,http://127.0.0.1:3000`); if `Origin` is absent, accept only `GET` and `HEAD`. Every `POST` must carry an allowed `Origin`. Rate limiting keys on `Origin`, or on `"no-origin"` when it is absent. A pytest asserts: same-origin GET without `Origin` → 200; POST without `Origin` → 403; POST from `127.0.0.1:3000` → 200.

### H-7: The timeout chain does not add up, and Simpler retry contradicts NFR-5

**Pair.** *Story A: Proxy retry (AD-7)* uses 60 s per attempt × 2 attempts, so up to about 120 s for a generation. *Story B: API client* implements FR-11 ("the request times out after 90 seconds") and aborts at 90 s. The student sees `err.generation` and presses "Prøv igjen", while the Proxy is still running attempt 2. That is three calls for one intent (NFR-5) and a concurrent generation (NFR-8).

Next.js rewrites also have their own proxy timeout (the default is far below 90 s in current versions), which no AD sets. Generation will fail at the rewrite before either timer fires.

AD-7 also says "the Proxy retries exactly once" without limiting this to `/api/study-set`. *Story C: Simpler* will reuse the same retry wrapper, which conflicts with NFR-5 and FR-16 ("Explain Simpler uses one call per request").

**Proposed rule (tighten AD-7):**
> Budgets: `GENERATION_TIMEOUT_S=40` per attempt (2 attempts + overhead < 90 s); browser abort for `/api/study-set` at 90 s; Next rewrite proxy timeout explicitly set to 95 s in `next.config`. `/api/simpler` makes **one** attempt, no retry, `SIMPLER_TIMEOUT_S=15` (NFR-4), browser abort at 20 s; any failure → `simpler.fail`. A test asserts total worst-case Proxy time < browser abort < rewrite timeout.

### H-8: Round progress shape, the write timing of last-shown and last-used, and non-atomic writes

**Pair.** *Story A: Round composition* writes `lastShown` and `lastUsedQuiz` when the Round is **composed**. *Story B: FR-15 interruption* stores only answers (`[{itemId, signal}]`) and recomposes the Round on resume. By then Mastery has changed mid-Round (FR-17 updates on every mark), so the resumed Round contains different concepts and the stored answers point at Items that are no longer in it.

*Story C: Mastery* writes the Mastery record on each mark, and Story B writes Round progress on each answer (AD-10). Those are two IndexedDB writes. A reload between them leaves an answer recorded with no Mastery change, or the reverse. The spine also never says whether Flashcard marks count as "answers" for FR-15, or when a Round is finished.

**Proposed rule (new AD, "Round record"):**
> `core/round.ts` composes a Round once into a `Round` record: `{roundId, noteHash, studySetKey, startedAt, conceptIds[], flashcardIds[], quizQuestionIds[], optionOrder per quiz question, events: [{itemId, kind: "mark"|"answer", signal, selectedOption?, at}], completedAt?}`. The composed Round is stored before the first card is shown and is **resumed, never recomposed**. `lastShown` and `lastUsedQuizQuestion` are written for all Round concepts at composition time. Every mark or answer is one `core` call that returns `(newRound, newMasteryStates)`, persisted by `storage/` in **one** IndexedDB transaction. A Round is incomplete while `completedAt` is unset; one active Round per Note at a time.

### H-9: A schema-version bump wipes all data, and later stories add fields

**Pair.** *Story A: persistence (Tier 2, FR-21)* ships `schemaVersion: 1` and, per AD-10, resets unknown data with `storage.reset`. *Story B: Archive (FR-26, Should, built weeks later)* adds `archived: boolean` to the Note record. Two AI agents will take two different AD-legal paths. One bumps `schemaVersion` to 2, and every existing Note, including the developer's test data and the examiner's Demo progress, is reset on next load. The other adds the field without a bump, so v1 code reading v2 data meets an unexpected field and a third agent's strict validator calls it "corrupt" and resets anyway.

Nothing says whether "reset" means the one corrupt record, one Note, or the whole store.

**Proposed rule (tighten AD-10):**
> All per-Note fields that any FR needs (including `archived`, `importanceLevel`, `lastPractisedAt`, `title`) exist in schema v1 from the first storage story, with defaults, even if their feature flag is `false`. Adding an optional field with a default never bumps `schemaVersion`; readers ignore unknown fields. A bump requires a migration function `migrate_vN_to_vN+1` in `storage/` with a unit test. Reset is per Note (one Note Hash), never the whole store; only an unreadable settings object resets settings.

---

## Medium

### H-10: The Mastery record shape, and two writers to one record

**Pair.** *Mastery story* stores `masteryStates: Record<keyConceptId, "new"|"shaky"|"known">` in the Note record. *Round story* stores `lastShown` and `lastUsedQuizQuestion` in a separate `concepts` map, or in the same map, as `{state, lastShown}`. Both are AD-legal ("keyed by Note Hash + Key Concept ID"). Read-modify-write of the same record by two code paths loses updates.

FR-4 says progress for vanished concept IDs is "dropped", but no story owns the pruning. Should it happen on regeneration, on read, or never? Concepts that are *not covered* also have a state ("new"), which FR-19 must skip.

**Proposed rule:**
> One per-concept record `ConceptProgress {noteHash, keyConceptId, state, lastShownAt?, lastUsedQuizQuestionId?, schemaVersion}`, IndexedDB store `conceptProgress`, key `[noteHash, keyConceptId]`. Only `core` functions produce new values, and only the H-8 transaction writes them. When a new Verified Study Set becomes current for a Note, `storage/` deletes `ConceptProgress` rows whose ID is not in it, in the same transaction. Missing row = `new`.

### H-11: The Simpler Explanation's Quote Check target, storage and Demo Fixture lookup are undefined

**Pair.** *Simpler story* sends `passage` = the cited Passage of the Item and Quote-Checks the response against that Passage. Another agent checks it against the **response's** own `passageId`, which the model may set to a different Passage that was never sent. *Demo story* follows AD-12 ("loads `proxy/fixtures/{noteHash}.json`"), but a Fixture is "the raw model response" for the Study Set. There is no place for per-Item Simpler responses, and no key to look them up with (H-1), yet FR-23 requires Simpler from Fixtures in the full Demo loop.

Whether a Simpler Explanation is stored (and so survives a reload, or must be paid for again) is not in AD-10's list.

**Proposed rule:**
> `/api/simpler` request carries `{mode, noteHash, itemId, passage, item}`; the response's Quote is checked only against the sent Passage, and a different `passageId` fails. Simpler Explanations are not persisted in v1 (state in `NoteSession` only). Fixture file = `{noteHash}.json` with `{studySet: <raw>, simpler: {<itemId>: <raw>}, model, promptVersion}`; `record_fixtures.py` records one Simpler per Flashcard and Quiz Question; a missing entry in Demo returns `simpler.fail`'s code, not `err.demoOnly`.

### H-12: Stored text is Extracted Text or normalized Passages, and a Normalization change orphans Notes

**Pair.** *Persistence story* follows AD-10 ("Extracted Text … lives in IndexedDB") and re-splits on load. *Source panel story* follows AD-8 ("the same objects") and needs the Passage objects the Quotes were checked against. After a later Normalization fix (allowed by AD-8 with Fixture re-recording), re-splitting stored Extracted Text yields different Passage IDs and a **different Note Hash**. Stored Study Sets then point at shifted Passages, highlights land wrong (the failure AD-8 exists to prevent), and the Note is no longer found by FR-4 lookup.

**Proposed rule (tighten AD-8/AD-10):**
> Persist the normalized Passages (`[{id, text}]`) with the Note, never re-derive them from stored text. Each Note records `normalizationVersion`; a code change to Normalization or splitting bumps it. Stored Notes with an older version are displayed and practiced with their stored Passages; only a new supply recomputes.

### H-13: Demo and live share the cache key and Mastery, and the Demo mode setting is not stored

**Pair.** *Demo story* serves a Fixture whose `model` and `promptVersion` equal the live ones (likely right after recording). *Persistence story* keys by `{noteHash}:{promptVersion}:{model}`. The Demo Study Set and a live Study Set of a reference note collide on one key, and Demo practice writes the same `ConceptProgress` as a later live session.

An e2e test in Demo mode then starts with Mastery left over from the developer's manual session. "Demo Mode can be switched on at any time" (FR-23) also implies a persisted toggle, but AD-10's settings list does not include it.

**Proposed rule:**
> Demo Study Sets use cache key `demo:{noteHash}:{promptVersion}:{model}` (metadata from the Fixture). Demo and live progress for the same Note Hash are kept apart by a `source: "demo"|"live"` component in the Note record key. `demoMode` is a localStorage setting. Playwright runs with a fresh browser context per test.

### H-14: Quiz option order and the answer index across a reload

**Pair.** *Quiz UI story* shuffles options at render with injected randomness (AD-11) and stores the selected **displayed** index. *Scoring story* compares against the contract's `correctIndex` in **original** order. After a reload the order is reshuffled, so the shown answer differs from the stored one.

**Proposed rule:** covered by H-8: `optionOrder` is fixed in the Round record at composition, answers store the **original** option index, scoring uses original indices only.

### H-15: The rate limit of 10 per minute breaks e2e, and covers Demo and `/api/status`

**Pair.** *Proxy guards* limit every request from one origin to 10 per minute (AD-5). *Playwright* runs the full Demo loop for three notes plus Simpler calls in one minute and gets 429 (`err.rateLimited`). The tests turn flaky in CI (AD-18). Demo makes no provider call, so limiting it protects nothing.

**Proposed rule:**
> The rate limit applies only to `POST` with `mode: "live"`. `/api/status` and Demo requests are exempt. The limit is set by `RATE_LIMIT_PER_MIN` (default 10) and the `test` profile sets it high; a pytest covers the 11th live request.

### H-16: The Note title is not in any shape, and it changes per upload

**Pair.** *Library story (FR-25)* shows the "Note's title". *Upload story* has a filename; *paste story* has none. Same content under a different filename gives the same Note Hash (FR-4). Should the title be overwritten or kept? The title is not in the AD-10 list, and the model does not return one.

**Proposed rule:**
> `title` is stored on the Note record at first creation: filename without extension for uploads, the first line of the text (truncated to 60 characters) for pastes. Re-supply never changes it. Demo notes use their sample name.

### H-17: The 'Dine notater' Readiness is recomputed or stored, and NoteSession covers only one Note

**Pair.** *Library story* stores a `readiness` number on the Note record for a fast list. *Round story* updates Mastery but not that number, because AD-11 says the shell persists what `core` returns, and the core Mastery function returns no readiness. The list now shows stale scores. `NoteSession` covers only the open Note, so the list cannot read it.

**Proposed rule:**
> Readiness is never stored. `storage/` exposes `listNotes()` returning per Note `{title, lastPractisedAt, archived, importanceLevel, verifiedSet coverage, conceptProgress[]}`, and the list computes `core/readiness` per row.

### H-18: Settings are "read synchronously before first render", but Next.js renders on the server first

**Pair.** *Theme/Consent story* reads localStorage "before first render" (AD-10, AD-15). *App shell story* uses Next.js as a server (AD-5) with server-rendered layouts. The first render happens on the server, where localStorage does not exist, so the result is either a hydration mismatch or a flash of the Consent screen, which is exactly what AD-10 says it prevents.

**Proposed rule:**
> A blocking inline `<script>` in `app/layout.tsx` sets `data-theme` and `data-consent` on `<html>` before paint. All screens below the layout are client components rendered after mount (`"use client"` + a mount gate); there is no server-rendered app content.

### H-19 (Should): The export format is the internal records; import merge vs replace; which schemaVersion

**Pair.** *Export story* dumps the stored records (as the Conventions say). *Storage story* has two schema versions (IndexedDB and localStorage) plus a per-record one. Should the import be checked against the export's version or the record's? Should importing over an existing Note merge Mastery or replace it? Is the Quote Check re-run on imported Items, or are they trusted? Internal shape changes now silently become a public file format.

**Proposed rule:**
> Export is `{format: "torsa-export", exportVersion: 1, note: {noteHash, title, passages, normalizationVersion}, studySet: VerifiedStudySet, conceptProgress[]}`, with no Round records. On import, `core` re-hashes the Passages and re-runs `verifyStudySet`'s Quote Check, and any mismatch gives `import.invalid`. Import replaces that Note Hash's data in one transaction.

---

## Low

### H-20: Centrality Rank validity and ties after drops

The Proxy story does not validate that ranks are a permutation. After duplicate-ID drops the ranks have gaps or ties, and FR-18 tie-breaks and FR-20 become nondeterministic.

**Rule:** the Proxy rejects (retry) unless ranks are unique integers from 1 to n. The browser keeps the original ranks after drops (gaps allowed) and breaks a remaining tie by `keyConceptId`.

### H-21: The `language` allow-list owner, and Simpler `language` vs Study Set `language`

AD-16 does not say who applies the allow-list (Proxy or browser), and it does not say whether a Simpler Explanation with a different `language` than its Study Set is allowed.

**Rule:** the Proxy normalizes `language` against the allow-list (fallback `und`). The browser uses the Study Set's `language` for all generated content, including Simpler.

### H-22: The "last practiced" trigger is undefined

The Library story might update it on opening a Note; the Round story on Round completion.

**Rule:** `lastPractisedAt` is set in the H-8 transaction on the first event of a Round.

### H-23: The double-submit dedupe owner (NFR-8)

Both the UI (a disabled button) and the API client may dedupe, or neither may.

**Rule:** the `api/` client holds one in-flight generation per Note Hash and returns the same promise for a duplicate call. UI disabling is cosmetic only.

---

## What the spine gets right (keep)

- AD-3 plus AD-7 cleanly separate text-independent checks (Proxy) from text-dependent ones (browser), and forbid browser retries.
- AD-4's generated contract with a CI diff check removes the most common TypeScript/Python drift.
- AD-12's "same validation function" for Demo and live, and AD-14's marker test, are concrete and testable.
- AD-17's flags-per-Should-FR fits the cut order in PRD §8.1.

## Suggested order of fixes

H-1 → H-3 → H-2 → H-4 → H-8 (with H-10, H-14) → H-5 → H-6 → H-7 → H-9. These are all shape or ownership rules that the first stories (generation, Quote Check, storage) will freeze. Each costs a few lines in the spine now, against a cross-story refactor later.
