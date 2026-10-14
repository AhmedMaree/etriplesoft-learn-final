# Courses, Mux video and progress

## Current DEV result — 2026-10-14

- Six Odoo Development videos were already linked to ready signed Mux assets. No duplicate video uploads were needed.
- Only the first lesson remains a preview. Five require enrollment. The requested existing administrator account received an audited development-test enrollment; the 499 EGP price is unchanged.
- Four crash-course PDFs are uploaded privately, byte/hash verified and published as English lesson resources: Course Agenda, Business Workflows, Accounting Fundamental and Supply Chain.
- Progress saves per enrollment/video in Supabase. Unique watched sections count toward the approved 90% threshold. Seeking, replay and stale sessions cannot multiply credit. Starting a second tab supersedes the previous session for that video. Course detail resumes the most recently accessed published lesson.
- Completing a video lesson does not issue course completion/certificates. Article/assessment completion and dashboard aggregation remain with their owning work.

## Your next steps

1. Run `npm run dev`. Sign in with your existing account at `http://127.0.0.1:3010/en/login`.
2. Open `/en/courses?course=odoo-development`, click Start Learning, play a video, leave and reopen it. Check resume and the saved watched percentage. Watching 90% of distinct sections completes that lesson.
3. As an administrator, open `/en/admin/enrollments` to grant another existing account access. Choose a course and approved reason. The action is audited and does not record payment or change price. Learners cannot grant themselves access.
4. Open `/en/video-management` to select an existing lesson and upload/replace its video. Status refreshes automatically until Ready. Existing ready video remains usable while a replacement processes. Current admins and assigned instructors can upload; this is not full course authoring.
5. Open the matching crash-course lessons and use Lesson resources to download the PDFs. The server authorizes the exact resource/lesson/locale before a 60-second private download redirect.
6. Review captions and actual Arabic content before accepting the phases. `/ar/...` uses the same localized interface; missing exact-locale lessons offer an explicit link to their available language, without silently substituting content.

## Video uploads and captions

Video bytes go straight to Mux in retryable 5 MiB chunks through pinned `@mux/upchunk@3.5.0`; they do not pass through Next.js. An interrupted transfer retries individual chunks. After a final failure, inspect the pending upload before retrying: its lesson reservation lasts until cancellation/timeout. Closing the browser transfer does not necessarily cancel the provider intent.

Add caption tracks in the Mux Development dashboard, review actual accuracy, select required languages and confirm reviewed tracks in video-management. Required languages block playback until reviewed tracks exist. The current six assets have no text tracks and no required caption languages configured; this is not caption/accessibility approval.

Mux must deliver signed events to an HTTPS endpoint ending in `/api/webhooks/mux`. It cannot call private loopback directly. Use the existing approved development tunnel/provider configuration or a development HTTPS endpoint. Keep the signing secret server-only. The hosted database retains provider events, but this turn did not provision a new public endpoint or re-run a fresh real upload delivery/recovery cycle. Production credentials/deployment remain separate.

## Automated evidence

- 347 local database checks pass, including owner isolation, denied direct writes, replay, seeking, multi-tab expiry, resume, the 90% boundary, completed/revoked access and audited/idempotent administrator grants.
- Seven focused browser/message tests pass: real signed playback, saved resume, real private PDF download, wrong-lesson resource denial, paid-course admin form and EN/AR layout checks with 48 captures at all eight required widths.
- Webhook signature tests pass 4/4. Build, TypeScript and lint pass.
- Five hosted transaction/rollback checks pass for owner session creation, cross-user read/checkpoint denial and anonymous playback/progress denial. Real-account learning progress was not fabricated or advanced during those checks.
- Three forward migrations are applied to local and hosted DEV: `20261014033209_learning_player_access`, `20261014033358_learning_progress`, `20261014040126_admin_course_access`. Hosted owner-context checks return six playable assets.
- Pre-change public schema/data dumps are in ignored, permission-restricted `tmp/learning-backup-20261014`. These are DEV logical backups, not production recovery certification. PDF upload receipts are in ignored `tmp/course-resource-upload-receipts.json`.

Run the browser suite with local credentials in process environment only:

```powershell
$localStatus = npx supabase status -o json | ConvertFrom-Json
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $localStatus.ANON_KEY
$env:SUPABASE_SERVICE_ROLE_KEY = $localStatus.SERVICE_ROLE_KEY
npx playwright test --config=playwright.learning-local.config.ts
```

Fixtures are local-only, archived afterward and retained as audit history; their private test file is removed. Run database checks after browser cleanup, not concurrently with fixture mutations. The audit-viewer SQL test now checks all pages instead of assuming fewer than 100 audit rows.

For future operator PDF imports, create resource records through authorized admin operations first, then run `scripts/import-development-course-resources.mjs` with an approved manifest. The script verifies DEV identity/private bucket, validates PDF bytes and compares downloaded hashes; it never overwrites an unfamiliar stored file. Keep its service key server-only.

## Limits and manual acceptance

Server-timed bounds validate browser playback reports; they cannot prove human attention. Progress/session retention, article completion, course-completion snapshots and certificates are not certified by this video flow. Fresh provider upload/cancellation/retry, actual-course EN/AR content/caption review and your visual acceptance remain phase gates. Payments remain Phases 19–20.

This Windows machine's default SWC cache permissions blocked native compiler loading. Ignored `.env.local` now uses a dedicated restricted user cache via `SWC_NATIVE_BINDING_CACHE`. No dependency was downgraded or compiler security check disabled; other machines can retain the default cache.
