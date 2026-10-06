---
name: nextjs-architecture
description: Use before structural Next.js App Router changes, major refactors, or work on routing, layouts, Server/Client boundaries, or data-loading architecture.
---

# Next.js Architecture

Use this skill to make focused changes that follow the repository's current Next.js App Router architecture. The React-to-Next.js migration is complete; this skill covers ongoing architecture and refactoring work.

## Before changing structure

- Read `AGENTS.md` and relevant architecture/routing documentation.
- Inspect the affected routes, layouts, components, data access, and current behavior.
- Read the applicable Next.js guide under `node_modules/next/dist/docs/` before writing code. This repository's installed Next.js version may have breaking or changed APIs; follow its current documentation.
- Identify whether the change affects rendered UI and apply `visual-parity` as required by `AGENTS.md`.

## Architecture rules

- Use App Router conventions and preserve public routes unless the task requests a route change.
- Keep Server Components as the default. Add a Client Component boundary only for state, effects, event handlers, browser APIs, or client-only libraries.
- Keep client boundaries narrow; pass server-rendered route content through layouts where possible.
- Use layouts and route groups for shared structure when they fit existing patterns.
- Load data on the server when appropriate; avoid unnecessary client-side fetching.
- Follow existing feature/component ownership and naming conventions. Do not add speculative abstractions or unrelated dependencies.
- Preserve approved UI and existing behavior during structural changes.

## Verification

Run relevant type, lint, test, and build checks for the change. When UI or layout is affected, use `responsive-qa` and compare against the approved design. Review the final diff for scope, route behavior, and unintended Server/Client boundary changes.
