# Project

ETripleSoft Learn is a responsive Odoo-learning portal implemented with Next.js App Router. Supabase DEV provides authentication, profiles, learner preferences, and private avatars. Course, lesson, instructor, assessment-question, answer-option, payment, and AI fixtures remain demo content until their approved server-backed phases are implemented. Several interface surfaces still have English copy that requires translation cleanup; LMS content localization remains future work under [DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md).

## Current architecture

- Next.js App Router, React, and TypeScript.
- Locale routes under `src/app/[locale]/`, with URL-neutral learner and auth route groups.
- `next-intl` v4 supports English (LTR) and Arabic (RTL), with English as the default and always-prefixed localized routes.
- Shared UI and feature components serve both locales. UI messages live in `messages/en.json` and `messages/ar.json`.
- Runtime artwork and the bundled font live in `public/assets/`. The local Inter font was visually sampled with Arabic at 1280px; Arabic glyph-source coverage and all-width visual sign-off remain open.
- Global CSS remains in `src/styles.css` and `src/refinements.css` to preserve approved styling.
- Non-auth LMS demo state uses browser local storage; no course/enrollment/progress backend is connected.

## Development and verification

Use Node.js 22 or newer. The current development workflow is local Next.js connected to the dedicated hosted Supabase DEV project. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DEV_PROJECT_REF`, and `AUTH_SITE_URL=http://127.0.0.1:3010` in ignored `.env.local`; `.env.example` lists their names. Supabase URL and reference must identify the same DEV project. Production uses a separate project and deployment environment. The hosted DEV deployment must set `AUTH_SITE_URL=https://etriplesoft-learn-final.vercel.app` in its server environment.

### Supabase DEV Auth Dashboard

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://etriplesoft-learn-final.vercel.app`
- Enable email confirmations under Authentication → Providers → Email.
- Add only these Redirect URLs:
  - `http://127.0.0.1:3010/en/auth/callback`
  - `http://127.0.0.1:3010/ar/auth/callback`
  - `https://etriplesoft-learn-final.vercel.app/en/auth/callback`
  - `https://etriplesoft-learn-final.vercel.app/ar/auth/callback`

Do not allow wildcard Vercel preview domains. Add a specific preview callback only if that preview will be used for auth testing. DEV uses Supabase's default email sender; set branded templates and production SMTP/sender identity separately before production launch.

Hosted database commands: `supabase login`, `supabase link --project-ref YOUR_DEV_PROJECT_REF`, `npm run db:push`, and `npm run db:types`. The committed migration history is authoritative; verify the linked project before pushing, and never reset the hosted database. `npm run db:types` generates `src/types/database.ts` from the linked database. `npm run db:test:hosted` performs hosted RLS checks with anonymous and authenticated publishable-key clients; its temporary service-role key is used only by the server-side validation script to create/delete uniquely tagged test users.

The pgTAP suite remains at `supabase/tests/database/` for future local/CI use and is **NOT RUN** in the current workflow because Docker is unavailable. Optional local commands remain `npm run db:start`, `npm run db:reset`, and `npm run db:test`. Run the app with `npm run dev` at <http://127.0.0.1:3010>. Other checks are `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

The database architecture and V1 product decisions are documented in [DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md).
