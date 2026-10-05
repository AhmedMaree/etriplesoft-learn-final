# ETripleSoft Learn

A responsive React + TypeScript implementation of the ten supplied learning-platform designs.

## Run locally

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Pages

- `/#overview` — learner dashboard, courses, learning paths, progress
- `/#courses` — searchable course catalog with categories and sorting
- `/#detail-course` — Crash Course Odoo ERP, curriculum, saved course, tabs
- `/#ai-page` — local assistant conversation and suggested prompts
- `/#assessment` — ten questions, answer saving, countdown, scoring
- `/#calendar` — month, week, agenda, event details, calendar export
- `/#certificates` — learner achievements and printable certificate
- `/#payment` — billing form, coupon, demo enrollment
- `/#settings` — profile, account, security, notifications, preferences
- `/#sign-up` — signup and demo login

The sidebar also includes Community and Messages destinations to preserve the supplied navigation. Their content is an empty state because no page reference or service was supplied.

## Demo behavior

- Navigation and forms work locally. Signup opens a demo learner profile; it does not create a server account or store passwords.
- Profile fields, selected preferences, photo, and saved assessment answers use browser local storage.
- The AI assistant returns local topic-based examples. No AI API is connected.
- Checkout does not contact Kashier or collect payment. `LEARN10` applies the demo discount. Payment fields are never stored.
- The course preview explains that lesson media has not been connected.
- Download Certificate opens the browser print dialog. Choose **Save as PDF** for a downloadable certificate.
- Sync Calendar downloads an `.ics` file for import into a calendar app.

## Validation

```sh
npm run build
npm test
```

Nine Playwright tests cover page rendering at 1448, 1024, 768, 390, and 320 pixels, course search, signup validation, saved settings, assessment completion, chat, calendar export, demo checkout, and mobile navigation. If Chromium is not installed, run `npx playwright install chromium`. An optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE` environment variable can point to an existing browser executable.

Desktop and mobile screenshots are in `.impeccable/review/`. The compact calendar and settings tabs scroll within their own containers on narrow screens.

## Design and assets

The root PNG references and brand PDF remain unchanged. Runtime assets are in `public/assets/`. Supplied logo and character artwork are reused. The learner hero and six course thumbnails were generated to more closely match the references; their provenance is stored beside the files.

The brand guide names Canva Sans and Montserrat. Canva Sans webfont files were not included; the implementation currently uses a self-hosted Inter substitute to approximate the screenshot lettering. This is a remaining difference from an exact brand-font match. The font license is included in `public/assets/FONT-LICENSE.txt`.

The application is a frontend implementation, ready for a future authentication, course-content, AI, and payment integration. It is not a production learning-management backend.
