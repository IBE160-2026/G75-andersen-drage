---
title: 'Demo Mode sends no Passages to the Proxy'
type: 'bugfix'
created: '2026-11-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In Demo Mode the send gate (`web/core/gate.ts`) returns ok before it checks Consent, and `requestStudySet` (`web/api/studySet.ts`) always sends every Passage. A student who declined Consent and then drops an own file in Demo Mode sends that Note's full text to the local Proxy, which only answers 404 `err.demoOnly`. The text never reaches OpenRouter, but "Nei takk" should mean the text never leaves the browser. Source: Epic 1 retrospective, finding R1 / action item `epic-1-retro-item-9`; decided by Tor 2026-11-25: tighten, send `passages: []` in Demo Mode.

**Approach:** `requestStudySet` sends `passages: []` whenever the mode is `demo`; the Proxy serves Demo Mode by Note Hash alone and never reads the Passages. The Proxy contract allows an empty `passages` list for `mode: "demo"` and still requires at least one Passage for `mode: "live"` (400 `err.generation` otherwise). `proxy/openapi.json` and `web/api/schema.d.ts` are regenerated so CI's contract-drift check stays green.

</frozen-after-approval>

## Implementation Notes

- Planned files: `web/api/studySet.ts` (demo body), `web/api/studySet.test.ts` (demo body is `passages: []`; live body unchanged), `proxy/app/schemas.py` (`passages` `min_length=0`, model validator: live needs ≥ 1), `proxy/tests/test_demo.py` (demo with `[]` serves the Fixture), `proxy/tests/test_study_set.py` (live with `[]` is 400), regenerated `proxy/openapi.json` and `web/api/schema.d.ts`, `.docs/deviations.md` (new row: contract change, for Story 5.3 to reconcile into the AD-6 contract table and AD-12).
- `web/core/gate.ts` stays as it is: Demo Mode still needs no Consent, because nothing from the Note leaves the browser any more.
- **As built (2026-11-25):**
  - `proxy/app/schemas.py`: `passages` keeps only `max_length`; the existing `_total_length` validator rejects an empty list for `mode == "live"` (400 `err.generation`, covered by the existing `no-passages` case in `test_study_set.py::test_malformed_request_is_400`). Demo still accepts any Passages and ignores them.
  - `proxy/openapi.json` is git-ignored (CI regenerates it); regenerating it drops `minItems: 1`. `web/api/schema.d.ts` comes out unchanged (openapi-typescript does not encode `minItems`), so it is not in the diff.
  - Surprise: two e2e tests asserted the old demo body. `e2e/notat.spec.ts` (demo 'Prøv igjen') now expects `passages: []`; `e2e/demo.spec.ts` (own upload with Consent declined, the R1 case) now also checks `passages: []`.
  - New tests: `web/api/studySet.test.ts` (+1: declined Consent in Demo, body has no Note text), `proxy/tests/test_demo.py` (+2: empty Passages serve the Fixture; unknown hash with empty Passages is 404 `err.demoOnly`).
  - `.docs/deviations.md`: new row D-21.
- **Review fixes (2026-11-25):** README › Demomodus and › Proxy-en describe `passages: []` in Demo Mode; D-21 says the Note Hash is still sent; `requestStudySet` JSDoc says `passages` is not sent in Demo; validator renamed `_check_passages`; `e2e/demo.spec.ts` sample flow (real Proxy, real Fixture) now also asserts `passages: []`.
- Verified: `docker compose run --rm --build test` gives Vitest 534, pytest 173, Playwright 142, exit 0 (run after the review fixes). Regenerated contract leaves `web/api/schema.d.ts` unchanged, so CI's contract diff stays clean.
- Not UI: no file under `web/app/`, `web/components/`, `web/styles/` and no Microcopy key changes, so no `Manual checks` list (manual-checks standard).

## Review Triage Log

Blind Hunter, one pass (10 findings):

- README still says 1–15 000 Passages and does not say Demo sends no text — **low**, real. Patched (Demomodus and Proxy-en sections).
- `sprint-status.yaml` action item 9 still `open`; spec `in-progress` vs D-21 `done` — **false** at review time: both are set when the spec is finalized (this step), not before.
- No e2e asserts `passages: []` for a sample through the real Proxy — **low**, real. Patched: the Demovelger happy-path assertion in `e2e/demo.spec.ts` now includes `passages`.
- Proxy still validates (and may 400 on) Passages in Demo instead of requiring `[]` — **low**, rejected: the privacy boundary is the browser, which now always sends `[]`; a stricter Proxy rule would only affect non-browser clients and adds a contract change with no user effect.
- Validator name `_total_length` no longer fits — **low**, real, trivial. Patched (`_check_passages`).
- No new Proxy test for live with `[]` → 400 — **false**: `test_malformed_request_is_400[no-passages]` posts `request_body(passages=[])` with the default `mode="live"` and asserts 400 `err.generation`; it now exercises the new validator branch (`min_length` is gone).
- D-21 overclaims: the Note Hash is still sent — **low**, real. Patched (wording names the hash and why it is sent).
- Spec has no ACs or Verification — **false**: the oneshot route keeps only Intent and Implementation Notes by design; test results are recorded under Implementation Notes.
- No Vitest for Demo with Consent accepted; live body not checked near the change — **false**: "demoMode on with a key configured" (Consent accepted) now asserts `passages: []`, and "happy: one live POST with the Passages" asserts the live body with all Passages.
- `requestStudySet` JSDoc does not say Passages are ignored in Demo — **low**, real. Patched.
