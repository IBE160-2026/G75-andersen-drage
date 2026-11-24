---
title: 'Story 1.13: Record Fixtures and compare models on the reference notes'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: '0918f98f32612e92629fd988d36b65b62c9cb297'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `proxy/fixtures/` is empty and the model is still the provisional `anthropic/claude-haiku-5.5`. Demo Mode (1.14) and the keyless tests need recorded responses for the three reference notes, and the model must be chosen on evidence (PRD OQ1).

**Approach:** `web/scripts/export-passages.ts` (real `extract/` + `core/`) → `proxy/scripts/record_fixtures.py` (live model via `llm.py`) → `web/scripts/evaluate.ts` (comparison). The winner is promoted to `proxy/fixtures/{noteHash}.json` and becomes the default model. Refs: FR-23 · AD-8, AD-12, AD-13 · NFR-4, NFR-5 · DR-2, DR-3.

## Boundaries & Constraints

**Always:**
- Passages come only from `export-passages.ts`; no Python splits or normalizes Note text.
- Recording uses the live agent setup (`build_agent`, `render_passages`, routing); only the model name differs.
- Fixture shape is exactly `{studySet, simpler, model, promptVersion}`, with `studySet` = raw model draft (camelCase).
- Record `anthropic/claude-haiku-5.5` and `openai/gpt-6-luna`; `google/gemini-3.5-flash-lite` only within the one-day time-box. A skipped model is noted in `.logs/`.
- Choice rule, in order: highest mean Quote Check pass rate; no note below the `err.tooFewItems` floor; most surviving Items; fastest generation.
- The chosen model becomes the default in `config.py`, `compose.yaml` and the README.
- The key is read only from the environment. Only counts and timings are printed.
- Decided by Tor 2026-11-24: Tor supplies the key in this session; recording, evaluation and promotion run here.
- Decided by Tor 2026-11-24: `simpler: {}` until Story 3.6 adds Simpler and re-records; no Simpler timing. Recorded in D-15.

**Never:** Demo Mode serving (`mode: "demo"` stays 404), `/api/simpler`, or changes to the prompt, `PROMPT_VERSION`, schema, extraction or `verifyStudySet`. No live call in tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Export | `reference-notes/*` | `proxy/recordings/passages.json` = `[{note, noteHash, passages}]` | extraction error: exit non-zero, name the file |
| Record | `--model X` + key | `proxy/recordings/<slug>/{noteHash}.json` = fixture shape + `generationMs` + `validated` (`validate_study_set` result or `null`) | failed call: `studySet: null` + `error`, continue, exit non-zero |
| No key | key unset | one-line message, no call, no file | — |
| Evaluate | `proxy/recordings/` | model × note table: pass rate, surviving Flashcards/Quiz/Summary Points, `verifyStudySet` code, ms; per-model mean | missing/failed shows `—` / `failed` |
| Promote | `--promote <slug>` | writes `proxy/fixtures/` in fixture shape | refuses if any recording failed or `validated` is `null` |
| Hash drift | Passages change | Vitest fails, naming note and hashes | — |

</frozen-after-approval>

## Code Map

- `web/extract/text.ts:58` -- `extractNote(fileName, bytes)`, Node-safe. Not `client.ts`/`worker.ts`. `reference-notes.test.ts:21-25` holds the expected hashes.
- `web/core/verifyStudySet.ts:26,44` -- `quoteCheck`, `verifyStudySet` (no drop counts; count raw vs survivors).
- `web/package.json` -- ESM, no tsx; imports lack `.ts`, so add `tsx`.
- `proxy/app/llm.py:48,70,81` -- `build_agent`, `render_passages`, `run_once`. `get_agent()` is cached on settings; build `OpenRouterModel(name, provider=get_provider())`.
- `proxy/app/rules.py:31` -- `validate_study_set`. `config.py:10,12` -- `PROMPT_VERSION`, `DEFAULT_MODEL`.
- `proxy/tests/conftest.py`, `tests/study_set_data.py:71` -- no model requests, `StubModel`.
- `e2e/Dockerfile` copies `proxy/` and `reference-notes/` into the test image.
- `compose.yaml:6`, `README.md:37,75`; `.docs/deviations.md` next D-15; logs in `.logs/lysebo/`.

## Tasks & Acceptance

**Execution:**
- [x] `web/package.json` -- `tsx` (dev), scripts `export-passages`, `evaluate`.
- [x] `web/scripts/export-passages.ts`, `web/scripts/evaluate.ts` -- per the matrix.
- [x] `proxy/scripts/record_fixtures.py` -- `--model` / `--promote`; slug = name with `/` → `__`; one attempt, `GENERATION_TIMEOUT_S`.
- [x] `proxy/tests/test_record_fixtures.py` -- StubModel: shape, failed call, promote strips extras and refuses failures, no key.
- [x] `proxy/tests/test_fixtures.py` -- each Fixture: four keys, parses as `StudySetDraft`, passes `validate_study_set`, matches `PROMPT_VERSION` and `DEFAULT_MODEL`, 64-hex filename.
- [x] `web/extract/fixtures.test.ts` -- reference-note hashes and Fixture files match one-to-one.
- [x] Run export → record two models → evaluate → promote; commit `proxy/recordings/` and `proxy/fixtures/`. Needs the key: the implementer runs export only, then stops and reports; the orchestrator runs the live steps with Tor and the config, README and D-15 result follow from them. The Fixture tests must pass (vacuously) while `proxy/fixtures/` is still empty.
- [x] `config.py`, `compose.yaml`, `README.md` -- chosen model; section "Fixtures og modellvalg" (commands, re-record rule); fix line 75.
- [x] `.docs/deviations.md` -- D-15: recordings folder, choice rule and result, `simpler: {}`.

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` without a key, then Vitest, pytest and Playwright pass, and `npx tsc --noEmit` passes.
- Given committed recordings, when `npm run evaluate` runs without a key, then it prints the comparison with no network call.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Source | Finding | Verdict | Route / evidence |
|---|--------|---------|---------|------------------|
| 1 | BH, VG | Vacuous-pass guards in `fixtures.test.ts` and `test_fixtures.py` stay green if the committed Fixtures or `passages.json` are deleted | medium | patch: early returns removed, non-empty assertion added |
| 2 | BH, VG | No test checks committed Fixtures against the browser Quote Check / `verifyStudySet`; `rules.py` alone accepts a set that ends in `err.tooFewItems` | medium | patch: Vitest compares each Fixture with its recording and asserts `verifyStudySet(validated, passages).ok` |
| 3 | BH, EC | Winner sort compares float mean pass rates exactly, so rounding noise skips the Items and timing tie-breaks | low | patch: compare at 0.1 % precision, as printed |
| 4 | BH | README recipe says "tre steg" but shows four commands, step 2 for one model only, omits the `promptVersion` refusal and the post-trim pass-rate denominator | low | patch: wording corrected |
| 5 | BH | No tests that a refused promote leaves existing Fixtures and that a wrong `promptVersion` is refused | low | patch: two pytest cases |
| 6 | VG | `isMain` and the script entry points are untested; a broken guard makes both npm scripts exit 0 silently | low | patch: `isMain.test.ts` (direct-run paths observed by hand) |
| 7 | BH, EC | `evaluate.ts` ignores `promptVersion`, so a stale recording could be compared | low | rejected: README re-records every candidate on a `PROMPT_VERSION` bump, and `--promote` refuses a stale recording, so a wrong winner cannot reach `proxy/fixtures/`; a fix needs the Python constant in TS |
| 8 | BH, EC, VG | `--promote` does not check `model == DEFAULT_MODEL` or the slug | low | rejected: `test_fixtures.py` fails loudly on it; the documented order (promote, then set the default) would be blocked by such a guard |
| 9 | EC | `--promote` without `passages.json` gives a traceback | low | rejected: a loud failure on a state the documented workflow never reaches |
| 10 | BH, EC | Promote deletes and then writes, so a failed write can leave `fixtures/` partial | low | rejected: unlikely local failure, recovered with `git checkout`; a temp-dir swap adds complexity |
| 11 | EC | Ctrl-C or a malformed entry mid-recording leaves a mix of old and new recordings | low | rejected: re-running the model overwrites all three; malformed entries come only from `export-passages.ts` |
| 12 | EC | Invalid JSON in a recording gives an uncaught stack trace in `evaluate` | low | rejected: loud failure on files only the scripts write |
| 13 | BH | Recordings store no timeout or date | low | rejected: D-15 and README record both; adding fields changes the recording shape for no consumer |
| 14 | BH | Pass rate is measured after the Proxy's trimming | low | by design (Design Notes); the README wording is fixed in #4 |
| 15 | BH | Fallback survivor counts for a rejected set are approximate but unmarked | low | rejected: such rows can never win (`all notes ok` excludes them); cosmetic |
| 16 | BH | Diff omits the spec, JSON data files and lock file | false | excluded on purpose: the spec goes only to the edge-case layer, and the data files are generated output |
| 17 | BH | D-15 is `done` while the sprint status is `in-progress` | false | as in D-1…D-14, `done` means recorded; the sprint status moves at the end of the build |

## Design Notes

Candidate recordings live outside `proxy/fixtures/`, so the Proxy image ships only the winner. `validated` is stored because `verifyStudySet` expects the Proxy-trimmed `StudySet`, and the trim rules exist only in Python.

## Verification

**Commands:**
- `cd web && npx vitest run && npx tsc --noEmit` -- green.
- `cd proxy && uv run --frozen pytest -q -p no:cacheprovider` -- green.
- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
