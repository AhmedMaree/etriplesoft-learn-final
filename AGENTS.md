# ETripleSoft Learn — Repository Instructions

## Project

ETripleSoft Learn is a production learning-management platform focused primarily on Odoo education.

The current project began as an approved React frontend demo and has been migrated to Next.js. The real LMS backend is a later phase.

The approved frontend design must be preserved.

## Primary stack

Target architecture:

- Next.js App Router
- React
- TypeScript
- Server Components by default
- Client Components only where necessary
- Supabase PostgreSQL and Auth in later phases
- Mux for protected course video in later phases
- Kashier for payments in later phases
- OpenAI for the AI learning assistant in later phases
- Vercel deployment

Do not introduce additional major frameworks without a clear technical reason.

## Before changing code

Always inspect the relevant code before making claims or edits.

Before substantial work:

1. Read this file.
2. Read the relevant documents in `docs/`.
3. Inspect the files related to the task.
4. Inspect existing patterns before creating new patterns.
5. Check the current git diff/status.
6. Understand existing behavior before modifying it.

Never speculate about code that has not been inspected.

## Skills and Skill Invocation

Project Codex skills live under `.agents/skills/<skill-name>/SKILL.md`. Skills are task-specific procedures; they supplement this policy and do not define or expand the task.

Before substantial work:

1. Read `AGENTS.md`.
2. Inspect the relevant repository files and understand the requested task.
3. Determine which project skills directly apply.
4. Read the relevant `SKILL.md` files before implementation.
5. Use only skills that directly apply; do not invoke unrelated skills merely because they are available.

Instruction priority is: explicit user instructions, this `AGENTS.md`, relevant project documentation (including `docs/`), then skill guidance. The approved design and reference implementation are authoritative for existing UI. A skill must never expand task scope on its own.

### Project skills

| Skill | Location | Use | Mandatory when |
| --- | --- | --- | --- |
| `nextjs-architecture` | `.agents/skills/nextjs-architecture/SKILL.md` | App Router architecture, layouts, routing, route groups, Server Components, Client Component boundaries, data-loading architecture, and major Next.js refactors. | Before structural Next.js changes. |
| `visual-parity` | `.agents/skills/visual-parity/SKILL.md` | Preserve the approved interface and compare implementation with the approved reference. | Whenever modifying an existing approved interface, including frontend refactors, component extraction, UI architecture changes, responsive fixes, and existing-page implementation. It is not permission to redesign. |
| `responsive-qa` | `.agents/skills/responsive-qa/SKILL.md` | Verify changed interfaces for responsive defects. | During verification after frontend or layout changes; check 320, 375, 430, 768, 1024, 1280, 1440, and 1920px. Use mainly for verification, not unrelated backend work. |
| `code-quality` | `.agents/skills/code-quality/SKILL.md` | Review refactors, architecture cleanup, duplication/dead code, Server/Client boundaries, and maintainability. | During final maintainability review for refactors and architecture changes. It does not justify unrelated refactoring. |
| `security-review` | `.agents/skills/security-review/SKILL.md` | Review trust boundaries, authorization, secrets, and security-sensitive behavior. | For authentication, authorization, Supabase, RLS, user data, payments/Kashier, webhooks, assessments, certificates, protected video/Mux, AI APIs/OpenAI, uploads, secrets, or admin permissions. Security-sensitive logic must never rely solely on browser-side checks. |
| `i18n-rtl` | `.agents/skills/i18n-rtl/SKILL.md` | English/Arabic localization, locale routing, translated UI, and RTL/LTR behavior. | Whenever frontend work involves visible text, layouts, navigation, routing, forms, metadata, Arabic typography, direction, or locale behavior; mandatory for major frontend restructuring, new reusable UI with text/direction, locale routing changes, Arabic implementation, and RTL bug fixes. |
| `lms-database-architecture` | `.agents/skills/lms-database-architecture/SKILL.md` | Model and review LMS PostgreSQL/Supabase schema, relationships, localization, migrations, and transaction boundaries. | For database architecture, schema design/review, or migration planning. Architecture-only requests do not authorize schema implementation. |
| `supabase-security` | `.agents/skills/supabase-security/SKILL.md` | Design and review Supabase RLS, roles, storage policies, RPCs, and privileged data workflows. | For any Supabase schema, authentication, authorization, RLS, storage, or privileged workflow; use with `security-review`. |

### Optional and external skills

Skills such as Impeccable, `frontend-design`, accessibility review, and Playwright QA may be available outside `.agents/skills/`. Use them only when they directly fit the task. They must follow this file, `docs/DESIGN-SYSTEM.md`, the approved UI, and the explicit task scope.

#### Impeccable

Use primarily for a final frontend quality review: spacing consistency, hierarchy, accessibility, responsive quality, interaction polish, visual regressions, and inconsistent component usage. On existing approved screens it must not redesign pages, change brand identity or typography arbitrarily, reorganize major content, replace approved assets, introduce a new aesthetic, or change approved layout without explicit request. It may fix obvious alignment or spacing issues, accessibility and interaction-state problems, responsive defects, and regressions caused by implementation work. Substantial redesign requires explicit user approval.

#### frontend-design

Use mainly for a new interface with no approved design, such as a new admin page, dashboard, flow, empty/error/success state, or explicitly requested redesign. Do not use it to redesign an approved ETripleSoft Learn page unless redesign is explicitly requested. New UI must follow `docs/DESIGN-SYSTEM.md`, existing tokens, typography, colors, spacing, component patterns, and brand identity.

### Skill selection by task

#### Existing frontend work

1. `i18n-rtl` when the work involves user-visible content or direction
2. `visual-parity`
3. Relevant architecture skill
4. `responsive-qa` during verification
5. `code-quality` during final review

Use Impeccable only as a useful final quality check. Do not use `frontend-design` unless redesign is explicitly requested.

#### New frontend interface

1. `frontend-design` when available
2. Design-system rules
3. `responsive-qa`
4. Accessibility review
5. `code-quality`
6. Impeccable for final polish when useful

#### Next.js restructuring

1. `nextjs-architecture`
2. `i18n-rtl`
3. `visual-parity`
4. `code-quality`
5. `responsive-qa` during verification

Do not use `frontend-design` unless redesign is explicitly requested.

#### Refactoring

Use `code-quality`; also use `visual-parity` if UI is involved, `security-review` if security-sensitive code is involved, and `nextjs-architecture` if App Router or Server/Client structure is involved. Keep the refactor within the requested scope.

#### Supabase, authentication, or RLS

Use `supabase-security`, `security-review`, `code-quality`, and relevant tests. Security review is mandatory. Keep RLS and server authorization authoritative.

#### Database schema or migrations

Use `lms-database-architecture` and, when Supabase access control or user data is involved, `supabase-security` plus `security-review`. Review normalization, foreign keys, indexes, unique constraints, deletion behavior, ownership, RLS impact, and auditability. Architecture planning does not authorize migrations or live schema changes.

#### Payments or Kashier

Use a payment integration skill when available, `security-review`, and integration tests. Review webhook signature verification, idempotency, server-side payment authority, secret handling, replay protection, and duplicate-enrollment prevention.

#### Assessments or quizzes

Use an assessment skill when available, `security-review`, and tests. Ensure scoring is server-side, correct answers are withheld until appropriate submission, timers use server timestamps, attempts cannot be forged in browser state, and retry rules are enforced server-side.

#### Certificates

Use a certificate skill when available, `security-review`, and tests. Ensure eligibility is server-authoritative, identifiers are unique, certificates are verifiable, and client state alone cannot issue them.

#### AI, OpenAI, or RAG

Use an AI integration skill when available, `security-review`, and the evaluation/testing procedure. Review API key protection, rate limiting, prompt-injection exposure, tool permissions, retrieval scope, user authorization, course entitlement, and data-access boundaries.

#### Video or Mux

Use a video integration skill when available, `security-review`, and playback tests. Verify enrollment and authorization before issuing protected playback access.

#### Final frontend verification

Use `responsive-qa`, `code-quality`, Playwright QA when available, and Impeccable when useful.

### Recommended execution order

For meaningful tasks:

Inspect → choose relevant skills → plan → implement → run relevant QA skills → run tests/build → code-quality review → report.

Do not load every skill and start changing everything. Load and use only relevant skills.

### Skill conflict rule

If skill guidance conflicts with explicit user instructions, `AGENTS.md`, project architecture/design/security documentation, or the approved reference implementation, follow the higher-priority source in that order. A skill may not independently expand scope, redesign approved UI, change architecture outside the task, add unrelated dependencies, weaken security rules, override design tokens, or refactor unrelated code.

### Current restructuring task

For the upcoming project restructuring work, use `nextjs-architecture`, `i18n-rtl`, `visual-parity`, and `code-quality`; use `responsive-qa` during verification, Playwright QA when available, and Impeccable only as an optional final UI review. Do not use `frontend-design` for this restructuring phase because the existing application design is approved. This policy does not authorize beginning that work without a separate task request.

The restructuring target starts with locale-aware routes under `src/app/[locale]/` and the planned `next-intl` foundation. The implementation sequence is: baseline verification; next-intl/i18n foundation; locale route structure; shared learner shell; shared UI extraction; feature extraction; feature-by-feature UI translation extraction; RTL-safe component adjustments; Server/Client boundary cleanup; responsive English QA; responsive Arabic QA; parameterized Playwright route/locale verification; then build, lint, and typecheck. Keep route groups URL-neutral. Preserve compatibility for existing demo URLs as documented in `docs/ROUTES.md`.

## Preserve approved design

This project already has an approved visual design.

Do not redesign pages unless explicitly requested.

Preserve:

- typography
- colors
- gradients
- spacing
- alignment
- container widths
- responsive behavior
- cards
- shadows
- border radii
- illustrations
- icons
- page composition
- desktop layout
- mobile layout

When migrating or refactoring UI, visual parity takes priority over subjective improvements.

Read `docs/DESIGN-SYSTEM.md` before changing shared UI.

## Internationalization and RTL

ETripleSoft Learn is a bilingual product. The initial supported locales are English (`en`, LTR) and Arabic (`ar`, RTL); frontend architecture and implementation must support both. This is a core product requirement, not an optional enhancement. See [docs/I18N.md](docs/I18N.md) for the target architecture and current/future boundaries.

- Keep pages, feature logic, and reusable components shared across languages. Do not create parallel `components/en/` and `components/ar/` trees or language-specific duplicates unless a truly different experience cannot reasonably be shared.
- Use translation resources for application UI. Avoid repeated locale ternaries and extract hardcoded UI strings feature by feature during restructuring.
- Treat LMS content such as courses, lessons, questions, choices, and instructor material as future database-backed localized content, separate from UI message files. Do not design or implement that schema as part of ordinary UI localization work.
- In the target locale layout, set the document language and direction (`en`/`ltr`, `ar`/`rtl`). Do not apply RTL ad hoc to unrelated components.
- Prefer CSS logical properties when they express the intended layout. Review physical left/right positioning contextually; do not mechanically rewrite it or create a large global `[dir="rtl"]` override sheet.
- Adapt directional controls and icons for RTL when their meaning requires it. Do not automatically mirror logos, brand marks, screenshots, photos, media, or non-directional icons.
- Evaluate Arabic typography independently. The Arabic font remains TBD until visually evaluated; do not assume the current English font is suitable or apply Latin letter spacing to Arabic without validation.
- Check mixed Arabic and technical English content, form fields with LTR values, wrapping, and alignment. Both English and Arabic must receive responsive QA at all required widths.
- Use `i18n-rtl` for localization and RTL work. It is mandatory for major frontend restructuring, new reusable UI components with text/direction, locale routing changes, Arabic implementation, and RTL bug fixes.

## Scope discipline

Implement only the requested task and changes clearly required to support it.

Do not:

- add unrelated features
- perform broad refactors without a reason
- create unnecessary abstractions
- introduce speculative architecture
- rewrite working modules for style preferences
- change approved content unless requested

Prefer the smallest clean solution that fits the existing architecture.

## Next.js rules

Use App Router.

Prefer Server Components.

Add `"use client"` only when required for:

- browser APIs
- React state
- effects
- interactive event handlers
- client-only libraries

Do not mark entire route trees as client components because one child needs interaction.

Prefer:

- `next/link`
- `next/image`
- Next.js metadata APIs
- reusable layouts
- route groups
- server-side data access

Avoid unnecessary client-side fetching when data can be loaded server-side.

## TypeScript

Use strict TypeScript.

Avoid `any`.

Do not suppress errors using:

- `@ts-ignore`
- `@ts-nocheck`
- unsafe casting

unless there is a documented unavoidable reason.

Prefer domain-specific types.

## Component rules

Before creating a new component:

- search for an existing equivalent
- reuse existing design primitives
- follow existing naming and folder conventions

Do not create one-off abstraction layers that are only used once.

Keep page components focused on composition.

Move reusable domain UI into feature/component modules.

## Styling

Preserve the current styling system.

Do not migrate to a different CSS framework unless explicitly requested.

Avoid hard-coded arbitrary values when a project token already exists.

Shared spacing, typography, colors and radii should follow the design system.

## Responsive requirements

Any UI change must work at:

- 320px
- 375px
- 430px
- 768px
- 1024px
- 1280px
- 1440px
- 1920px

Check for:

- horizontal overflow
- clipped content
- incorrect stacking
- unreadable text
- distorted images
- oversized controls
- broken grids

## Accessibility

Preserve or improve:

- semantic HTML
- keyboard access
- focus states
- labels
- alt text
- heading hierarchy
- touch targets
- reduced-motion support

Do not use clickable `div` elements when semantic controls are appropriate.

## Security

Never expose secrets in browser code.

Never commit credentials.

Never put server secrets in `NEXT_PUBLIC_*`.

Never weaken authentication or authorization to make a feature work.

Later Supabase implementation must use RLS.

Never trust client-side authorization for:

- enrollments
- assessment scoring
- payments
- certificates
- admin permissions

Read `docs/SECURITY.md` before authentication/payment/backend work.

## Data and LMS rules

Future LMS business logic must treat the database/server as authoritative.

Examples:

- assessment scoring happens server-side
- payment confirmation comes from verified Kashier webhooks
- certificate eligibility is determined server-side
- course access requires verified enrollment
- assessment timers use server timestamps
- progress is persisted based on actual lesson activity

Do not implement security-sensitive logic purely in the browser.

## Git safety

Never automatically:

- `git reset --hard`
- force push
- delete branches
- discard unfamiliar changes
- amend published commits
- remove large groups of files

Do not treat destructive actions as shortcuts.

Do not commit or push unless explicitly requested.

Preserve user changes.

## Dependency rules

Before adding a dependency:

1. Check whether the project already has a solution.
2. Prefer framework/platform functionality where appropriate.
3. Explain why the dependency is needed.
4. Avoid packages for trivial utilities.

Do not upgrade unrelated packages while implementing another task.

## Testing

After meaningful changes, run the relevant available checks.

Typically:

- typecheck
- lint
- unit tests
- integration tests
- Playwright where relevant
- production build

Never delete or weaken tests just to make them pass.

Tests verify behavior; they do not define shortcuts around correct implementation.

## Build rule

A task is not complete if the code does not build because of changes introduced by the task.

Do not hide build failures using:

- ignored TypeScript errors
- disabled linting
- removed tests
- fallback mock implementations

Fix the root cause.

## Temporary files

If temporary scripts/files are created for investigation, remove them when finished unless they have lasting project value.

## Documentation

If a change alters:

- architecture
- routing
- environment variables
- business logic

- project setup

update the relevant documentation.

Do not generate excessive documentation for trivial changes.

## Definition of done

Before considering a task complete:

- requested behavior works
- existing behavior has not regressed
- TypeScript passes
- relevant tests pass
- build passes when applicable
- responsive behavior is preserved
- no new console errors
- no secrets are exposed
- changes remain within requested scope

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
