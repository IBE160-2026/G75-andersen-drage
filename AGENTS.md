<!-- bmad:context -->
<!-- Verified 2026-11-25 against 78bcb02. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Known pitfalls

- When a file must contain `\uXXXX` escapes, never type them into a tool call; the tool layer turns them into the literal character before the command runs (broke `proxy/app/prompts/system.md`, fixed in 6251765). Build the backslash with `chr(92)` in a Python script and check the raw bytes in the written file afterwards.
- Never add `page.waitForTimeout` in `e2e/`; wait on a locator assertion, `expect.poll` or `page.waitForResponse`. The five existing fixed waits are deferred debt (epic-1 retro A4), not a pattern to copy.

<!-- /bmad:context -->
