---
name: Torsas læringsassistent
status: final
created: 2026-11-10
updated: 2026-11-12
sources:
  - ../../prds/prd-G75-andersen-drage-2026-11-05/prd.md
  - ../../prds/prd-G75-andersen-drage-2026-11-05/addendum.md
description: >-
  Study companion that turns a student's own Note into Flashcards and a Quiz with a verified
  source on every Item. One identity, two modes: light "Lesesal" (paper, serif, deep green)
  and dark "Kveldsmodus" (night, amber); serif marks Note content in both modes. No UI library; library choice is deferred to architecture.
colors:
  # Mode convention: unsuffixed = light (Lesesal); `-dark` suffix = dark (Kveldsmodus).
  # Every {colors.x} reference resolves to {colors.x-dark} when dark mode is active.
  # Values lifted from mockups/directions-4.html (.d1 = light, .d3 = dark).
  background: '#FAF7F2'
  surface: '#FFFDF9'
  surface-source: '#F5F0E7'
  surface-card: '#FFFDF9'
  ink: '#2B2A28'
  ink-muted: '#6B655C'
  line: '#E4DCCD'            # separators only, never an interactive boundary
  line-strong: '#8A8275'     # interactive boundaries (>=3:1 on surface/background/surface-source)
  ink-disabled: '#A39B8F'    # disabled text/glyphs (exempt from 1.4.3, never the only state cue)
  surface-hover: '#F3EEE5'   # hover fill for secondary/ghost buttons, quiz options, rows, menu items
  accent: '#2F5D50'
  accent-strong: '#2F5D50'
  on-accent: '#FFFFFF'
  focus: '#2F5D50'
  highlight: '#F3E3A3'
  highlight-ring: '#8A6510'  # 2px Quote outline
  quote-bg: '#F5F0E7'
  mastery-new-bg: '#ECE7DE'
  mastery-new-fg: '#4D473F'
  mastery-shaky-bg: '#F6E1D3'
  mastery-shaky-fg: '#7A3B12'
  mastery-known-bg: '#DCE9E2'
  mastery-known-fg: '#1F4A3D'
  error-bg: '#FBE1E7'        # dedicated error role: crimson, hue-separated from mastery-shaky (orange)
  error-fg: '#A11A3B'
  background-dark: '#14161B'
  surface-dark: '#1C1F26'
  surface-source-dark: '#181B21'
  surface-card-dark: '#222630'
  ink-dark: '#E7E5E0'
  ink-muted-dark: '#A3A7B0'
  line-dark: '#2E333D'
  line-strong-dark: '#727885'
  ink-disabled-dark: '#5E636D'
  surface-hover-dark: '#262A34'
  accent-dark: '#F2B84B'
  accent-strong-dark: '#F5C76E'
  on-accent-dark: '#1A1406'
  focus-dark: '#F5C76E'
  highlight-dark: '#F2B84B47'       # rgba(242,184,75,.28); over surface-source-dark = #55472D
  highlight-ring-dark: '#F2B84B'    # solid amber
  quote-bg-dark: '#1A1D24'
  mastery-new-bg-dark: '#2A2E37'
  mastery-new-fg-dark: '#C9CCD3'
  mastery-shaky-bg-dark: '#3A2A1A'
  mastery-shaky-fg-dark: '#F3C38E'
  mastery-known-bg-dark: '#1D3329'
  mastery-known-fg-dark: '#9ED9B7'
  error-bg-dark: '#3D1A26'
  error-fg-dark: '#F5A3B8'
typography:
  # Light (Lesesal): serif for source text, card text and brand; sans for UI chrome.
  brand:
    fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
    fontSize: 16.5px
    fontWeight: '500'
  headline:                          # [ASSUMPTION] screen titles ('Dine notater'); not in mockups
    fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.3'
  panel-label:
    fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
    fontSize: 12px
    fontWeight: '500'
    letterSpacing: '0'
  body:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.45'
  source:
    fontFamily: "Georgia, serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  card-front:
    fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
    fontSize: 26px
    fontWeight: '500'
    lineHeight: '1.3'
  card-back:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.55'
  quote:
    fontFamily: "Georgia, serif"
    fontSize: 13.5px
    fontWeight: '400'
    lineHeight: '1.5'
  reference:                         # [ASSUMPTION] raised from mockup's ~11.5px to 13px for legibility
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 13px
    fontWeight: '400'
  chip:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 12px
    fontWeight: '400'
  mono:
    fontFamily: "ui-monospace, Consolas, monospace"
    fontSize: 11px
    fontWeight: '400'
  # Dark (Kveldsmodus): sans chrome, uppercase tracked labels; Note content (source, quote, card-front) in serif as in light.
  brand-dark:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 16.5px
    fontWeight: '600'
  headline-dark:                     # [ASSUMPTION] as headline
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  panel-label-dark:                  # rendered UPPERCASE (see Typography)
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 12px
    fontWeight: '600'
    letterSpacing: 0.08em
  body-dark:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.45'
  source-dark:
    fontFamily: "Georgia, serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  card-front-dark:
    fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
    fontSize: 26px
    fontWeight: '500'
    lineHeight: '1.3'
  card-back-dark:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.55'
  quote-dark:
    fontFamily: "Georgia, serif"
    fontSize: 13.5px
    fontWeight: '400'
    lineHeight: '1.5'
  reference-dark:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 13px
    fontWeight: '400'
  chip-dark:
    fontFamily: "system-ui, 'Segoe UI', sans-serif"
    fontSize: 12px
    fontWeight: '400'
  mono-dark:
    fontFamily: "ui-monospace, Consolas, monospace"
    fontSize: 11px
    fontWeight: '400'
rounded:
  # Shared by both modes. [ASSUMPTION] Lesesal values adopted; Kveldsmodus mockup used 6px / 10px.
  sm: 4px
  md: 6px
  track: 3px
  full: 9999px
spacing:
  # Shared by both modes. [ASSUMPTION] mockup paddings (14-16px base) normalized to a 4px scale.
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  gutter-mobile: 16px
  focus-offset: 2px
  focus-width: 3px
  quote-rule: 3px
  progress-height: 6px
components:
  # Order matches DESIGN › Components and EXPERIENCE › Component Patterns.
  top-bar:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border-bottom: '1px solid {colors.line}'
    brand-type: '{typography.brand}'
    readiness-value: '{colors.accent-strong}'
    meta: '{colors.ink-muted}'
  status-strip:                      # [ASSUMPTION] mobile, top of 'Studier' tab; composed from top-bar tokens
    background: '{colors.surface}'
    border-bottom: '1px solid {colors.line}'
    padding: '{spacing.2} {spacing.gutter-mobile}'
    type: '{typography.body}'
    note-name-color: '{colors.ink-muted}'
    readiness-value: '{colors.accent-strong}'
    gap-note-color: '{colors.ink-muted}'
  demo-indicator:                    # [ASSUMPTION] top-bar link 'Demomodus'; composed from chip tokens
    background: '{colors.surface}'
    foreground: '{colors.accent-strong}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.full}'
    type: '{typography.chip}'
    decoration: underline
  overflow-menu:
    trigger: '{components.button-ghost}'
    background: '{colors.surface-card}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
    item-hover: '{colors.surface-hover}'
    type: '{typography.body}'
  skip-link:
    background: '{colors.surface-card}'
    foreground: '{colors.accent-strong}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
  theme-toggle:
    background: transparent
    foreground: '{colors.ink}'
    radius: '{rounded.sm}'
  tabs:
    inactive: '{colors.ink-muted}'
    active: '{colors.ink}'
    indicator: '3px solid {colors.accent}'
    divider: '1px solid {colors.line}'
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.on-accent}'
    border: '1px solid {colors.accent}'
    radius: '{rounded.sm}'
    type: '{typography.body}'
  button-secondary:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
    hover-background: '{colors.surface-hover}'
  button-ghost:
    background: transparent
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
    hover-background: '{colors.surface-hover}'
  button-disabled:                   # any button variant while disabled / aria-disabled
    background: '{colors.surface}'
    foreground: '{colors.ink-disabled}'
    border: '1px solid {colors.line}'
  kbd-hint:
    type: '{typography.mono}'
    foreground: '{colors.ink-muted}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
    on-primary-foreground: '{colors.on-accent}'            # inside a primary button
    on-primary-border: '1px solid {colors.on-accent}'
  focus-ring:
    outline: '{spacing.focus-width} solid {colors.focus}'
    offset: '{spacing.focus-offset}'
    offset-in-scroll-container: '-{spacing.focus-width}'   # inset, so overflow does not clip it
  source-panel:
    background: '{colors.surface-source}'
    border-right: '1px solid {colors.line}'
    padding: '{spacing.5}'
    label-type: '{typography.panel-label}'
    label-color: '{colors.ink-muted}'
  passage:
    type: '{typography.source}'
    id-type: '{typography.mono}'
    id-color: '{colors.ink-muted}'
  passage-active:
    background: transparent          # no tint; keeps surface-source so the Quote ring stays perceivable
    rule: '{spacing.quote-rule} solid {colors.accent}'
    radius: '0 {rounded.sm} {rounded.sm} 0'
    padding: '{spacing.2}'
  source-reference:
    type: '{typography.reference}'
    foreground: '{colors.accent-strong}'
    decoration: underline
  quote-highlight:
    background: '{colors.highlight}'
    outline: '2px solid {colors.highlight-ring}'          # outline, not box-shadow (survives forced colors)
    box-decoration-break: clone
    forced-colors: 'Mark / MarkText + 2px outline CanvasText'
  return-control:                    # desktop: top of source panel; mobile: top of 'Kilde' tab
    background: '{colors.surface}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
    action-color: '{colors.accent-strong}'
  flashcard:
    background: '{colors.surface-card}'
    border: '1px solid {colors.line}'
    radius: '{rounded.md}'
    padding: '{spacing.5}'
    front-type: '{typography.card-front}'
    back-type: '{typography.card-back}'
    back-divider: '1px dashed {colors.line}'
  quote-block:
    background: '{colors.quote-bg}'
    rule: '{spacing.quote-rule} solid {colors.accent}'
    radius: '0 {rounded.sm} {rounded.sm} 0'
    type: '{typography.quote}'
  quiz-option:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
    hover-background: '{colors.surface-hover}'
    correct-bg: '{colors.mastery-known-bg}'
    correct-fg: '{colors.mastery-known-fg}'
    wrong-bg: '{colors.mastery-shaky-bg}'
    wrong-fg: '{colors.mastery-shaky-fg}'
    answered-foreground: '{colors.ink}'              # answered, not chosen, not correct: full text contrast
    answered-border: '1px solid {colors.line}'       # only the border is muted; not the disabled style
  round-progress:
    label-color: '{colors.ink-muted}'                # "Runde n · Kort x av y" / "Runde n · Spørsmål x av y"
    track: '{colors.line}'
    fill: '{colors.accent}'
    height: '{spacing.progress-height}'
    radius: '{rounded.track}'
  result-row:                        # Resultat, one per Quiz Question (key-result mockup)
    divider: '1px solid {colors.line}'
    padding: '{spacing.4} 0'
    gap: '{spacing.2}'
    heading-type: '{typography.reference}'
    heading-color: '{colors.ink-muted}'
    question-type: '{typography.source}'
    answer-type: '{typography.body}'
    answer-color: '{colors.ink}'
    mark-correct: '{colors.mastery-known-fg}'
    mark-wrong: '{colors.mastery-shaky-fg}'
  mastery-chip-new:
    background: '{colors.mastery-new-bg}'
    foreground: '{colors.mastery-new-fg}'
    radius: '{rounded.full}'
    type: '{typography.chip}'
  mastery-chip-shaky:
    background: '{colors.mastery-shaky-bg}'
    foreground: '{colors.mastery-shaky-fg}'
    radius: '{rounded.full}'
    type: '{typography.chip}'
  mastery-chip-known:
    background: '{colors.mastery-known-bg}'
    foreground: '{colors.mastery-known-fg}'
    radius: '{rounded.full}'
    type: '{typography.chip}'
  concept-chip:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '1px solid {colors.line}'
    radius: '{rounded.full}'
    type: '{typography.chip}'
  readiness-score:
    value-color: '{colors.accent-strong}'
    gap-note-color: '{colors.ink-muted}'
  banner:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    rule: '{spacing.quote-rule} solid {colors.accent}'
    radius: '{rounded.sm}'
  note-row:
    background: '{colors.surface}'
    hover-background: '{colors.surface-hover}'
    divider: '1px solid {colors.line}'
    title-type: '{typography.body}'
    title-color: '{colors.ink}'
    meta-color: '{colors.ink-muted}'
    control-gap: '{spacing.2}'
    archive-button: '{components.button-ghost}'          # icon + visually hidden name, 44px hit area
  importance-select:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.full}'
    type: '{typography.chip}'
    hover-background: '{colors.surface-hover}'
  toast:                             # archive undo toast; return-control tokens, bottom centre
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.sm}'
    padding: '{spacing.2} {spacing.4}'
    action-color: '{colors.accent-strong}'
    separator-color: '{colors.ink-muted}'
    offset-bottom: '{spacing.5}'
  drop-zone:
    background: '{colors.surface}'
    border: '1px dashed {colors.ink-muted}'
    radius: '{rounded.md}'
  text-area:
    background: '{colors.surface}'
    border: '1px solid {colors.ink-muted}'
    radius: '{rounded.sm}'
    type: '{typography.body}'
  generation-progress:
    track: '{colors.line}'
    fill: '{colors.accent}'
    radius: '{rounded.track}'
    status-color: '{colors.ink-muted}'
  dialog:
    background: '{colors.surface-card}'
    border: '1px solid {colors.line}'
    radius: '{rounded.md}'
    padding: '{spacing.5}'
  checkbox:
    background: '{colors.surface}'
    border: '1px solid {colors.line-strong}'
    checked-background: '{colors.accent}'
    checkmark: '{colors.on-accent}'
    radius: '{rounded.sm}'
  toggle:
    track-off: '{colors.surface}'
    track-off-border: '1px solid {colors.line-strong}'
    thumb-off: '{colors.ink-muted}'
    track-on: '{colors.accent}'
    thumb-on: '{colors.on-accent}'
    radius: '{rounded.full}'
    state-text-color: '{colors.ink-muted}'
  settings-row:
    divider: '1px solid {colors.line}'
    label-type: '{typography.body}'
    label-color: '{colors.ink}'
    description-color: '{colors.ink-muted}'
    padding: '{spacing.3} 0'
  error-message:
    background: '{colors.error-bg}'
    foreground: '{colors.error-fg}'
    rule: '{spacing.quote-rule} solid {colors.error-fg}'
    radius: '0 {rounded.sm} {rounded.sm} 0'
    icon-color: '{colors.error-fg}'
  empty-state:
    headline-type: '{typography.headline}'
    body-color: '{colors.ink-muted}'
---

# Torsas læringsassistent — Design Spine

Visual identity. Behavior lives in `EXPERIENCE.md`. Product scope, glossary and requirements live in the PRD (`sources`) and are not repeated here.

Visual references (illustrations only; **the spines win on conflict**):

- [`mockups/directions-4.html`](mockups/directions-4.html): the four visual directions; tokens lifted from direction 1 Lesesal and direction 3 Kveldsmodus (see Brand & Style); directions 2 and 4 were rejected (`EXPERIENCE.md` › Inspiration & Anti-patterns).
- Key-screen mockups, light mode (Lesesal) only, built from these tokens: [Start](mockups/key-start.html) ([PNG](mockups/key-start.png)), [Genererer](mockups/key-generating.html) ([PNG](mockups/key-generating.png)), [Notatoversikt](mockups/key-overview.html) ([PNG](mockups/key-overview.png)), [Runde: flashcards](mockups/key-flashcards.html) ([PNG](mockups/key-flashcards.png)), [Runde: quiz](mockups/key-quiz.html) ([PNG](mockups/key-quiz.png)), [Resultat](mockups/key-result.html) ([PNG](mockups/key-result.png)). Which components each one shows: Components › Mockup map.
- Low-fi wireframes (v1, predate later decisions): [`wireframes/ia-2026-11-10.excalidraw`](wireframes/ia-2026-11-10.excalidraw) (IA map), [`wireframes/flow-uj1-2026-11-10.excalidraw`](wireframes/flow-uj1-2026-11-10.excalidraw) (UJ-1 flow).

`imports/` is empty. Every known mismatch between the mockups/wireframes and the spines is listed once in `EXPERIENCE.md` › Known drift (only directions-4 and the v1 wireframes drift from the spines; the key-screen mockups match).

## Brand & Style

A study companion that sits beside the student like a quiet reading room, not a game. The emotional job is to lower exam stress through calm and legibility, and to make trust visible: every Item points back to the student's own Note. Two modes, one identity:

- **Lesesal (light).** A well-printed course compendium: warm paper, serif source and card text, sans UI chrome, almost no shadows. The source feels like the student's own notes.
- **Kveldsmodus (dark).** The evening before the exam, when the screen is the only light in the room: low brightness, amber accent, a warm highlight that lights up the Quote in the source. Sans chrome with uppercase tracked labels; Note content stays in serif, as in Lesesal.

Layout, spacing and component shapes are identical across modes; only color, chrome type and elevation change. Serif marks Note content in both modes. Mode default and persistence: `EXPERIENCE.md` › Foundation.

## Colors

Tokens are paired light/dark (`x` / `x-dark`). **Resolution rule:** every `{colors.x}` and `{typography.x}` reference in a component resolves to `{colors.x-dark}` / `{typography.x-dark}` while Kveldsmodus is active; components therefore reference light tokens only. One chromatic accent per mode; everything else is warm neutrals.

| Role | Light (Lesesal) | Dark (Kveldsmodus) | Used for | Not used for |
|---|---|---|---|---|
| `background` | `#FAF7F2` paper | `#14161B` night | Page canvas | Panels |
| `surface` / `surface-card` | `#FFFDF9` | `#1C1F26` / `#222630` | Top bar, buttons, rows, Flashcard, dialogs | — |
| `surface-source` | `#F5F0E7` | `#181B21` | Source panel; mobile 'Kilde' tab | Study content |
| `surface-hover` | `#F3EEE5` | `#262A34` | Hover fill: secondary/ghost buttons, quiz options, Note rows, menu items | Selected or active state |
| `ink` / `ink-muted` | `#2B2A28` / `#6B655C` | `#E7E5E0` / `#A3A7B0` | Text / meta, Passage IDs, inactive tabs | — |
| `ink-disabled` | `#A39B8F` | `#5E636D` | Text and glyphs of disabled controls | Any readable content (disabled state is always also stated in text or by `aria-disabled`) |
| `line` | `#E4DCCD` | `#2E333D` | Dividers, card borders, progress track | Interactive boundaries (too faint, see contrast) |
| `line-strong` | `#8A8275` | `#727885` | Boundaries of interactive controls: secondary/ghost buttons, quiz options, importance select, toggle, checkbox, menus | Dividers |
| `accent` | `#2F5D50` deep green | `#F2B84B` amber | Primary button, progress fill, Quote rule, active-Passage rule, active tab, toggle/checkbox on | Decoration, error states |
| `accent-strong` | `#2F5D50` | `#F5C76E` | Source reference links, Readiness Score value | Fills |
| `focus` | `#2F5D50` | `#F5C76E` | Focus ring | — |
| `highlight` / `highlight-ring` | `#F3E3A3` / `#8A6510` | amber at 28% (`#F2B84B47`) / `#F2B84B` | The Quote inside its Passage: fill plus 2px ring | Any other emphasis |
| `mastery-*` | new / shaky / known pairs | dark pairs | Mastery State chips; quiz correct/wrong colors (`quiz-option.correct-*` / `wrong-*`) | Generic status |
| `error-bg` / `error-fg` | `#FBE1E7` / `#A11A3B` crimson | `#3D1A26` / `#F5A3B8` | Error messages only (with icon, "Feil:" prefix and `error-fg` rule) | Mastery 'usikker' (orange; see hue separation below) |

**Error vs 'usikker' hue separation.** Error reads crimson/pink, 'usikker' reads orange. Lightness is deliberately similar, so color is never the only cue: errors also carry an icon, the "Feil:" prefix and a 3px `error-fg` rule, and mastery chips always carry their text label. Hue figures (OKLCH / HSL):

| Pair | Light: error vs 'usikker' (apart) | Dark: error vs 'usikker' (apart) |
|---|---|---|
| `error-fg` vs `mastery-shaky-fg` | 14° / 345° vs 49° / 24° (35° / 39°) | 3° / 345° vs 69° / 32° (66° / 47°) |
| `error-bg` vs `mastery-shaky-bg` | 2° / 346° vs 56° / 24° (54° / 38°) | 0° / 339° vs 66° / 30° (66° / 51°) |

### Contrast (WCAG 2.1 AA, NFR-6)

WCAG relative-luminance ratios, recomputed 2026-11-12. Text pairs need 4.5:1; non-text boundaries and state indicators need 3:1 (SC 1.4.11).

| Pair | Light | Dark | Needed |
|---|---|---|---|
| `ink` on `background` / `surface` | 13.4 / 14.1:1 | 14.4 / 13.1:1 | 4.5 |
| `ink` on `surface-source` / dark `surface-card` | 12.6:1 | 12.0:1 | 4.5 |
| `ink` on `surface-hover` | 12.4:1 | 11.4:1 | 4.5 |
| `ink-muted` on `background` / `surface` / `surface-source` | 5.4 / 5.7 / 5.1:1 | 7.5 / 6.8 / 7.2:1 | 4.5 |
| `ink-muted` on `surface-hover` / dark `surface-card` | 5.0:1 | 6.0 / 6.3:1 | 4.5 |
| `on-accent` on `accent` (primary button; also keyboard hint inside it) | 7.5:1 | 10.2:1 | 4.5 |
| `accent-strong` on `surface` / `quote-bg` (reference link, Readiness value) | 7.4 / 6.6:1 | 10.4 / 10.7:1 | 4.5 |
| `ink` on `highlight` (Quote text; dark blended over `surface-source-dark` = `#55472D`) | 11.2:1 | 7.2:1 | 4.5 |
| `highlight-ring` vs `surface-source` (Quote boundary against its Passage) | 4.7:1 | 9.6:1 | 3 |
| `highlight-ring` vs `highlight` (ring vs its own fill) | 4.1:1 | 5.1:1 | 3 |
| Active-Passage rule `accent` vs `surface-source` | 6.6:1 | 9.6:1 | 3 |
| `line-strong` vs `surface` / `background` / `surface-source` | 3.7 / 3.6 / 3.4:1 | 3.7 / 4.1 / 3.9:1 | 3 |
| `line-strong` vs `surface-card` / `surface-hover` | 3.7 / 3.3:1 | 3.4 / 3.2:1 | 3 |
| `ink-muted` input and drop-zone border vs `surface` | 5.7:1 | 6.8:1 | 3 |
| `accent` (tab indicator, progress fill, toggle on) vs `surface` | 7.4:1 | 9.2:1 | 3 |
| Mastery chips new / shaky / known (text) | 7.5 / 6.8 / 8.0:1 | 8.5 / 8.5 / 8.4:1 | 4.5 |
| `focus` ring vs `background` / `surface` | 7.0 / 7.4:1 | 11.4 / 10.4:1 | 3 |
| `error-fg` on `error-bg` (text; also the error rule) | 6.2:1 | 7.9:1 | 4.5 |
| `error-fg` on `surface` (error rule edge) | 7.6:1 | 8.5:1 | 3 |
| `line` vs `background` (separator only) | 1.3:1 | 1.4:1 | — |
| `ink-disabled` | exempt (1.4.3 incidental) | exempt | — |

Rules that follow from the table:

- `line` fails 3:1, so it only separates content. Every interactive control's boundary uses `line-strong` (or `ink-muted` for inputs and the drop zone).
- The Quote highlight is perceivable by its 2px `highlight-ring` outline, not by its fill; the fill is warmth only (1.1:1 against `surface-source`). The active Passage has no tint and keeps the panel background so nothing sits between ring and panel.
- `ink-muted` text never sits on `highlight` (4.5:1 fails); Passage IDs stay outside the `<mark>`.
- A keyboard hint inside a primary button uses `on-accent` (7.5 / 10.2:1), never `ink-muted`.
- Progress tracks (`line`) are decorative; the "Kort 3 av 12" text carries the information and the bar is `aria-hidden`.

## Typography

System font stacks only (no web fonts to load). Roles are shared; families differ per mode.

| Role | Light | Dark | Use |
|---|---|---|---|
| `brand` | Georgia 500, 16.5px | system-ui 600 | Product name in top bar |
| `headline` | Georgia 500, 20px `[ASSUMPTION]` | system-ui 600 | Screen titles, empty-state headlines |
| `panel-label` | Georgia 500, 12px, sentence case | system-ui 600, 12px, UPPERCASE, 0.08em | "Kilde · forelesning-7.pdf", section labels |
| `body` | system-ui 400, 15px / 1.45 | same | UI chrome, buttons, rows |
| `source` | Georgia 15px / 1.6 | same | Extracted Text Passages |
| `card-front` | Georgia 500, 26px / 1.3 | same | Flashcard front, Quiz Question stem |
| `card-back` | system-ui 15px / 1.55 | same | Flashcard back, answers |
| `quote` | Georgia 13.5px / 1.5 | same | Quote block |
| `reference` | system-ui 13px | same | "Kilde: P4" links |
| `chip` | system-ui 12px | same | Mastery and concept chips, importance select |
| `mono` | ui-monospace 11px | same | Passage IDs (P1, P2 …), keyboard hints |

Rules: in both modes serif marks *content from or about the Note*; sans marks *the app speaking*. Never set UI chrome in serif. The Quote is set in the `source` family so it visibly matches the Passage it came from. Sentence case for all UI strings (NFR-9).

- **Units.** Tokens are written in px for readability; implement every `fontSize` in rem (px ÷ 16, for example `card-front` 26px = 1.625rem) so the user's default font size and 200% text zoom apply (SC 1.4.4). Line heights are unitless. No fixed heights on text containers (chips, keyboard hints, buttons, top bar) so 1.4.12 text spacing does not clip.
- **Wrapping.** All text containers use `overflow-wrap: anywhere` and `hyphens: auto`, with the correct `lang` on Note content, so long Norwegian compounds ("eksamensforberedelse") wrap inside a 288px content box. Note titles in rows and the top bar may truncate with an ellipsis (full-title requirement: `EXPERIENCE.md` › Accessibility Floor); body text never truncates.

## Layout & Spacing

Scale `{spacing.1}`–`{spacing.6}` = 4 / 8 / 12 / 16 / 24 / 32px `[ASSUMPTION]` normalized from mockup paddings.

- **Desktop/laptop:** top bar across the full width; below it a two-column split on Notatoversikt, Round and Resultat screens: **source panel left, study panel right** visually, columns `1fr : 1.15fr` `[ASSUMPTION]` (Lesesal ratio; Kveldsmodus mockup used 1 : 1.2). In the DOM the study panel (`main`) comes first and the source panel (`aside`) second; CSS grid places the source panel left. Panels pad `{spacing.5}`; study panel stacks its blocks with `{spacing.4}` gaps. Illustrated in [key-overview](mockups/key-overview.html), [key-flashcards](mockups/key-flashcards.html), [key-quiz](mockups/key-quiz.html), [key-result](mockups/key-result.html).
- **Mobile (down to 320px):** single column; source and study become tabs ('Studier' / 'Kilde') under the top bar. Side gutter `{spacing.gutter-mobile}`, leaving a 288px content box at the 320px floor (WCAG 1.4.10; NFR-7 names 360px, but the spine designs for 320px). Breakpoint: `EXPERIENCE.md` › Responsive & Platform. Illustrated in [key-quiz](mockups/key-quiz.html), lower frame (360px 'Kilde' tab with condensed top bar).
- **Condensed top bar (mobile):** one row: brand (link to 'Dine notater') left, 'Mer' overflow button right (44 × 44px). 'Mer' opens a menu with 'Innstillinger' and the theme toggle. On Notatoversikt, Round and Resultat screens (4–7 in `EXPERIENCE.md` › Information Architecture) the Note name, "Klar for eksamen {n} %" and the gap note move to a status strip at the top of the 'Studier' tab (score and gap note stay together, FR-19), wrapping onto two lines as needed.
- **Zoom:** at 200% zoom on a 1280px window (640 CSS px) the mobile layout applies; at 400% (320 CSS px) nothing scrolls horizontally (long tokens wrap, see Typography). Dialogs use `max-height: 100dvh` with internal scroll.
- Start ('Dine notater'), Genererer, Arkiv and Innstillinger are single-column screens without the source panel, max content width ~40rem `[ASSUMPTION]` ([key-start](mockups/key-start.html), [key-generating](mockups/key-generating.html)).
- **Round screens:** the round progress line sits at the top of the study panel, the same one-line pattern for Flashcards and Quiz (Components › Round progress).

## Elevation & Depth

Mode-specific, lifted from the directions:

- **Light:** no shadows. Depth comes from tonal layering (`background` → `surface-source` → `surface-card`) and 1px `line` borders. Paper does not float.
- **Dark:** the Flashcard and dialogs carry one soft shadow, `0 8px 24px rgba(0,0,0,.35)`, because tonal steps are small in the dark. Nothing else is elevated.

Dialogs dim the page behind them `[ASSUMPTION]` (scrim not specified in mockups).

## Shapes

Shared across modes, using the Lesesal values `[ASSUMPTION]`: `{rounded.sm}` 4px for buttons, inputs, checkboxes, menus, Passages, return control, banners; `{rounded.md}` 6px for the Flashcard, dialogs and the drop zone; `{rounded.full}` for chips, the importance select and toggle tracks; `{rounded.track}` 3px for progress bars. The Quote block, the active Passage and the error message are square on the left (where their 3px rule sits) and rounded on the right. No pills for buttons.

## Components

Components marked † are not drawn in `directions-4.html`; their visuals are composed from existing tokens `[ASSUMPTION]`. Row order and names match `EXPERIENCE.md` › Component Patterns. Which key-screen mockup draws each component: Components › Mockup map, after the table.

| Component | Visual spec |
|---|---|
| **Top bar** | `surface`, bottom `line`. Left: `brand` (a link to 'Dine notater'), then the Demo indicator when Demo Mode is on, then Note name in `ink-muted`. Right: Readiness Score ("Klar for eksamen **63 %**", value in `accent-strong`, 1.25× body), gap note ("2 begreper uten verifiserte elementer", `ink-muted`), theme toggle, 'Innstillinger' ghost button. **Mobile:** see Layout & Spacing › Condensed top bar. |
| **Status strip** † (mobile, screens 4–7) | Strip at the top of the 'Studier' tab: `surface`, bottom `line`, padding `{spacing.2}` × `{spacing.gutter-mobile}`, `body` type. Note name in `ink-muted`; "Klar for eksamen **{n} %**" with the value in `accent-strong`; gap note in `ink-muted` right after the score (never separated, FR-19). Wraps onto two lines as needed. |
| **Demo indicator** † | "Demomodus" link next to the brand: pill (`{rounded.full}`), `surface` with 1px `line-strong` border, `chip` type, `accent-strong` underlined text. Same look in the condensed top bar. |
| **Overflow menu** † ('Mer') | Ghost icon button (⋯ glyph + visible or visually hidden name 'Mer'), 44 × 44px. Menu: `surface-card`, 1px `line-strong`, `{rounded.sm}`, items in `body` at ≥44px height, hover `surface-hover`. Items: 'Innstillinger', theme toggle (shows its state, for example "Mørk modus: av"). |
| **Skip link** † | First element in the page. Visually hidden until focused, then shown top-left over the top bar: `surface-card`, `line-strong` border, `accent-strong` text, focus ring. |
| **Theme toggle** | Icon button, sun (light) / moon (dark) glyph, `ink` on transparent, same footprint as a ghost button. Accessible name required. Inside 'Mer' on mobile. |
| **Tabs** (mobile) | Two equal tabs 'Studier' / 'Kilde'; inactive `ink-muted`, active `ink` semibold with 3px `accent` bottom border. |
| **Button** (primary / secondary / ghost) | Padding `{spacing.2}` × `{spacing.4}` (~0.45em × 0.9em in the mockups), `{rounded.sm}`, min 44px tall on touch. Primary: `accent` fill, `on-accent` text. Secondary: `surface` fill, `line-strong` border. Ghost: transparent, `line-strong` border. One primary per view. **Hover:** secondary/ghost take `surface-hover`; primary keeps its fill and underlines its label `[ASSUMPTION]`. **Disabled / pending:** `ink-disabled` text, `line` border, `surface` fill, no hover; pending buttons stay focusable (`aria-disabled`). |
| **Keyboard hint** | Optional trailing hint inside a button, for example "Kunne det **2**". The Space key is shown as 'Mellomrom' (`kbd.space`), for example "Snu kortet **Mellomrom**". Style: `mono`, 1px border, `{rounded.sm}`. On secondary/ghost: `ink-muted` text, `line-strong` border. **Inside a primary button: `on-accent` text and `on-accent` border.** Hidden when shortcuts are off and on touch-only devices. |
| **Focus ring** | `{spacing.focus-width}` solid `focus`, offset `{spacing.focus-offset}`, on every interactive element via `:focus-visible`. Inside scroll containers (source panel, dialogs) the offset is negative (inset) so `overflow` does not clip it. |
| **Source panel** | `surface-source`, right `line` border (desktop). `panel-label` header "Kilde · {filename}". Scrolls independently. Visually left on desktop, second in DOM. |
| **Passage** | Row: Passage ID (`mono`, `ink-muted`, min 2em) + text in `source`. **Active Passage**: no fill (keeps `surface-source`), 3px `accent` left rule, `{spacing.2}` padding bleeding into the gutter. |
| **Source reference** | Text link "Kilde: P4" in `reference`, `accent-strong`, underlined (offset 2px). Same look on Flashcard front, Quote block, Summary Point, Quiz Question and Resultat rows. |
| **Quote highlight** | `<mark>` with `highlight` fill plus **2px solid `highlight-ring` outline** (`box-decoration-break: clone`, so each wrapped line is ringed); text keeps `ink`. The ring is the perceivable boundary (4.7:1 light, 9.6:1 dark vs the panel). Visually hidden "Sitat start" / "Sitat slutt" text brackets the `<mark>` for screen readers. Forced colors: `Mark`/`MarkText` + outline. Only one highlight visible at a time. |
| **Return control** | Strip at the top of the source panel (desktop) or 'Kilde' tab (mobile), sticky while the panel scrolls: `surface`, 1px `line-strong`, `{rounded.sm}`; small text "Viser P4 fra kort 3" + underlined `accent-strong` action 'Tilbake til kortet' / 'Tilbake til spørsmålet' / 'Tilbake til resultatet'. No timer. |
| **Flashcard** | `surface-card`, 1px `line`, `{rounded.md}`, `{spacing.5}` padding; dark mode adds the card shadow. Top: concept chip. **Front:** question in `card-front` + source reference only. **Back** (after reveal): answer in `card-back` above a dashed `line` divider, then the Quote block. |
| **Quote block** | `quote-bg`, 3px `accent` left rule, text in `quote` inside « », source reference below. |
| **Quiz Question** † | **No card container:** the question sits directly in the study panel (unlike the Flashcard); concept chip above the stem. Stem in `card-front`; source reference under the stem; four **quiz options** as full-width secondary buttons (`line-strong` border, hover `surface-hover`) labeled A–D, each with keyboard hint 1–4. After answering, the chosen wrong option takes `quiz-option.wrong-bg/-fg` (the `mastery-shaky` colors) plus "✗", and the correct option takes `quiz-option.correct-bg/-fg` (`mastery-known` colors) plus "✓"; only colors are borrowed, the option keeps its button shape and type. **Answered options that were neither chosen nor correct keep full `ink` text (`quiz-option.answered-foreground`); only their border is muted to `line` (`answered-border`).** They never take the disabled style (`ink-disabled`). Then the Quote block. Color is never the only signal. |
| **Explain Simpler** † ('Forklar enklere') | Ghost button. Result renders inline below the answer: plain text in `card-back`, then its Quote block; failure renders as an error message with the Item's Quote block. |
| **Round progress** | **One line at the top of the study panel, same pattern for Flashcards and Quiz:** "Runde 2 · Kort 3 av 12" / "Runde 1 · Spørsmål 4 av 9" in `ink-muted` (the `h1` round name and the `h2` Item heading set inline, joined by "·"), then the 6px bar (`line` track, `accent` fill, `{rounded.track}`) filling the remaining width, then the mastery chip of the current concept. |
| **Resultat row** | One per Quiz Question below the score: `line` top divider, `{spacing.4}` vertical padding, blocks `{spacing.2}` apart. Heading "Spørsmål {x}" in `reference` size, `ink-muted`; question in the `source` family; answer lines in `body` `ink`: "Ditt svar:" with a leading ✓ (`mastery-known-fg`) or ✗ (`mastery-shaky-fg`), and on missed questions "Rett svar:" with ✓; then the Quote block with its source reference. The marks are `aria-hidden`; the text labels carry the meaning. |
| **Mastery chip** | Pill, `chip` type, label text 'ny' / 'usikker' / 'kan' on its mastery pair. |
| **Concept chip** | Pill, `surface` with `line` border; Key Concept name. |
| **Readiness Score** | See top bar; on Notatoversikt repeated larger (`headline`) `[ASSUMPTION]`. No score shown when there are zero eligible concepts. |
| **Summary Point** † | Bullet text in `body`, followed by its Quote block (compact) and reference. |
| **Key Concept list** † | Wrapping row of concept names, each with its mastery chip; a *not covered* concept shows "ingen verifiserte elementer" in `ink-muted` instead of a chip. |
| **Banner** † (interrupted round) | Full-width strip at top of Notatoversikt: `surface`, `line` border, 3px `accent` left rule, `{rounded.sm}`. Text + 'Fortsett' (primary) + 'Ny runde' (secondary). While it shows, 'Start runde' is hidden, so one primary per view holds. |
| **Note row** † ('Dine notater', Arkiv) | List item, compact, 1–2 lines: title in `body` `ink` (a real link, no underline until hover/focus); meta line in `ink-muted`: last practiced (`row.lastPractised`) · Readiness Score · gap note, the gap note only when its count is above 0. Right side, as siblings of the link: importance select, then 'Arkiver' ghost icon button (archive-box glyph, 44 × 44px hit area), `{spacing.2}` apart. The link's hit area is stretched over the whole row (`::after` overlay); importance select and 'Arkiver' sit above it (`position: relative; z-index`). Row hover `surface-hover`; focus ring on the link draws around the whole row. `line` divider between rows. **Arkiv variant:** title is plain text (row opens nothing); right side holds 'Gjenopprett' (secondary) and 'Slett for godt' (ghost). |
| **Importance select** † | Compact native select with options "1 – viktigst" / "2 – middels" / "3 – minst"; the closed select shows the chosen option's full label (for example "2 – middels"). Style: `surface` + `line-strong` border (3.7:1), hover `surface-hover`, 44px hit area, `chip` type. Accessible name carries the meaning (`EXPERIENCE.md` › Component Patterns › Importance select). |
| **Toast** † (archive undo) | Styled like the return control (tokens in `components.toast`): `surface`, 1px `line-strong`, `{rounded.sm}`, padding `{spacing.2}` × `{spacing.4}`, text in `body`. Positioned **bottom center** of the viewport, `{spacing.5}` above the bottom edge, one line: message, then 'Angre' (text button, `accent-strong`, underlined), `ink-muted` "·", 'Vis arkiv' (link). No shadow in light; dark adds the card shadow. Wraps on narrow screens. |
| **Drop zone** † | Dashed `ink-muted` border, `{rounded.md}`, centered text "Slipp en fil her eller velg fil" + accepted types line ".txt .md .docx .pdf · maks 10 MB" in `ink-muted`. |
| **Text area** † (paste) | `surface`, 1px `ink-muted` border, `{rounded.sm}`, `body` type, visible label. |
| **Generation progress** † | Determinate bar (`line` track, `accent` fill) + status line ("Finner nøkkelbegreper …") + Note meta ("forelesning-7.pdf · 3 120 ord · 24 avsnitt"). |
| **Dialog** † (Consent, delete confirmation) | `surface-card`, `{rounded.md}`, `{spacing.5}` padding, dark-mode shadow, centered; full-width on mobile, `max-height: 100dvh` with internal scroll. Title in `headline` as `h2`. Primary action right/last. |
| **Checkbox** † ('Ikke spør igjen') | Native checkbox, 18 × 18px, `surface` with 1px `line-strong` border, `{rounded.sm}`; checked: `accent` fill with `on-accent` check. Label to the right in `body`; label click toggles. |
| **Toggle (switch)** † (Innstillinger) | Track 36 × 20px `{rounded.full}`. Off: `surface` track, 1px `line-strong` border, `ink-muted` thumb left. On: `accent` track, `on-accent` thumb right. Visible state text 'På' / 'Av' in `ink-muted` beside it, so state is not color- or position-only. Whole settings row is the 44px hit area. |
| **Settings row** † | Full-width row: label (`body`, `ink`) and optional description (`ink-muted`, one or two lines) left; control (toggle, button or status) right; stacks vertically below 480px. `line` divider; rows grouped under `h2` section headings in `headline`. A withdraw-Consent row holds a secondary button. |
| **Error message** † | Inline block, `error-bg` / `error-fg` (own crimson role, never the 'usikker' orange), 3px `error-fg` left rule, square left / `{rounded.sm}` right. Leading warning icon (`aria-hidden`) + "Feil:" prefix (visible or visually hidden, key `err.prefix`) + message text + optional actions: 'Prøv igjen' (secondary); on Genererer also 'Tilbake til start' (ghost, `gen.back`). Text states the problem and the next step; no alarm styling (no bold red fills, no shaking). |
| **Empty state** † | `headline` sentence, which is the screen's `h1` (for example "Dine notater: ingen ennå"), + one `ink-muted` line on what to do next + the relevant actions. |

### Mockup map

| Mockup | Components shown |
|---|---|
| [key-start](mockups/key-start.html) ([PNG](mockups/key-start.png)) | Dialog (Consent, frame a), Note row and Importance select and Toast (frame b), Drop zone, Text area, Empty state (frame c), Error message (`err.scanned`, frame d) |
| [key-generating](mockups/key-generating.html) ([PNG](mockups/key-generating.png)) | Generation progress (frame a), Error message with 'Prøv igjen' + 'Tilbake til start' (frame b) |
| [key-overview](mockups/key-overview.html) ([PNG](mockups/key-overview.png)) | Top bar, Banner (interrupted round), Readiness Score, Summary Point, Quote block, Key Concept list, Mastery chip, Source panel |
| [key-flashcards](mockups/key-flashcards.html) ([PNG](mockups/key-flashcards.png)) | Round progress, Flashcard front and back, Keyboard hint ('Mellomrom'), Quote highlight, Return control |
| [key-quiz](mockups/key-quiz.html) ([PNG](mockups/key-quiz.png)) | Round progress, Quiz Question (answered wrong), Quote block, Explain Simpler, Passage, Quote highlight, Return control, Tabs + condensed top bar (360px) |
| [key-result](mockups/key-result.html) ([PNG](mockups/key-result.png)) | Resultat row, Source reference, active Passage with inset focus, Return control |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep layout, spacing and shapes identical in both modes | Let a mode change move or resize anything |
| Serif only for Note content (source, Quote, card text), in both modes | Serif in buttons or labels; sans for Note content |
| One accent per mode, for the primary action, progress and the Quote rule | Accent as decoration, or as an error color |
| Highlight only the Quote inside its Passage, with fill + 2px ring | Highlight several passages, use highlight for emphasis, or tint the Passage behind the Quote |
| Pair every mastery/correctness/error color with a text label, ✓/✗ or the "Feil:" prefix | Color-only state |
| Use `line-strong` on control boundaries and `ink-muted` on inputs and the drop zone | Rely on `line` as an interactive boundary |
| Use `on-accent` for anything inside a primary button | `ink-muted` hints on an `accent` fill |
| Tonal layering in light; a single soft shadow in dark | Hard offset shadows, thick outlines (rejected direction 4 Energi) |
| Visible focus ring on every control | Remove outlines |
