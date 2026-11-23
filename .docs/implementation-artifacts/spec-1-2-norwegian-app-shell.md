---
title: 'Story 1.2: Norwegian app shell with design tokens and accessible structure'
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'fcf673b56b1023f860b204f8af40a7fc6bbeccc7'
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/ux-designs/ux-G75-andersen-drage-2026-11-10/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app is a bare placeholder `h1`; every later UI story needs a shared Norwegian shell, design tokens, strings and accessible building blocks, or each screen will diverge (UX-DR1–6, 21–24, 35, 36).

**Approach:** Build the shell per AD-15/16/17: `tokens.css` from DESIGN.md frontmatter, `i18n/messages.ts`, `features.ts`, a client-rendered layout behind a mount gate with skip link, top bar (condensed 'Mer' menu below 768 px), route focus/title handling, and shared Button, ErrorMessage and EmptyState components, checked by Vitest and Playwright + axe. Refs: AD-15, AD-16, AD-17 · NFR-6, NFR-7, NFR-9.

## Boundaries & Constraints

**Always:** tokens only from DESIGN.md (`:root` = light, `[data-theme="dark"]` = `-dark` values, font sizes in rem, system font stacks); components use `var(--token)` only, one CSS Module each; every visible string from `messages.ts`; `<html lang="nb">`; 3 px `:focus-visible` ring on every interactive element; 44 px minimum targets; pins `radix-ui@1.8.1`, `@axe-core/playwright@4.14.0`.

**Never:** no Consent, `data-consent` or Innstillinger content (Story 1.3); no upload (1.4); no Demo indicator, Note name or Readiness in the top bar yet (no data); no theme toggle while `darkMode` is false; no Tailwind, web fonts, stylelint/ESLint, or new state library; no edits to planning docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First load | `/` | `data-theme="light"` before paint; h1 `start.empty` focused; title "Dine notater · Torsas læringsassistent" | — |
| Keyboard | first Tab on any route | skip link visible, activates focus on `h1` | — |
| Navigate | 'Innstillinger' clicked | `/innstillinger`, h1 focused, title "Innstillinger · Torsas læringsassistent" | — |
| Narrow | viewport < 768 px | brand + 'Mer'; menu opens with arrows, Esc returns focus to 'Mer' | — |
| Pending button | `pending` prop set | `aria-disabled="true"`, click ignored, focus kept | — |
| 320 px / 200 % zoom | viewport 320 and 640 CSS px | no horizontal scroll; axe no serious/critical | test fails |

**Decisions (2026-11-22, Claude, no user-visible gap):** routes `/` = Dine notater, `/innstillinger` = Innstillinger (placeholder h1 only). Strings missing from the EXPERIENCE.md Microcopy table get new keys in the same `surface.item` scheme (`app.brand`, `nav.notes`, `nav.settings`, `title.notes`, `title.settings`, `settings.h1`); planning docs untouched.

</frozen-after-approval>

## Code Map

- `web/app/layout.tsx`, `web/app/page.tsx` -- 1.1 placeholders; replace, keep `lang="nb"`.
- Do not change: `web/next.config.ts`, `web/api/schema.d.ts`, `compose.yaml`, `scripts/test.sh`.
- `web/vitest.config.ts` -- extend `include` beyond `core/**`, `extract/**`; environment stays `node`.
- `e2e/smoke.spec.ts` -- must keep passing. `e2e/Dockerfile` runs `npm ci`: regenerate `web/` and `e2e/` lockfiles in the Linux image if host output differs.
- DESIGN.md frontmatter: colors L17-66, typography L67-171, rounded L172-177, spacing L178-190; components top-bar L193, overflow-menu L215, skip-link L222, button-* L236-254, focus-ring L265, error-message L433, empty-state L439; prose L582-620.
- EXPERIENCE.md: page structure/titles L64-80, Microcopy L97-177, top bar L185-189.

## Tasks & Acceptance

**Execution:**
- [x] `web/package.json` + lockfile -- add `radix-ui@1.8.1`.
- [x] `web/styles/tokens.css` -- all DESIGN.md colour, typography, radius, spacing tokens as `--{group}-{name}`.
- [x] `web/styles/global.css` -- reset, body type, `overflow-wrap:anywhere`, `:focus-visible` ring, `.visually-hidden`.
- [x] `web/features.ts` -- `shortcuts`, `panicMode`, `exportImport`, `archive`, `importance`, `darkMode`, all `false`.
- [x] `web/i18n/messages.ts` -- typed key map + `t(key)`.
- [x] `web/app/layout.tsx` -- static pre-paint `<head>` script `document.documentElement.dataset.theme="light"`, global CSS, `AppShell`.
- [x] `web/components/AppShell/` -- renders `null` until a `useEffect` mount flag (AD-15); skip link → `header` → `main`.
- [x] `web/components/TopBar/` -- brand link `/`, ghost 'Innstillinger' link; < 768 px brand + 'Mer' (Radix DropdownMenu, 44 × 44).
- [x] `web/components/Screen/` -- on mount sets `document.title` and focuses its `h1` (`tabindex="-1"`); each page owns its focus, no router listener.
- [x] `web/components/Button/`, `ErrorMessage/`, `EmptyState/` -- Button `variant` primary/secondary/ghost + `pending`; ErrorMessage `role="alert"`, icon + `err.prefix` + text + next-step slot; EmptyState h1 + next-step line + actions slot.
- [x] `web/app/page.tsx`, `web/app/innstillinger/page.tsx` -- empty state `start.empty`; placeholder h1.
- [x] `web/core/tokens.test.ts` -- no hex in `*.module.css`; every DESIGN.md token present (both themes where `-dark` exists); flags all false; every `t()` key used in `components/`, `app/` exists.
- [x] `e2e/shell.spec.ts` + `e2e/package.json` -- add `@axe-core/playwright@4.14.0`; I/O matrix rows; axe on both routes at desktop and 320 px.
- [x] `README.md` -- short Norwegian note on shell, tokens, `features.ts`.

**Acceptance Criteria:**
- Given any rendered screen, when inspected, then no visible text is hard-coded outside `messages.ts`.
- Given `docker compose run --rm test`, when run with no key, then all three suites pass, including the new shell tests.

## Implementation Notes

- **First Tab vs h1 focus.** Rows 1 and 2 conflict as written: the focused `h1` sits inside `main`, so a plain Tab would move past the skip link. `Screen` therefore sends the first Tab after mount (no Shift, focus still on the `h1`) to the skip link; every later Tab is native. No router listener; each `Screen` owns it.
- **Token test needs DESIGN.md in the test image.** `.docs` is dockerignored, so `.dockerignore` re-includes only DESIGN.md and `e2e/Dockerfile` copies it to the same relative path; `web/core/tokens.test.ts` parses its frontmatter and fails if the file is missing.
- **Token names:** `--colors-*`, `--typography-{role}-{property}` (for example `--typography-body-font-size`), `--rounded-*`, `--spacing-*`.
- **Extra keys:** `nav.label` (top bar `nav` landmark name) and `start.empty.next` (second string of `start.empty`).
- **Both top-bar variants are in the DOM;** CSS hides one at the 768 px breakpoint, which also hides it from assistive tech.
- **Pending Button** is covered by Vitest (`components/Button/Button.test.tsx`), since no screen uses it yet. 200 % zoom is approximated by a 640 px viewport.

## Spec Change Log

## Review Triage Log

Iteration 0 (Blind Hunter = B, Edge Case Hunter = E, Verification Gap = V).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| B1, E5, E11 | Mount gate leaves server HTML empty; no `noscript` | false | Intended: AD-15 and the frozen Approach require client-only rendering behind a mount gate; no-JS is not a supported path. | reject |
| B2, E10 | No `<title>` before mount (metadata title removed) | low | Real, but only until hydration (milliseconds locally); restoring metadata re-introduces the overwrite the agent observed. | reject (low, fix not a direct correction) |
| B3, E3 | Skip-link fallback to `main` is not focusable when no `h1` | low | Every route renders `Screen` + `h1`; no screen without `h1` exists. Fix adds a branch. | reject (low, unreachable today) |
| E4 | `Screen` without `h1` loses focus | low | Same as B3: no such screen exists. | reject |
| B4 | No `aria-current="page"` in top bar | low | Not required by spec or EXPERIENCE.md top-bar pattern; fix needs pathname plumbing. | reject |
| B5 | `nav` landmark only wraps the wide variant; lost below 768 px | low | Verified: narrow 'Mer' sits in a plain `div`, so mobile AT users have no navigation landmark. Fix is moving the `nav` wrapper. | patch |
| B6 | Token test never checks that used `var(--…)` names exist | medium | Verified by grep that all current names exist, but a typo would fall back silently and no test catches it (breaks AD-15 drift guard). | patch |
| B7, V1 | Hex guard skips `global.css` and non-module CSS | medium | V1 pre-verified: `moduleCss` filters `*.module.css` only; `global.css` claims "no hex" unchecked. `rgb()`/named colours part rejected as low. | patch |
| B8a, E6, E7, E8 | Hard-coded-text guard misses JSX expression literals (`{"Hei"}`), `aria-description`/`aria-roledescription`/`label`, and uses `in` (prototype keys) | medium | Verified in `tokens.test.ts:1069-1087`: only `JsxText` and four attrs with `StringLiteral` initializers are checked; `value in messages` accepts `constructor`. The AC's evidence depends on this guard. Custom props (`heading="…"`) rejected: no general rule without type info. | patch |
| B8b | `nav.notes` defined but unused | low | Key is required by the frozen Decisions; unused until a later story links it. | reject |
| B9 | `ErrorMessage` and `EmptyState` have no tests | medium | Task requires `role="alert"`, `err.prefix` and slots; nothing asserts them. | patch |
| B10 | "Arrows move" e2e is trivial with one menu item | low | True, but the matrix row is satisfied (ArrowDown opens the menu in the third test; Radix owns roving focus). | reject |
| B11 | First-Tab redirect in `Screen` is fragile | false | Redirect fires only while focus is on the freshly focused `h1`; after any other interaction native order applies, which is the intended behaviour for both matrix rows (Implementation Notes). | reject |
| B12 | `overflow-wrap:anywhere` + `hyphens:auto` on `a`/`button` | low | Breaks only when a word does not fit; 320 px test passes with labels intact. | reject |
| B13 | Pre-paint script hard-codes `light`, ignores `darkMode` | false | Frozen Always/Design: always `light` while `darkMode` is false; Story 4.x changes it. | reject |
| B14 | Diff omits lockfiles; pins unverifiable | false | Checked: `web/package-lock.json` has `radix-ui` 1.8.1, `e2e/package-lock.json` has `@axe-core/playwright` 4.14.0. | reject |
| B15 | Vitest include globs for non-existent folders | false | Globs matching nothing cause no failure or false coverage claim; they prepare later stories. | reject |
| V2 | No test that 'Mer' is not refocused after choosing 'Innstillinger' | medium | V2 pre-verified: only the end state is asserted; removing `preventDefault` would pass. | patch |
| E1 | 'Mer' › 'Innstillinger' while on `/innstillinger` drops focus to `body` | medium | Verified: same-route `Link` does not remount `Screen` (effect deps `[title]` unchanged), yet `onCloseAutoFocus` is prevented, so focus is lost. | patch |
| E2 | Viewport widens past 768 px with menu open | low | Rare (resize with menu open); fix adds a media-query listener. | reject |
| E9 | DESIGN.md parser silently skips unknown lines | low | `tokens.length > 100` guards gross failure; fix adds a throwing branch for a hypothetical format. | reject |

## Verification

**Commands:**
- `docker compose up -d --build && curl -s http://127.0.0.1:3000/` -- HTML with `lang="nb"` and `data-theme`
- `docker compose run --rm --build test` -- exit 0, all suites incl. axe
- `docker compose down`

**Manual checks:**
- Tab through `/` and `/innstillinger` at 320 px: skip link first, visible focus ring everywhere, 'Mer' menu works with keyboard.
