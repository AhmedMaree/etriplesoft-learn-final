# ETripleSoft Learn — Claude Code Instructions

This repository is the ETripleSoft Learn LMS.

ETripleSoft Learn is a bilingual English/Arabic product. For localization, locale routing, Arabic typography, or RTL/LTR work, read `.claude/skills/i18n-rtl/SKILL.md` and consider both locales in frontend changes.

Read `AGENTS.md` first.

Treat `AGENTS.md` as the shared repository engineering policy for both Codex and Claude Code.

Also consult relevant files under `docs/` before making architectural, design, security or routing changes.

## Claude-specific workflow

Investigate before editing.

Do not make claims about files you have not inspected. `AGENTS.md` remains the canonical shared repository policy.

For tasks touching several modules, understand the existing implementation before changing architecture.

Prefer incremental, reversible changes.

Avoid overengineering.

Do not add unrelated functionality.

Do not redesign approved frontend interfaces.

Use the existing components, tokens and patterns whenever possible.

For risky or irreversible operations, ask before proceeding.

Risky operations include:

- deleting substantial code
- dropping database objects
- resetting git history
- force pushing
- modifying shared infrastructure
- changing production services
- publishing externally

Local reversible actions such as reading files, editing project files and running tests may proceed when they are necessary for the requested task.

## Project skills

`AGENTS.md` contains the canonical skill invocation policy shared by Codex and Claude Code. Inspect relevant skills under `.claude/skills/` and use only those that directly apply. Follow approved UI and project docs; do not use `frontend-design` for approved screens unless redesign is requested. Use `security-review` for security-sensitive work.

For LMS database architecture or migration planning, read `.claude/skills/lms-database-architecture/SKILL.md`. For Supabase schema, authentication, authorization, RLS, storage, or privileged workflows, also read `.claude/skills/supabase-security/SKILL.md` and `.claude/skills/security-review/SKILL.md`.

## Verification

Before finishing implementation work:

- inspect the resulting diff
- run appropriate checks
- confirm no unrelated changes were introduced
- report any remaining failures instead of hiding them

For substantive tasks, read relevant skill instructions before implementation and respect the scope and priority rules in `AGENTS.md`.
