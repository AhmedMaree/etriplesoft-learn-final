# Project

ETripleSoft Learn is a responsive Odoo-learning portal implemented as a Next.js App Router frontend demo. It has shared locale-prefixed English and Arabic routes and message resources. Several interface surfaces still contain English copy and require translation cleanup; LMS course, lesson, instructor, assessment-question, answer-option, and event fixtures intentionally remain English until database content localization is designed.

## Current architecture

- Next.js App Router, React, and TypeScript.
- Locale routes under `src/app/[locale]/`, with URL-neutral learner and auth route groups.
- `next-intl` v4 supports English (LTR) and Arabic (RTL), with English as the default and always-prefixed localized routes.
- Shared UI and feature components serve both locales. UI messages live in `messages/en.json` and `messages/ar.json`.
- Runtime artwork and the bundled font live in `public/assets/`. The local Inter font was visually sampled with Arabic at 1280px; Arabic glyph-source coverage and all-width visual sign-off remain open.
- Global CSS remains in `src/styles.css` and `src/refinements.css` to preserve approved styling.
- Demo state uses browser local storage; no LMS backend is connected.

## Development and verification

Use Node.js 20.9 or newer. Run `npm run dev` and open <http://127.0.0.1:3010>. Available checks are `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. The demo requires no environment variables.

Backend work requires a separate database, security, and integration design.
