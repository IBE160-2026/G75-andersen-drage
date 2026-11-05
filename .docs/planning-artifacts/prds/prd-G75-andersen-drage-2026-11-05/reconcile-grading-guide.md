# Reconciliation: IBE160 Part 1 grading guide vs. PRD

- **Source:** `../../input/Sensorveiledning IBE160 - Del 1 applikasjon og prosess.pdf` (section 4 "Sensor ser etter" lists, section 5 warning signs, section 3 examiner procedure)
- **Checked against:** `prd.md` (FR, NFR, DR, SM) and `addendum.md`
- **Date:** 2026-11-05
- **Status values:** **Covered** = a PRD requirement makes it happen. **Partial** = a requirement exists but leaves part of the bullet open, or it has no verification. **Gap** = nothing in the PRD makes it happen. **Arch** = belongs in architecture or project conventions rather than in the PRD. **Downstream** = owned by the UX spec or the epics.

## Criterion 1: Process and AI governance (30%)

| # | Examiner looks for | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| 1.1 | BMAD documents (brief, PRD, architecture, epics, stories) that are actually used and **updated**, not generated once | DR-4 (deviations recorded as PRD update), §11 (changes recorded as PRD update) | Partial | Only the PRD must be updated. Nothing requires architecture, epics or sprint status to be kept in step with the code, and no requirement covers a changelog or "updated" history in the documents. Suggest that DR-4 cover every planning artifact and require a short change log per document. |
| 1.2 | Plan–code traceability: features trace to requirements and stories; deviations explained | DR-4 | Covered | You could also require that test names or descriptions cite FR-IDs (for example `FR-17`), so that the chain runs from the PRD through stories and commits to the tests. |
| 1.3 | Commit history: steady progress over time, small focused commits with descriptive messages | none | **Gap** | No DR covers commit cadence, size or message quality. This is also warning sign W1. Suggest a DR: work is committed in small, story-scoped commits throughout the period (for example at least weekly), with messages that name the story or FR. |
| 1.4 | Workflow: branches, pull requests, issues or equivalent | DR-4 mentions pull requests only as something that references stories | Partial | Nothing requires branches, PRs or issues to be used. Suggest a DR: one branch and PR per story (or per epic), merged into `main`, with open points tracked as issues (`.logs/<user>/issues.md` or GitHub Issues). |
| 1.5 | Traceable AI use: saved prompts and sessions; examples of clarifying, rejecting, correcting or improving AI suggestions | DR-5 | Covered | See W8: DR-5 does not require each session to be linked to the commit or story it produced. |
| 1.6 | Decisions: documented choices of technology, architecture and solutions, with rationale | PRD decisions D1–D9 are cited inline; Open Question 1 defers model choice to architecture; addendum | Partial / Arch | The PRD cites D1–D9 but does not say where the decision log lives or require one. The architecture doc will hold its own decisions. Suggest a DR: decisions (D-n and architecture decisions) are kept in one findable log with rationale, linked from the README. |
| 1.7 | Collaboration: history shows the group did the work over time | none | Gap (minor) | The project is solo (Tor), but README.md still lists two members. Suggest a DR (or a README item under DR-1) that states the solo status and when the other member left, so that the examiner reads the commit statistics correctly. |

## Criterion 2: Functionality and scope (20%)

| # | Examiner looks for | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| 2.1 | Core flows from the proposal and README work end to end | UJ-1 to UJ-3, FR-1 to FR-24, FR-23 (Demo Mode full loop), SM-4 | Covered | The examiner will follow the README's description of the core flows. DR-1 does not require the README to describe the core flows (see 6.1). |
| 2.2 | Scope and complexity relative to the assignment (storage, roles, integrations, non-trivial rules) | FR-21 (persistence), Proxy and AI integration (FR-8, NFR-1 to NFR-3), Quote Check (FR-9), Mastery and Round rules (FR-17, FR-18) | Covered | Single-user and no accounts is a deliberate scope choice (§7). Make sure the README states it, so it does not read as missing scope. |
| 2.3 | Stability: tolerates normal use, bad input and repeated actions without crashing | NFR-8, FR-3, FR-8, FR-11, FR-15, FR-21 | Covered | NFR-8 has no stated verification method. See 3.2. |
| 2.4 | What was omitted or changed from the proposal is described and justified | §8.3 Out of Scope (including the brief's Vision items), DR-4 (deviations from the PRD) | Partial | DR-4 covers deviations from the **PRD**, but the examiner compares against the **approved proposal / brief**. Step 1 of the examiner procedure is to read the proposal, and the PRD does not reference a proposal document (only the brief). Suggest a DR: the README, or a linked delivery note, lists what changed from the proposal and brief and why, as of the deadline. |

## Criterion 3: Quality assurance and testing (15%)

| # | Examiner looks for | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| 3.1 | Automated tests that run as the README describes and test meaningful logic | DR-2 (minimum test scope), FR-14, FR-17 (one unit test per table row), SM-5 | Covered | DR-2 says "one documented command" but does not say that the command is in the README. SM-5 says "passes in CI", but no DR requires CI. Either add CI to DR-2 or reword SM-5. |
| 3.2 | Documented manual tests or test plans where automation is not appropriate | DR-3 (manual spot check of content) | Partial | Only content quality has a manual check. Nothing requires a manual test plan or log for the UI flows: keyboard-only operation (NFR-6, FR-12, FR-13), responsive layout (NFR-7), reload and interruption (FR-15, NFR-8), storage-full and private mode (FR-21), or the Demo Mode walkthrough (UJ-3). Suggest a DR: a manual test checklist with dated results is kept in the repo. |
| 3.3 | Traces of code review: PR comments, or descriptions of bugs found in AI-generated code and how they were fixed | DR-5 (examples of rejected or corrected AI suggestions) | **Gap** | DR-5 covers corrected *suggestions* in sessions, not review of *code*. Because the project is solo, there is no peer reviewer, so the review evidence must be produced on purpose. Suggest a DR: every story goes through a recorded review (for example `bmad-code-review` output or PR review comments), and a bug log records defects found in AI code, their cause and the fixing commit. |
| 3.4 | Basic error handling, input validation, security awareness (no secrets in code) | FR-3, FR-8, FR-11, FR-24, NFR-1, NFR-2, NFR-3, addendum "Proxy" | Covered | |

## Criterion 4: Design and user experience (10%)

| # | Examiner looks for | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| 4.1 | Coherent, consistent visual style (colours, typography, spacing, components) | none in the PRD; §0 names the UX spec as a downstream document | Downstream | Belongs in the UX spec (DESIGN.md). It is acceptable for a PRD not to specify this, but the PRD does not require the UX spec to exist (see 4.6). |
| 4.2 | Clear navigation and information structure | UJ-1 to UJ-3, FR-11, FR-12 | Partial / Downstream | Screen structure and navigation belong in EXPERIENCE.md. |
| 4.3 | Understandable feedback, error messages and empty states | FR-1, FR-3, FR-10, FR-11, FR-16, FR-18 (review-round message), FR-19 (no score when there are zero eligible concepts), FR-21 ("Progress is not being saved"), FR-24, NFR-9 | Covered | The first-run empty state (no Note yet, before Consent) is not specified. It can be left to the UX spec. |
| 4.4 | Basic accessibility: contrast, keyboard navigation, alt text, form labels | NFR-6, FR-12, FR-13 | Partial | The requirement is complete, but NFR-6 has no verification method. Suggest naming one (an automated a11y check such as axe or Lighthouse plus the manual keyboard checklist from 3.2). The tool choice belongs in architecture. |
| 4.5 | Adaptation to relevant screen sizes | NFR-7 | Covered | Verification is via the manual checklist (3.2). |
| 4.6 | Traces of design work in the process (sketches, wireframes, UX descriptions in planning docs) | §0 names the UX spec as a consumer of the PRD | Partial | No DR requires the UX spec, or wireframes or sketches, to be produced and kept in the repo. Suggest adding this to DR-4 or a new DR. |

## Criterion 5: Code quality and architecture (10%)

| # | Examiner looks for | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| 5.1 | Folder and module structure that matches the described architecture | none | Arch | The architecture doc defines the structure. The PRD can require that the README gives a folder overview (see 6.6). |
| 5.2 | Readable code: descriptive names, sensible comments | none | Arch | Project conventions (AGENTS.md / project context). |
| 5.3 | Little duplication, dead code or commented-out remnants of earlier AI attempts | none | Gap / Arch | This is also warning sign W7. A PRD-level hook is possible: a delivery requirement for a pre-deadline cleanup pass (dead code, unused files, commented-out code) as part of the story definition of done. The mechanics belong in architecture and conventions. |
| 5.4 | Consistent style, ideally enforced by a linter or formatter | none | Arch | Architecture should pick the linter and formatter (for example ESLint and Prettier) and the command that runs them. DR-2 could include "lint passes" next to the tests. |
| 5.5 | Sensible handling of configuration and dependencies | NFR-1 (`.env`, `.env.example`), DR-1 (prerequisites with versions), addendum "Proxy" | Partial / Arch | A committed lockfile and pinned runtime version (for example `.nvmrc` or `engines`) are architecture details. They support DR-1's clean-machine install. |

## Criterion 6: README and runnability (10%)

| # | Examiner looks for | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| 6.1 | Short description of what the app does and who it is for, ideally with a screenshot | DR-1 (screenshot) | Partial | DR-1 requires the screenshot, not the "what and who" description or the core flows. Add both to DR-1. |
| 6.2 | Prerequisites with versions | DR-1 | Covered | |
| 6.3 | Step-by-step install and start with exact copyable commands | DR-1 (exact commands, one command for frontend and Proxy) | Covered | |
| 6.4 | Configuration: required env vars, with an example file without real secrets | NFR-1 (`.env.example`), DR-1 (configuration description), FR-24 | Covered | |
| 6.5 | Test data or test users if needed, and how to run the tests | DR-1 (Demo Mode as default), FR-23 (sample note), DR-2 (documented test command), DR-3 (reference notes) | Covered | Make DR-2 say explicitly that the test command is in the README. |
| 6.6 | Overview of the folder structure and links to planning and process documentation | none | **Gap** | DR-1 has neither the folder overview nor links to `.docs/` (brief, PRD, architecture, epics), `.logs/` (AI sessions, DR-5), the decision log, the test and QA evidence (DR-3, 3.2, 3.3) or the reference-note results. Criterion 1 (30%) depends on the examiner finding these, so this is a high-leverage addition to DR-1. |
| 6.7 | README tailored to the project and up to date, not an unchanged template or generated text that does not match the code | SM-4 (clean-machine run within 15 min) | Partial | SM-4 is a metric, not a delivery step. Suggest a DR: before the deadline, the README is verified by a fresh clone of the final commit on a clean environment, following only the README, and the result is logged. The current README is still the group template with two members (see 1.7). |

## Criterion 7: Repository tidiness (5%)

| # | Examiner looks for | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| 7.1 | Clear folder structure separating code, documentation and resources | DR-6 ("no stray files in the root") | Partial / Arch | The layout is an architecture decision. The `.docs/` and `.logs/` split already exists. |
| 7.2 | `.gitignore` that keeps build artifacts, dependencies and local files out | DR-6 | Covered | Add local files (editor and OS files, local storage dumps) explicitly if you want. |
| 7.3 | No secrets in the repo **or its history** (API keys, passwords, `.env`) | NFR-1 (including history), DR-6 | Covered | NFR-1 has no verification method. A secret scan (for example gitleaks, or a pre-commit hook) belongs in architecture. |
| 7.4 | No stray test files, backups, old versions or random files in the root | DR-6 | Covered | |
| 7.5 | Sensible file and folder names | none | Arch | Conventions. The existing artifact naming (`<type>-G75-...-<date>`) is consistent. |

## Section 5: Warning signs

| # | Warning sign | PRD coverage | Status | Note / suggested fix |
|---|---|---|---|---|
| W1 | All or nearly all code added in one or a few commits right before the deadline | none | **Gap** | Same gap as 1.3. Add a commit-cadence DR. |
| W2 | Planning docs describe a different app from the one delivered, or are clearly generated afterwards | DR-4 (deviations recorded), PRD frontmatter dates, git history of `.docs/` | Partial | Same gap as 1.1: only the PRD must be kept in step. Suggest a final reconciliation of PRD, architecture and epics against the delivered app before the deadline, recorded as a dated update. |
| W3 | README is an unchanged template, or its commands do not work | DR-1, SM-4 | Partial | The current README is the template. Add the fresh-clone verification DR (6.7). |
| W4 | API keys, passwords or `.env` files committed | NFR-1, DR-6 | Covered | Secret scanning: Arch (7.3). |
| W5 | `node_modules`, `venv`, build folders or large binaries in the repo | DR-6 (dependencies, build output) | Partial | Large binaries are not addressed. The reference notes (DR-3), sample note and Fixtures (FR-23) and the screenshot (DR-1) may be PDF or DOCX or images. Suggest a size limit or rule for committed test assets in DR-6. |
| W6 | Tests fail or only test trivial things | DR-2 (non-trivial minimum scope), SM-5 | Covered | CI is mentioned in SM-5 but not required (see 3.1). |
| W7 | Lots of dead code, duplicate files, or remnants of discarded AI attempts | none | Gap / Arch | Same gap as 5.3. |
| W8 | AI-use documentation is generic and cannot be tied to concrete changes in the repo | DR-5 | Partial | DR-5 requires saving sessions but not linking them. Suggest that each saved session or log entry names the story or FR and the resulting commit(s) or PR, and that commits or PRs point back to the session where relevant. |

## Summary of the most important gaps

1. **Commit cadence and workflow (1.3, 1.4, W1).** No DR requires small, steady, story-scoped commits or the use of branches, PRs and issues. This affects the 30% criterion and is the first warning sign.
2. **Code-review and bug-fix evidence (3.3).** Nothing requires recorded review of AI-generated code or a log of defects found and fixed. Because the project is solo, this evidence will not appear unless it is required.
3. **README as a map to the process (6.1, 6.6).** DR-1 lacks the app description, the folder overview and links to the planning docs, AI logs, decision log and QA evidence that the examiner needs to grade criteria 1 and 3.
4. **AI sessions are not linked to changes (W8, 1.5).** DR-5 saves sessions but does not tie them to stories or commits.
5. **Keeping all planning docs current, and the final verification (1.1, W2, 6.7, 2.4).** Only the PRD must be updated. No pre-deadline step reconciles the docs against the delivered app and the proposal or brief, or verifies the README on a fresh clone.

The minor and architecture items are: the manual UI test checklist (3.2); verification methods for NFR-6 and NFR-1; lint and formatter (5.4); the cleanup pass (5.3, W7); a size rule for binary test assets (W5); the CI mismatch in SM-5; the decision-log location (1.6); and the README still listing two members (1.7).
