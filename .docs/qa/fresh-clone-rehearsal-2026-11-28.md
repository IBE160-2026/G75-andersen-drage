# Fresh-clone rehearsal (M2, Story 5.4)

Rehearsal of Story 5.4 at milestone M2 (`epics.md` › Story 5.4, AC 1): clone `main`, follow the README, finish a Demo Mode Round, run the test command, check CI. The real Story 5.4 run is due by 2026-12-12 (DR-9).

**Run by:** Tor (browser), agent (clone, build, tests) · **Date:** 2026-11-28 · **Commit:** `main`, cc11e4f

## Environment

- Windows 11 Enterprise, Docker Engine 29.9.3, Docker Compose v5.7.1 (README asks for v5.5 or newer), Edge InPrivate.
- **Not a clean machine.** Same PC as development. The clone was built with `docker compose build --no-cache`, but base images (node, python, Playwright) were already pulled, and the test images reused cached layers. The real Story 5.4 run should use Windows Sandbox, a new user account or another PC.
- The dev stack was stopped first (`docker compose down`) so port 3000 was free.

## Timings

| Step | Clock | Took |
|---|---|---|
| `git clone https://github.com/IBE160-2026/G75-andersen-drage.git` (no `.env`) | 08:51:11 → 08:51:18 | 7 s |
| `docker compose up` (as `build --no-cache`, then `up -d --wait`) | 08:51:25 → 08:52:52 | 1 min 27 s |
| Demo Mode Round: localhost:3000 → 'Nei takk, vis demo' → *Smidig utvikling og Scrum* → 'Start runde' → Resultat | 08:58 → 09:00 | about 2 min |
| **Clone → Resultat** | 08:51:11 → 09:00 | **about 9 min** (SM-4: under 15 min). Includes about 5 min waiting for Tor; hands-on time about 4 min |
| `docker compose run --rm test` (builds 3 test images) | 08:53:06 → 08:54:50 | 1 min 44 s, exit 0: Vitest 610, pytest 173, Playwright 155 (SM-5) |
| Latest CI run on `main` (cc11e4f) | — | success, 3 min 16 s |

## README findings

| # | Finding | Severity | Action |
|---|---|---|---|
| R1 | No clone step or repository URL; "Forutsetninger" lists only Docker | Low | Fixed: "Kom i gang" step 1 (Git clone with URL, or Code › Download ZIP); "Forutsetninger" now says Git is optional |
| R2 | No quick-start for the Demo Round. Tor had to ask how to start it: the path ('Nei takk, vis demo' → sample → 'Start runde' → cards → quiz → 'Se resultatet') is only in "Demomodus", after the dense "App-skallet" section | Medium | Fixed: "Kom i gang" right under "Forutsetninger", 6 numbered steps from clone to Resultat |
| R3 | No note that the first `docker compose up` builds the images and takes a few minutes | Low | Fixed: "Kom i gang" step 2 (first build takes a couple of minutes; ready when a `web-1` line shows `✓ Ready`) |
| R4 | No note that port 3000 must be free | Low | Fixed: "Kom i gang" step 2 |
| R5 | "Forutsetninger" said "Ingenting annet trengs", but cloning needs Git (found while fixing R1) | Low | Fixed: Git optional, ZIP download as the alternative |

## Re-run after the fixes

- About 09:05, same PC: the repository is public and the ZIP link (`archive/refs/heads/main.zip`) answers 200. A fresh `git clone` per step 1, then `docker compose up` per step 2: `proxy-1 Healthy`, then `web-1    | ✓ Ready` (the spacing varies with the project name, so the README does not quote it literally); localhost:3000 answers 200.
- Steps 3–6 describe unchanged app behaviour that Tor ran in the first run (about 2 min). Their button texts match `web/i18n/messages.ts`, and `e2e/demo.spec.ts` runs the same Demo loop.

## Result

- [x] Demo Mode Round finished within 15 minutes from clone (about 9 min)
- [x] Test command green with no API key and no `.env`; latest CI on `main` green
- [x] README findings R1–R5 fixed and the affected steps re-run (Story 5.4 AC 1)
- [ ] Story 5.4 itself: run on a clean machine (Windows Sandbox, new user account or another PC) by 2026-12-12
