# Spine Pair Review — G75-andersen-drage

Reviewed 2026-11-12: `DESIGN.md` and `EXPERIENCE.md` (both `status: draft`, updated 2026-11-12) checked against `.memlog.md` (61 entries; later entries supersede), PRD `prd.md` + `addendum.md`, the spec in `bmad-ux/references/design-md-spec.md` and the five example spines. Line references are `FILE Lnn`.

## Overall verdict

**Adequate.** Downstream consumers can use the pair for the core study loop. UJ-1..UJ-3 are fully walked, every `{token}` reference resolves, all 23 colors come in light/dark pairs, contrast is computed for the main pairs, and DESIGN.md follows the canonical section order. The pair is not yet a clean contract, for four reasons. Stale `[OPEN]` markers and English PRD strings contradict the Microcopy table. The FR-12 change to a PRD load-bearing differentiator has not been settled with the PRD. The Demo Mode model (picker vs. global mode) is undefined. Innstillinger has no components at all. Fix the 4 high findings before `bmad-architecture` and story creation consume the pair.

## 1. Flow coverage — adequate

Checked: every PRD journey (UJ-1, UJ-2, UJ-3) and every FR with a user-facing flow against EXPERIENCE.md › Key Flows for a named protagonist, numbered steps, a climax beat and a failure path. UJ-1..UJ-3 match the PRD names verbatim. Each has a protagonist, numbered steps, a bold climax and a failure path. Flow 4 (archive/delete) covers the memlog-added Arkiv surface. Misses: FR-20, FR-22 and Demo Mode entry/exit.

### Findings
- **high** The Demo Mode model is undefined. 'Prøv demomodus' on Start opens Demovelger (IA row 2, EXPERIENCE L32). Innstillinger has "Demo Mode on/off" (L39). FR-23 says Demo Mode "can be switched on at any time" and then rejects non-sample uploads. The spine never says whether picking a sample from Demovelger switches on a global mode, how the student leaves it, or how Start/top bar show that it is on. A dev building Demovelger, the `err.demoOnly` check and the Innstillinger toggle has to guess (EXPERIENCE L32, L39, L167, L262). *Fix:* add one rule. Example: "Demovelger turns Demo Mode on. A visible 'Demomodus' indicator in the top bar links to Innstillinger, where it is turned off." Also add the indicator to both spines' Components.
- **medium** UJ-3 contradicts itself. In step 2 the examiner presses 'Nei takk, vis demo', and State Patterns › Consent declined then disables upload and paste (L161). Step 6 has the same examiner uploading a file and getting "Demomodus støtter bare eksempelnotatene" (L262), which cannot happen while upload is disabled (EXPERIENCE L258, L262 vs L161). *Fix:* state which wins. Either upload stays enabled in Demo Mode and shows `err.demoOnly`, or step 6 applies only to the accept path.
- **medium** UJ-1 step 5 shows the Readiness Score as "Klar: –" for 8 eligible concepts that are all 'ny'. FR-19 and DESIGN (L464) hide the score only when there are zero eligible concepts, so 0/8 must render "Klar for eksamen 0 %" (EXPERIENCE L237; wireframe screen 4 matches the flow). *Fix:* change step 5 to "Klar for eksamen 0 %". If a dash is wanted before the first Round, make that an explicit rule and a PRD note.
- **medium** FR-20 Panic Mode ('Eksamen om en time') and FR-22 export/import appear only in IA rows 4 and 9 and in one State row (L179). Neither spine has a flow, component row or entry-point placement for them. Their entry points sit on Must surfaces (Notatoversikt, Innstillinger) (EXPERIENCE L34, L39). *Fix:* add a short Flow 5 (Panic Mode from Notatoversikt) and component rows for both, or state "hidden until built" per the Priority rule (L44).
- **low** UJ-1 step 9 introduces the label 'Ny runde (usikre først)' (L241). It is not in Microcopy, and the IA and the banner use 'Start runde' / 'Ny runde' (EXPERIENCE L241, L34, L103). *Fix:* add a `overview.newRound` key, or reuse 'Start runde'.

## 2. Token completeness — adequate

Checked: all 50 distinct `{path}` references in both files against the DESIGN.md frontmatter (all resolve), light/dark pairing of colors (23/23) and typography (11/11), spec type rules (hex strings, kebab-case keys, `rounded.full = 9999px`), and the Contrast table. No critical misses: no color lacks a hex value or a dark pair.

### Findings
- **medium** The light→dark resolution rule ("every `{colors.x}` resolves to `{colors.x-dark}` when dark mode is active") exists only as a YAML comment (DESIGN L14–15). YAML parsers drop comments. All 32 component entries reference light tokens only, and nothing states that the rule also covers `typography.*`. *Fix:* state the rule in Colors and Typography prose, including that it covers typography roles. Optionally add `components.*-dark` overrides only where the mapping is not 1:1.
- **medium** No token or visual spec for disabled, hover, pressed or selected states. EXPERIENCE requires disabled buttons during pending actions (L127), disabled upload/paste after Consent decline (L161) and a disabled drop zone during generation (L150). Quiz options need a selected state before feedback renders (DESIGN L187–343, L449; EXPERIENCE L127, L150, L161). *Fix:* add an `ink-disabled` / `ink-disabled-dark` pair (or one opacity rule) and a one-line hover/pressed rule per control family in Components.
- **medium** `quiz-option.correct: '{components.mastery-chip-known}'` (and `.wrong`) points at a whole component, not a color. If a resolver flattens it, the quiz option inherits `radius: {rounded.full}` and `chip` typography and becomes a 12px pill. The prose means "takes mastery-known colors" (DESIGN L262–263 vs L458). *Fix:* use `correct-bg: '{colors.mastery-known-bg}'`, `correct-fg: '{colors.mastery-known-fg}'` and the same for wrong.
- **low** Several values sit outside the token system. The dark card/dialog shadow `0 8px 24px rgba(0,0,0,.35)` (L433) and the dialog scrim (L435, no color) have no `elevation`/`scrim` token. `tabs.indicator: '3px solid'` hard-codes 3px when `{spacing.quote-rule}` exists (L312). Button padding "~0.45em × 0.9em" is approximate (L449). *Fix:* add `shadow-card-dark` and `scrim`/`scrim-dark` tokens, reuse the spacing token, and give exact padding in `{spacing.*}`.
- **low** The Contrast table (L384–396) omits some load-bearing pairs. `accent-strong` on `surface` / `background` covers source references on Summary Points and the top-bar Readiness value. `ink-muted` on `surface` covers Note-row meta and the top bar. The `ink-muted` input border on `surface` must reach 3:1, and the L398 rule depends on it. `accent` tab indicator on `surface` is non-text. *Fix:* add these four rows.

## 3. Component coverage — adequate

Checked: every component named in either spine or its frontmatter against DESIGN.md › Components (29 rows), EXPERIENCE.md › Component Patterns (30 rows) and the 32 frontmatter component keys. The core loop is fully paired with real rules: Flashcard, Quiz Question, Source reference, Quote block, Passage, Tabs, Return toast, Note row and Banner. The gaps are on secondary surfaces.

### Findings
- **high** Innstillinger, a Must surface, has no components in either spine. It needs a settings toggle/switch (Demo Mode on/off, delete warning), a withdraw-Consent action (with or without confirmation?), export and import file controls, and the storage-warning text. The delete dialog's 'Ikke spør igjen' checkbox (EXPERIENCE L116, L189) has no checkbox component either (EXPERIENCE L39, L222 "settings toggles"; DESIGN Components has none). *Fix:* add rows for Toggle, Checkbox and Settings row (visual + behavioral), and define the withdraw-Consent interaction.
- **medium** DESIGN › Note row (L466) specifies title, meta and importance badge only. It lacks the 'Arkiver' icon button that EXPERIENCE requires on every row (L145, memlog L58) and the Arkiv variant actions 'Gjenopprett' / 'Slett for godt' (L115, L145). No icon is named. *Fix:* add the Arkiver control (icon, size, placement) and the Arkiv row variant to DESIGN Note row, plus `note-row` token entries.
- **medium** Components that IA/States depend on but neither spine defines: the Demovelger sample-note item (IA row 2), the Resultat per-question row ("your answer, correct answer, Quote", IA row 7; DESIGN only mentions "Resultat rows" in passing, L454), and a non-blocking **warning/notice** for the encoding fallback (L166), the first-time storage warning (L162) and the persistent "Progresjon lagres ikke" (L177). Banner is defined only for the interrupted round, and there is no warning color role (EXPERIENCE L32, L37, L162, L166, L177). *Fix:* add Sample-note item, Result row and Notice (with a stated color role, e.g. neutral `surface` + `ink-muted` rule) to both spines.
- **medium** Two behaviors that a story needs are unspecified. Consent 'Les mer' could expand inline in the dialog or open something else (EXPERIENCE L82, L197). Explain Simpler's "inline loading in place" has no visual spec (EXPERIENCE L135, DESIGN L459). *Fix:* state that 'Les mer' is an inline disclosure inside the dialog (`aria-expanded`), and define the loading treatment (status text, e.g. "Lager en enklere forklaring …", plus a disabled button).
- **low** Names differ across the pair: frontmatter `text-input` vs component "Text area"; `kbd-hint` vs "Keyboard hint" (its own row in EXPERIENCE L139, folded into Button in DESIGN L449); `quiz-option` has no prose row of its own (DESIGN L328–331, L449, L458). *Fix:* rename `text-input` → `text-area` and `kbd-hint` → `keyboard-hint`, and give Keyboard hint its own DESIGN row.

## 4. State coverage — adequate

Checked by walking each IA surface for the states it should have: Samtykke, Start, Demovelger, Genererer, Notatoversikt, both Round screens, Resultat, Arkiv, Innstillinger, Kildepanel and Top bar. Checked states: empty, cold-load, focus, error, offline, permission-denied (N/A: no accounts; storage-denied is covered) and disabled. Well covered: Start input rejections, Genererer failures, no-eligible-concepts, interrupted Round, Arkiv empty, storage failures, offline (via the network error).

### Findings
- **medium** The 360px top bar is "condensed `[ASSUMPTION]`" (L125, L291) with no rule for which of its six elements survive: brand, Note name, Readiness + gap note, theme toggle, Innstillinger. FR-19 requires the gap note always beside the score (L143), and NFR-7 requires every flow at 360px (EXPERIENCE L125, L143, L291). *Fix:* specify the mobile top bar, e.g. brand + Readiness value + Innstillinger icon. The gap note and Note name move to the top of the 'Studier' tab, and the theme toggle moves into Innstillinger.
- **medium** Genererer has no cancel or back path. Its error states offer only 'Prøv igjen' (L99–101, L169–171), so a student who hits `err.tooFewItems` again has no stated route back to Start, and browser Back during a pending generation is undefined (NFR-8) (EXPERIENCE L33, L169–171). *Fix:* add 'Tilbake til start' (secondary) to Genererer error states and define what browser Back does while a generation is pending (abort, no cache write).
- **medium** Consent declined/withdrawn says only "upload and paste disabled" (L161). The spine does not say whether stored Notes stay studyable, whether 'Forklar enklere' (a live AI call) and 'Prøv igjen' are disabled, or what copy they show (EXPERIENCE L161, L199). *Fix:* add a rule, e.g. "Stored Notes remain studyable; live AI actions (Forklar enklere, Prøv igjen, new upload) are disabled with `consent.declined` copy; Demo-Mode Notes use Fixtures."
- **medium** Export in FR-22 is per Note, but it lives on the global Innstillinger screen with no Note context. There is also no import-success state (EXPERIENCE L39, L179). *Fix:* place export on Notatoversikt (or name the Note picker in Innstillinger) and add `import.success` copy.
- **medium** Tab order puts the source panel before the study panel (`[ASSUMPTION]`, L186). On every card the keyboard user must cross the source panel, which is a scrollable region that needs a tab stop, before reaching the Flashcard. That adds friction to the UJ-1 keyboard checklist (NFR-6). Whether Passages are tab stops (L129 "programmatically focusable") is ambiguous (EXPERIENCE L129, L186). *Fix:* commit to study panel first, give the source panel one focusable scroll container, and give Passages `tabindex="-1"` (focus only via reference jump).
- **low** The Space shortcut for 'Snu kortet' (L186) collides with native Space on a focused button or link, such as the front-side "Kilde: P4" reference or 'Forklar enklere'. *Fix:* "Space flips only when focus is on the card or the body; a focused control keeps its native Space behavior."
- **low** Minor states not covered: drop-zone drag-over, the transition from the last Flashcard to the quiz (any interstitial?), and whether the interrupted-Round count "n av m besvart" includes Flashcard marks (L103, L144). *Fix:* one line each.

## 5. Visual reference coverage — adequate

Checked: files in W/. `mockups/` and `wireframes/` do not exist. `imports/` exists and is empty. `.working/` holds `directions-4.html`, `ia-2026-11-10.excalidraw` and `flow-uj1-2026-11-10.excalidraw`. Both spines name all three files and say what each shows (DESIGN L350, EXPERIENCE L15). "This spine wins on conflict" is stated once per file. No orphans. Some drift is declared: the name spelling, the Quote on the card front and the Consent timing/labels.

### Findings
- **medium** Undeclared structural drift in the IA map. `ia-2026-11-10.excalidraw` numbers surfaces 1 Start, 2 Samtykke, 3 Demovelger … 9 Innstillinger and places Kildepanel "beside 5–8". EXPERIENCE numbers them 0 Samtykke … 9 Innstillinger, beside 4–7. A consumer who cross-references by number lands on the wrong surface. The map also lacks Arkiv and the delete-warning setting; Arkiv is declared, the setting is not (EXPERIENCE L15, L28–42). *Fix:* add "IA map numbering differs; use the spine's numbers" to Known drift, or re-render the map.
- **low** Other undeclared drift. `directions-4.html` labels the source reference "Se i kilden" (9 times) where the spine uses "Kilde: P4". `flow-uj1` screen 2 has Consent copy "Ingenting lagres hos oss", which contradicts Consent point (D) "stored only in this browser" (EXPERIENCE L197) (DESIGN L350, EXPERIENCE L15). *Fix:* add both to Known drift.
- **low** References are listed only in the preambles, as backtick paths rather than links. IA, Key Flows › UJ-1 and Components do not point to the illustration at the point of use (EXPERIENCE L15, L26, L229; DESIGN L350, L441). *Fix:* add a one-line "→ `.working/flow-uj1-2026-11-10.excalidraw` screens 1–9" under UJ-1, and the same for IA and the Flashcard/Tabs rows.
- **low** No key-screen mocks exist, although Finalize step 4 planned them (memlog L52). 13 DESIGN components are marked † (unmocked), including all of 'Dine notater', Arkiv, Dialog and Error message. *Fix:* render the key screens ('Dine notater', Notatoversikt, Quiz answered, mobile Kilde, an error state) into `mockups/` and link them, or state the deferral.

## 6. Bloat & overspecification — strong

The pair is lean for its scope. The Microcopy table and the Contrast table carry real weight, and the invented sections each own a rule set that appears nowhere else. Two small items:

### Findings
- **low** 8 of 11 dark typography roles repeat the light values exactly (DESIGN L117–167). Only `brand`, `headline` and `panel-label` differ, so the rest are duplicates that can drift apart. *Fix:* define only the three dark deltas and state that other roles are shared, or keep the duplicates and add "identical to light; change both" in the comment.
- **low** Two Inspiration entries add no constraint: "qualities not stated" for Logically / Open notebook, and "Reason not recorded" for direction 2 (EXPERIENCE L278–279). *Fix:* record the reason or drop the entries.

## 7. Inheritance discipline — adequate

Checked: `sources` paths resolve (`../../prds/prd-G75-andersen-drage-2026-11-05/{prd,addendum}.md`). UJ names match the PRD verbatim. Glossary terms are used with PRD capitalization. Component names were compared across both files (§3). EXPERIENCE token references (`{components.focus-ring}` ×2) resolve. Memlog decisions were checked against the spines. All superseding entries are reflected: Torsas spelling, unified serif, error role, consent first-run, archive without confirmation, importance cycling.

### Findings
- **high** Stale `[OPEN]` markers and English strings contradict the Microcopy table, so a consumer cannot tell which string is committed. Examples:
  - The Text area submit label is "`[OPEN]`" (L151), but `start.paste.submit` = "Lag kort og quiz" (L87).
  - The Quiz advance label is "`[OPEN]`" (L134), but `quiz.next` exists (L108).
  - The Arkiv empty copy is "`[OPEN]`" (L164), but `archive.empty` exists (L114).
  - The review-round copy is "`[OPEN]`" (L174), but `round.review` exists (L104).
  - Explain Simpler failure is in English (L135), but `simpler.fail` exists (L109).
  - No API key is in English (L168, L264), but `err.noKey` exists (L97).
  - State Patterns quotes English PRD strings throughout (L165) instead of keys.

  (EXPERIENCE L134–174, L264.) *Fix:* replace every inline string or `[OPEN]` in Component Patterns, State Patterns and Key Flows with its Microcopy key (e.g. "`err.noKey`"), and keep `[OPEN]` only where no key exists.
- **high** FR-12 ("The Quote is visible without any extra click") is part of PRD §1.3 differentiator 1, which the PRD says UX "must not trade away". The spine narrows it: no Quote on the Flashcard front or before a Quiz answer. The PRD is still `status: final` with the literal wording, and the spine does not say which document wins on Open Items 1–6 until the PRD is updated. A story-dev writing FR-12 acceptance tests from the PRD will contradict the spine (EXPERIENCE L132–134, L190, L298–305; PRD L232–236, L49–51). *Fix:* run `bmad-prd` update for Open Items 1–6 before architecture and stories, or add "Until the PRD is updated, this spine supersedes it on Open Items 1–6" to the preamble.
- **medium** Much of the behavior is provisional. The whole Microcopy table is "awaiting Tor's approval `[ASSUMPTION]`" (L77). Load-bearing rules are still `[ASSUMPTION]`: the 768px breakpoint (L292), the column ratio (DESIGN L424), focus after reveal (L219), importance cycling (L146), the sort tie-break (L207), and status `draft` in both files. A consumer cannot tell "build to this" from "may change" (EXPERIENCE L77, L146, L207, L219, L292). *Fix:* have Tor confirm or adjust these in one pass, remove the tags, and set `status: final`.
- **low** PRD-to-UI term mappings are implied, not stated: Mastery State *new/shaky/known* ↔ 'ny'/'usikker'/'kan'; PRD "text view" (FR-1, FR-12) ↔ Kildepanel / source panel; "knew it"/"didn't know" ↔ 'Kunne det'/'Kunne det ikke'; "Exam in one hour" ↔ 'Eksamen om en time' (DESIGN L461, EXPERIENCE L40, L105). *Fix:* add a 5-row "PRD term → UI label" table to EXPERIENCE Foundation.
- **low** The grading guide (criterion 4) is a confirmed source (memlog L6) and drove decisions, but it is missing from both files' `sources` frontmatter. *Fix:* add `../../input/Sensorveiledning IBE160 - Del 1 applikasjon og prosess.pdf`.

## 8. Shape fit — strong

DESIGN.md follows the canonical order exactly: Brand & Style → Colors (+ Contrast) → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. Its frontmatter uses the spec keys, plus `status`/`created`/`updated`/`sources`, which are harmless. EXPERIENCE.md has every section the examples use, including Responsive & Platform, which earns its place here (multi-width). Four sections are invented and each earns its place: Microcopy (NFR-9, bokmål UI), Consent & Privacy (FR-5 gate), Note Lifecycle (new archive/delete rules) and Open Items.

### Findings
- **low** EXPERIENCE puts Key Flows before Inspiration & Anti-patterns and Responsive & Platform (L227, L275, L286). The examples put Responsive before Inspiration and end with Key Flows. Readers won't be confused, but the order differs from the house pattern. *Fix:* move Key Flows to the end, just before Open Items.
- **low** Consent & Privacy (L192–199) repeats the consent decision partly in prose next to `consent.*` Microcopy keys (L81–84). *Fix:* reference the keys from Consent & Privacy instead of paraphrasing the copy.

## Mechanical notes

- **Token references:** 50 distinct `{path}` references (49 in DESIGN, 1 in EXPERIENCE), all of which resolve. `{colors.x}` / `{colors.x-dark}` in the DESIGN L15 comment are placeholders.
- **Colors:** 23 light + 23 dark, fully paired, all hex. The dark highlight values are 8-digit hex with alpha (`#F2B84B47`, `#F2B84B99`); the spec allows hex strings, but a consumer needs to support alpha hex.
- **Typography:** 11 light + 11 dark roles, fully paired. `rounded`: sm, md, track, full (`9999px`). `spacing`: 1–6 plus 5 named tokens.
- **Frontmatter components:** 32 keys. DESIGN prose Components: 29 rows. EXPERIENCE Component Patterns: 30 rows. The only names not shared by both prose tables are Keyboard hint (folded into DESIGN Button) and `quiz-option` (inside DESIGN Quiz Question).
- **Journeys:** UJ-1, UJ-2, UJ-3 present with verbatim titles, plus Flow 4 (spine-added).
- **FRs with no UX surface beyond a mention:** FR-20 and FR-22, both Should.
- **Workspace files:** `.working/directions-4.html`, `.working/ia-2026-11-10.excalidraw`, `.working/flow-uj1-2026-11-10.excalidraw` are all referenced. `imports/` is empty. `mockups/` and `wireframes/` are absent.
- **Spine status:** both `draft`. Memlog L52 plans `final` after key-screen mocks and polish.
- **Finding counts:** critical 0 · high 4 · medium 16 · low 15.
