---
title: 'Fix: regenerating a stored Note keeps user fields and replaces its Study Set (AD-21)'
type: 'bugfix'
created: '2026-11-25'
status: 'done'
baseline_commit: '46da2cf668c2219ee871fbac39b2255ab56bef87'
route: 'dispatch'
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Saving a generated Study Set for a Note that is already stored (re-upload from Start, Demovelger, or 'Prøv igjen' on Notatoversikt) `put`s a fresh Note from `buildNoteRecord`: `title`, `archived`, `importanceLevel` and `lastPractisedAt` are reset, the previous `studySets` record is orphaned when the cache key changed, and `conceptProgress` rows for vanished concept IDs stay. Since Story 2.1 writes progress, this loses data.

**Approach:** `saveGeneratedNote` reads the stored Note inside its transaction and applies AD-21 › "Replacing a Study Set" in that one transaction. Refs: AD-21 · FR-4 · Epic 1 retro R2 / action item 5.

## Boundaries & Constraints

**Always:**
- One `readwrite` transaction over `notes`, `studySets`, `conceptProgress`, `rounds`. Any failure aborts it; nothing changes.
- Stored Note valid: keep its `title` (AD-21: set at creation, never changed), `archived`, `importanceLevel`, `lastPractisedAt`; take everything else from the new Note (`passages`, `wordCount`, `sourceType`, `normalizationVersion`, `currentCacheKey`).
- Stored `currentCacheKey` ≠ new `cacheKey`: delete the old `studySets` record.
- Decided by Tor 2026-11-25 (review pass 1, EC1): whenever a valid stored Note gets a new set, same cache key or not, every `active` Round of the Note is set to `abandoned`, answers kept (the replaced set's Items may be gone; resume in 3.5 must not offer it).
- Delete the Note's `conceptProgress` rows whose `keyConceptId` is not a concept ID in the new set; keep the others unchanged (state, timestamps).
- Live and `demo:` records stay separate: only rows and Rounds with the same Note key are touched.

**Never:** UI changes, new Microcopy, a DB version bump, the FR-4 cache-hit lookup (Epic 3), deleting Rounds (abandoned Rounds keep their answers).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| First save | no stored Note | Note and set written as today |
| Same cache key | stored Note, same `cacheKey`, an active Round, a row for a dropped concept | user fields + title kept; set replaced; no set deleted; the Round `abandoned`; the row pruned |
| New cache key | stored Note, other `cacheKey` | old set deleted; new set written; `currentCacheKey` updated |
| User fields | stored `archived: true`, `importanceLevel: 3`, `lastPractisedAt` set, title "A" | all four kept; new title from the new file ignored |
| Prune | progress rows for k-a, k-x; new set has k-a, k-b | k-x deleted; k-a unchanged; no row created for k-b |
| Active Round | active Round of the Note (old or same key) | `abandoned`, answers kept |
| Other Rounds | `complete`/`abandoned` Rounds of the Note; Rounds of the `demo:` twin | untouched |
| Invalid stored Note | stored record fails `NoteRecordSchema` | treated as no stored Note (written fresh); nothing deleted |
| Write fails | any request rejects | transaction aborted; stored Note, set, rows, Rounds unchanged |

</frozen-after-approval>

## Code Map

- `web/storage/db.ts:159-176` -- `saveGeneratedNote`: the only change site. Reuse `NoteRecordSchema` (read validation), `validRows`-style parsing, `abortQuietly`, and the `startRound` pattern (reads with `await` inside the transaction, then queued writes, `Promise.all([...writes, done])`).
- `web/core/noteRecord.ts:20-37` -- `buildNoteRecord` keeps building defaults for a first save; do not change it (the merge belongs in storage, where the stored Note is read).
- `web/components/Generating/Generating.tsx:128-133` -- the only caller; signature and result unchanged, so no caller change.
- `web/storage/db.test.ts` -- fake-indexeddb, fresh `IDBFactory` per test; existing `saveGeneratedNote` tests ("the same Note again replaces both records", abort tests) must still pass or be updated to the new merge rule.

## Tasks & Acceptance

**Execution:**
- [x] `web/storage/db.ts` -- implement the merge, old-set delete, prune and abandon in `saveGeneratedNote`; update its doc comment. Find old sets via the `studySets` `noteHash` index (delete every record of the Note except the new `cacheKey`; covers earlier orphans). Parse Rounds with `RoundRecordSchema` before rewriting them; skip invalid ones.
- [x] `web/storage/db.test.ts` -- one test per matrix row, plus: an async rejection of an earlier request (e.g. the old-set `delete` or a Round `put`) rolls everything back; an invalid Round row is left as is.
- [x] `.docs/implementation-artifacts/deferred-work.md` -- remove the `spec-1-9` entry (re-upload overwrites user fields), citing this spec.
- [x] `README.md` -- one plain sentence on re-upload / 'Prøv igjen': title and user fields kept, the old Study Set replaced, progress for vanished concepts removed, an active Round ended. No unexplained terms ("hurtignøkkel").

**Acceptance Criteria:**
- Given a stored Note with user fields, progress rows and an active Round on cache key A, when `saveGeneratedNote` saves a set with cache key B in one call, then afterwards every matrix outcome holds at once (title and user fields kept, set A deleted, vanished rows pruned, the Round abandoned) and `readNote` returns the merged Note.
- Given the existing e2e suite, when it runs, then it stays green (no UI change).

## Carried items

- `deferred-work.md › spec-1-9` (re-upload overwrites user fields, orphans old set): carried, matrix rows "User fields", "New cache key". Close at source when done.
- `sprint-status.yaml › epic-1-retro-item-5` (open): carried; set to `done` when merged.
- `issues.md` 2026-11-24 story-1-9, story-1-11 (archived/importanceLevel/lastPractisedAt reset), epic-1-retrospektiv (move AD-21 fix to Epic 2), 2026-11-25 story-2-1-start-runde (retro item 5 as own PR): carried; tick when merged.
- `deferred-work.md › spec-1-10` (FR-4 'Prøv igjen' must bypass the cache lookup): not this fix; stays with the FR-4 story in Epic 3.
- Searches run: `deferred-work.md`, `.logs/lysebo/issues.md` open items, `sprint-status.yaml` open `action_items`, for "AD-21", "regenerat", "user fields", "orphan", "retro item 5".

## Implementation Notes

- `saveGeneratedNote` reads the stored Note first; only a valid one triggers merge, prune, the old-set sweep (every other `studySets` record of the Note) and abandoning every active Round (loop 1). The set's `put` is queued last, so a failing set write rolls back every earlier delete.
- Prune uses the `noteHash` index's primary keys (`getAllKeys`), so an invalid row for a vanished concept is deleted too; rows for kept concepts are not rewritten.
- Unknown top-level fields on the stored Note are not carried over ("everything else from the new Note").
- `deferred-work.md › spec-1-9` entry removed: closed by this spec.

## Spec Change Log

- 2026-11-25, loop 1. Trigger: review pass 1 EC1/BH1 (intent_gap): with an unchanged cache key the set was replaced but an active Round stayed `active` with Items that may be gone. Amended: frozen Always rule and matrix rows "Same cache key", "Active Round", "Other Rounds" (Tor's decision: abandon every active Round of the Note on any replacement); Tasks now also require the `noteHash`-index sweep of old sets (EC2/EC4), Round parsing before rewrite (EC5), the same-key prune test (VG1), an async-rejection rollback test (BH8), plain README wording (BH10). Known-bad state avoided: a live Round pointing at replaced Items. Code was not reverted (the revert was blocked by a permission check); the existing implementation is adjusted in place. KEEP: read the stored Note with `NoteRecordSchema` inside the transaction; merge only `title`, `archived`, `importanceLevel`, `lastPractisedAt`; prune via `getAllKeys` on the `noteHash` index; queue the set `put` last; `abortQuietly` on any failure; the existing matrix tests and the one-call AC test.

## Review Triage Log

Pass 1 (2026-11-25): Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Note: the first verification run used a stale test image (Vitest 484, `db.test.ts` 21 tests); re-run after `docker compose --profile test build`.

| ID | Finding | Verdict | Evidence | Route |
|----|---------|---------|----------|-------|
| EC1/BH1/VG-o1 | Same cache key: the set is replaced but an `active` Round on it stays active with Items that may be gone | medium | Abandon runs only when `oldCacheKey !== set.cacheKey`; a same-model re-upload regenerates new Item IDs under the same key, the Round screen then shows `note.missing` and resume (3.5) would offer it. The frozen rule names only the changed-key case. | intent_gap |
| VG1/BH7 | Prune with an unchanged cache key is untested | medium | The same-key test keeps `["k-a","k-x"]` and asserts no progress; moving the prune under the key check passes every test. | patch |
| EC2/EC4 | Old sets are found only via `currentCacheKey`: earlier orphans stay, and a corrupt key could name another Note's set | low | Orphans exist only from pre-fix regenerates; the cache key embeds the Note hash. Deleting every `studySets` record on the Note's `noteHash` index except the new key is a direct correction covering both. | patch |
| EC3 | `note.currentCacheKey` may differ from `set.cacheKey` | false | The only caller builds the Note with `currentCacheKey: set.cacheKey` (`buildNoteRecord`, `recordsForMode`). | reject |
| EC5/BH5 | Rounds are rewritten as `abandoned` from raw, unvalidated rows | low | Only hand-edited storage yields a malformed Round; parsing with `RoundRecordSchema` before rewriting is a direct correction. | patch |
| EC6/BH4 | Invalid stored Note: valid user fields lost, old set left | low | Needs a corrupt Note record; salvaging single fields adds branches. The old-set part is covered by the index sweep (EC2). | reject |
| BH2 | A kept row's `lastUsedQuizQuestionId` may name a vanished question | false | `nextQuizQuestionId` treats an unknown ID as stale and picks the first question (Story 2.1, tested). | reject |
| BH3 | Prune assumes concept IDs are stable across generations | low | By design of AD-21 (prune by vanished concept ID); not a defect of this change. | reject |
| BH6 | `deferred-work.md` entry removed without citing this spec | false | The carry-forward standard closes items at source; the citation is in this spec's Implementation Notes and the commit. | reject |
| BH8 | Abort test covers only a synchronous failure of the last write | low | An async rejection of an earlier `delete`/`put` is not exercised; a test-only addition. | patch |
| BH9 | Spec Code Map line numbers stale, empty sections | — | Fix edits this spec. | reject |
| BH10 | README uses the unexplained word "hurtignøkkel" and omits the same-key case | low | Direct wording correction. | patch |

Pass 2 (2026-11-25, loop 1): verification after `docker compose --profile test build`: Vitest 498, pytest 171, Playwright 134, all green. VG: no gaps.

| ID | Finding | Verdict | Evidence | Route |
|----|---------|---------|----------|-------|
| EC2-1 | The Note `put` is queued before the awaited index reads; an async rejection of it would be unhandled until `Promise.all` attaches | low | Reads span IDB request callbacks, so a quota/constraint rejection of the early `put` surfaces as an unhandled rejection before the catch runs. Queuing the Note `put` after the reads is a direct correction (as `startRound` does). | patch |
| BH2-1/EC2-3 | Invalid stored Note leaves the old set and active Rounds; pass 1's EC6 evidence wrongly said the sweep covers it | false | Per the frozen matrix row "Invalid stored Note → treated as no stored Note; nothing deleted": intended. The pass 1 EC6 evidence about the sweep is wrong (the sweep runs only for a valid Note); EC6 stays rejected on the matrix rule and corrupt-record rarity. | reject |
| BH2-3 | AD-21 in the architecture does not state the new abandon-on-replace rule; Story 3.5 reads AD-21 | low | A product rule now lives only in this spec. Recording it as a `.docs/deviations.md` entry (reconciled in Story 5.3) is a direct correction. | patch |
| BH2-5 | No test that an invalid progress row for a vanished concept is pruned, and one for a kept concept left alone | low | Implementation Notes claim it; test-only addition. | patch |
| BH2-8 | README says "byttes bare studiesettet ut" though the Note is also rewritten; "avsluttet" reads as completed; Demovelger not named | low | Direct wording correction. | patch |
| BH2-11 | Test "the same Note again replaces both records (put)" is now misnamed | low | The Note is merged, not replaced; direct rename. | patch |
| BH2-2 | Implementation Notes describe pre-loop behaviour | — | Fix edits this spec (notes updated as housekeeping). | reject |
| BH2-4/BH2-9/BH2-10 | Code Map lines stale; deferred-work task wording; Verification shows no results | — | Fix edits this spec. | reject |
| BH2-6 | Live/demo separation tested one way only | low | The code filters by the same `noteHash` key in both directions; unlikely to regress asymmetrically. | reject |
| BH2-7 | Abandoned Round gets no timestamp | false | AD-21 "Ny runde sets it to `abandoned` and keeps its answers" defines no timestamp; `startRound` (2.1) abandons the same way. | reject |
| BH2-12 | Async rollback test is fragile; no Round-`put` failure case | low | One async rejection already proves the rollback path; fragility is hypothetical. | reject |
| EC2-2 | An invalid Round with raw `status: "active"` stays active, while `startRound` abandons raw rows | low | Needs hand-corrupted storage; aligning both paths adds branches. | reject |
| EC2-4 | An empty or fully renamed set prunes every progress row | false | `verifyStudySet` rejects a set below the Item floors (`err.tooFewItems`), so a saved set has concepts; pruning renamed IDs is AD-21's rule. | reject |

## Verification

**Commands:**
- `docker compose run --rm test` -- expected: Vitest, pytest and Playwright green.
