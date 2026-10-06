# React to Next.js migration

## Previous architecture

The approved frontend demo was a Vite application. It rendered each screen from a single React tree and selected the screen from the URL fragment (for example `/#courses`). The migration retained the original design system, global styles, mock content, assets, and browser-only demo interactions.

## Current architecture

The application uses the Next.js App Router. `src/app` contains explicit route entry points and route-group layouts; route and layout modules are Server Components by default. Screen-specific UI and demo data live under `src/features`. Generic visual primitives live in `src/components/ui`, shell elements in `src/components/layout`, and shared application UI in `src/components/shared`.

Client Components are limited to interactive screens and small browser-dependent components. `src/lib/browser` contains local demo storage, toast state, and downloads. Those modules are temporary demo infrastructure and are not persistence, identity, or authorization services.

## Routes

The current route set is:

| Route | Purpose |
| --- | --- |
| `/` | Overview entry point |
| `/overview` | Learner overview |
| `/courses` | Course catalog; supports the `q` search query |
| `/detail-course` | Featured course detail |
| `/ai-page` | Demo AI learning assistant |
| `/community` | Community empty state |
| `/messages` | Messages empty state |
| `/calendar` | Demo calendar and local calendar-file download |
| `/certificates` | Certificate and achievement demo |
| `/settings` | Local profile and preference demo |
| `/assessment` | Demo assessment with local answers and client-side scoring |
| `/payment` | Demo checkout; it does not collect or process payment |
| `/sign-up` | Registration UI demo |

Legacy fragment URLs are redirected by `LegacyHashRedirect` to the corresponding path.

## Feature and client boundaries

- `src/app` owns route composition, metadata, and shared/route-group layouts.
- `src/features/<domain>/components` owns domain-specific screens and interactions.
- `src/features/<domain>/data` owns demo fixtures that can later be replaced by server data.
- `src/components/ui` contains generic controls; `src/components/shared` and `src/components/layout` contain reusable application elements.
- `src/hooks/use-demo-navigation.ts` adapts the current in-app navigation behavior to App Router navigation.
- `src/lib/routes.ts` is the typed source for supported demo navigation paths.
- `src/lib/browser` is client-only and must not be imported into Server Components.
- Route modules and layouts remain Server Components. Interactive descendants own state, event handlers, browser APIs, timers, and file operations.

## Preserved behavior and deferred services

The restructuring retains the approved styles and public assets, all listed routes, local demo settings and assessment-answer persistence, navigation, search, calendar download, certificate actions, and form interactions. Course and calendar fixtures remain local. AI replies, checkout, registration, and assessment scoring are demonstrations only.

No Supabase client, database schema, authentication, RLS policy, Mux playback, Kashier payment integration, or OpenAI service has been added. Implement those in later feature/domain server modules with server-authoritative access checks and verified external callbacks, following `docs/SECURITY.md` and the corresponding integration plans.

## Verification

Use `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` for code checks. `npm run inspect` captures desktop and mobile screenshots for the route set and reports page errors, horizontal overflow, and broken images. Playwright tests exercise routes and current demo interactions.

## Next phase

Review and approve this architecture before beginning backend work. The next implementation phase can define the Supabase data model, authentication, authorization, and RLS boundaries; this migration itself does not implement them.
