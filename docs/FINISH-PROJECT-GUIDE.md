# Finish the LMS while course media is pending

Updated 2026-10-14. This is the next-work sequence, not a completion report. Existing phase verification gates still apply. Preserve the approved EN/AR interface.

## Current starting point

Odoo Development has six connected Mux videos, enrollment protection, saved video position and 90% distinct watched-timeline completion. The crash course has four private PDFs. Administrative access and video management are available in DEV. See [the video guide](COURSE-VIDEO-GUIDE.md) for verification limits and operator steps.

Course editing and private browser PDF upload, assessments, completion, certificate issuance/verification and dashboard learning metrics now have DEV backend integration. The live `/assessment` entry selects entitled course assessments instead of browser demo grading. On 2026-10-14, ten optional English practice checks (20 questions) were published after their six Odoo Development and four Python Fundamentals video lessons. Review them as an enrolled learner; they are lesson checks, not comprehensive course exams, and do not affect completion. See [the learning checkpoint](LEARNING-FEATURES-GUIDE.md) for implemented behavior, content placement, tests and remaining manual/release gates. The table below describes responsibilities and acceptance, not blanket verification.

## Work in this order

| Step / feature | AI implementation and verification | Your manual input or check | Why / benefit | Ready when |
| --- | --- | --- | --- | --- |
| 1. Assessment content and acceptance (Phases 14–16) | Immutable quiz versions, private answer keys, server grading, and ten optional two-question video checks are implemented in DEV. | Review the ten checks as a learner; provide Arabic wording and review it before publishing Arabic versions. Add broader course assessments when the relevant content is approved. | Connects assessment behavior to available lessons while keeping unfinished language/content unpublished. | A real learner can attempt and review each check; approved locale content is published without changing scoring identity. |
| 2. Attempts and grading (Phase 15) | Server-created deadlines, answer autosave, resume, three-attempt limit, atomic grading and post-submission review. Test timeout, reload, duplicate submit and cross-user access. | Confirm one real example gives the expected score. | Learners can resume safely; changing browser state cannot manufacture a pass. | Approved 70% / 3 attempts / 30-minute rules are enforced by the server. |
| 3. Learner quiz experience (Phase 16) | Connect the approved assessment layout to real services; EN/AR states, timer, save feedback, results and review. Verify both languages at all eight required widths. | Try start → answer → reload → submit → review on a phone and computer. | Replaces the demo with a usable assessment flow. | Real answers persist; results match backend records; no premature certificate link. |
| 4. Course completion (Phase 17, finishing Phase 13) | Add required/optional content rules, nonvideo completion and immutable completion snapshots; combine actual lesson and quiz outcomes. | Approve which lessons/quizzes are required and how an article/document lesson becomes complete. | Gives a truthful course completion result and stable history. | Required work blocks completion; optional work does not; later content edits preserve legitimate completions. |
| 5. Certificates (Phase 18) | Issue from verified completion only; unique identity, download and public verification; preserve revocation/reissue history. | Approve certificate layout, EN/AR output, logo, issuer name and any signature. | Provides a shareable, verifiable achievement. | Ineligible learners cannot issue; the downloaded file and verification agree. |
| 6. Course authoring (Phase 27, coordinated with Step 1) | Reusable admin workflows for curriculum, resources, quizzes and publication, reusing existing upload and access controls. | Review lesson order, titles, descriptions, prices, previews and translations. | Lets you add remaining courses without repeating development. | Draft/incomplete content stays unavailable; authorized publishing and exact-locale behavior work. |
| 7. Learner dashboard (Phase 22) | Replace demo percentages/counts with enrollment, progress, quiz and completion records; show a real continue-learning link. | Check your account shows the correct courses and progress. Approve any additional learning-time metric before implementation. | Makes the learner homepage useful and trustworthy. | Values match persisted records; no invented ratings, streaks or achievements. |
| 8. Payments (Phases 19–20) | DEV order snapshots, test-mode Kashier checkout, verified webhook reconciliation, idempotent enrollment and rollback security checks are implemented. Test keys are configured locally; a public webhook is optional for local test-mode reconciliation, and no sandbox transaction has been completed. | For local testing, leave KASHIER_WEBHOOK_URL empty and keep `npm run dev` running at `http://127.0.0.1:3010`, sign in as a learner, start checkout for a published paid course, and use the official Kashier test card below. Verify server reconciliation and the test dashboard. Approve D02 refund/access policy before payment acceptance or production. | Allows paid-course sales without relying on manual grants. | A successful and a failed sandbox transaction reconcile correctly; refund policy is recorded; production gates remain separate. |
| 9. Launch acceptance | Check approved scope, security, EN/AR responsiveness, real account flows, build and deployment configuration. Finish provider recovery checks. | Approve real launch content; test email and payment flows; review final site with the client. | Prevents demo content or unfinished flows reaching the client. | Required phase gates and manual acceptance pass; missing content is clearly withheld. |

Each implementation step should end with a short report: what changed, why, tests passed, remaining limitation, and the single next manual action. AI performs work during an authorized session; this guide does not schedule background work.

### Kashier sandbox checkout smoke test

When storing Kashier secrets in `.env.local`, escape literal dollar signs as `\$`: Next.js expands `$VARIABLE` references even inside quoted values. Otherwise the server may receive a truncated secret and Kashier returns `401 Invalid token`, surfaced by the checkout API as a generic 503. Restart the local server after correcting credentials. Deployment environment dashboards take the raw credential rather than the `.env` escape syntax.

Provider checks on 2026-10-17 also rejected `merchantRedirect` URLs with explicit ports (including `:3010`); removing the port passed URL validation. A working return path therefore needs a port-free app origin, such as an HTTPS tunnel or a local port-80 reverse proxy to Next.js. Set `AUTH_SITE_URL` to that origin and use the same origin in the browser so checkout's trusted-origin checks remain valid. Do not simply remove the port unless the app is actually reachable there. Session creation includes the server-owned learner ID as the required `customer.reference`. These requirements supersede the direct `:3010` return instructions below; webhook delivery remains optional in test mode.

1. For local testing, leave `KASHIER_WEBHOOK_URL` empty. Test mode supports server-side reconciliation after returning from Kashier, without a public webhook. Keep test credentials server-only in ignored `.env.local`; never add them as `NEXT_PUBLIC_*` variables. Live mode still requires a public HTTPS webhook and app origin.
2. To test webhook delivery separately, deploy the current app to a public DEV host, set `KASHIER_WEBHOOK_URL` to its exact HTTPS `/api/webhooks/kashier` endpoint and verify the route reaches the app (a harmless empty JSON body should return an application response such as 400/401/503, not 404). Signature verification remains required.
3. Start the local app with `npm run dev` and keep it running at `http://127.0.0.1:3010`; this is the configured `AUTH_SITE_URL` return address. Keep test credentials only in ignored `.env.local` (`KASHIER_MODE=test`, `KASHIER_CHECKOUT_ENABLED=true`).
4. Sign in with a learner account that has an email address. Do not use an admin preview account for the purchase flow.
5. Open `/en/payment?course=odoo-development` (the current Hosted DEV price is EGP 499.00), review the total, and select **Continue to payment**. The server creates the pending order and redirects to Kashier’s hosted test checkout.
6. Use Kashier’s [official test card instructions](https://developers.kashier.io/docs/get-started/testing). The approved success test card is Mastercard `5123450000000008`, cardholder `John Doe`, expiry `06/25`, CVV `100`.
7. Complete any simulated 3-D Secure step. Kashier should return to the same local `/payment?order=…` page. If the page still says pending, select **Check payment status**; access is granted only after server-side provider reconciliation.
8. Confirm the transaction in the Kashier **test-mode** dashboard and confirm the learner is enrolled in the course. If testing webhooks, also check the deployed webhook logs for delivery. Retain redacted transaction evidence only.

For webhook reachability, use a real test-mode payment: Kashier currently documents that its standalone test-webhook endpoint is not available on `test-api.kashier.io`.

## Approved quiz defaults

- Pass threshold: 70%.
- Maximum attempts: 3.
- Time limit: 30 minutes, enforced using server time.
- Reveal correct answers after submission. Do not send keys before that point.
- These defaults may vary by future immutable quiz version.

Multiple-selection exact-set scoring (no partial credit) is approved. The initial authoring workflow uses uniform one-point questions; unanswered questions score zero. Expiry finalizes the last saved answers on the next server operation and rejects late edits. Final questions are content approval, separate from software testing. Clearly labeled test fixtures verify the system without pretending to be launch assessments.

## Prepare this now

For the first quiz, a spreadsheet or plain text is sufficient:

`Course | Lesson/quiz title | Language | Question type | Question | Choices | Correct choice(s) | Optional explanation`

Start with one course. Provide approved English content and Arabic content when available; an unpublished translation must not silently fall back. Videos are not needed to test the quiz software.

## Add the remaining media later

For each course: prepare lesson names/order and language → upload videos through video management → wait for ready status → review caption requirements → attach PDFs privately to the correct lessons → choose previews → publish approved content → test as an enrolled learner and an unenrolled visitor. Follow [the existing operator guide](COURSE-VIDEO-GUIDE.md).

Keep a course or individual lesson in draft until its content is complete. Quiz software, authoring tools and tests can proceed using isolated DEV fixtures. Public launch claims, required completion rules and final certificate eligibility need approved content.
