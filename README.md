# ETripleSoft Learn

ETripleSoft Learn is a responsive learning-platform frontend focused on Odoo education. This repository preserves the approved interactive demo in the Next.js App Router. LMS services and backend integrations are planned for later phases.

English and Arabic are core product locales. Shared `/en` and `/ar` routes, locale-aware navigation, and RTL document direction are implemented. Some interface strings still need Arabic extraction; course and LMS demo fixtures intentionally remain English. See [docs/I18N.md](docs/I18N.md).

## Stack

- Next.js 16 App Router and React 19
- TypeScript with strict checking
- Existing CSS and local Learn font
- Lucide icons
- Playwright for browser coverage

## Development

Use Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open <http://127.0.0.1:3010>.

## AI development workflow

`AGENTS.md` contains the skill invocation policy. Codex project skills live in `.agents/skills/` and Claude Code skills in `.claude/skills/`; load skills only when relevant to the task.

## Build and checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Playwright starts the Next.js development server automatically. Install its browser if needed with `npx playwright install chromium`. An optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE` environment variable can point to an existing Chromium executable.

## Routes

Localized routes are prefixed with `/en` or `/ar`. Unprefixed legacy paths resolve to their English equivalents, `/overview` resolves to `/en`, and `/` redirects to `/en`. Known fragment aliases such as `/#courses` resolve to the matching English route after hydration. See [docs/ROUTES.md](docs/ROUTES.md) for the full map.

| Logical page | English | Arabic |
| --- | --- | --- |
| Overview | `/en` | `/ar` |
| All Courses | `/en/courses` | `/ar/courses` |
| AI Assistant | `/en/ai-page` | `/ar/ai-page` |
| Community | `/en/community` | `/ar/community` |
| Messages | `/en/messages` | `/ar/messages` |
| Calendar | `/en/calendar` | `/ar/calendar` |
| Certifications | `/en/certificates` | `/ar/certificates` |
| Settings | `/en/settings` | `/ar/settings` |
| Course details | `/en/detail-course` | `/ar/detail-course` |
| Assessment | `/en/assessment` | `/ar/assessment` |
| Checkout | `/en/payment` | `/ar/payment` |
| Signup / demo login | `/en/sign-up` | `/ar/sign-up` |

## Project structure

```text
src/
  app/
    [locale]/
      layout.tsx              Locale document layout, font, styles and providers
      (learner)/              URL-neutral learner shell and explicit pages
      (auth)/sign-up/         Signup demo page
  i18n/                       Locale config, routing, request and navigation helpers
  features/                   Domain UI and feature-owned demo data
    <domain>/components/       Feature screens and focused interactions
    <domain>/data/             Demo fixtures and feature types
  components/
    ui/                       Shared presentation primitives
    layout/                   Learner shell and page chrome
    shared/                   Shared client/presentation components
  lib/
    browser/                   Demo persistence, toast state, downloads
    routes.ts                  Typed demo route names
  hooks/                       Shared client navigation hook
  styles.css
  refinements.css
messages/                     English and Arabic UI messages
public/assets/                 Existing runtime artwork, icons, and font
tests/                         Playwright flows and responsive checks
scripts/                       Inspection and asset/document utilities
docs/                          Project, architecture, design, and QA guidance
```

## Rendering decisions

The locale layout, explicit route pages, metadata, page headings, overview composition, shared UI primitives, and community/messages placeholders are Server Components. The learner layout keeps a small Client Component shell for mobile navigation, menus, search, and profile display; route content is passed through as server-rendered children. Interactive feature screens use feature-scoped Client Components. Browser persistence and toast handling live in small client utilities.

The approved global CSS and runtime assets are shared across locales. Course fixtures now live with the courses feature. Demo settings and assessment answers remain localStorage-backed. The hosted identity/RLS foundation and session refresh are connected; signup, payments, AI, and LMS workflows remain unimplemented.

## Environment

Copy `.env.example` to `.env.local`, then configure the hosted Supabase DEV URL, publishable key, and project reference. `.env.local` is ignored. The URL and publishable key use Supabase's browser-safe client model. Never add a service-role key to `NEXT_PUBLIC_*`; hosted RLS validation accepts it only as a server-side process variable and uses it solely for disposable test-user setup and cleanup. Production must use a separate Supabase project and deployment environment.

Current database workflow uses local Next.js with hosted Supabase DEV. Run `supabase login`, link the DEV reference with `supabase link --project-ref YOUR_DEV_PROJECT_REF`, apply committed migrations using `npm run db:push`, and regenerate types with `npm run db:types`. Confirm the linked ref and `NEXT_PUBLIC_SUPABASE_URL` both point to DEV before any remote command. The linked CLI migration history is the schema source of truth; do not use remote reset commands.

Run `npm run db:test:hosted` to create two uniquely tagged disposable DEV users, perform authorization checks through anonymous and authenticated publishable-key clients, then delete the users. Supply `SUPABASE_SERVICE_ROLE_KEY` to the process only for that run; it is never required by the app. `npm run db:test` remains the pgTAP suite for a future local/CI database environment and has not been run in the current hosted workflow.

Local Docker Supabase remains an optional future workflow through `npm run db:start`, `npm run db:reset`, and `npm run db:test`. These commands are not part of current development verification.

## Migration notes

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for current boundaries and [docs/MIGRATION-REACT-TO-NEXT.md](docs/MIGRATION-REACT-TO-NEXT.md) for the route map and migration notes.
