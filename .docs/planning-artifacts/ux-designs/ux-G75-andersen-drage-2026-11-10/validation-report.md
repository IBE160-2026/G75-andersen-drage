# Validation Report — G75-andersen-drage

- **DESIGN.md:** `.docs/planning-artifacts/ux-designs/ux-G75-andersen-drage-2026-11-10/DESIGN.md`
- **EXPERIENCE.md:** `.docs/planning-artifacts/ux-designs/ux-G75-andersen-drage-2026-11-10/EXPERIENCE.md`
- **Run at:** 2026-11-12

## Overall verdict

**Adequate.** Downstream consumers can use the pair for the core study loop. UJ-1..UJ-3 are fully walked, every `{token}` reference resolves, all 23 colors come in light/dark pairs, contrast is computed for the main pairs, and DESIGN.md follows the canonical section order. The pair is not yet a clean contract, for four reasons. Stale `[OPEN]` markers and English PRD strings contradict the Microcopy table. The FR-12 change to a PRD load-bearing differentiator has not been settled with the PRD. The Demo Mode model (picker vs. global mode) is undefined. Innstillinger has no components at all. Fix the 4 high rubric findings before `bmad-architecture` and story creation consume the pair.

The two extra reviewers make the picture worse than "adequate" suggests, and each raises 2 criticals. The accessibility reviewer finds the pair **not AA-ready**: the UJ-1 climax, the Quote highlight in the source panel, is about 1.04:1 against the active Passage in Lesesal, and the 'Dine notater' Note row nests buttons inside a clickable row, which fails the NFR-6 axe gate by construction. Focus management (after marking, archiving, answering and reference jumps), heading/landmark structure, shortcut scoping and 320px reflow are also unspecified. The examiner reviewer predicts a **B** for criterion 4, with an A possible and a C likely if Should features ship half-styled. The design trail is invisible as delivered (dot-folders, Excalidraw JSON, no images, template README), and the remaining scope does not fit about 33 solo days to 2026-12-15 without a firm Must/Should cut. After deduplication across reviewers: **4 critical · 16 high · 28 medium · 22 low**.

## Category verdicts
- Flow coverage — adequate
- Token completeness — adequate
- Component coverage — adequate
- State coverage — adequate
- Visual reference coverage — adequate
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — strong

Extra reviewers: Accessibility — not AA-ready (critical 2 · high 7 · medium 12 · low 8). Examiner (criterion 4) — predicted B, A possible, C risk (critical 2 · high 8 · medium 14 · low 6).

## Findings by severity

### Critical (4)

**[Accessibility]** — Quote highlight effectively invisible against the active Passage (DESIGN Colors / Quote highlight; EXPERIENCE Reference jump)
`highlight` on `passage-active` is 1.04:1 (light) / 1.89:1 (dark); the 1px ring is 1.32:1 in light. This is the UJ-1 climax, and `<mark>` is not announced by screen readers. SC 1.4.11, 1.4.1, 1.3.1.
Fix: Drop the Passage tint while a Quote is highlighted, or use a ≥3:1 ring (2px `accent` outline/underline). Add hidden "Sitat start" / "Sitat slutt" or `aria-describedby`. Add the pair to the contrast table.

**[Accessibility]** — Note row nests interactive controls (DESIGN Note row; EXPERIENCE Note row)
A clickable row containing the badge and 'Arkiver' buttons trips axe `nested-interactive` (serious) and fails the NFR-6 gate by construction. Arkiv rows inherit it; what clicking an archived row does is unstated. SC 4.1.2, 1.3.1.
Fix: Title as a real `<a>` with a `::after` stretched hit area; badge and 'Arkiver' as DOM siblings raised with `z-index`; `<ul>`/`<li>`; Arkiv rows open nothing.

**[Examiner]** — Design trail invisible to the examiner as delivered (README.md; W/.working/*; W/imports/)
Everything lives in dot-folders; Excalidraw shows as raw JSON on GitHub; the mockup must be downloaded; `imports/` empty; README is the group template with no links.
Fix: Export boards and the directions page to PNG/SVG in a visible folder; add a README "Design" section embedding IA, UJ-1 flow and final screenshots, linking DESIGN.md, EXPERIENCE.md and the memlog.

**[Examiner]** — Scope against the solo deadline (EXPERIENCE › IA › Priority)
About 33 days remain with no architecture, epics or code; criterion 4 punishes half-finished UI harder than missing Should features; the "hide, never dead" rule is still `[ASSUMPTION]`.
Fix: Firm, dated Must/Should line (UJ-1 and UJ-3 working and screenshotted by ~2026-12-01, Shoulds after); remove the `[ASSUMPTION]`; record cuts in PRD and README.

### High (16)

**[Rubric + Examiner]** — Stale `[OPEN]` markers and English strings contradict the Microcopy table (EXPERIENCE L134–174, L264; State Patterns, Explain Simpler, UJ-3)
`[OPEN]` labels exist as keys (`start.paste.submit`, `quiz.next`, `archive.empty`, `round.review`); English strings ("No API key configured…", "Could not make a verified simpler explanation", "No readable text found") sit where `err.noKey`, `simpler.fail`, `err.noText` exist. A dev agent will ship English into a bokmål UI (NFR-9); to an examiner it reads as an unmaintained document.
Fix: Replace every inline string or `[OPEN]` with its Microcopy key; keep `[OPEN]` only where no key exists.

**[Rubric + Examiner]** — PRD not updated with the UX decisions; FR-12 narrowed against a PRD differentiator (EXPERIENCE L132–134, L190, L298–305, Open Items; PRD L49–51, L232–236)
The spine removes the Quote from the card front / pre-answer while the `final` PRD forbids trading away differentiator 1; six `[NOTE FOR PRD]` items ('Dine notater', Arkiv, importance, consent-first, name) have no FR, breaking DR-4 traceability.
Fix: Run the `bmad-prd` update for Open Items 1–6 now (add FRs, cite memlog dates); until then state "this spine supersedes the PRD on Open Items 1–6".

**[Rubric]** — Demo Mode model undefined (EXPERIENCE L32, L39, L167, L262)
Demovelger, the Innstillinger toggle and the `err.demoOnly` check imply a global mode, but entry, exit and indicator are never stated.
Fix: "Demovelger turns Demo Mode on; a 'Demomodus' indicator in the top bar links to Innstillinger, where it is turned off." Add the indicator to Components.

**[Rubric]** — Innstillinger (Must) has no components (EXPERIENCE L39, L116, L189, L222)
No toggle, checkbox, withdraw-Consent action, export/import controls or storage-warning text.
Fix: Add Toggle, Checkbox and Settings row (visual + behavioral); define withdraw-Consent.

**[Accessibility + Rubric + Examiner]** — Single-key shortcuts unscoped, cannot be turned off; quiz keys `[OPEN]` (EXPERIENCE Interaction Primitives, L186)
Space activates a focused control *and* flips/marks the card; speech-input users trigger them; no dialog suppression; quiz option keys undecided. SC 2.1.4, 2.1.1.
Fix: Fire only with focus in the Flashcard region and not on a control; Innstillinger toggle "Hurtigtaster"; suppress in dialogs; Space on a revealed card is a no-op; use 1–4 (or arrows in a radio group) for quiz options and show hints.

**[Accessibility]** — Focus lost after mark-and-advance and screen changes (EXPERIENCE Flashcard, Quiz Question, Accessibility Floor)
The focused button is removed and focus falls to `<body>`; nothing announces the new card. SC 2.4.3, 4.1.3.
Fix: Focus the new Item's heading (`h2` "Kort 4 av 12", `tabindex="-1"`); on screen changes focus the `h1`. One rule in the Accessibility Floor.

**[Accessibility + Examiner]** — Desktop reference jump has no way back (EXPERIENCE Accessibility Floor, Reference jump)
The claimed Shift+Tab return path does not exist; on Resultat the student tabs back through the list after every jump. SC 2.4.3, 2.1.1.
Fix: 'Tilbake til {kort 3 / spørsmål 4}' at the top of the source panel after every jump, desktop too, returning focus to the activating reference; Esc does the same.

**[Accessibility + Rubric]** — No headings, landmarks, page titles; tab order puts source panel first (DESIGN Typography/Layout; EXPERIENCE IA, Accessibility Floor, L129, L186)
No stated `h1`s, no landmarks, no `document.title` on route change, no skip link; every Round screen begins with the scrollable source panel. SC 2.4.2, 1.3.1, 2.4.6, 2.4.1.
Fix: Per-surface table of title, `h1` and landmarks (`header`, `main`, labelled `aside`); skip link; study panel first in DOM and tab order (source panel can stay visually left); Passages `tabindex="-1"`.

**[Accessibility]** — Cycling importance badge undiscoverable, poorly announced, disorienting (DESIGN/EXPERIENCE Importance badge, Note Lifecycle › Order)
Looks like a read-only chip, `line` boundary 1.34:1, instructions in the name, no "1 = viktigst", immediate re-sort moves the focused row, nothing announced. SC 1.4.11, 4.1.2, 4.1.3, 2.4.3.
Fix: Menu button or native `<select>` "Viktighet for {tittel}" (1 – viktigst / 2 – middels / 3 – minst); `ink-muted` border + chevron; defer re-sort or keep focus and announce via `role="status"`.

**[Accessibility + Rubric + Examiner]** — Mobile top bar unspecified; reflow promised at 360px, WCAG needs 320px (EXPERIENCE L125, L143, L291; DESIGN Layout)
Six top-bar elements "condensed `[ASSUMPTION]`" will wrap or overflow; long Norwegian compounds overflow 26px card fronts; dialogs need internal scroll at zoom. SC 1.4.10, 1.4.4; NFR-7, FR-19.
Fix: 320px floor; specify the condensed bar (brand + Readiness + overflow menu for gap note/theme/Innstillinger, or move gap note into the 'Studier' tab); `overflow-wrap: anywhere; hyphens: auto` with `lang`; dialogs `max-height: 100dvh`; rem tokens.

**[Accessibility + Examiner]** — Archiving gives no feedback, no undo, no focus target; Arkiv hard to find (EXPERIENCE Note Lifecycle, Flow 4)
The row disappears, focus goes to `<body>`, a mis-tap silently hides a Note, and Arkiv is only a bottom link. Restore/delete share the focus problem. SC 2.4.3, 4.1.3.
Fix: Focus the next/previous row or list heading; `role="status"` "{tittel} er arkivert. [Angre] · [Vis arkiv]", persistent until the next action.

**[Examiner]** — Two visual modes double the consistency surface (DESIGN Brand & Style, Elevation)
Kveldsmodus changes typography, elevation and brand weight; unchecked dark states are where inconsistency will be found.
Fix: Ship light only until every Must flow is done and screenshotted; then add dark via custom properties and screenshot both modes.

**[Examiner + Rubric]** — Undrawn † components and no key-screen mocks (DESIGN Components †; memlog L52)
11–13 components including every "feil input" surface (drop zone, text area, error, empty state, progress, dialog, Quiz, banner) have no drawing; Finalize step 4 not done.
Fix: Mock Start (empty + error), Genererer, Quiz answered, Resultat, Consent dialog and the 360px Round into `mockups/` before architecture, and link them.

**[Examiner]** — No accessibility evidence planned in the repo (EXPERIENCE Accessibility Floor)
axe and the keyboard checklist are named but not stored anywhere.
Fix: Commit an axe report (or Playwright + axe test) and a filled keyboard checklist for UJ-1 and UJ-3 under `.docs`; link from README.

**[Examiner]** — Only one mobile visual (DESIGN Layout; EXPERIENCE Responsive)
Start with Note rows, Consent, Quiz and Resultat have no 360px drawing.
Fix: Wireframe 360px Start, Quiz (answered) and Resultat; screenshot from the built app.

**[Examiner + Rubric]** — Wireframes stale and partly undeclared drift (EXPERIENCE L15, L28–42, L197; .working/ia, flow-uj1, directions-4.html)
IA map numbering differs from the spine, lacks Arkiv/Consent-first/Note-row controls/delete setting; flow-uj1 says "Ingenting lagres hos oss"; directions says "Se i kilden". Stale boards look like abandoned exploration.
Fix: Add dated v2 boards next to v1 (keep v1 as history), and list remaining drift (numbering, "Se i kilden", consent copy) under Known drift.

### Medium (28)

**[Rubric]** — UJ-3 contradicts itself on upload after Consent decline (EXPERIENCE L258, L262 vs L161)
Fix: State whether upload stays enabled in Demo Mode with `err.demoOnly`, or step 6 applies only to the accept path.

**[Rubric + Examiner + Accessibility]** — Pre-first-Round Readiness "Klar: –" conflicts with 0 % rule and is cryptic to AT (EXPERIENCE L237; DESIGN L464)
Fix: Define the state in Microcopy (rules say "Klar for eksamen 0 %"); if a dash stays, give it hidden text "ingen poengsum ennå". Give references names like "Kilde: avsnitt 4, vis i notatet".

**[Rubric + Examiner]** — FR-20 Panic Mode and FR-22 export/import have no flow or components (EXPERIENCE L34, L39, L179)
Fix: Add a short Flow 5 and component rows, or mark them hidden/"not in v1" per the Priority rule.

**[Rubric]** — Light→dark resolution rule only in a YAML comment (DESIGN L14–15)
Fix: State it in Colors and Typography prose, including typography roles.

**[Rubric + Examiner]** — No disabled/hover/pressed/selected/loading state tokens (DESIGN L187–343, L449; EXPERIENCE L127, L150, L161)
Fix: Add an `ink-disabled` pair or opacity rule and one shared interaction-state row reused by every control family.

**[Rubric]** — `quiz-option.correct/.wrong` reference a whole component (DESIGN L262–263)
Fix: Use `correct-bg`/`correct-fg` color tokens.

**[Rubric]** — DESIGN Note row lacks 'Arkiver' control and the Arkiv variant (DESIGN L466)
Fix: Add the control (icon, size, placement), the Arkiv variant and `note-row` tokens.

**[Rubric + Accessibility]** — Sample-note item, Result row and Notice component undefined; notices need persistence (EXPERIENCE L32, L37, L162, L166, L177)
Fix: Add all three to both spines, with a color role for Notice; render notices as persistent `role="status"` banners, user-dismissed.

**[Rubric]** — Consent 'Les mer' and Explain Simpler loading unspecified (EXPERIENCE L82, L135, L197)
Fix: Inline disclosure with `aria-expanded`; loading = status text plus disabled button.

**[Rubric + Accessibility]** — Genererer has no cancel/back path and fake progress semantics (EXPERIENCE L33, L99–101, L169–171; DESIGN Generation progress)
Fix: Add 'Avbryt' / 'Tilbake til start'; define Back while pending (abort, no cache write); indeterminate `progressbar`, steps via `role="status"`, focus error heading or Notatoversikt `h1`.

**[Rubric]** — Consent declined/withdrawn scope unclear (EXPERIENCE L161, L199)
Fix: Stored Notes stay studyable; live AI actions disabled with `consent.declined` copy; Demo Notes use Fixtures.

**[Rubric + Examiner]** — Per-Note export on global Innstillinger; no success feedback (EXPERIENCE L39, L179; Microcopy)
Fix: Put export on Notatoversikt (or a picker); add `import.success` and success strings for export, theme and Consent withdrawal.

**[Rubric + Examiner]** — Provisional decisions, unapproved microcopy, ~40 `[ASSUMPTION]` tags, both spines `draft` (EXPERIENCE L77, L146, L207, L219, L292; DESIGN L424; memlog)
Fix: One confirm/adjust pass with Tor logged in the memlog (change some strings visibly), remove tags, set `status: final`; add a short human-written "Design decisions" summary linked from README.

**[Accessibility]** — Quiz answering leaves focus undefined; ✓/✗ glyphs misread (Quiz Question)
Fix: `aria-disabled` options, focus feedback heading, hidden "Ditt svar, feil" / "Riktig svar", group as `radiogroup`.

**[Accessibility]** — Error role indistinguishable from 'usikker' (1.01:1 bg, 1.08:1 fg) (DESIGN Colors › error)
Fix: Icon + "Feil:" prefix + `error-fg` rule; `role="alert"`/`status`; `aria-describedby` + `aria-invalid`.

**[Accessibility]** — Keyboard hint illegible inside primary button (1.30 / 1.35) (DESIGN Button)
Fix: `on-accent` hint inside primary buttons; add the pair to the table.

**[Accessibility + Examiner]** — No `lang` markup on Note content (EXPERIENCE Foundation, Accessibility Floor)
Fix: Store detected language per Note (fallback `nb`); set `lang` on source panel, cards, Quotes, Summary Points, Quiz.

**[Accessibility]** — Mobile tabs and return toast under-specified (DESIGN/EXPERIENCE Tabs, Return toast)
Fix: ARIA tabs with manual activation; persistent return control as next Tab stop; context-aware label.

**[Accessibility]** — Active Passage is a 1.09:1 tint only (DESIGN Passage)
Fix: 3px `accent` left rule.

**[Accessibility]** — Scrollable source panel not keyboard reachable; focus ring clipped (EXPERIENCE Source panel)
Fix: `tabindex="0"`, `role="region"` + label; inset focus rings in scroll containers.

**[Accessibility]** — Dialog focus and labelling missing (EXPERIENCE Dialog, delete.confirm)
Fix: Native `<dialog>` + `showModal()`, `aria-labelledby`/`describedby`, initial focus 'Avbryt' on delete, real labelled checkbox.

**[Accessibility]** — Forced-colors mode ignored (DESIGN Quote highlight, Round progress, Quiz)
Fix: `@media (forced-colors: active)` rules with outlines, `Mark`/`Highlight` system colors, chip borders.

**[Accessibility]** — Small targets next to a destructive neighbour (DESIGN Note row, Importance badge, Source reference)
Fix: 44px hit areas; ≥8px gap or move 'Arkiver' into an overflow menu.

**[Accessibility]** — Errors lack suggestions and programmatic association (EXPERIENCE Microcopy, Text area)
Fix: "Fant ingen tekst i filen. Prøv en annen fil, eller lim inn teksten."; `role="alert"` + focus for async validation; native labelled file input.

**[Examiner]** — Back route to Start relies on browser Back / brand link (EXPERIENCE IA "Back navigation")
Fix: Visible 'Dine notater' link on screens 4–7; leaving a Round keeps it resumable.

**[Examiner]** — Icon-only buttons and badge cycle lack committed names/announcements (DESIGN Theme toggle; EXPERIENCE Importance badge)
Fix: Exact accessible names in Microcopy; `aria-pressed` or live announcement.

**[Examiner]** — 768px `[ASSUMPTION]` breakpoint leaves a cramped tablet range (DESIGN Layout)
Fix: Raise the split to ~1024px, or set a minimum source-panel width and test at 800px.

**[Examiner]** — Uncommitted design changes (git status)
Fix: Commit the Finalize work in small, described commits.

### Low (22)

- **[Rubric]** 'Ny runde (usikre først)' not in Microcopy (EXPERIENCE L241). Fix: add `overview.newRound` or reuse 'Start runde'.
- **[Rubric]** Values outside tokens: dark shadow, scrim, 3px indicator, approximate padding (DESIGN L312, L433–449). Fix: add tokens, reuse `{spacing.quote-rule}`.
- **[Rubric]** Contrast table omits load-bearing pairs (DESIGN L384–396). Fix: add `accent-strong`/surface, `ink-muted`/surface, input border, tab indicator.
- **[Rubric]** Component names differ (`text-input`/Text area, `kbd-hint`/Keyboard hint, `quiz-option`). Fix: rename and add a Keyboard hint row.
- **[Rubric]** Minor states uncovered (drag-over, card→quiz transition, "n av m" count). Fix: one line each.
- **[Rubric]** Visual references not linked at point of use. Fix: one-line pointers under UJ-1, IA, Flashcard/Tabs.
- **[Rubric]** 8 of 11 dark typography roles duplicate light (DESIGN L117–167). Fix: define only deltas or comment.
- **[Rubric]** Two Inspiration entries add no constraint (EXPERIENCE L278–279). Fix: record reason or drop.
- **[Rubric]** PRD→UI term mapping implied. Fix: 5-row mapping table in Foundation.
- **[Rubric]** Grading guide missing from `sources`. Fix: add the Sensorveiledning PDF path.
- **[Rubric]** Key Flows placed before Inspiration/Responsive. Fix: move to just before Open Items.
- **[Rubric]** Consent & Privacy paraphrases `consent.*` keys. Fix: reference the keys.
- **[Accessibility]** Progress track imperceptible (1.27–1.43:1). Fix: `ink-muted` track border or `aria-hidden`.
- **[Accessibility]** Quiz options / secondary buttons rely on 1.34:1 border. Fix: `ink-muted` border on options.
- **[Accessibility]** Theme toggle semantics muddled. Fix: fixed name "Mørk modus" + `aria-pressed`, glyph shows current state.
- **[Accessibility]** Pending buttons `disabled` drop focus. Fix: `aria-disabled` + `aria-busy` + `role="status"`.
- **[Accessibility]** Reduced motion covers only reference scroll. Fix: global reduced-motion rule.
- **[Accessibility]** Text spacing untested; px font tokens. Fix: rem tokens, no fixed text heights, 1.4.12 check.
- **[Accessibility]** Accidental marks permanent. Fix: 'Angre' for the last mark.
- **[Examiner]** directions-4.html still shows superseded name and Quote placement. Fix: one-line "superseded by DESIGN.md" banner.
- **[Examiner]** 11px mono / 12px chips. Fix: raise mono to 12px.
- **[Examiner]** Drag-and-drop primary on mobile. Fix: show only "Velg fil" on touch.

## Reviewer files
- `review-rubric.md`
- `review-accessibility.md`
- `review-grading-guide.md`
- Consolidated HTML: `validation-report.html`
