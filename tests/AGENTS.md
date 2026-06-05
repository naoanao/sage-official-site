# tests/AGENTS.md
## Goal
Protect current production behavior before refactoring.

## Rules
- Add characterization tests before modifying route logic.
- Mock all external APIs strictly.
- Keep assertions behavior-focused, not implementation-focused.
- If behavior is odd but intentional, document it and preserve it.
