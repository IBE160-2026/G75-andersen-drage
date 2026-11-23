---
title: 'Story 1.3: Consent gate and Innstillinger › Samtykke'
type: 'feature'
created: '2026-11-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'dc86231feccc4118f24a4be50fa57e3b927b2a75'
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing tells the student that Notes go to an external AI provider, and there is no stored choice for later stories to gate on (FR-5). Upload (1.4) and generation (1.9) need settings storage, `/api/status` at startup and one send gate.

**Approach:** Add `web/storage/settings.ts` (localStorage, Zod, `schemaVersion`, memory fallback), an `api/status.ts` startup fetch with 3 retries, `core/gate.ts canSend`, a non-dismissable Radix Consent dialog with a 'Les mer' disclosure, `consent.declined` on Start, and the Samtykke section in Innstillinger. Refs: FR-5 · AD-6, AD-10, AD-13, AD-15, AD-20 · UX-DR27, UX-DR28, UX-DR32.

## Boundaries & Constraints

**Always:** only `web/storage/` touches `localStorage`, except the pre-paint inline script, which reads the same key in try/catch and sets `data-consent` (`accepted` | `declined` | `unset`) next to `data-theme`; every string from `messages.ts`, with `{leverandør}` filled from `/api/status` (or the fallback when status never answered); the Consent dialog is the Radix Dialog, `h2` via `aria-labelledby`, body via `aria-describedby`, blocks Esc and outside clicks; accept is the only primary button; pin `zod@4.6.7`.

**Never:** no other Innstillinger sections (Studier, Lagring, Sletting); no Demovelger or Demo Mode (1.14: decline lands on Start, DR-4 interim); no `storage.unavailable` banner (Story 3.7); no IndexedDB or `idb`; no POST endpoints or `api/` POST client (`canSend` is built and unit-tested, wired by 1.9); no Proxy changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First open | no stored decision | dialog over Start, focus inside it, `data-consent="unset"` | Esc / outside click do nothing |
| Status answers | `/api/status` 200 | `consent.body` names OpenRouter and the model | — |
| Status down | 3 failed tries 1 s apart | provider fallback from `messages.ts` | live state stays "unknown"; app usable |
| Accept | 'Jeg forstår, fortsett' | stored `accepted`, dialog closes, Start h1 focused | — |
| Reload after accept | stored `accepted` | `data-consent="accepted"` in `<head>`, dialog never rendered | — |
| Decline | 'Nei takk, vis demo' | stored `declined`, Start shows `consent.declined`; its link reopens the dialog | — |
| Withdraw | Innstillinger, accepted | → declined, `settings.consent.withdrawn` via `role="status"`, no confirmation | — |
| Accept later | Innstillinger, declined | 'Godta at notater sendes' opens the dialog; focus returns to the trigger on close | — |
| Corrupt setting | invalid JSON or schema | treated as no decision, setting reset | — |
| Storage blocked | `localStorage` throws | memory fallback: asked once per session, app works | no crash |

**Decisions (2026-11-23, Tor):** the strings below are approved as written. `{leverandør}` in `consent.body` is "OpenRouter (modellen {model})" with the raw model ID from `/api/status`, or `consent.provider.fallback` alone while status has not answered; in every other string it is just "OpenRouter". The spec is kept whole (~1800 tokens) rather than split.

| Key | String |
|---|---|
| consent.title | "Før du starter" |
| consent.body | "Notatet ditt sendes til {leverandør} for å lage kort og quiz. Vil du ikke det, kan du prøve appen med eksempelnotater." |
| consent.more | "Les mer" |
| consent.more.b *(new)* | "OpenRouter sender notatet bare til KI-tjenester som verken lagrer det eller bruker det til trening." |
| consent.more.c *(new)* | "Appen lagrer og logger ikke innholdet i notatene dine." |
| consent.more.d *(new)* | "Notatene og fremgangen din lagres bare i denne nettleseren." |
| consent.more.e *(new)* | "Du kan trekke tilbake samtykket når som helst i Innstillinger." |
| consent.accept / decline | "Jeg forstår, fortsett" / "Nei takk, vis demo" |
| consent.declined | "Du har ikke godtatt at notater sendes til {leverandør}. Du kan bruke demomodus, eller [godta nå]." |
| settings.consent.h2 *(new)* | "Samtykke" |
| settings.consent.on | "Notatene dine sendes til {leverandør} når du lager kort og quiz." · 'Trekk tilbake samtykke' |
| settings.consent.off | "Notatene dine sendes ikke til {leverandør}. Du kan bruke eksempelnotatene." · 'Godta at notater sendes' |
| settings.consent.withdrawn | "Samtykket er trukket tilbake." |
| consent.provider.fallback *(new)* | "OpenRouter" |

</frozen-after-approval>

## Code Map

- `web/app/layout.tsx` -- `PRE_PAINT` script; add the `data-consent` read (same storage key as `storage/settings.ts`, exported constant inlined at build).
- `web/components/AppShell/AppShell.tsx` -- mount gate; wrap children in the new settings/status provider and render `ConsentDialog`.
- `web/components/Screen/Screen.tsx` -- focuses `h1` on mount; must not steal focus from an open dialog.
- `web/app/page.tsx`, `web/app/innstillinger/page.tsx` -- Start empty state; settings placeholder h1.
- `web/i18n/messages.ts` -- add keys; `t()` has no interpolation yet.
- `web/api/schema.d.ts` -- `components["schemas"]["Status"]` = `{keyConfigured, model, provider, promptVersion}`; do not edit.
- `web/components/Button/` -- reuse `variant` primary/secondary/ghost.
- `e2e/shell.spec.ts` -- 1.2 tests assume no dialog; they must seed `accepted` with `page.addInitScript` before `goto`.
- `web/core/tokens.test.ts` -- hard-coded-text and `var(--…)` guards also cover the new components.
- `.docs/deviations.md` -- D-3 lists added keys; new keys get D-4.

## Tasks & Acceptance

**Execution:**
- [x] `web/package.json` + lockfile -- add `zod@4.6.7`.
- [x] `web/storage/settings.ts` + test -- `SETTINGS_KEY`, Zod schema `{schemaVersion: 1, consent?: "accepted" | "declined"}` (unknown fields kept), `readSettings`, `writeSettings`; invalid → reset; throwing storage → in-memory fallback.
- [x] `web/api/status.ts` + test -- `fetchStatus` with 3 retries 1 s apart (injected delay); returns `Status | null`.
- [x] `web/core/gate.ts` + test -- `canSend(settings, status, mode)` per AD-20, one test per branch, `status` may be `null` (→ `err.noKey` path treats null as not configured).
- [x] `web/i18n/messages.ts` -- keys from the approved table plus `err.noKey`; add `format(key, vars)` for `{leverandør}`.
- [x] `web/components/AppSettings/` -- React context: settings, status, `accept()`, `decline()`, `openConsent()`.
- [x] `web/components/ConsentDialog/` -- Radix Dialog, `onEscapeKeyDown` / `onPointerDownOutside` / `onInteractOutside` prevented, no close button, 'Les mer' button with `aria-expanded` controlling points B–E.
- [x] `web/app/layout.tsx`, `AppShell.tsx` -- pre-paint `data-consent`; provider + dialog.
- [x] `web/app/page.tsx` -- `consent.declined` notice with an inline link-styled button that opens the dialog.
- [x] `web/app/innstillinger/page.tsx` -- `h2` Samtykke, status text, secondary withdraw / accept button, polite `role="status"` region.
- [x] `e2e/consent.spec.ts` -- every I/O row; axe with the dialog open at desktop and 320 px; update `shell.spec.ts` seeding.
- [x] `.docs/deviations.md` -- D-4 for the new keys. EXPERIENCE.md Microcopy -- mark the Samtykke and `settings.consent.*` rows *(approved)* (2026-11-23) and add the new keys; no other edits. `README.md` -- one line on Consent and where to withdraw it.

**Acceptance Criteria:**
- Given `docker compose run --rm test` with no key, when run, then all three suites pass, including the new unit and e2e tests.
- Given any new component, when inspected, then no visible text is hard-coded outside `messages.ts`.

## Implementation Notes

- **Status tries:** "3 retries" is read as 3 tries in total, 1 s apart (matrix row "3 failed tries 1 s apart"), so `fetchStatus` makes at most 3 requests and waits 2 × 1 s.
- **Extra keys (D-4):** `consent.provider.model` ("{provider} (modellen {model})") keeps the approved `{leverandør}` value out of component code; `settings.consent.on.action` / `.off.action` hold the two button labels. `consent.declined` keeps `[godta nå]`; `ConsentNotice` splits on the brackets and renders the inside as a link-styled button.
- **Focus:** `Screen` skips its h1 focus while a `[role="dialog"]` is in the DOM. `ConsentDialog`'s `onCloseAutoFocus` calls `restoreFocus()`: from the first-run gate it focuses the Start h1 (or navigates to `/` when the gate opened on another route, which matches "decline lands on Start"); when it was opened from a trigger it focuses the trigger, or the main h1 if the trigger is gone. Innstillinger uses one button node whose label flips, so focus returns to it after accepting.
- **`data-consent`** is set by the pre-paint script and kept in step by `AppSettingsProvider` after each decision. `SETTINGS_KEY` = `torsa.settings`, inlined into the script with `JSON.stringify`.
- **Memory fallback:** `createSettingsStore` reports `usingMemory()` for Story 3.7's banner; nothing renders it yet.
- **Shared IDs** moved to `components/AppShell/ids.ts` so `AppSettings` and `Screen` can import them without a cycle; `AppShell` re-exports them.
- `e2e/seed.ts` seeds a decision once per tab (sessionStorage guard), so reloads see what the app stored. `smoke.spec.ts` needed the same seeding as `shell.spec.ts`.

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter = B, Edge Case Hunter = E, Verification Gap = V).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| B1, V1, E1 | `Screen` early return on open dialog also skips the first-Tab-to-skip-link handler | medium | Verified: the return sits before `addEventListener`; effect deps `[title]` do not re-run after the gate closes, so on first visit Tab from the Start h1 skips the skip link (1.2 contract). No test presses Tab after the gate. | patch (+ e2e) |
| B2, E8 | Blocked storage: dialog returns on every full reload | low | Real: memory is module-scoped. AD-10 says "asked once per session"; a reload with blocked storage is rare, and sessionStorage is usually blocked too, so a fix needs a new persistence path. | reject (low, fix not a direct correction) |
| B3 | Higher `schemaVersion` is removed on read | false | AD-10 and Story 3.7 specify that unknown versions are reset; this is the documented behaviour, not a bug. | reject |
| B4 | Key and validation duplicated in pre-paint script and `e2e/seed.ts` | low | Pre-paint hard-codes `schemaVersion===1` while the key is already interpolated: direct correction. `seed.ts` lives in the separate e2e package and cannot import `web/` cleanly. | patch (schemaVersion only) |
| B5 | `provider` comes from `status.provider`, not always "OpenRouter" | low | Decisions say `{leverandør}` outside `consent.body` is just "OpenRouter"; today identical (AD-13), but a direct correction keeps the strings consistent with `consent.more.b`. | patch |
| B6 | `epic-1-context.md` still calls the Consent provider name open | low | Verified in the bullet "Microcopy status". Fixed directly in the context file during triage (not code). | patch (done) |
| B7 | `err.noKey` missing from D-4 | false | `err.noKey` is in the EXPERIENCE.md Microcopy table with identical text; not a new key. | reject |
| B8 | Spec `in-review` vs sprint-status `in-progress` | false | Expected mid-workflow: sprint status moves to `review` at presentation. | reject |
| B9 | Dialog description changes while open (model name not announced) | low | Real for a screen reader that has read the fallback already; status usually answers within milliseconds locally. Fix (delay the dialog) adds state. | reject (low) |
| B10 | No e2e for `data-consent` after withdraw, gate from non-Start page via notice; gate codes hand-listed | low | Withdraw state is covered by the settings and Start assertions; `data-consent` is informational. | reject (low) |
| B11 | `ConsentNotice` bracket split untested | false | `messages.test.ts` asserts the exact `consent.declined` string including `[godta nå]`; the decline e2e test clicks the link. | reject |
| B12 | README "og hvilken modell" overstates when status is down | low | True only when the Proxy is unreachable, which also breaks the app; wording is accurate in normal use. | reject (low) |
| B13 | "Exactly one primary action" test does not check the variant | medium | Verified: the test only asserts both buttons are visible; the Always rule "accept is the only primary button" is unguarded. | patch |
| E2 | Hung `/api/status` never times out, so no retries | low | Real in theory; Compose gates `web` on the Proxy healthcheck and the fallback name shows meanwhile. Fix adds a timeout signal. | reject (low) |
| E3 | Abort during the 1 s delay waits up to 1 s | low | Only after unmount of the root provider; harmless. | reject (low) |
| E4 | Empty `model` / `provider` string accepted | low | The Proxy always sets both from defaults; fix adds a guard for an undemonstrated state. | reject (low) |
| E5 | No `storage` event listener across tabs | low | AD-10: last write wins across tabs; live sync is not required. | reject (low) |
| E6 | Fallback description asserted before any try failed | low | Verified: status is null from the start, so the assertion is trivially true; re-asserting after the third try is a direct correction. | patch |
| E7 | EXPERIENCE.md `consent.body` cell gained a parenthetical | low | The note records the approved `{leverandør}` decision in the row it applies to; content of the string is unchanged. | reject (low) |
| V2 | Pre-paint `declined` / `unset` branches only checked after the provider rewrites them | low | Verified-gap layer, pre-verified: only `accepted` is observed before hydration. `data-consent` is informational; filed disposition defer. | defer |

## Design Notes

**Focus with the dialog open.** Radix traps focus while the dialog is open, so `Screen` focusing its `h1` on mount must not win. Render the dialog after the screen mounts, or let `Screen` skip `focus()` when `document.querySelector('[role="dialog"]')` is open. After accept or decline, focus goes to the Start `h1`; when the dialog was opened from a trigger, focus returns to that trigger.

**`data-consent` is informational before paint.** `AppShell` renders nothing until mount, so the dialog cannot flash. The attribute lets CSS and tests see the state without JS state.

## Verification

**Commands:**
- `docker compose run --rm --build test` -- exit 0, all suites incl. axe.

**Manual checks:**
- Fresh profile: Tab through the dialog at 320 px; Esc does nothing; 'Les mer' toggles.
