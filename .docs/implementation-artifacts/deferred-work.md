# Deferred Work

- source_spec: `.docs/implementation-artifacts/spec-1-1-one-command-start.md`
  summary: Strengthen the lazy-provider test so a provider built at import or lifespan with a key set is detected.
  evidence: `proxy/tests/test_status.py` clears the `get_provider` cache after `app.main` is imported and never enters lifespan (`TestClient` without `with`); rework when Story 1.6 changes `llm.py`.

- source_spec: `.docs/implementation-artifacts/spec-1-3-consent-gate.md`
  summary: Add pre-hydration e2e checks that the pre-paint script sets `data-consent` to `declined` and `unset` (invalid or newer stored settings), not only `accepted`.
  evidence: `e2e/consent.spec.ts` observes `data-consent` before hydration only for `accepted`; the `declined`/`unset` assertions run after `AppSettingsProvider` rewrites the attribute, so drift between the inline script and `storage/settings.ts` goes unnoticed. Add when CSS or a story starts depending on the pre-paint value.

- source_spec: `.docs/implementation-artifacts/spec-1-5-upload-docx-pdf.md`
  summary: PDFs whose fonts lack a ToUnicode map may extract as garbage glyphs that pass every FR-3 check and would be sent to the AI.
  evidence: Review pass 1 EC4 (maybe-false). Settle it by extracting a sample of real student PDFs and checking the share of letters; if garbage appears, add a letter-ratio check mapped to err.unreadable.

- source_spec: `.docs/implementation-artifacts/spec-1-6-proxy-study-set.md`
  summary: MAX_OUTPUT_TOKENS = 16 000 may not fit in the 40 s attempt timeout, so a long valid Study Set could time out (504) instead of finishing.
  evidence: Review pass 1 BH2 (maybe-false). Not settled in Story 1.13 (epic-1 retro A6); now an AC of Story 5.1. Settle it there by measuring real output tokens and tokens per second on the reference notes, then size MAX_OUTPUT_TOKENS and the prompt's field lengths to finish well inside 40 s (NFR-4).

- source_spec: `.docs/implementation-artifacts/spec-1-9-generate-study-set.md`
  summary: Re-uploading a stored Note overwrites its record with defaults (`archived`, `importanceLevel`, `lastPractisedAt`) and, when model or prompt version changed, leaves the old `studySets` record orphaned.
  evidence: Review pass 1 BH1/EC3. `saveGeneratedNote` uses `put` as the 1.9 matrix decides; harmless now (no UI sets those fields yet), but AD-21 requires keeping user fields, deleting the old set and pruning `conceptProgress` in one transaction. Target (epic-1 retro item 5, moved by spec-2-1 on 2026-11-25): its own fix PR right after Story 2.1, before Story 2.2.

- source_spec: `.docs/implementation-artifacts/spec-1-10-generation-errors-retry-and-interrupted-generation.md`
  summary: FR-4: when the browser Study Set cache lookup lands, 'Prøv igjen' must skip it and send a fresh POST.
  evidence: Story 1.10 has no browser cache, so 'Prøv igjen' (`web/components/Generating/Generating.tsx`, `attempt`) simply re-runs `requestStudySet`. The FR-4 cache-hit story in Epic 3 must add a bypass for the retry path (epic-1-context › Minimums).

- source_spec: `.docs/implementation-artifacts/spec-fix-gate-waits-for-status.md`
  summary: Add tests for the status wait beyond the logic already covered: a component test for `AppSettingsProvider.waitForStatus` (settles once, not on a Strict Mode abort), an e2e where status never answers (wait, then `err.noKey`), an e2e that Demo Mode and a missing Consent do not wait, and a second drop during the wait being ignored.
  evidence: Blind Hunter review of the fix; `gateNeedsStatus` (web/api/studySet.test.ts) and `fetchStatus` timeout (web/api/status.test.ts) are unit-tested, the three race e2e tests fail on the old code, but these paths have no direct test.

- source_spec: `.docs/implementation-artifacts/spec-2-1-start-a-round-from-notatoversikt.md`
  summary: Tighten the browser Study Set guard (`web/api/studySet.ts`): `centralityRank` and `correctIndex` as integers, `options` length 4, `0 ≤ correctIndex ≤ 3`, matching the Proxy and the storage read schemas. Target: Story 2.3.
  evidence: Epic 1 retro R3 (defer "with Epic 2 Quiz work"). Story 2.1 only selects Quiz Question IDs; Story 2.3 is the first to render options, so it carries this.

- source_spec: `.docs/implementation-artifacts/spec-2-1-start-a-round-from-notatoversikt.md`
  summary: A Round whose concepts have only Quiz Questions (no Flashcards) shows the Round screen with no `h2` and an empty study panel; untested. Target: Story 2.3.
  evidence: Review pass 1 BH9/VG4. `verifyStudySet.ts:82` marks a concept covered with quizzes only; `RoundScreen` (`web/components/Round/Round.tsx`) guards `current === null` but no Vitest or e2e test renders that case. Story 2.3 adds Quiz Items to this screen and must cover it.

- source_spec: `.docs/implementation-artifacts/spec-2-1-start-a-round-from-notatoversikt.md`
  summary: Add a component test that `Screen` reruns its title/focus effect only when the title text changes (a new but equal `{ key, vars }` object must not refocus the `h1`; a changed value updates `document.title`).
  evidence: Review pass 1 VG3. `web/components/Screen/Screen.tsx` depends on `[docTitle]`; reverting to `[title, note]` refocuses `h1` on every `RoundScreen` render and no test fails. Vitest runs `environment: "node"`, so the test needs a DOM environment (e.g. `happy-dom`), a new dev dependency; deferred by Tor 2026-11-25. Add when a story first needs effect-running component tests (likely 2.2).
