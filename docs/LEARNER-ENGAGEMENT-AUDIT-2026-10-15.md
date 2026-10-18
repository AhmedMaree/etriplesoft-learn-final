# Learner engagement audit

Date: 15 October 2026. Scope: all current page route templates in English and Arabic, including public discovery, authentication, learner pages, checkout, outcomes, and supporting administration.

## Recommendation

Build one connected journey around practical Odoo competence:

**Choose a goal → find the right course → try a real lesson → enroll/pay → achieve a first useful task → learn, apply and check → resume → complete → claim and share a verifiable certificate → choose the next relevant skill.**

The highest-value work is connecting existing capabilities and making course promises match delivered content. Preserve the approved visual system. New games, points, leaderboards, AI and community are lower priorities than a reliable next step and useful learning material.

## Evidence and limits

This is a source-based product and journey audit of the current working tree, including existing uncommitted changes. All page route files were inspected along with the principal marketing, authentication, course, player, quiz, checkout, certificate, dashboard, settings and navigation components. Project product, route, learning, design, localization, security and open-decision documents informed the review. The local English landing endpoint returned HTTP 200.

This is not a completed browser visual/accessibility audit, authenticated end-to-end test, live payment test, production security certification, or review of every database course record and video. No conversion analytics, learner interviews or retention cohorts were provided. Expected benefits below are hypotheses to measure, not measured improvements. Backend behavior described from documentation still needs operational verification before release.

Some documentation is stale relative to code: ROUTES.md describes database-backed public catalog/detail and demo certificates, whereas current public catalog/detail use editorial JSON and certificates have real learner components. Current code takes precedence for this audit. No application code, payment settings or course records were changed.

## Highest-priority findings

### 1. Public discovery and internal learning are separate journeys — critical

The landing page and `/catalog` read local editorial course JSON. `/catalog/[slug]` renders `CourseDetail`; its primary CTA opens `externalCourseUrl` in a new tab for available courses. Six current course JSON files contain links to `etriple.odoo.com/slides/...`. Coming-soon courses lead to Contact. Internal database courses, enrollment, checkout and progress instead live under `/courses` and `/courses?course=...`.

An external legacy offering may be intentional, but the current entry flow does not consistently lead into this website's paid learning and certificate loop.

**Recommendation:** explicitly map each editorial offering to its internal course identity. Retain the rich approved sales page, but derive availability, language, price and enrollment action from the matching published offering. Use Start free / Enroll / Continue learning / View certificate according to real state. Keep an external CTA only where that is the intended product, and label the destination clearly. Do not assume matching slugs or map courses by title. Public course slugs are statically enumerated, so a new database course also needs a publication/discovery plan.

Evidence: `src/app/[locale]/(site)/page.tsx`, `(site)/catalog/page.tsx`, `(site)/catalog/[slug]/page.tsx`; `src/features/marketing/server/course-repository.ts`; `src/features/marketing/components/course/course-detail.tsx`; `src/features/courses/components/course-links.ts`.

### 2. Demo promises compete with real learning — high

Learner navigation exposes AI, community, messages and calendar. The dashboard promotes AI as new; the course detail offers an assistant. AI returns local demo answers, community/messages are placeholder panels, calendar uses demo events, the header shows an unconditional notification dot, and mobile store buttons report an unavailable app. PRODUCT.md explicitly excludes those features from launch unless hidden or labelled.

**Recommendation:** remove these promotions from the primary launch journey or clearly mark demonstration availability. Replace the notification dot with real unread state only when supported. Give that attention to Continue learning, course resources and genuine support. Retain useful preferences only with clear delivery status; saved notification settings are not a notification service.

Evidence: `src/components/layout/learner-sidebar.tsx`, `learner-header.tsx`; `src/features/dashboard/components/dashboard.tsx`; `src/features/courses/components/learner-course-detail.tsx`; `src/features/ai-assistant/components/ai-page.tsx`; community/messages route files; calendar component; PRODUCT.md.

### 3. Signup can interrupt purchase intent — high

Login/signup routes and actions support a safe `next` destination. However, the shared auth form's links between Login and Sign up omit `next`. A learner arriving from checkout can lose the selected course when creating an account. Confirmation resend also uses Overview as its callback destination. Signup asks for learner classification and, for students, required university/faculty before learning begins.

**Recommendation:** preserve the validated selected course and return destination across form switches, confirmation and resends. Initially request only information necessary for account creation and certificate identity. Move nonessential education/work profiling to optional onboarding. Review any change against existing onboarding requirements. Explain email verification and provide a visible route back to the selected course. Company invitation UI must not imply working company enrollment.

Evidence: `src/features/auth/components/auth-page.tsx`, `src/features/auth/actions.ts`, login/signup routes.

### 4. Payment confirmation does not clearly hand over to learning — high

Checkout has server-supplied prices, status messaging and a status-check action. The progress indicator always marks Cart as current. A paid order disables payment but does not render a course-specific Start learning button. Display formatting rounds monetary values to whole EGP; fractional prices need an explicit correctness check. Only test-mode provider URLs are supported.

**Recommendation:** distinct pending, confirmed, failed/cancelled and refunded presentations; show the actual current step. After server-confirmed payment and entitlement, show Start your first lesson, the purchased course and receipt/support details. Explain delayed confirmation without encouraging a duplicate charge. Preserve the order destination after expired authentication; the current unauthenticated payment redirect preserves `course` but not `order`. Display exact payable amounts. Link refund/access terms beside the purchase action and show only supported payment methods.

Keep signature verification, reconciliation, idempotency and server-authoritative enrollment. Never unlock a course from a browser success redirect. Production checkout is a separate release gate, and earlier project decisions defer payment setup until learning is finished.

Evidence: payment route; `src/features/checkout/components/checkout.tsx`; `docs/SECURITY.md`; checkout documentation. No real payment was attempted.

### 5. Completion and certificate discovery require extra initiative — high

Video progress and quizzes can complete individual requirements, but course completion is exposed through Check course completion. Its incomplete response is generic. Certificate issuance happens separately on the certificate list; the completion control does not link directly to that step. The certificate page already supports EN/AR presentation, browser print/save PDF and copying the public verification URL.

**Recommendation:** after qualifying learning events, ask the server to evaluate completion and show the result. For incomplete courses, list exact outstanding required lessons/assessments and link to them. For eligible learners, present Course complete → Claim certificate → View/share. Preserve manual acknowledgement for articles/PDFs and the distinction between required and optional material. Add a gentle completion celebration, then an optional next course. Confirm the learner's certificate name without allowing the browser to decide eligibility. Do not imply direct PDF generation already exists.

Evidence: `src/features/learning/components/completion-controls.tsx`; `src/features/certificates/components/learner-certificates.tsx`, `certificate-print-actions.tsx`; learning features guide.

## Page-by-page recommendations

All paths below are locale-relative: review both `/en` and `/ar`. Parameterized routes represent every instance of that page template; individual course content readiness requires a separate inventory.

### Public pages

- **Landing `/`:** strong existing breadth: courses, paths, modules, learning framework and FAQ. Make the main promise specific to a learner outcome and offer a low-friction real sample lesson. Use one primary course-discovery action and one role-selection alternative. Keep the decorative player visibly illustrative; do not mistake it for a working preview. Use real instructor work and learner results as evidence only when approved and verifiable.
- **Catalog `/catalog`:** role filtering and beginner guidance are useful. Add trustworthy course language, availability, price, prerequisites and the concrete result learners can achieve. Keep unavailable/coming-soon offerings distinct from immediately learnable courses. Preserve search/filter state on return; current search and sort are component state, while role is in the URL. Do not present the public and learner catalogs as contradictory inventories.
- **Public course detail `/catalog/[slug]`:** preserve outcomes, audience, requirements, projects, instructor, curriculum, FAQ and certificate explanation. This is a stronger sales structure than the internal overview. Connect its CTA to the real offering; show exact price/access conditions, supported Odoo version/edition, course language and a genuine sample. State certificate issuer and requirements without implying official Odoo certification unless independently authorized.
- **Learning paths `/learning-paths`:** good role-based sequencing and course links. Add one clear Start with this course action for each role, prerequisite guidance and a realistic study commitment. Current paths are editorial guidance, not evidence of tracked path enrollment or enforced prerequisites. Save path selection only if separately approved; do not invent path certificates.
- **Odoo modules `/odoo-modules`:** connect business problems to courses: for example, improve lead follow-up → CRM workflow → suitable course → relevant lesson. Always provide a next learning action, including an honest alternative where no course exists. Avoid leaving people exploring the ecosystem indefinitely.
- **About `/about`:** use the existing team/story structure to explain why these instructors can teach practical Odoo work. Add reviewed examples of implementation or teaching results and link each instructor to relevant courses. Validate partner/credential claims before publication.
- **Help `/help`:** existing FAQ and Contact handoff are a foundation. Prioritize account confirmation, payments awaiting verification, locked lessons, saved progress, quiz attempts and missing certificates. Give each answer an actionable destination. Add search only when article volume warrants it.
- **Contact `/contact`:** existing email/phone channels and response-time copy are useful. Offer topic-specific contact links for course advice, learning problems and payment support. Carry a non-sensitive course/order reference where appropriate; never put tokens or unnecessary learner data in a contact URL. Promise only response times operations can meet.
- **Refund policy `/refund-policy`:** surface an approved plain-language summary before purchase, with the full policy linked. Ensure the exchange/refund promise matches support and payment operations. Current workflow is email-based, not automated refund self-service.
- **Privacy `/privacy`:** reconcile wording with accounts, learning records, analytics, video and payment processing. Project docs say this copy predates accounts. Obtain qualified policy review; this audit is not a legal opinion.
- **Terms `/terms`:** clearly explain access, content use, assessment/certificate terms and support boundaries. Reconcile the approved wording with real operations before accepting live payments.
- **Public verification `/verify/[token]`:** preserve the narrow public valid/revoked result, learner/course identity, number and issue date. Explain who issued the certificate. Make invalid/revoked states understandable and accessible. Keep unnecessary account details private. A secondary relevant course link can follow the verification facts without obscuring them.

### Authentication pages

- **Signup `/sign-up`:** preserve the selected course; reduce unnecessary form friction through progressive profiling. Explain the immediate benefit: save progress and earn the course certificate. Retain clear validation and confirmation/resend behavior.
- **Login `/login`:** retain return-to-course behavior and ensure switching to signup retains it. Show a concise course context for checkout arrivals. Avoid generic dashboard detours.
- **Forgot password `/forgot-password`:** provide a clear sent/retry state, realistic next steps and a safe way to return to login. Preserve original learning intent through recovery where feasible without compromising safe redirect handling.
- **Reset password `/reset-password`:** distinguish expired recovery from a successful update. After recovery/login, return to the intended course/order when safely retained. Do not force learners to rediscover the product.

### Learner pages

- **Dashboard `/overview`:** real counts and continue links already exist. Give returning learners a prominent primary Resume lesson action using actual saved state; the current main hero promotes browsing and available courses precede Your courses. For first-time users show a recommended starting point; for active learners show the next lesson/task; for completers show certificate/next skill. Use accurate lesson counts and recent achievements, not invented streaks.
- **Course library `/courses`:** make My learning prominent for enrolled learners; use the existing `view=mine` behavior. Show completed/in-progress state and a direct resume action. Empty states should lead to an appropriate first course. Distinguish unavailable translation from missing enrollment.
- **Internal detail `/courses?course=[slug]`:** preserve real price, enrollment, curriculum and progress. Improve the state-specific primary action: Start / Resume / Finish remaining requirement / View certificate. Explain required vs optional material and readiness. Resume currently selects the most recently updated progress lesson or first outline lesson; prefer an unfinished saved lesson, then the next required available item. Never auto-jump past unfinished requirements just because a later preview was opened.
- **Lesson `/courses/[slug]/lessons/[lessonId]`:** preserve signed playback, saved position, speed controls, resources, next/previous navigation and completion feedback. Add an outcome before the lesson and a small real Odoo task afterward. Show course completion separately from lesson position: the sidebar progress bar represents completed required lessons while its text uses the current lesson index. Do not imply that opening lesson 10 means finishing 10 lessons. Give pending media a useful alternative/support action and disclose course readiness before purchase.
- **Video-to-practice transition:** the player already offers the next practice check and respects autoplay preferences; preserve it. Make practice feel like testing the skill just learned, with a clear optional/required label. Let learners choose a sensible stopping point after a task. Extra autoplay and watch time alone are not evidence of learning.
- **Assessment directory `/assessment`:** add course grouping, meaningful status and clear links back to associated learning material. An empty directory should offer eligible courses or explain that a selected course has no available assessment, rather than leaving a dead end.
- **Assessment lesson UI:** autosave, server-timed attempts and post-submit explanations are strengths. Before starting, explain pass mark, time, attempts and completion relevance. After a missed answer, link to the relevant lesson/section and suggest a practice task. Distinguish optional low-stakes practice from a required final assessment. The documented ten two-question English checks are useful starts, not a comprehensive mastery exam. Arabic checks need reviewed content.
- **Certificates `/certificates`:** show earned certificates plus a clear route to the nearest achievable certificate and its remaining requirements. Keep issuance separate from eligibility authority. Include a direct view/share action once issued and a useful first-course action in the empty state.
- **Certificate `/certificates/[certificateId]`:** preserve bilingual presentation, print and verification sharing. Offer clear instructions for adding the credential to a professional profile and describe what the certificate proves. Avoid describing completion as independently assessed mastery where the course does not substantiate that claim.
- **Payment `/payment?course=...` or `?order=...`:** treat as a focused purchase and confirmation flow. Resolve the status/next-step issues above. A new one-course checkout should not imply a fully editable multi-course cart if that product capability is absent.
- **Settings `/settings`:** preserve genuine profile, language, timezone and autoplay preferences. Separate working actions from deferred Account/Security/AI preferences. Reminders should be opt-in, explain actual delivery, and have easy pause/unsubscribe controls once a delivery system exists.
- **AI `/ai-page`:** do not promote as a working learning assistant at launch while it returns local demo responses. A future assistant should be course-scoped, cite lesson sources and provide hints before solutions; it needs a separately approved product/security/evaluation scope.
- **Community `/community`:** currently a placeholder directing learners to courses. Hide or clearly label until a real moderated support/community experience exists. A future small instructor-supported question flow would be more useful than launching an empty general feed.
- **Messages `/messages`:** currently an empty placeholder, not a learner communication system. Remove the unconditional unread implication. Real course-specific support requires defined owners, response expectations and delivery.
- **Calendar `/calendar`:** demo events must not appear to be actual obligations. Keep out of the core journey until events are real. A future study plan can be optional; avoid artificial deadlines for self-paced content.
- **Legacy detail `/detail-course`:** redirects to the internal course when a slug is present and to the library otherwise. Preserve that compatibility; ensure no notification or campaign link uses the identifier-free URL to promise resuming a specific course.
- **Video management `/video-management`:** an operational screen, not a learner destination. Its engagement value is reliable media/captions. Keep management restricted and make processing/publishing status clear to authorized operators.

### Administration pages that affect learner engagement

- **Roles `/admin`:** maintain least-privilege operations so instructors/support can deliver the promised experience safely. No learner-facing gamification needed.
- **Audit `/admin/audit`:** use privileged-action history to investigate access and certificate issues; preserve privacy and administrator-only visibility.
- **Courses `/admin/courses`:** add a publication readiness checklist as a focused future improvement: curriculum, playable content, language, price, preview, outcomes and certificate requirements. Prevent marketing an incomplete offering as ready.
- **Editor `/admin/courses/[courseId]`:** make pending media/resources, required content and per-locale publication readiness obvious. Preview the real learner experience. Author clear outcomes, tasks and feedback before adding engagement decoration.
- **Assessments `/admin/assessments`:** require reviewed question wording, explanations, sensible rules and translation readiness. Keep optional practice distinct from required evidence for certification.
- **Enrollments `/admin/enrollments`:** use audited access grants to resolve genuine access problems. Provide actionable support context without treating manual grants as a substitute for payment reconciliation.

## The learning loop to build

For a practical CRM lesson, use this sequence:

1. **Goal:** “Create and qualify a sales opportunity in Odoo.” State the supported version, needed environment and expected task.
2. **Learn:** a focused video/reading with reliable captions, saved position and relevant resource.
3. **Apply:** create the opportunity in a safe practice environment using an explicit checklist and sample data. Provide a worked example, then a similar task to attempt independently.
4. **Retrieve:** answer a small number of relevant questions from memory and receive explanatory feedback after submission.
5. **Reflect:** compare the task result with the expected behavior and identify what to revisit.
6. **Progress:** save authoritative completion and show the next useful task or a natural stopping point.
7. **Return:** on the next visit, resume the exact useful place and offer a short recap/review of earlier concepts. Optional reminders require a real delivery system and consent.

Use progressively harder tasks across a course: follow an example → solve a similar case → troubleshoot → complete an integrated scenario. A portfolio-worthy task can improve the meaning of the course, but automated practical grading or manual project review would be a separate feature requiring content and operational scope. Do not claim the current system verifies practical mastery.

This recommendation combines the platform's practical Odoo purpose with evidence for active retrieval and spaced study. The IES practice guide supports distributing learning over time and using quizzes to reinforce retrieval; it does not establish a specific conversion or retention lift for this website: https://ies.ed.gov/ncee/wwc/PracticeGuide/1.

## Bilingual engagement

- Keep interface language distinct from course/media language. The public course component deliberately renders substantial English source content even inside Arabic UI; do not market that as a fully Arabic course.
- Tell learners the language of video, captions, resources and assessments before enrollment. Explicitly offer the other published locale when current content is unavailable; no silent fallback.
- Preserve learner course/order/lesson intent when changing language. Confirm that the other locale has published learning content before presenting it as a seamless continuation.
- Publish reviewed Arabic practice checks, resources and support guidance according to the course's actual promise. Matching translation keys alone do not establish a bilingual learning experience.
- Verify both locales at 320, 375, 430, 768, 1024, 1280, 1440 and 1920px before shipping UI changes, including mixed Arabic/Odoo/code content, keyboard access and caption usability. This audit did not perform those checks.

## Recommended implementation order

**First: repair trust and continuity.** Map public offerings to the internal product; align price/language/readiness promises; resolve demo promotions; preserve selected-course intent through auth; prepare truthful purchase/confirmation states. Keep live payment activation behind its existing release gates.

**Second: finish one excellent pilot course.** Confirm every required lesson is ready, add a real preview, write practical tasks and useful practice explanations, improve resume/remaining-requirement guidance, and connect completion directly to certificate issuance. Prove the entire journey before scaling the catalog.

**Third: improve repeat learning.** Prioritize resume on the dashboard, introduce optional study goals and spaced review content, and only then consider opt-in reminders. Reminder delivery, AI, community, gamification, project grading and tracked learning paths remain separate decisions, not prerequisites for the core launch.

**Fourth: scale what works.** Extend the successful course pattern to the rest of the approved launch catalog and Arabic content. Use measured learner difficulties and support requests to choose the next feature.

## Measurement and experiments

Choose **weekly learners who complete a meaningful learning unit** as the primary engagement measure, paired with course completion and learning-quality checks. Define a unit explicitly (for example, a lesson plus its associated practice/task acknowledgement); do not call a self-acknowledged task proof of mastery. Watch time is diagnostic, not the main goal.

Proposed funnel events: course viewed → preview started/completed → signup started/verified → enrollment created or checkout started → payment confirmed → first lesson started → first lesson completed → practice submitted/passed → return learning session → course completed → certificate issued/viewed/shared.

Use authoritative server events for payments, enrollments, assessment outcomes, completions and issuance. Browser events describe browsing intent only. Add event deduplication, no answer text or personal data in analytics payloads, approved consent/retention rules, and course/UI-language dimensions. This is an instrumentation proposal, not an approved analytics integration.

Report conversion with explicit denominators: first-lesson completion per enrolled cohort, confirmed paid orders per eligible checkout-start cohort, and certificate issuance per eligible completion. Compare day-7 meaningful return among activated learners with a full seven-day observation window. Segment by course, device, acquisition channel, interface language and actual course language; separate free from paid and exclude admins/test accounts. Establish a baseline before setting numeric targets.

Test one change at a time where traffic allows: state-aware internal CTA vs current handoff; reduced initial signup vs current profiling; prominent resume vs generic dashboard hero; completion guidance vs manual discovery. Measure downstream completion as well as clicks, and monitor refunds, payment failures, support load and learner frustration. Low traffic may call for moderated usability sessions rather than underpowered A/B claims.

## Release acceptance for the improved journey

Follow a new learner and a returning learner through discovery, course selection, signup/confirmation, free enrollment or sandbox payment, first lesson, saved resume, practice, remaining requirements, completion, certificate and public verification. Repeat in EN/AR and on mobile/desktop. Include payment pending/cancelled/duplicate callback, expired login, unavailable locale/content, failed progress save, exhausted quiz attempts and revoked certificate. Never bypass server completion/payment authority to improve apparent conversion.

Keep launch content, final certificate presentation, policy wording, provider production configuration and operational support approvals visible as separate gates. The best engagement strategy is a trustworthy promise followed by repeated, visible learning success.
