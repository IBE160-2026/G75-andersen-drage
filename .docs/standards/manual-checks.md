# Manual checks in story specs (required for UI stories)

Source: epic-1 retro, action item 3 (finding A8). Applies from Story 2.1 onward.

**Rule.** Every story spec that adds or changes UI must carry a filled `**Manual checks:**` list under `## Verification`. A story changes UI when it touches `web/app/`, `web/components/`, `web/styles/`, or adds or changes a Microcopy key. A spec with no UI change leaves the list out.

**What the list names**, one bullet per screen or state the story adds or changes:

- Keyboard: Tab order, visible focus on every control, and Esc / focus return for dialogs, panels and menus.
- 320 px width: no horizontal scroll, nothing clipped or overlapping, touch targets usable.
- The exact screen and state to open, so the check can be repeated (for example "Notatoversikt › Kilde tab, after a reference jump").

**Gates.**

- The spec cannot leave `draft` while a UI story has no `**Manual checks:**` list. The template's "(if no CLI)" wording does not apply to UI stories: the list is required even when CLI commands exist, because axe and Playwright cannot judge NFR-6 keyboard use or the 320 px layout.
- The story is not `done` until Tor has run the checks and the session log records each as P or F, with any F fixed or logged in `issues.md`.

Example (from `spec-1-2-norwegian-app-shell.md`):

```markdown
**Manual checks:**
- Tab through `/` and `/innstillinger` at 320 px: skip link first, visible focus ring everywhere, 'Mer' menu works with keyboard.
```
