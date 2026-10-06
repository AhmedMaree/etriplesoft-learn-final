# Architecture

The application uses Next.js App Router, React, and TypeScript. Locale routes live under `src/app/[locale]/`; `(learner)` and `(auth)` are URL-neutral route groups. `src/app/[locale]/layout.tsx` validates locale parameters, sets `lang`/`dir`, loads the local font and global CSS, provides next-intl context, and mounts the legacy fragment handler and demo toast viewport. English and Arabic use shared page and feature components.

## Locale routing and messages

`next-intl` v4 is configured by `next.config.ts` and `src/i18n/request.ts`. Routing policy is in `src/i18n/config.ts` and `src/i18n/routing.ts`: supported locales are `en` and `ar`, the default is `en`, every localized route is prefixed, and locale detection is disabled. `src/proxy.ts` applies next-intl routing and preserves the `/overview` compatibility redirect. Locale-aware links and router helpers are in `src/i18n/navigation.ts`; messages are in `messages/en.json` and `messages/ar.json`. See [I18N.md](I18N.md) and [ROUTES.md](ROUTES.md).

## Server and Client Components

App Router pages, route layouts, metadata functions, and the overview composition are Server Components by default. The locale layout and learner layout remain server-rendered. Focused Client Components own interactions requiring React state, browser APIs, local demo storage, event handlers, locale switching, toasts, mobile navigation, or browser downloads. Examples include the learner shell/header/sidebar, courses filtering, settings, signup, assessment, calendar, AI demo, checkout, and certificate actions. The learner shell receives route content through `children`, so client navigation does not make all route pages client components.

## Features and future backend

Feature code and demo fixtures live under `src/features/`; shared layout, UI, and components live under `src/components/`. Browser-only demo storage and toast behavior live under `src/lib/browser/`. Course, lesson, assessment-question, and event fixtures remain English demo content by design. No database, authentication provider, payment processor, video service, certificate backend, or AI provider is connected. Production enrollment, assessment scoring, payment confirmation, certificates, and AI access require separate server-authoritative designs; see [SECURITY.md](SECURITY.md).

## Styling

The approved design remains in `src/styles.css` and `src/refinements.css`. Direction-aware spacing uses CSS logical properties where appropriate, with scoped RTL placement rules for components whose direction changes. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) and the root [DESIGN.md](../DESIGN.md).
