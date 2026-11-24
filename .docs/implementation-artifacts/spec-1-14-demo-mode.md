---
title: 'Story 1.14: Demo Mode with the bundled sample notes'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'd98e78459ec9cdb2d72411ce312dd33bcd498afb'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** With no API key nothing can be generated: `mode: "demo"` always gets 404, the web build has no sample notes, and declining Consent lands on Start. The examiner's path (UJ-3) is missing.

**Approach:** Build-time copy of the reference notes to `web/public/samples/` + manifest; Demovelger (`/demo`); a persisted `demoMode` setting with top-bar indicator and Innstillinger switch; a Proxy demo branch serving `proxy/fixtures/{noteHash}.json`. Refs: FR-5, FR-23, FR-24 · AD-9, AD-12, AD-20 · UX-DR32, UX-DR33.

## Boundaries & Constraints

**Always:**
- Samples run the upload pipeline (`checkFile` → `extractInWorker` → `requestStudySet` → `verifyStudySet` → `saveGeneratedNote`). The browser never decides which hashes are samples; the Proxy's 404 is the rejection.
- `api/` derives mode from fresh settings (`demoMode` → `"demo"`); `canSend` order unchanged.
- Demo records: Note key `demo:{noteHash}`, `cacheKey` `demo:{noteHash}:{promptVersion}:{model}`, route `/notat/demo:{noteHash}`; the POST carries the bare hash.
- Proxy demo: Fixture `studySet` → `validate_study_set(model, prompt_version from the Fixture)`; no agent, key or rate-limit count.
- New strings are `messages.ts` keys, recorded in D-16.
- Decided by Tor 2026-11-24: only the first-open Consent gate sends 'Nei takk, vis demo' to Demovelger; a reopened dialog keeps today's behaviour.
- Decided by Tor 2026-11-24: sample names "Smidig utvikling og Scrum" (nb), "Den digitale verden" (nb), "Unit testing" (en), with `demo.lang.nb` / `demo.lang.en`.

**Never:** Simpler, Rounds, a stored-Notes list, paste input, or changes to extraction, prompt, schema or Fixtures.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Build | `npm run build` / `dev` | 3 files + `manifest.json` `[{file, title, language}]` | missing source: exit non-zero, name it |
| Pick sample | any Consent, no key | `demoMode: true`, Genererer, `/notat/demo:{hash}` | fetch fails → `err.unreadable`; manifest fails → `err.generation` |
| Proxy demo | Fixture hash / unknown hash | 200 validated `StudySet` / 404 `err.demoOnly` | invalid Fixture → 502 `err.generation` |
| Own upload in Demo | valid non-sample file | FR-3 first, then `err.demoOnly` inline at the drop zone | — |
| Demo off | no key / declined | `err.noKey` / `consent.declined` (unchanged) | — |
| Same note live + demo | both stored | separate Note and Study Set records | — |

</frozen-after-approval>

## Code Map

- `proxy/app/main.py:140` -- the 404 stub; add `FIXTURES_DIR` (monkeypatchable). `note_hash` is already 64-hex (`schemas.py:61`). Its docstring is copied into `web/api/schema.d.ts:35`.
- `web/storage/settings.ts:12` -- schema gets `demoMode`.
- `web/components/AppSettings/AppSettings.tsx` -- `decide` pattern for `setDemoMode`; `restoreFocus` gate branch (the "DR-4 interim" comment) is where decline must go to `/demo`.
- `web/api/studySet.ts` -- `checkSendGate`, `pending` map (key it `${mode}:${noteHash}`), `post()` error mapping.
- `web/core/ids.ts:27` -- `cacheKey`; add `demoKey`.
- `web/components/Generating/Generating.tsx` -- saves and navigates; `FailureCode`.
- `web/app/notat/[noteHash]/page.tsx:105` -- regenerate passes `state.note.noteHash` (must strip `demo:`).
- `web/app/page.tsx` -- `block()` shows gate errors inline.
- `web/components/TopBar/TopBar.tsx`, `ConsentSettings/ConsentSettings.tsx` -- patterns for the indicator and the settings section.
- `web/scripts/isMain.ts` -- entry guard for the new script.
- `compose.yaml` (`web`, `web-test`, `web-dev`), `web/Dockerfile` -- build context is `./web`, so `reference-notes/` is not visible yet. Root `.dockerignore` covers `node_modules`/`.next`.
- `proxy/tests/test_guards.py`, `test_study_set.py:147`, `e2e/guards.spec.ts:25` -- demo requests use non-Fixture hashes, so 404 stays; update stale "1.13/1.14" comments.

## Tasks & Acceptance

**Execution:**
- [x] `proxy/app/main.py`, `proxy/tests/test_demo.py` -- demo branch; tests: every Fixture → 200 equal to `validate_study_set` with no key; unknown → 404; invalid Fixture → 502; not rate-limited.
- [x] `web/scripts/copy-samples.ts` (+ test), `web/package.json` (`samples`, `prebuild`, `predev`), `.gitignore` (`web/public/samples/*` except `.gitkeep`) -- copies `../reference-notes/{nb-smidig-scrum.md, nb-digital-verden.docx, en-unit-testing.pdf}`; test: byte-identical files, three manifest entries, missing source fails.
- [x] `compose.yaml`, `web/Dockerfile` -- `web`/`web-test` build from repo root with `reference-notes/` at `/reference-notes`; `web-dev` mounts it read-only.
- [x] `web/storage/settings.ts`, `web/core/ids.ts`, `web/api/studySet.ts` (+ tests) -- `demoMode`; `demoKey(x)` = `demo:{x}`; mode in body and result; 404 `err.demoOnly` → `err.demoOnly`.
- [x] `AppSettings.tsx`, `Generating.tsx`, `web/app/page.tsx`, `notat/[noteHash]/page.tsx` -- `setDemoMode`; decline → `/demo`; demo save under `demoKey`; `err.demoOnly` via a new `onRejected` prop to Start's inline error; 'Prøv demomodus' link on Start.
- [x] `web/app/demo/page.tsx`, `TopBar.tsx`, new `DemoSettings/DemoSettings.tsx`, `innstillinger/page.tsx`, `messages.ts` -- Demovelger (manifest list; pick → `File([bytes], "{title}.{ext}")` → extract → `setDemoMode(true)` → `Generating`); indicator `Link` to Innstillinger; Studier `h2` with Radix `Switch` and visible 'På'/'Av'. Keys: `title.demo`, `demo.h1`, `demo.lang.*`, `start.demo`, `demo.indicator`, `settings.studies.h2`, `settings.demo`, `settings.demo.desc`, `toggle.on`, `toggle.off` (texts from EXPERIENCE.md Microcopy).
- [x] `e2e/demo.spec.ts`, `e2e/consent.spec.ts` -- fresh context: decline → Demovelger (`h1` focused) → Norwegian sample → Notatoversikt with Summary Points → reference jump marks one `<mark>`; indicator; switch off; own upload → `err.demoOnly`; axe on Demovelger and Innstillinger. First-open decline tests now expect Demovelger.
- [x] `README.md`, `.docs/deviations.md` -- Demo section; D-16 (keys, sample names, decline target, inline `err.demoOnly`, manifest-failure key).

**Acceptance Criteria:**
- Given `docker compose run --rm --build test` with no key, then Vitest, pytest, Playwright and `npx tsc --noEmit` pass, with no request reaching the provider.
- Given Demo on and a key configured, when a sample is picked, then the request is `mode: "demo"` and no live record is written.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Source | Finding | Verdict | Route / evidence |
|---|--------|---------|---------|------------------|
| 1 | VG | Demovelger error views (manifest failure, sample fetch failure) untested where they render | medium | patch: two `page.route` tests in `e2e/demo.spec.ts` |
| 2 | VG, BH | 'Prøv igjen' on a `demo:` Note (`bareNoteHash`, key switch in `onSaved`) untested | medium | patch: demo variant of the `err.noConcepts` test in `e2e/notat.spec.ts` |
| 3 | VG | Demo indicator never asserted on the narrow top bar | low | patch: `toBeVisible` at 320 px |
| 4 | BH | `web/.dockerignore` is dead after the root build context | low | patch: deleted |
| 5 | BH | `studySet.test.ts:311` redundant `ok && ok` expression | low | patch: simplified |
| 6 | BH | README says "(bokmål)", UI says "Norsk" | low | patch: README uses "(norsk)" |
| 7 | BH, EC | Demo Mode turned on at pick, stays on if generation fails | false | by design: `api/` derives mode from settings, so it must be on before the POST; EXPERIENCE.md says choosing a sample turns it on; the indicator shows it |
| 8 | BH, EC | `pick` not aborted on unmount; may turn Demo on after leaving `/demo` | low | rejected: needs leaving within the ~1 s fetch/extract window; fix adds a mounted guard and signal plumbing |
| 9 | BH | `err.demoOnly` offers no way out of Demo Mode | low | rejected: Microcopy text is EXPERIENCE.md's; the indicator links to the switch; adding actions is new UI |
| 10 | BH, EC | Demovelger has no loading state or manifest retry; `err.generation` wording | low | rejected: the manifest is a static file from the same server; the key choice is recorded in D-16 |
| 11 | BH | `pending` shows on every sample button | low | rejected: all buttons are blocked while one loads; tracking the picked one adds state for a cosmetic gain |
| 12 | BH | 'Tilbake til start' on Demovelger's Genererer goes to `/` | false | the button's text (`gen.back`) says Start |
| 13 | BH | Proxy does not check Fixture `promptVersion` against `PROMPT_VERSION` | false | `proxy/tests/test_fixtures.py:53` fails on a stale Fixture |
| 14 | BH | Broken Fixture 502 leaves no log trace | false | the middleware logs status and `err.generation`; exception text is withheld on purpose (AD-14) |
| 15 | BH | Demo trusts the client `noteHash`; sync disk read, not rate-limited | false | Fixtures are public sample content and the Proxy never compares text (AD-5); a few-kB read per request is negligible |
| 16 | BH | Indicator lacks focus style and `aria-current` | false | `global.css:61` gives every `:focus-visible` element the 3 px ring; `aria-current` is not required by the spec or axe |
| 17 | BH | No IndexedDB test for live + demo records side by side | low | rejected: `recordsForMode` unit test proves distinct keys; `saveGeneratedNote` puts by key |
| 18 | BH | Review diff omits spec and tracking files | false | excluded on purpose, as in 1.13 |
| 19 | EC | First-open gate on `/demo`, accept → pushed to Start | low | rejected: same rule as 1.3 (accept on first open lands on Start, tested for `/innstillinger`) |
| 20 | EC | Duplicate `file` in manifest gives duplicate React keys | false | the manifest is written only from the `SAMPLES` constant |
| 21 | EC | Fixture removed between `is_file` and read → 502 | false | the Proxy container is `read_only`; Fixtures never change at runtime |
| 22 | EC | Stale files left in `public/samples/` when `SAMPLES` changes | low | rejected: Docker builds start clean; locally only after editing the constant |

## Design Notes

The title-named `File` keeps the Fixture match (the Note Hash depends only on Passages) and gives a readable title in the top bar and source label.

## Verification

**Commands:**
- `cd web && npx vitest run && npx tsc --noEmit` -- green.
- `cd proxy && uv run --frozen pytest -q -p no:cacheprovider` -- green.
- `docker compose --profile test build && docker compose run --rm test` -- exit 0.
