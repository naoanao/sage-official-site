# AGENTS.md
## Mission
Preserve behavior while making the system more modular, testable, and restart-friendly.

## Non-negotiables
- Do not make broad refactors without a written plan.
- Add or update characterization tests before changing behavior.
- Prefer minimal diffs over clever rewrites.
- Do not touch unrelated files.
- Stop and report if external APIs, auth, billing, or destructive actions are involved.

## Completion gate
A task is complete only when relevant tests pass, changes are summarized, and the next steps are defined.
