---
title: 'Story 1.10: Generation errors, retry and interrupted generation'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: '48724dfb2b413f6fda3ee0d8d166acf50dae3122'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When generation fails, Genererer shows only `err.generation` with 'Tilbake til start'. There is no 'Prøv igjen', `err.tooFewItems` is never shown, and nothing proves that a reload or a double press leads to at most one generation and no partial record.

**Approach:** Genererer gets a failure view that shows the matching message (`err.generation`, `err.tooFewItems` or `err.noKey`), is focused, and offers 'Prøv igjen' (a fresh request in the same component) plus 'Tilbake til start'. Playwright covers double submit, double retry and reload mid-generation. A Vitest test checks that every Proxy error code is a Microcopy key. Refs: FR-5, FR-8, FR-10, FR-11, FR-24 · AD-6, AD-7, AD-11 · NFR-5, NFR-8 · UX-DR21, UX-DR23.

## Boundaries & Constraints

**Always:**
- There is no automatic retry anywhere in the browser. A new request starts only when the user presses 'Prøv igjen'.
- 'Prøv igjen' sends a new POST and never reuses an earlier result. The browser has no Study Set cache before FR-4, so this is the whole "bypass".
- Only Genererer's success path writes. Every failure stores nothing.
- The existing 1.9 guarantees stay: the send gate, single-flight per Note Hash, the 90 s abort, and the abort on unmount.
- Every new string is a Microcopy key.

**Never:**
- Demo Mode behaviour, the demo offer, or Demovelger (1.14).
- A browser cache or cache lookup (FR-4, Epic 3).
- Changes to `proxy/`, `schemas.py` or `schema.d.ts`.
- Real Notatoversikt content (1.11).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HTTP / network | 429, 5xx, network error, non-JSON body, unknown `code`, 90 s abort | `err.generation`, focused, with 'Prøv igjen' + 'Tilbake til start' | nothing stored |
| Proxy says no key | 503 `{code:"err.noKey"}` (key removed after startup) | `err.noKey`, focused, with 'Tilbake til start' only | nothing stored |
| verify fails | `verifyStudySet` → `err.generation` / `err.tooFewItems` | the matching text + 'Prøv igjen' + 'Tilbake til start'; no automatic retry | nothing stored |
| storage fails | IndexedDB write rejects | `err.generation` + 'Prøv igjen' | transaction aborted |
| retry succeeds | 'Prøv igjen' after a 502, next answer valid | progress view again (bar at 0, first step), 1 new POST, then Notatoversikt | N/A |
| double retry | 'Prøv igjen' pressed twice quickly | exactly 1 new POST | the second press is ignored (`pending`) or joins the single-flight |
| double submit | second file while pending | no second POST (drop zone gone, `busyRef`) | N/A |
| reload mid-generation | page reloaded while the POST is held | Start (empty) after reload; the same file can be uploaded again and generates once | no record from the first attempt |
| Consent declined / no key | gate blocks at submit | stays on Start with `consent.declined` / `err.noKey` inline (1.9 behaviour) | no request |

</frozen-after-approval>

## Code Map

- `web/components/Generating/Generating.tsx` -- the run is one `useEffect([])` with `AbortController`, timers, `requestStudySet`, `verifyStudySet`, `saveGeneratedNote` and `router.push`. Turn `failed: boolean` into `error: FailureCode | null`, and add an `attempt` counter to the effect deps (reset progress and step when it runs). Keep the `start` ref and `useBlockWindowDrop`. The `ERROR_ID` focus effect must run on every new failure (key the ErrorMessage by attempt).
- `web/api/studySet.ts` -- `post()` maps every `!res.ok` to `err.generation`. Change it so a 503 with body `{code:"err.noKey"}` returns `err.noKey`; everything else stays the same. `StudySetErrorCode` already includes `err.noKey`. Its tests are in `web/api/studySet.test.ts`.
- `web/core/verifyStudySet.ts` -- `VerifyResult` codes are `err.generation | err.tooFewItems`. Read only.
- `web/components/Button/Button.tsx` -- the `pending` prop (aria-disabled, ignores clicks).
- `web/components/ErrorMessage/ErrorMessage.tsx` -- the `actions` slot and `tabIndex=-1`.
- `web/i18n/messages.ts` -- `err.generation` and `err.tooFewItems` exist. Add `gen.retry` "Prøv igjen" and `err.demoOnly` "Demomodus støtter bare eksempelnotatene." (EXPERIENCE L134).
- `proxy/app/main.py`, `proxy/app/generation.py` -- the Proxy codes are `GENERATION_ERROR = "err.generation"` and the literals `"err.noKey"` and `"err.demoOnly"`. The test image copies `proxy/` next to `web/` (`e2e/Dockerfile`), so Vitest can read `../proxy/app/*.py`. See `web/core/tokens.test.ts` for the repo-file-reading pattern.
- `e2e/generate.spec.ts` -- reuse `stubStatus`, `stubStudySet`, `storedRecords`, `gotoStartWithStatus`, `upload`, `studySetFor` and `MSG`. The 1.9 tests "HTTP 502" and "verify fails" expect only 'Tilbake til start', so extend them.
- `app/page.tsx` -- no change expected. `backToStart` and `busyRef` already cover double submit and the gate.

## Tasks & Acceptance

**Execution:**
- [x] `web/i18n/messages.ts` -- add `gen.retry` and `err.demoOnly`.
- [x] `web/i18n/proxyCodes.test.ts` -- extract every `"err.*"` string literal plus the `GENERATION_ERROR` value from `proxy/app/*.py`. Assert that the set is not empty, that it contains the three known codes, and that each one is a key in `messages`.
- [x] `web/api/studySet.ts` + test -- add the 503 `err.noKey` passthrough. Test that a 503 with another or a missing code, and a 500 with `err.noKey`, both give `err.generation`.
- [x] `web/components/Generating/Generating.tsx` -- add the failure view with the matching text. Show `gen.retry` (primary) for `err.generation`/`err.tooFewItems`, and `gen.back` always. Retry bumps `attempt`, which restarts the run. The retry button is `pending` from the press until the view switches.
- [x] `e2e/generate.spec.ts` -- add these tests:
  - 502, then 'Prøv igjen', then a valid answer → Notatoversikt, with exactly 2 POSTs in total.
  - A double-clicked 'Prøv igjen' while the next POST is held → 1 new POST.
  - A Study Set with fewer than 5 surviving Quiz Questions (Quotes valid) → `err.tooFewItems`, focused, with both buttons, nothing stored and no further POST after 2 s.
  - 503 `err.noKey` → `err.noKey`, with no 'Prøv igjen'.
  - Reload while the POST is held → Start, no records; uploading again → 1 POST and success.
  - A double drop while pending → 1 POST.

  Extend the 502 test and the verify-fail test to expect 'Prøv igjen'. Add an axe check on the failure view.
- [x] `.docs/deviations.md` -- D-12: new key `gen.retry`; Proxy 503 `err.noKey` is shown as `err.noKey` without retry.
- [x] `.docs/implementation-artifacts/deferred-work.md` -- FR-4: a cache lookup must be skipped when 'Prøv igjen' is pressed.
- [x] `README.md` -- in the "Lag kort og quiz" section: errors, 'Prøv igjen', no automatic retry.

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` without a key, when run, then Vitest, pytest and Playwright pass.
- Given `npx tsc --noEmit` in `web/`, when run, then it passes.
- Given any failure view, when it appears, then focus is on the `role="alert"` message, and Tab reaches 'Prøv igjen' (when shown) before 'Tilbake til start'.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Source | Finding | Verdict | Route / evidence |
|---|--------|---------|---------|------------------|
| 1 | BH | `retrying` state / `pending` never rendered; comment untrue | low | patch: delete the dead state, keep `retryingRef` |
| 2 | BH | Focus falls to `body` after 'Prøv igjen' (button unmounts) | medium | patch: focus the `h1` when a retry starts; e2e asserts it |
| 3 | BH, EC | Retry gates on the status captured at mount | false | `AppSettings` fetches `/api/status` once at startup; Generating mounts only after the gate saw a non-null status, so it cannot change afterwards |
| 4 | BH | `consent.declined` branch is dead | false | `checkSendGate` reads `readSettings()` on every call, so withdrawing in another tab reaches it |
| 5 | BH, VG | `canRetry` and the `consent.declined` view untested | medium | patch: unit test `canRetry` for all four codes; the e2e for the other-tab path is not added (narrow, the unit test pins the retry rule) |
| 6 | BH | Aborted 503 `err.noKey` branch untested | low | rejected: an aborted run is discarded by Generating (`signal.aborted`) whatever the code; fix adds a test for an unreachable outcome |
| 7 | BH | Double-retry test does not exercise the guard (button unmounts after the first click); uses `waitForTimeout` | low | rejected: the matrix outcome (1 new POST) is verified; the guard is defensive |
| 8 | BH | Reload test never releases its `hold()` | low | patch: release in `finally` |
| 9 | BH | too-few-Items test relies on the fixture having 5 Quiz Questions | false | if the fixture changes, the assertion on `err.tooFewItems` text fails loudly; it cannot pass for the wrong reason |
| 10 | BH | `proxyCodes.test.ts` misses constants, ENOENT unclear, one-directional | false | the regex matches any `"err.*"` literal, including one assigned to a new constant; a missing dir fails loudly in CI |
| 11 | BH | README: `err.generation` also covers other non-2xx and a failed save | low | patch: one phrase |
| 12 | BH | Spec file missing from the diff | false | intentional: reviewers see code only |
| 13 | BH | D-12 `done` while EXPERIENCE.md is not updated | false | as D-1…D-11: `done` means recorded; Epic 5 reconciles planning docs |
| 14 | VG | No test for failure → retry → failure → retry | medium | patch: e2e with 502, 502, valid → 3 POSTs, error refocused |
| 15 | EC | After 503 `err.noKey`, Start's status still says a key exists, so a re-upload sends another POST | low | rejected: needs the key removed and the Proxy restarted while the app is open; fix adds a status refresh path |
| 16 | EC | `sourceType` null offers a useless retry | false | `checkFile` rejects every other extension before extraction, so `fileType` never returns null here |
| 17 | EC | A failed save is retried with a new paid generation | low | rejected: IndexedDB write failures are rare (storage-unavailable messaging is Story 3.7); fix adds state to keep the verified set |
| 18 | EC | `proxyCodes.test.ts` not recursive | false | `proxy/app` has no subpackages (only `prompts/*.md`) |

## Design Notes

- Retry stays in the same `Generating` instance (no remount from `page.tsx`), so the page title, the Note meta and `useBlockWindowDrop` are kept. After a retry, the old run's abort controller is already done: the effect cleanup runs when `attempt` changes, which aborts any stale run.
- Reload needs no code. Genererer lives on `/` with no URL state, the save happens only after a verified answer, and a reload kills the fetch. The e2e test proves it.
- `err.noKey` after a 503 gets no 'Prøv igjen', because retrying cannot help until the key is set and the Proxy restarted.

## Verification

**Commands:**
- `cd web && npx vitest run && npx tsc --noEmit` -- green.
- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
