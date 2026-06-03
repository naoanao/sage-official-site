# AGENTS.md

## Project Overview
Sage 3.0 is an AI solo-preneur platform that generates, refines, and publishes content autonomously.
The stack includes React 19 + Vite 7 + Tailwind CSS 4 on the frontend and Flask on the backend.

## Agent Roles
- Sage Agent:
  - Responsible for architecture, planning, trade-offs, and review.
  - Do not directly implement code unless explicitly asked.
- Dev Agent:
  - Responsible for implementation, refactoring, bug fixes, and tests.
  - Follow the decisions made by Sage Agent and the ADRs.
- Memory Agent:
  - Responsible for recording important decisions, risks, and learnings.
  - Keep entries short and actionable.

## Working Rules
- Read these files before making changes:
  - AGENTS.md
  - docs/adr/
  - docs/memory/
- Prefer small, incremental changes.
- Do not modify large files without a plan.
- If a change affects architecture, create or update an ADR first.
- If you discover an important lesson, record it in docs/memory/.
- If something is unclear, ask before making a large change.

## Important Areas
- Frontend: React 19 + Vite 7 + Tailwind CSS 4
- Backend: Flask on port 8080
- Core workflow: TALK -> CREATE -> REFINE -> PUBLISH
- Emergency stop file: SAGE_STOP

## Safety Rules
- Never break authentication, subscription, or publishing flows.
- Be careful with browser automation and auto-posting.
- Do not touch secrets, API keys, or environment variables unless explicitly asked.
- For large refactors, propose a plan first.

## Output Style
- Be concise.
- Explain the reason for changes.
- Mention risks when needed.
- If the task is ambiguous, ask a clarifying question before coding.
