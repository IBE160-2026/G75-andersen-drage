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
| R1 | No clone step or repository URL; "Forutsetninger" lists only Docker | Low | Add a clone line to a quick-start section |
| R2 | No quick-start for the Demo Round. Tor had to ask how to start it: the path ('Nei takk, vis demo' → sample → 'Start runde' → cards → quiz → 'Se resultatet') is only in "Demomodus", after the dense "App-skallet" section | Medium | Add "Kom i gang" with 4–6 numbered steps right under "Forutsetninger" |
| R3 | No note that the first `docker compose up` builds the images and takes a few minutes | Low | One sentence in the quick-start |
| R4 | No note that port 3000 must be free | Low | One sentence in the quick-start |

## Result

- [x] Demo Mode Round finished within 15 minutes from clone (about 9 min)
- [x] Test command green with no API key and no `.env`; latest CI on `main` green
- [ ] README findings R1–R4 fixed before the feature freeze (2026-12-09), then re-run the affected steps (Story 5.4 AC 1)
