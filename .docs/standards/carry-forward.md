# Carry deferred items into the story they name

Source: epic-1 retro, action item 6 (finding A6). Applies from Story 2.1 onward.

**Rule.** When a story spec is written, search for open items that name that story and pull each one into the spec. A deferred item that only lives in a log or a backlog file gets lost: three checks meant for Story 1.13 were never done because spec 1.13 did not mention them.

**Where to look**, with the story number (`1.13`, `Story 5.1`), its epic (`Epic 3`) and the feature or AD it covers (`FR-4`, `AD-21`):

- `.docs/implementation-artifacts/deferred-work.md`
- `.logs/<user>/issues.md`, open items only (`- [ ]`)
- `action_items` in `.docs/implementation-artifacts/sprint-status.yaml` with `status: open`

An item names a story when it gives the story number, or gives the epic and the feature and this is the first story in that epic that touches it.

**How to carry an item.** For each item found, the spec does one of these:

- Puts it in an Acceptance Criterion or task, quoting the source (`deferred-work.md › spec-1-6`).
- Defers it again, with a stated reason and a new target story. Then update the target in the source file so the next search finds it.
- Drops it, with a stated reason.

Note the outcome in the spec under `## Carried items`, one bullet per item. A spec with no matching items writes "None found" and the searches run, so a reviewer can tell an empty list from a skipped step.

**Gates.**

- The spec cannot leave `draft` without a `## Carried items` section.
- When the story is `done`, close each carried item at its source: tick it in `issues.md`, or remove it from `deferred-work.md`, citing the story.

Example:

```markdown
## Carried items

- `deferred-work.md › spec-1-9`: keep user fields and delete the old Study Set on regenerate (AD-21). Carried: AC 4.
- `issues.md` 2026-11-24 story-1-11: regenerating from Notatoversikt resets `archived`. Covered by the same AC 4.
```
