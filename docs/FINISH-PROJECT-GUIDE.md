# Finish the LMS while course media is pending

Updated 2026-10-14. This is the next-work sequence, not a completion report. Existing phase verification gates still apply. Preserve the approved EN/AR interface.

## Current starting point

Odoo Development has six connected Mux videos, enrollment protection, saved video position and 90% distinct watched-timeline completion. The crash course has four private PDFs. Administrative access and video management are available in DEV. See [the video guide](COURSE-VIDEO-GUIDE.md) for verification limits and operator steps.

Assessments, completion, certificate issuance/verification and dashboard learning metrics now have DEV backend integration. The live `/assessment` entry selects entitled course assessments instead of browser demo grading. See [the learning checkpoint](LEARNING-FEATURES-GUIDE.md) for implemented behavior, content placement, tests and remaining manual/release gates. The table below describes responsibilities and acceptance, not blanket verification.

## Work in this order

| Step / feature | AI implementation and verification | Your manual input or check | Why / benefit | Ready when |
| --- | --- | --- | --- | --- |
| 1. Assessment data (Phase 14) | Immutable quiz versions, localized questions/options, private answer keys, publish validation and authorization tests. | Supply approved questions, choices, correct answers and optional explanations. For multiple-selection questions, approve scoring before publication. | Makes quizzes editable without changing past attempt history or exposing answers. | Invalid quizzes cannot publish; answer keys cannot be read by learners; published versions cannot be edited. |
| 2. Attempts and grading (Phase 15) | Server-created deadlines, answer autosave, resume, three-attempt limit, atomic grading and post-submission review. Test timeout, reload, duplicate submit and cross-user access. | Confirm one real example gives the expected score. | Learners can resume safely; changing browser state cannot manufacture a pass. | Approved 70% / 3 attempts / 30-minute rules are enforced by the server. |
| 3. Learner quiz experience (Phase 16) | Connect the approved assessment layout to real services; EN/AR states, timer, save feedback, results and review. Verify both languages at all eight required widths. | Try start → answer → reload → submit → review on a phone and computer. | Replaces the demo with a usable assessment flow. | Real answers persist; results match backend records; no premature certificate link. |
| 4. Course completion (Phase 17, finishing Phase 13) | Add required/optional content rules, nonvideo completion and immutable completion snapshots; combine actual lesson and quiz outcomes. | Approve which lessons/quizzes are required and how an article/document lesson becomes complete. | Gives a truthful course completion result and stable history. | Required work blocks completion; optional work does not; later content edits preserve legitimate completions. |
| 5. Certificates (Phase 18) | Issue from verified completion only; unique identity, download and public verification; preserve revocation/reissue history. | Approve certificate layout, EN/AR output, logo, issuer name and any signature. | Provides a shareable, verifiable achievement. | Ineligible learners cannot issue; the downloaded file and verification agree. |
| 6. Course authoring (Phase 27, coordinated with Step 1) | Reusable admin workflows for curriculum, resources, quizzes and publication, reusing existing upload and access controls. | Review lesson order, titles, descriptions, prices, previews and translations. | Lets you add remaining courses without repeating development. | Draft/incomplete content stays unavailable; authorized publishing and exact-locale behavior work. |
| 7. Learner dashboard (Phase 22) | Replace demo percentages/counts with enrollment, progress, quiz and completion records; show a real continue-learning link. | Check your account shows the correct courses and progress. Approve any additional learning-time metric before implementation. | Makes the learner homepage useful and trustworthy. | Values match persisted records; no invented ratings, streaks or achievements. |
| 8. Payments (Phases 19–20) | Kashier checkout, verified webhooks, idempotent paid enrollment and reconciliation tests. | Provide sandbox configuration securely and approve refund/access policy. | Allows paid-course sales without relying on manual grants. | Sandbox payment, failure, replay and enrollment checks pass before production credentials are used. |
| 9. Launch acceptance | Check approved scope, security, EN/AR responsiveness, real account flows, build and deployment configuration. Finish provider recovery checks. | Approve real launch content; test email and payment flows; review final site with the client. | Prevents demo content or unfinished flows reaching the client. | Required phase gates and manual acceptance pass; missing content is clearly withheld. |

Each implementation step should end with a short report: what changed, why, tests passed, remaining limitation, and the single next manual action. AI performs work during an authorized session; this guide does not schedule background work.

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
