# Project

ETripleSoft Learn is a responsive Odoo-learning portal implemented with Next.js App Router. Supabase DEV provides authentication, profiles, learner preferences, private avatars, and the Phase 07/08 course and curriculum schema. The hosted course tables remain empty. Phase 09 public catalog search, learner course listing, canonical detail, instructor attribution, and published outline use exact-locale Supabase projections in Local Supabase; migration `20261011150000_catalog_search_and_facets.sql` is also applied on Hosted DEV. Hosted catalog smoke checks return empty results because no courses are seeded there; fixtures and launch content are still separate. Local deterministic course and curriculum rows are clearly demo data, not approved launch content. Learning playback, assessments, payments, and AI remain demo content until their approved server-backed phases are implemented. Several interface surfaces still need translation cleanup; see [I18N.md](I18N.md) and [DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md).

## Current architecture

- Next.js App Router, React, and TypeScript.
- Locale routes under `src/app/[locale]/`, with URL-neutral learner and auth route groups.
- `next-intl` v4 supports English (LTR) and Arabic (RTL), with English as the default and always-prefixed localized routes.
- Shared UI and feature components serve both locales. UI messages live in `messages/en.json` and `messages/ar.json`.
- Runtime artwork and the bundled font live in `public/assets/`. The local Inter font was visually sampled with Arabic at 1280px; Arabic glyph-source coverage and all-width visual sign-off remain open.
- Global CSS remains in `src/styles.css` and `src/refinements.css` to preserve approved styling.
- Non-course LMS demo state still uses browser local storage. Course catalog and outline reads use Local Supabase during Phase 09 verification; learner entitlements, playback, enrollment, and progress are not connected.

## Development and verification

Use Node.js 22 or newer. The primary development workflow is local Next.js connected to the dedicated hosted Supabase DEV project. Keep `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DEV_PROJECT_REF`, and `AUTH_SITE_URL=http://127.0.0.1:3010` in ignored `.env.local`; `.env.example` lists their names. For isolated Phase 09 checks, override only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the app/test process with the local Supabase URL/key. Process environment values take precedence over `.env.local` without rewriting it; verify the URL is loopback before running. Supabase URL and reference must identify the same DEV project in the primary workflow. Production app and Supabase Auth URL configuration are a separate deployment phase.

### Supabase DEV Auth Dashboard

For local development against hosted DEV, the Supabase Dashboard → Authentication → URL Configuration is set to:

- Site URL: `http://127.0.0.1:3010`
- Enable email confirmations under Authentication → Providers → Email.
- Add only these Redirect URLs:
  - `http://127.0.0.1:3010/en/auth/callback`
  - `http://127.0.0.1:3010/ar/auth/callback`

Email confirmations are enabled. The hosted DEV settings were pushed through Supabase CLI and verified with a zero-update config diff. Do not add production or preview application origins during this local validation phase. DEV uses Supabase's default email sender; configure branded templates, production SMTP/sender identity, and production Auth URLs during the deployment phase.

Hosted database commands: `supabase login`, `supabase link --project-ref YOUR_DEV_PROJECT_REF`, `npm run db:push`, and `npm run db:types`. The committed migration history is authoritative; verify the linked project before pushing, and never reset the hosted database. `npm run db:types` generates `src/types/database.ts` from the linked database. `npm run db:test:hosted` validates identity RLS; `npm run db:test:hosted:course` runs read-only course-domain checks and creates no test data.

The pgTAP suite remains at `supabase/tests/database/` for future local/CI use and is **NOT RUN** in the current workflow because Docker is unavailable. Optional local commands remain `npm run db:start`, `npm run db:reset`, and `npm run db:test`. Run the app with `npm run dev` at <http://127.0.0.1:3010>. Other checks are `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

The database architecture and V1 product decisions are documented in [DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md).
