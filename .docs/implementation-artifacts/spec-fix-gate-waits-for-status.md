---
title: 'Send gate waits for /api/status instead of reporting a missing key'
type: 'bugfix'
created: '2026-11-24'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/api/status` takes up to three tries 1 s apart. Until it answers, the send gate (`web/core/gate.ts`) counts the null status as "no key". A file dropped on Start in that window gets `err.noKey` even when a key is configured, and the error stays after status arrives. 'Prøv igjen' on Notatoversikt right after a reload has the same race (`Generating` captures the status at mount). The architecture says live submit is disabled until status answers (epic-1-context › Status), and does not say a missing key is reported. Source: Epic 1 retrospective, finding R5 / action item `epic-1-retro-item-4`.

**Approach:** `AppSettingsProvider` exposes a promise of the settled status (the answer, or null after the last failed try). Start awaits it after extraction, before the gate. `Generating` awaits it before each POST. Once status has settled, both behave exactly as today, including `err.noKey` when the key is really missing or status never answered.

</frozen-after-approval>

## Implementation Notes

- `web/components/AppSettings/AppSettings.tsx`: new context field `waitForStatus(): Promise<Status | null>`, backed by one deferred created per provider and resolved when `fetchStatus` settles (not on abort, see As built). `status` itself is unchanged, so the Consent text and other readers keep working.
- `web/app/page.tsx`: `onFile` awaits `waitForStatus()` after extraction and runs `checkSendGate` with the result. The drop zone stays busy while it waits, so a second drop is still ignored. `statusRef` goes away.
- `web/components/Generating/Generating.tsx`: the run awaits `waitForStatus()` and passes that status to `requestStudySet`, instead of the status captured at mount. Abort is checked after the wait. The Genererer progress view already shows while waiting.
- `web/core/gate.ts` is unchanged: null still means "no key" once status has settled for good (the Proxy is unreachable). Reporting an unreachable Proxy with its own message is out of scope.
- **As built (2026-11-24):**
  - The deferred is *not* resolved on abort, against the plan above. React's dev Strict Mode runs the status effect twice and aborts the first run, which would settle the promise with null before the real answer. The provider wraps the whole app, so a waiter cannot outlive it.
  - New `gateNeedsStatus()` in `web/api/studySet.ts`: only a live request with Consent waits. Demo Mode and a missing Consent decide without the status (AD-6: Demo stays usable while status is pending), so they never wait. Both `page.tsx` and `Generating.tsx` call it.
  - `page.tsx` shows the Note meta *before* waiting, so the student sees the file was read. It also lets the e2e tests observe that extraction finished without fixed waits.
  - Files: `web/components/AppSettings/AppSettings.tsx`, `web/api/studySet.ts`, `web/app/page.tsx`, `web/components/Generating/Generating.tsx`, `web/api/studySet.test.ts` (+6 `gateNeedsStatus` cases), `e2e/generate.spec.ts` (+2), `e2e/notat.spec.ts` (+1).
  - Verified: `docker compose run --rm --build test` gives Vitest 432, pytest 171, Playwright 123, exit 0. With the old `page.tsx` and `Generating.tsx` the three new e2e tests fail (3 failed, 120 passed), so they catch the race.
- Tests: e2e in `e2e/generate.spec.ts` (status held while the file is dropped, then released with `keyConfigured: true` → Genererer and exactly 1 POST, no `err.noKey`; released with `keyConfigured: false` → `err.noKey` inline). E2e in `e2e/notat.spec.ts` (status held, 'Prøv igjen' after `err.noConcepts`, then released → 1 POST, overview reloads).
- **Review fixes (2026-11-24):** `web/api/status.ts` gets a per-try timeout (`STATUS_TRY_TIMEOUT_MS` = 5 s, plus 2 Vitest cases), so the settled status always arrives even when the Proxy accepts the connection and never answers. JSDoc order and the `RequestOptions.status` / `AppSettingsValue.status` comments are corrected. The `noteMeta` regex now uses `String.raw`, after the tool layer had dropped one of the two backslashes before the dot, so the regex matched any character (retro pitfall P1, verified with `od -c`). README › Lag kort og quiz describes the wait. Re-run: Vitest 434, pytest 171, Playwright 123, exit 0.

## Review Triage Log

Blind Hunter, one pass (9 findings):

- Hung `/api/status` waits forever — **medium**, real: `fetchStatus` had no per-try timeout, and the fix made a hang block the gate instead of giving `err.noKey`. Patched (per-try timeout + tests).
- `checkSendGate` JSDoc above `gateNeedsStatus` — **low**, real. Patched.
- Stale comment on `RequestOptions.status`; `status` field has no warning — **low**, real. Patched.
- `noteMeta` escape `"\."` matches any char — **low**, real (tool-layer escape loss). Patched with `String.raw`.
- Settings change during the wait gives false `err.noKey` — **false**: when `gateNeedsStatus()` is false there is no `await` before `checkSendGate`; when true, switching to Demo or withdrawing Consent during the wait is decided correctly by the gate.
- Genererer progress starts before the wait — **low**, rejected: the wait is normally under 3 s and bounded by the timeout above; Genererer is legitimately "working".
- No message on Start while waiting — **low**, rejected: the Note meta and the busy drop zone show; same bound.
- Missing tests (provider `waitForStatus` unit test, status-never-answers e2e, Demo/no-Consent-does-not-wait e2e, second drop during the wait) — **low**, deferred: `gateNeedsStatus` cases, `fetchStatus` timeout cases and the existing consent.spec "falls back after 3 failed tries" cover the logic; see `deferred-work.md`.
- Spec contradicts itself; duplicated hold helper; `holdStatus` lacks `.catch` — spec line **low**, fixed; duplication **low**, rejected; missing `.catch` **false**: those tests do not navigate before the status is released.
