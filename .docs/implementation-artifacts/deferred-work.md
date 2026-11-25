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

- source_spec: `.docs/implementation-artifacts/spec-1-10-generation-errors-retry-and-interrupted-generation.md`
  summary: FR-4: when the browser Study Set cache lookup lands, 'Prøv igjen' must skip it and send a fresh POST.
  evidence: Story 1.10 has no browser cache, so 'Prøv igjen' (`web/components/Generating/Generating.tsx`, `attempt`) simply re-runs `requestStudySet`. The FR-4 cache-hit story in Epic 3 must add a bypass for the retry path (epic-1-context › Minimums).

- source_spec: `.docs/implementation-artifacts/spec-fix-gate-waits-for-status.md`
  summary: Add tests for the status wait beyond the logic already covered: a component test for `AppSettingsProvider.waitForStatus` (settles once, not on a Strict Mode abort), an e2e where status never answers (wait, then `err.noKey`), an e2e that Demo Mode and a missing Consent do not wait, and a second drop during the wait being ignored.
  evidence: Blind Hunter review of the fix; `gateNeedsStatus` (web/api/studySet.test.ts) and `fetchStatus` timeout (web/api/status.test.ts) are unit-tested, the three race e2e tests fail on the old code, but these paths have no direct test.
