# sage-review

Read-only review skill for Sage codebase. Inspect, analyze, and propose improvements without making any changes.

## Constraints (absolute)
- **READ-ONLY**: Allowed tools: Read, Grep, Glob, Bash (non-modifying only). Never use Edit, Write, or any file-modifying tool.
- **PROPOSAL ONLY**: Output review findings and suggestions as text. Never apply changes directly.
- **NO COMMITS**: Never create branches, stage files, or commit.
- **SCOPE**: Code quality, security, performance, architecture adherence, test coverage, and AGENTS.md compliance.

## Trigger
Use this skill when asked to review code, audit quality, check compliance, or inspect the codebase without making modifications.
