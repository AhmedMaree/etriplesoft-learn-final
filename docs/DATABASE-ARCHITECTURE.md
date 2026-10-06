# ETripleSoft Learn — Database Architecture

**Status: NEEDS REVIEW** — This is a proposed production schema, not an implemented backend. Product decisions in §19 must be resolved before the affected behavior is enabled. No SQL, Supabase project, migration, auth flow, or provider integration is created by this document.

## 1. Design principles

- PostgreSQL is the authority for identity links, entitlements, progress, assessment results, certificates, and payment state. Browser state and provider redirects are never authoritative.
- Model business entities relationally with foreign keys, unique/check constraints, explicit ownership, and indexes that support known reads and RLS predicates. Avoid large JSONB business records and polymorphic foreign keys.
- Keep the course, lesson, path, question, and option identities independent of locale. Store application UI messages in `messages/`; this schema covers future database-backed LMS content.
- Use `public` for application tables. Keep Supabase credentials, privileged operations, and answer keys outside learner-readable paths.
- Prefer soft lifecycle states for courses and enrollments. Retain financial, assessment, and certificate history for auditability rather than deleting completed records.
- V1 means the first individual-learner production learning flow. Company enrollment is deferred.

## 2. Domain overview

The production core connects Supabase Auth users to minimal profiles, published course content, learning paths, course entitlements, lesson/video progress, assessments, certificates, and one-time course purchases. Course authors can attribute content to instructors. Catalog data can be read without enrollment; lesson access requires an active enrollment or another explicit server-authorized grant.

The current demo shows course title/description/category/level/price, instructors, a module-like curriculum, lessons, resources, quizzes, learning paths, learner settings, certificates, and checkout. Its ratings, review counts, calendar entries, profile values, progress totals, and payment outcomes are mock data, not confirmed production requirements. The database design does not make those demo values authoritative.

## 3. Relationship map

```text
auth.users
  ├── profiles ── learner_preferences
  └── user_roles

courses ── course_translations
  ├── course_instructors ── profiles
  ├── course_modules ── module_translations
  │     └── lessons ── lesson_translations
  │          ├── lesson_resources ── lesson_resource_translations
  │          ├── lesson_videos
  │          └── quizzes ── quiz_translations
  │               └── questions ── question_translations
  │                    └── question_options ── option_translations
  │                         └── quiz_answer_keys (protected)
  └── learning_path_courses ── learning_paths ── path_translations

profiles ── enrollments ── courses
  ├── lesson_progress ── lessons
  ├── video_progress ── lessons
  ├── quiz_attempts ── quizzes
  │     └── quiz_answers ── quiz_answer_selections
  ├── certificates ── enrollments
  └── orders ── payments ── payment_webhook_events
       └── successful payment grants an enrollment transactionally
```

Deferred organization tables attach organization memberships and course assignments to profiles/courses without changing course identity or learner progress. Calendar events, notification delivery, AI conversations, and general admin audit records are separate later domains.

## 4. Table inventory

RLS is enabled on every exposed application table. “Private” means owner-scoped or server-only; “Catalog” means only published, non-sensitive fields are anonymously readable. “Main owner” identifies the row authority, not necessarily who may write it.

| Table | Purpose | Scope | Classification | Main owner |
|---|---|---|---|---|
| `profiles` | Minimal app profile linked 1:1 to Auth | V1 | Private; limited instructor display fields may appear in catalog | Auth user |
| `learner_preferences` | Locale, timezone, and explicit learning/notification settings | V1 | Private | Auth user |
| `user_roles` | Elevated application roles such as admin and instructor | V1 | Privileged | Trusted admin process |
| `courses` | Language-independent course identity, state, level, category, price, and creator | V1 | Catalog when published; drafts privileged | Course admin |
| `course_translations` | Localized course title and descriptions | V1 | Catalog when parent is published | Course admin |
| `course_instructors` | Ordered instructor attribution for a course | V1 | Catalog when parent is published | Course admin |
| `course_modules` | Ordered course modules and required flag | V1 | Catalog when parent is published | Course admin |
| `module_translations` | Localized module title/description | V1 | Catalog when parent is published | Course admin |
| `lessons` | Ordered lesson identity, supported type, duration, required flag, and state | V1 | Enrolled learner; published outline may be catalog-visible | Course admin |
| `lesson_translations` | Localized lesson title, summary, and article body | V1 | Enrolled learner | Course admin |
| `lesson_resources` | File/external resource identity, kind, locale, and storage/link reference | V1 | Entitled learner or authorized preview | Course admin |
| `lesson_resource_translations` | Localized resource label/description | V1 | Entitled learner or authorized preview | Course admin |
| `lesson_videos` | Provider asset/playback reference and processing state, separate from lesson | V1 boundary; Mux values later | Server-only metadata; playback access is issued server-side | Course admin/provider workflow |
| `learning_paths` | Language-independent path identity and publication state | V1 | Catalog when published | Course admin |
| `path_translations` | Localized path title/description | V1 | Catalog when parent is published | Course admin |
| `learning_path_courses` | Ordered path-to-course membership | V1 | Catalog when path is published | Course admin |
| `enrollments` | Authoritative user/course entitlement and lifecycle | V1 | Private | Server grant process |
| `lesson_progress` | Learner lesson started/completed state and timestamps | V1 | Private | Auth user via constrained server operation |
| `video_progress` | Playback position, watched duration, and completion checkpoint | V1 | Private | Auth user via constrained server operation |
| `quizzes` | Language-independent assessment rules and publication state | V1 | Entitled learner may read safe fields | Course admin |
| `quiz_translations` | Localized quiz title/instructions | V1 | Entitled learner | Course admin |
| `questions` | Ordered question identity, supported choice type, and points | V1 | Entitled learner may read safe fields | Course admin |
| `question_translations` | Localized question wording | V1 | Entitled learner | Course admin |
| `question_options` | Ordered answer-option identity | V1 | Entitled learner may read safe fields | Course admin |
| `option_translations` | Localized option text | V1 | Entitled learner | Course admin |
| `quiz_answer_keys` | Correct-option mapping, withheld from learner clients | V1 | Privileged/server-only | Assessment service |
| `quiz_attempts` | Server-timed attempt state and final result | V1 | Private | Auth user via assessment service |
| `quiz_answers` | Per-attempt question answer record | V1 | Private | Auth user via assessment service |
| `quiz_answer_selections` | Selected option rows, supporting single/multiple choice | V1 | Private | Auth user via assessment service |
| `certificates` | Issuance linked to a completed enrollment, locale, and opaque verification token | V1 | Private; verify through limited public endpoint | Certificate service |
| `orders` | One-time course purchase and immutable amount/currency snapshot | V1 | Private | Auth user; state server-managed |
| `payments` | Kashier transaction references and authoritative payment state | V1 boundary; Kashier later | Private/server-managed | Payment service |
| `payment_webhook_events` | Deduplicated provider event receipt and processing outcome | V1 boundary; Kashier later | Privileged/server-only | Payment service |
| `organizations` | Company identity | Later | Private/organization-scoped | Organization admin |
| `organization_members` | User membership and company-manager relationship | Later | Private/organization-scoped | Organization admin |
| `organization_invitations` | Expiring, single-use invitations | Later | Private/organization-scoped | Organization admin |
| `organization_course_assignments` | Company course allocation/entitlement source | Later | Private/organization-scoped | Organization admin |
| `calendar_events` | Persisted live sessions, due dates, and learner calendar entries | Later | Private/entitled | Event owner/service |
| `notifications` | User notification records and read/delivery state | Later | Private | Notification service |
| `ai_conversations` | Optional persisted assistant conversation metadata | Later | Private | Auth user/AI service |
| `ai_messages` | Conversation messages and safe metadata | Later | Private | Auth user/AI service |
| `admin_audit_log` | Append-only record of privileged content/account actions | Later | Privileged | Trusted admin process |

No table is proposed for reviews/ratings, coupon rules, subscriptions, or general-purpose files until the product confirms those workflows. Course cards can display ratings only after a review/rating product and moderation policy are specified.

### Column, key, and ownership catalogue

Use UUID primary keys for independent V1/deferred entities, generated by the database. Translation/junction/progress/answer tables use composite primary keys where stated. IDs are internal identifiers, not authorization. Mutable entities and translations have `created_at`/`updated_at` `timestamptz` values in UTC; immutable event/history rows use `received_at`, `issued_at`, or equivalent instead of mutable timestamps. Amounts are integer minor units and durations/positions are integers. Foreign-key actions below describe the proposed default; archived/history-bearing rows use `RESTRICT` rather than cascade deletion.

| Table | Proposed columns and keys | Ownership, foreign keys, and delete behavior |
|---|---|---|
| `profiles` | `id uuid PK`; `display_name text`; nullable `bio text`, `avatar_object_key text`; `created_at`, `updated_at` | `id → auth.users.id`; Auth deletion cascades to the profile, but retained history FKs can block deletion until the approved anonymization/retention process is followed |
| `learner_preferences` | `user_id uuid PK`; `preferred_locale text`; `timezone text`; booleans `email_notifications`, `course_reminders`, `assignment_deadlines`, `community_updates`, `daily_learning_reminders`, `course_recommendations`, `autoplay_next`; `updated_at` | `user_id → profiles.id ON DELETE CASCADE`; one row per learner |
| `user_roles` | `id uuid PK`; `user_id uuid`; `role text`; `granted_by uuid`; `granted_at`; nullable `revoked_by uuid`, `revoked_at` | User/grantor/revoker reference profiles with delete restricted; no self-write; preserve revoked grants; only one unrevoked row per user/role |
| `courses` | `id uuid PK`; unique `slug`; `status`; nullable `level`, `category`; `price_minor bigint`; `currency char(3)`; nullable `thumbnail_object_key`; `created_by`, `updated_by`; `published_at`, `created_at`, `updated_at` | Creator/updater reference profiles with delete restricted; referenced by course history, so archive instead of delete |
| `course_translations` | Composite PK `(course_id, locale)`; `title`; nullable `short_description`, `description` | `course_id → courses.id ON DELETE CASCADE`; locale is `en` or `ar` |
| `course_instructors` | Composite PK `(course_id, instructor_id)`; `position`; `assigned_by`; `created_at` | Course FK restricts deletion; instructor/assigner reference profiles with deletion restricted; unique course position |
| `course_modules` | `id uuid PK`; `course_id`; `position`; `is_required`; `created_at`, `updated_at` | Course FK restricts deletion; unique `(course_id, position)` |
| `module_translations` | Composite PK `(module_id, locale)`; `title`; nullable `description` | `module_id → course_modules.id ON DELETE CASCADE`; locale check `en`/`ar` |
| `lessons` | `id uuid PK`; `module_id`; `position`; `lesson_type`; `status`; `is_required`, `is_preview`; nullable `duration_seconds`; `published_at`, `created_at`, `updated_at` | Module FK restricts deletion; unique `(module_id, position)`; referenced by progress/assessment/video history |
| `lesson_translations` | Composite PK `(lesson_id, locale)`; `title`; nullable `summary`, `body` | `lesson_id → lessons.id ON DELETE CASCADE`; locale check `en`/`ar` |
| `lesson_resources` | `id uuid PK`; `lesson_id`; `kind`; nullable `locale`; `position`; nullable `storage_object_key`, `external_url`; `created_by`; `created_at`, `updated_at` | Lesson FK restricts deletion; creator references profile; unique `(lesson_id, position)`; resource translation children cascade; Storage object removal is handled by a separate authorized cleanup workflow |
| `lesson_resource_translations` | Composite PK `(resource_id, locale)`; `label`; nullable `description` | `resource_id → lesson_resources.id ON DELETE CASCADE`; locale check `en`/`ar` |
| `lesson_videos` | `id uuid PK`; unique `lesson_id`; `provider`; `provider_asset_id`; nullable `playback_id`; `processing_status`; nullable `duration_seconds`; `created_at`, `updated_at` | Lesson FK restricts deletion; unique `(provider, provider_asset_id)`; provider metadata is server-only |
| `learning_paths` | `id uuid PK`; `status`; `created_by`, `updated_by`; `published_at`, `created_at`, `updated_at` | Creator/updater reference profiles; archive instead of deleting published paths |
| `path_translations` | Composite PK `(path_id, locale)`; `title`; nullable `description` | `path_id → learning_paths.id ON DELETE CASCADE`; locale check `en`/`ar` |
| `learning_path_courses` | Composite PK `(path_id, course_id)`; `position`; `created_at` | Path and course FKs restrict deletion; unique `(path_id, position)` |
| `enrollments` | `id uuid PK`; `user_id`, `course_id`; `source`, `status`; nullable `order_id`, `granted_by`; `enrolled_at`, nullable `completed_at`, `expires_at`; `created_at`, `updated_at` | User/course/order/grantor FKs restrict deletion; one active enrollment per user/course and at most one enrollment per non-null order; historical rows remain after revoke/expiry |
| `lesson_progress` | Composite PK `(user_id, lesson_id)`; `status`; nullable `progress_percent`; `started_at`, `completed_at`, `last_accessed_at`, `updated_at` | User and lesson FKs restrict deletion; written only through owner-scoped, validated operation |
| `video_progress` | Composite PK `(user_id, lesson_id)`; `position_seconds`, `watched_seconds`; nullable `duration_seconds`, `completed_at`; `updated_at` | User and lesson FKs restrict deletion; values bounded/validated server-side |
| `quizzes` | `id uuid PK`; unique `lesson_id`; `status`; `passing_score_basis_points`; nullable `time_limit_seconds`, `max_attempts`; `created_at`, `updated_at` | Lesson FK restricts deletion; one quiz per quiz lesson |
| `quiz_translations` | Composite PK `(quiz_id, locale)`; `title`; nullable `instructions` | `quiz_id → quizzes.id ON DELETE CASCADE`; locale check `en`/`ar` |
| `questions` | `id uuid PK`; `quiz_id`; `position`; `question_type`; `points numeric`; `is_required`; `created_at`, `updated_at` | Quiz FK restricts deletion; unique `(quiz_id, position)`; composite `(id, quiz_id)` key supports answer integrity |
| `question_translations` | Composite PK `(question_id, locale)`; `prompt`; nullable `explanation` | `question_id → questions.id ON DELETE CASCADE`; locale check `en`/`ar` |
| `question_options` | `id uuid PK`; `question_id`; `position`; `created_at` | Question FK restricts deletion when answer keys/selections exist; unique `(question_id, position)` and `(question_id, id)` |
| `option_translations` | Composite PK `(option_id, locale)`; `option_text` | `option_id → question_options.id ON DELETE CASCADE`; locale check `en`/`ar` |
| `quiz_answer_keys` | Composite PK `(question_id, option_id)`; `created_at` | Composite FK to an option belonging to the question; delete restricted; no learner/instructor grants |
| `quiz_attempts` | `id uuid PK`; `user_id`, `quiz_id`; `attempt_number`; `status`; `started_at`, `expires_at`; nullable `submitted_at`, `score`, `possible_score`, `passed`; `created_at`, `updated_at` | User/quiz FKs restrict deletion; unique `(user_id, quiz_id, attempt_number)` and `(id, quiz_id)`; one in-progress attempt per user/quiz |
| `quiz_answers` | Composite PK `(attempt_id, question_id)`; `quiz_id`; `answered_at` | Composite FKs require attempt and question to belong to the same quiz; delete restricted after attempt history exists |
| `quiz_answer_selections` | Composite PK `(attempt_id, question_id, option_id)`; `selected_at` | Composite FK to `quiz_answers` and composite FK `(question_id, option_id)` to options; delete restricted |
| `certificates` | `id uuid PK`; `enrollment_id`; unique `certificate_number`; unique `verification_token_hash`; `issue_locale`; `issued_at`; nullable `revoked_at`, `revoked_by` | Enrollment and revoker profile FKs restrict deletion; at most one unrevoked certificate per enrollment; store only a hash of the high-entropy verification token |
| `orders` | `id uuid PK`; `user_id`, `course_id`; `status`; `currency`; `course_title_snapshot`; `unit_price_minor`, `subtotal_minor`, `discount_minor`, `tax_minor`, `total_minor`; `created_at`, `updated_at` | User/course FKs restrict deletion; one course per order; enrollment may reference order; monetary fields are immutable after confirmation |
| `payments` | `id uuid PK`; `order_id`; `provider`; nullable `provider_reference`; `amount_minor`, `currency`; `status`; nullable `succeeded_at`, `failure_code`; `created_at`, `updated_at` | Order FK restricts deletion; unique provider/reference when reference exists; multiple attempts may belong to one order |
| `payment_webhook_events` | `id uuid PK`; `provider`; `provider_event_id`; nullable `payment_id`; `event_type`; `signature_verified_at`; `received_at`; `processing_status`; nullable `processed_at`, `safe_error_code`, `payload_digest` | Unique `(provider, provider_event_id)`; payment FK `ON DELETE SET NULL` so event evidence remains; raw payload/PII is not retained |
| `organizations` (later) | `id uuid PK`; `name`; `status`; `created_by`; `created_at`, `updated_at` | Creator profile FK restricts deletion; organization soft-deleted/deactivated |
| `organization_members` (later) | `id uuid PK`; `organization_id`, `user_id`; `membership_role`; `status`; `invited_by`; `joined_at`, nullable `left_at` | Organization/profile/inviter FKs restrict deletion; at most one active membership per organization/user |
| `organization_invitations` (later) | `id uuid PK`; `organization_id`; normalized `invited_email`; unique `token_hash`; `membership_role`; `invited_by`; `created_at`, `expires_at`; nullable `accepted_by`, `accepted_at`, `revoked_at` | Organization/inviter/acceptor FKs restrict deletion; token is single-use and expires; raw token is never stored |
| `organization_course_assignments` (later) | `id uuid PK`; `organization_id`, `course_id`; `assigned_by`; `status`; `assigned_at`; nullable `starts_at`, `ends_at` | Organization/course/assigner FKs restrict deletion; assignment rules and seat counts require product decision |
| `calendar_events` (later) | `id uuid PK`; `event_type`; nullable `course_id`, `lesson_id`; `title`; `starts_at`, `ends_at`; `timezone`; `created_by`; timestamps | Course/lesson/creator FKs restrict deletion; participant/visibility relation is intentionally undecided |
| `notifications` (later) | `id uuid PK`; `user_id`; `notification_type`; `message_key`; nullable `course_id`, `lesson_id`; `created_at`, nullable `read_at`, `delivered_at` | User FK restricts deletion until retention workflow; optional course/lesson FKs set null; channels/consent remain undecided |
| `ai_conversations` (later) | `id uuid PK`; `user_id`; nullable `course_id`; `interface_locale`, nullable `source_locale`, `response_locale`; `created_at`, `updated_at`, nullable `closed_at` | User FK restricts deletion until retention policy; course FK set null; locale dimensions remain distinct |
| `ai_messages` (later) | `id uuid PK`; `conversation_id`; `speaker`; `content text`; `created_at`; optional provider/model metadata | Conversation FK cascades only under an approved retention/deletion policy; never persist provider secrets |
| `admin_audit_log` (later) | `id uuid PK`; `actor_id`; `action`; `occurred_at`; nullable typed target FKs (`course_id`, `user_role_id`, `enrollment_id`, `certificate_id`); `request_id`; safe summary | Actor/target FKs restrict deletion; check requires exactly one supported target; append-only, no client mutation |

This is a schema proposal, not DDL. Exact SQL types, generated IDs, triggers, grants, and policy expressions are implementation details to review against the selected Supabase/PostgreSQL versions before migrations.

## 5. Core table design

### Identity, settings, and roles

- `auth.users` owns authentication identifiers, verified email, and credentials. Do not copy passwords, provider secrets, or a second authoritative email into `public`.
- `profiles.id` is the Auth user UUID, a primary key and `auth.users(id)` foreign key with `ON DELETE CASCADE`. Store only needed app fields: `display_name`, optional `bio`, optional avatar object key, and timestamps. Demo age, gender, university, faculty, and account-type values are not included without a confirmed product need.
- `learner_preferences.user_id` is a 1:1 profile FK. Store `preferred_locale` constrained to `en`/`ar`, IANA `timezone`, and explicit boolean fields for current learning/notification preferences. Do not use an opaque settings JSON blob. AI-specific preferences are deferred with AI persistence.
- `user_roles` stores elevated `admin` and `instructor` assignments, grantor, grant/revoke times, and revoking actor; learner is the default authenticated role and is not an editable profile field. Role values use a text check constraint initially. A partial unique index permits one unrevoked assignment per user/role while retaining grant history. There is no user-facing insert/update/delete policy. Instructor assignment to a course is also represented by `course_instructors`.

### Courses and localized learning content

- `courses`: UUID identity; unique stable slug; `draft`/`published`/`archived` status; category and level; `price_minor` integer plus ISO currency; optional thumbnail key; creator/updater profile IDs; `published_at`, `created_at`, and `updated_at`. Enforce nonnegative price and consistency between published state and publication timestamp. Archiving is the normal removal path.
- `course_translations`: `(course_id, locale)` primary key, locale check (`en`, `ar`), required title, optional short description/description. A course can exist before both locale rows are ready; publication completeness/fallback is a product decision.
- `course_instructors`: `(course_id, instructor_id)` primary key plus display order; unique `(course_id, position)`; FKs to course and profile; instructor role required by the trusted publishing operation. Public reads expose only necessary instructor presentation fields.
- `course_modules`: course FK, stable position, required flag, timestamps; unique `(course_id, position)`.
- `module_translations`: `(module_id, locale)` primary key and localized title/description.
- `lessons`: module FK, position, type, required flag, duration seconds, publication state/timestamps; unique `(module_id, position)`. V1 supports `video`, `article`, `quiz`, and `resource`; adding `project` or `live_session` requires a migration and a defined workflow.
- `lesson_translations`: `(lesson_id, locale)` primary key; localized title/summary and optional article body. Keep large files and video payloads out of this table.
- `lesson_resources`: lesson FK, kind (`pdf`, `download`, `external_link`, or `attachment`), optional locale, ordering, storage object key or validated external URL, creator, timestamps; unique `(lesson_id, locale, position)`. A check requires exactly one resource locator. Store uploaded content in Storage, not as a database blob.
- `lesson_resource_translations`: `(resource_id, locale)` primary key with localized label/description.
- `lesson_videos`: one row per video lesson, FK unique to lesson; provider, provider asset ID, playback ID, processing status, duration, timestamps. Keep provider identifiers in this boundary table, never put video bytes in PostgreSQL/Storage. V1 defines the boundary; Mux identifiers are populated only in the later Mux phase.
- `learning_paths`: UUID, state, creator, timestamps. `path_translations` uses `(path_id, locale)` and localized title/description. `learning_path_courses` stores path, course, position with unique `(path_id, course_id)` and `(path_id, position)`; only published courses appear in a published path.

### Enrollment and progress

- `enrollments`: user FK, course FK, source (`purchase`, `admin_grant`, or `free` in V1), status (`active`, `completed`, `expired`, `revoked`), grantor/order references as applicable, enrolled/completed/expiry timestamps. Preserve historical rows. A partial unique index permits at most one active row per `(user_id, course_id)` while retaining prior revoked/expired history. Do not implement organization/coupon sources until those workflows are approved.
- `lesson_progress`: unique `(user_id, lesson_id)`, status (`not_started` is implicit; rows begin on first activity; then `in_progress`/`completed`), optional bounded percentage, started/completed/last-access timestamps. Completion is set by server-validated activity. Prevent completion timestamps on non-completed rows.
- `video_progress`: unique `(user_id, lesson_id)`, nonnegative position/watched seconds, optional duration/completed time, updated timestamp. Accept progress only after enrollment and video authorization; browser-reported watch time is untrusted and must be bounded/validated.
- Course progress percentage is derived from required published lessons and `lesson_progress`; do not make a stored aggregate the authority. Add a view or cached aggregate only after measured dashboard/query needs justify it.

### Assessments

- `quizzes`: one-to-one lesson FK, publication state, passing percentage, optional time limit, optional maximum attempts, timestamps. Whether null means unlimited attempts and whether quiz policy is per course/user remain product decisions.
- `quiz_translations`: quiz/locale PK, title/instructions.
- `questions`: quiz FK, position, type (`single_choice`, `multiple_choice`, `true_false`), nonnegative points, required flag. Enforce unique `(quiz_id, position)`.
- `question_translations`: question/locale PK with localized prompt/explanation. Explanations are withheld until policy permits.
- `question_options`: question FK and position, unique `(question_id, position)`.
- `option_translations`: option/locale PK with localized option text.
- `quiz_answer_keys`: protected relation `(question_id, option_id)` to correct options. Composite FK ensures the option belongs to that question. Never grant learner `SELECT`; grading reads keys server-side. Validate at publish time that supported questions have valid choices/keys.
- `quiz_attempts`: user, quiz, attempt number, status, server-created `started_at`, `expires_at`, `submitted_at`, score, passed, and timestamps. Unique `(user_id, quiz_id, attempt_number)` and one in-progress attempt per user/quiz. The server computes attempt number and deadline; browser clocks never control them.
- `quiz_answers`: unique `(attempt_id, question_id)` answer record, with a `quiz_id` consistency key and composite FKs tying both attempt and question to the same quiz; `quiz_answer_selections` stores selected option IDs with composite FKs to the answer and option so a selection must belong to that question. Reject writes after submission/expiry. Do not accept client score or passed values.
- Assessment submission is a server transaction: lock/check the attempt, validate deadline and answer ownership, finalize responses, grade against protected keys, set result/submission time, and prevent replay. Use a narrowly scoped RPC or trusted server transaction when ordinary independent writes cannot enforce this atomically.

### Certificates

- `certificates`: FK to the completed enrollment, unique human certificate number, cryptographically random verification token stored only as a unique hash, issued/revoked timestamps, and issue locale. Enforce at most one unrevoked certificate per enrollment with a partial unique index; retain revoked rows if replaced. The issuance flow returns the raw token once; the public verification route hashes the presented token and uses a restricted RPC/view returning only certificate number, course display name, recipient display name if approved, issue date, and validity. Never expose raw user UUID or the full row.

Verification tokens should contain at least 128 bits of random entropy and must not encode user/course IDs. The verification endpoint should rate-limit requests and return the same generic not-found response for unknown/revoked tokens. Certificate numbers are unique display identifiers, not bearer secrets. Revoke/replace is a trusted server operation; no client can mint or alter a certificate.

### Purchases and payments

- `orders`: user/course FKs, status (`pending`, `paid`, `cancelled`, `refunded`), currency, and immutable price/subtotal/discount/tax/total snapshots in integer minor units, timestamps. V1 models one course per order, matching the current checkout; no subscription or coupon engine is inferred from the demo coupon control.
- `payments`: order FK, provider, unique provider reference where available, amount/currency, status (`pending`, `succeeded`, `failed`, `refunded`), and timestamps. Never store PAN, CVV, or provider secrets. Only verified server-side Kashier events can change payment state.
- `payment_webhook_events`: provider event ID unique, associated payment when resolved, receipt/processing state, signature verification/receipt/processed timestamps, safe error code, and optional payload digest. Do not store raw webhook payloads or unnecessary PII. Enforce idempotency by provider event ID and provider payment reference constraints.
- On verified successful payment, one transaction records the payment transition and creates/reactivates the corresponding enrollment. Repeated webhook delivery returns the existing outcome without duplicate grants. Redirects never create an entitlement.

#### Payment idempotency and audit procedure

1. Verify the webhook signature and expected provider account before recording an event. Reject invalid signatures without changing an order, payment, or enrollment.
2. Insert the verified provider event into `payment_webhook_events` with status `received`; unique `(provider, provider_event_id)` makes duplicate delivery resolve to the existing receipt. Store only event ID/type, provider payment reference, timestamps, processing status, safe error code, and optionally a digest—not the raw callback body.
3. In a transaction, lock the event and matching payment/order, re-check the event is not already processed, and verify provider reference, amount, currency, order ownership, and allowed state transition. Then update payment and order, create one enrollment, and mark the event processed in the same commit.
4. If processing fails, do not grant access. Preserve the verified receipt as retryable and record a sanitized failure code through the controlled service. Retries/reconciliation re-run the same checks; unique event/payment references and the active-enrollment constraint prevent duplicate effects.

Payment/order/event rows are append/audit-oriented; state transitions are server-only. Retain enough identifiers and timestamps to reconcile provider statements, but keep retention duration, refunds, chargebacks, and any legally required fields as open decisions.

## 6. Localization strategy

| Approach | Benefits | Costs/risks | Decision |
|---|---|---|---|
| Translation tables | Typed fields, relational integrity, independently complete locale rows, straightforward joins and locale-scoped RLS | More joins and one table per translated entity | **Recommend.** Best fit for stable LMS entities, queryable catalog content, and editorial review across `en`/`ar`. |
| JSONB localized fields | Fewer tables; convenient for genuinely variable metadata | Weaker field constraints, harder indexes/validation, inconsistent keys, awkward translation lifecycle | Do not use for core title/body/question fields. Reserve JSONB for small provider metadata only when a concrete need exists and it is not business authority. |
| Duplicated course/lesson rows per language | Simple localized reads | Duplicates identity, status, ordering, price, enrollment links, and analytics; creates drift | Reject. One language-independent entity owns business identity; translation rows own only localized presentation. |

Use `(entity_id, locale)` primary keys with a check for `en`/`ar`. Localized titles and body fields live in translations; price, status, duration, position, required state, scoring, and access rules do not. Localized content completeness, fallback, and whether course assets differ by locale remain publication/product decisions. Question and option identity and scoring remain language-independent.

## 7. User/profile/role model

`auth.users` is the authentication source for ID, verified email, and credentials. `profiles.id` references it 1:1; never store passwords or treat a copied email as authoritative. Profile updates are limited to an allowlist of presentation fields and cannot alter role, payment, enrollment, or assessment state. RLS does not filter columns, so public instructor attribution must use a curated, invoker-secured view or narrow RPC; never grant anonymous access to the full `profiles` row.

Use `user_roles` for explicit elevated role grants rather than `profiles.role`. Database membership rows are the source of truth. Do not use user-editable Auth metadata for authorization. JWT app claims can become stale until refresh and must not replace current database authorization. Avoid recursive RLS; prefer an invoker query path. Only if a role lookup cannot be expressed without recursion, use a narrowly scoped helper in a non-exposed schema, with fixed empty/safe `search_path`, explicit caller identity checks, and `EXECUTE` revoked from roles that do not need it. Learners cannot self-assign admin/instructor. Instructor course attribution is independent of the ability to administer the entire platform.

| Role approach | Assessment for this product |
|---|---|
| Editable `profiles.role` | Reject: mixes presentation/profile updates with authorization and is unsafe if exposed to profile editing. |
| Protected role/membership rows | Recommend: auditable grant/revocation history, database-checkable current membership, and room for organization-scoped membership roles later. V1 `user_roles` holds global elevated admin/instructor grants; learner is implicit. |
| JWT/custom claims | Do not use as the source of truth: claims can be stale until refresh, and user-editable metadata is untrusted. A server-issued app claim may cache a non-sensitive role hint, but every privileged operation must validate current authority. |
| Organization membership role | Defer with company enrollment: manager is scoped to a particular organization, so it belongs on a future organization membership, not as a global profile role. |

## 8. Course lifecycle and ownership

Draft courses/modules/lessons are visible to trusted course administrators only. Publishing requires the content/translation/asset prerequisites selected by the product. Published catalog fields can be read anonymously; lesson bodies, resources, and video playback require enrollment unless explicitly marked as a preview by a later policy. Archive content instead of deleting it. Restrict cascade deletes to dependent translation/option rows; use `RESTRICT`/soft archive for purchases, enrollments, attempts, issued certificates, and payment history. Use `created_by`, `updated_by`, and timestamps on editable content. Course ownership/admin rights are checked server-side and audited when the admin audit workflow is introduced.

## 9. Enrollment and progress rules

V1 entitlement sources are successful purchase, trusted admin grant, and free-course grant. Every source becomes an enrollment row; consumers check that row instead of inferring entitlement from UI state. Revoke/expire changes access without erasing history. Expiry policy and re-enrollment semantics require product confirmation.

Lesson completion is the source for course completion. Keep playback checkpoints separate because they update more often and have different validation. Compute course completion/progress from the required published lesson set. A server transaction should reconcile final lesson completion and enrollment completion before certificate eligibility is evaluated.

## 10. RLS and authorization model

Enable RLS on every table in an exposed schema, including tables that are intended to be server-only. Deny by default. The service-role key remains server-only and bypass use is limited to explicitly privileged operations. Use `auth.uid()` for row ownership; never treat hidden controls or a submitted `user_id` as authorization.

RLS and SQL privileges are separate gates: grant Data API/table access only to intended roles, then use row policies for authorization. The Supabase Data API exposure setting is separate from grants and RLS; expose only the intended schema/tables. `TO authenticated` is not an ownership check; policies must compare the row owner with `(select auth.uid())`. Any owner update policy needs both `USING` and `WITH CHECK`, and PostgreSQL also requires a matching SELECT policy for an UPDATE to affect rows. Index columns used by owner, membership, and entitlement predicates. Views bypass RLS by default; any exposed projection must use invoker security on supported PostgreSQL versions or live in an unexposed schema/server endpoint with narrowly granted access. Avoid `auth.role()` checks; target the intended database role and verify a real user identity.

| Table | Anonymous | Learner | Instructor | Organization manager | Admin |
|---|---|---|---|---|---|
| `profiles` | No direct table access; curated public instructor projection only | Read/update own allowlisted fields | Read/update own allowlisted fields; assigned attribution through curated projection | Later: scoped member display fields only | Trusted server; privileged edits audited |
| `learner_preferences` | No access | Read/update own | Own row only | No member preference access | Trusted support only when required |
| `user_roles` | No access | Read own grants; cannot mutate | Read own grants; cannot mutate | No access | Trusted role-grant service only |
| `courses` | Read published catalog fields | Read published catalog | Read catalog and assigned courses | Later: catalog and assigned allocations | Trusted authoring service; draft access |
| `course_translations` | Published parent only | Published parent only | Assigned course content | Later: allocated course outline | Trusted authoring service |
| `course_instructors` | Read published instructor attribution | Read published attribution | Read own/assigned course attribution | Later: allocated course attribution | Trusted authoring service |
| `course_modules` | Read published outline only | Read published outline | Read assigned course outline | Later: allocated outline only | Trusted authoring service |
| `module_translations` | Published parent only | Published parent only | Assigned course content | Later: allocated outline only | Trusted authoring service |
| `lessons` | No protected lesson data; approved preview only | Read published lesson metadata/body only with enrollment or preview | Read assigned course lesson content | Later: outline only unless separately enrolled | Trusted authoring service |
| `lesson_translations` | Approved preview only | Entitled/preview lesson only | Assigned course content | Later: allocated outline only | Trusted authoring service |
| `lesson_resources` | No access unless approved public preview | Entitled/preview resource via signed access | Assigned resource metadata; learner link still gated | Later: no file access without entitlement | Trusted authoring service; issue signed links after checks |
| `lesson_resource_translations` | Approved preview only | Entitled/preview resource only | Assigned course content | Later: allocated outline only | Trusted authoring service |
| `lesson_videos` | No access | No provider metadata; playback token issued by server after entitlement check | Assigned metadata only; no playback bypass | Later: no playback bypass | Trusted video service only |
| `learning_paths` | Read published path fields | Read published paths | Read published paths | Later: published/allocated paths | Trusted authoring service |
| `path_translations` | Published parent only | Published parent only | Published content | Later: allocated path content | Trusted authoring service |
| `learning_path_courses` | Read rows for published paths | Read published path membership | Read published path membership | Later: allocated path membership | Trusted authoring service |
| `enrollments` | No access | Read own; no direct grant/revoke | No learner roster access in V1 | Later: explicit approved member/aggregate scope only | Trusted grant/revoke service |
| `lesson_progress` | No access | Read own; update via constrained server operation | No learner progress access in V1 | Later: explicit approved aggregate scope only | Trusted support operation, audited |
| `video_progress` | No access | Read own; checkpoint via constrained server operation | No learner progress access | Later: no individual checkpoint access by default | Trusted support operation, audited |
| `quizzes` | No access | Read safe published fields with enrollment | Read assigned quiz content; no keys | Later: no quiz results/keys | Trusted authoring and grading service |
| `quiz_translations` | No access | Entitled published quiz only | Assigned course content | Later: allocated metadata only | Trusted authoring service |
| `questions` | No access | Read safe published question structure with enrollment | Assigned course content; no answer keys | No access to assessment content by manager role | Trusted authoring/grading service |
| `question_translations` | No access | Entitled published question only | Assigned course content | No access by default | Trusted authoring service |
| `question_options` | No access | Read safe options with enrollment | Assigned course content; no keys | No access by default | Trusted authoring/grading service |
| `option_translations` | No access | Entitled published options only | Assigned course content | No access by default | Trusted authoring service |
| `quiz_answer_keys` | No access | No access | No client/RLS access | No access | Assessment service only; never direct admin client read |
| `quiz_attempts` | No access | Read own safe results; create/start/submit through assessment service | No individual attempts in V1 | Later: approved aggregates only | Trusted grading/support operation, audited |
| `quiz_answers` | No access | Read own permitted answer state; writes only through assessment service while valid | No individual answers in V1 | No individual answers | Trusted grading/support operation, audited |
| `quiz_answer_selections` | No access | Read own permitted selections; writes only through assessment service while valid | No individual answers | No individual answers | Trusted grading/support operation, audited |
| `certificates` | No direct table access; limited verification endpoint only | Read own certificates by joining enrollment ownership | No access | Later: approved completion aggregates only | Trusted issue/revoke service |
| `orders` | No access | Read own order | No access | No payment/member detail access | Trusted commerce service |
| `payments` | No access | Read own safe payment status only | No access | No access | Payment service only |
| `payment_webhook_events` | No access | No access | No access | No access | Payment service only; no client mutation |
| `organizations` | No access | Later: own organization metadata only | No access by default | Later: own organization only | Trusted organization service |
| `organization_members` | No access | Later: own membership only | No access by default | Later: own organization membership scope | Trusted organization service |
| `organization_invitations` | No access | Later: accept own opaque invitation only | No access | Later: create/revoke own organization invitations | Trusted organization service |
| `organization_course_assignments` | No access | Later: own assignment only | No access | Later: own organization assignments | Trusted organization service |
| `calendar_events` | No access unless explicitly public | Later: own or entitled events | Later: manage assigned events | Later: approved organization events only | Trusted event service |
| `notifications` | No access | Later: read/update own notification state | Own row only | No member notification access | Trusted notification service |
| `ai_conversations` | No access | Later: own conversation metadata | No learner history access | No access | Restricted, audited support only if approved |
| `ai_messages` | No access | Later: own messages | No learner history access | No access | Restricted, audited support only if approved |
| `admin_audit_log` | No access | No access | No access | No access | Append/read through trusted admin service; no client mutation |

The organization-manager column is explicitly future policy, not permission to inspect employees by default. Build one documented authorization helper or server policy per trust boundary; test owner spoofing, cross-user IDs, unpublished content, answer-key reads, and direct writes to server-managed state.

## 11. Constraints and deletion behavior

- **Identity and roles:** profile ID is the Auth UUID; preference/role owner IDs reference profiles. Constrain role to `admin`/`instructor`; retain revoked grants and use a partial unique active `(user_id, role)` index. Do not create a learner role row by default.
- **Catalog/content:** unique course slug; status checks; nonnegative price; currency is three uppercase letters and must also be in the configured supported-currency allowlist; published courses require `published_at`. Translation primary keys enforce one row per entity/locale and locale checks allow only `en`/`ar`. Enforce positive positions and unique parent/position for modules, lessons, instructors, path courses, resources, questions, and options. Constrain lesson/resource types to the documented V1 list. Resource locator check requires exactly one of storage key or external URL. `lesson_videos.lesson_id` is unique and provider asset identity is unique per provider.
- **Entitlement/progress:** constrain enrollment source/status to the V1 vocabulary, require `expires_at > enrolled_at` when set, and require `completed_at` exactly when status is completed. A partial unique active `(user_id, course_id)` index prevents concurrent active grants while preserving history. Progress is unique by user/lesson; percentage is between 0 and 100, seconds are nonnegative, and completed timestamps must agree with completed status. A completed lesson progress row has 100 percent; whether time watched alone can complete a video remains a product rule.
- **Assessment:** one quiz per lesson; passing score basis points are 0–10,000; time limit and max attempts are positive when present. Question/option ordering is unique per parent, points are nonnegative, and question types are `single_choice`, `multiple_choice`, or `true_false`. Attempt number is positive, score/possible score are nonnegative with score not above possible score, submitted state requires `submitted_at`, and `expires_at > started_at`. Use one active-attempt partial unique index. Composite FKs ensure answers/selections and answer keys refer to questions/options from the same quiz/question. At publish time validate at least one correct option; require exactly one for single choice and exactly two options/one correct for true/false. Cross-row checks belong in the publish/grading transaction, not a fragile client check.
- **Certificates:** unique certificate number and verification-token hash; issue locale check `en`/`ar`; issued time precedes revocation time. Partial unique index allows only one unrevoked certificate per enrollment. Enrollment history is retained; certificate verification uses the opaque token hash through a restricted endpoint.
- **Commerce/audit:** course prices, order snapshots, and payments use integer minor units with ISO currency. Amounts are nonnegative; discount cannot exceed subtotal; order total equals subtotal minus discount plus tax; payment amount/currency must match the order before capture. Provider payment reference and `(provider, provider_event_id)` are unique. Event rows are retained even if the payment row is later removed; raw callback payloads/card details are never stored. Audit rows are append-only and typed FKs restrict deletion.
- **Delete behavior:** use UUID primary keys for app entities and `CASCADE` only for dependent translations/preferences that have no independent history. Prefer `RESTRICT` and soft archive for courses, users, enrollments, attempts, certificates, orders, payments, role grants, and audit events. Storage-object deletion is a separately authorized cleanup operation.
- Use text plus check constraints for lifecycle/status values expected to evolve; reserve PostgreSQL enums for values with a strong compatibility reason. Do not duplicate an index already provided by a primary/unique constraint.
- Store money as integer minor units plus ISO currency, never floating point. Store timestamps as `timestamptz` in UTC; apply user timezone only for display/scheduling.
- An Auth delete may be blocked by retained profile references until a reviewed anonymization/retention workflow handles them. Set nullable course/lesson context to null on notification/AI history only if that preserves required privacy/audit behavior.
- Do not store derived rating totals, course progress, or dashboard counters as independent truth. Cached aggregates need explicit invalidation/reconciliation design if later justified.

## 12. Index plan

Primary-key and unique-constraint indexes are implicit and are not repeated here.

| Index | Reason |
|---|---|
| Partial `courses(category, level, created_at DESC) WHERE status='published'` | Catalog filters and newest-first listing without indexing drafts |
| `course_translations(locale, course_id)` | Locale-first catalog joins/search; the PK starts with course ID |
| Partial unique `user_roles(user_id, role) WHERE revoked_at IS NULL` | Enforce one active elevated role and support owner-role checks |
| `course_instructors(instructor_id, course_id)` | Reverse lookup of an instructor's assigned courses |
| Unique constraint indexes `course_modules(course_id, position)`; `lessons(module_id, position)`; `course_instructors(course_id, position)`; `learning_path_courses(path_id, position)`; `questions(quiz_id, position)`; `question_options(question_id, position)` | Parent-scoped ordering; do not add duplicate standalone indexes |
| `module_translations(locale, module_id)`; `lesson_translations(locale, lesson_id)`; `quiz_translations(locale, quiz_id)`; `question_translations(locale, question_id)`; `option_translations(locale, option_id)`; `path_translations(locale, path_id)`; `lesson_resource_translations(locale, resource_id)` | Locale-first content fetches; each translation PK starts with its parent ID |
| `lesson_resources(lesson_id, locale, position)` | Load a lesson's resource list in display order |
| Partial `learning_paths(created_at DESC) WHERE status='published'` | Published path catalog newest-first listing |
| `learning_path_courses(course_id, path_id)` | Reverse lookup of paths containing a course |
| Partial unique `enrollments(user_id, course_id) WHERE status='active'` | Enforce one active entitlement while preserving history |
| `enrollments(user_id, status, enrolled_at DESC)` and `(course_id, status)` | Learner dashboard and authorized course roster queries |
| Partial unique `enrollments(order_id) WHERE order_id IS NOT NULL` | Enforce one entitlement grant per order and resolve purchase access safely |
| `lesson_progress(user_id, updated_at DESC)` and `(lesson_id, status)` | Learner progress dashboard and course-level completion aggregation |
| `lesson_progress(lesson_id, user_id)` and `video_progress(lesson_id, user_id)` | Lesson-parent FK lookups and course progress joins where the learner key is not the leading column |
| `video_progress(user_id, updated_at DESC)` | Resume the learner's most recent playback |
| `questions(quiz_id, position)`; `question_options(question_id, position)` | Ordered assessment load; unique constraint indexes may satisfy both |
| `quiz_attempts(user_id, quiz_id, started_at DESC)` | Learner attempt history and retry policy checks |
| `quiz_attempts(quiz_id, status, submitted_at)` | Quiz-level attempt reporting and FK checks |
| Partial unique `quiz_attempts(user_id, quiz_id) WHERE status='in_progress'` | Prevent concurrent active attempts |
| `quiz_answers(question_id, quiz_id)` and `quiz_answer_selections(option_id)` | Support composite question/quiz FK checks and protected option reverse checks; the answer PK already covers `attempt_id` lookups |
| Partial unique `certificates(enrollment_id) WHERE revoked_at IS NULL` and `(enrollment_id, issued_at DESC)` | One current certificate per enrollment and owner-scoped listing through the enrollment FK |
| `orders(user_id, created_at DESC)` | Learner purchase history |
| `orders(course_id, created_at DESC)` | Course-level purchase/reconciliation reports |
| `payments(order_id, created_at DESC)` | Resolve order payment history |
| `payment_webhook_events(payment_id, received_at)` | Payment-specific event audit and reconciliation |
| `payment_webhook_events(processing_status, received_at)` | Retry failed event processing and audit operational backlog |
| Deferred organization tables: `(organization_id, status)` and `(user_id, organization_id)` | Scoped manager membership/course-assignment queries when that phase is approved |
| Deferred notifications: `(user_id, read_at, created_at DESC)` | User inbox/unread counts if notifications ship |
| Deferred calendar: `(starts_at)` and `(course_id, starts_at)` | Time-window event queries and course event lookup if those event scopes are confirmed |
| Deferred AI messages: `(conversation_id, created_at)` | Ordered conversation retrieval if persistence ships |
| Deferred admin audit: `(actor_id, occurred_at DESC)` | Trusted admin audit history by actor and time |

Every foreign key used in joins/RLS/deletion checks must have an index whose leading columns cover the lookup; composite PK/unique indexes already cover their leftmost prefixes and should not be duplicated. Validate query plans against actual access patterns before adding any other index.

## 13. Storage plan

Use Supabase Storage only for files, not relational records. Candidate buckets:

- `avatars`: private user-owned images, constrained size/type; serve through short-lived signed URLs or an explicitly reviewed public profile-image policy.
- `course-resources`: private by default; access checks must verify published preview or enrollment before issuing a signed URL. Object paths are identifiers, not authorization.
- `certificate-files`: defer until generated/downloadable certificate requirements are confirmed; private and tied to an issued certificate.
- Course video bytes stay with Mux, not Supabase Storage. Keep provider IDs in `lesson_videos` and issue playback access only after server-side enrollment checks.

Define bucket object policies alongside migrations. Never trust a client-supplied path, MIME type, or user ID as authorization.

## 14. Transaction boundaries and database functions

Use normal server-side queries for ordinary profile reads and catalog composition. Use a narrowly scoped Postgres function/RPC or an equivalent trusted transaction when multiple writes must be atomic or a security decision must remain inside the database boundary.

1. **Verified payment → enrollment:** verify webhook signature outside or at the trusted edge, insert the idempotent event, lock/update payment and order, and grant/reactivate enrollment once in one transaction.
2. **Assessment submission:** validate attempt ownership/state/deadline, freeze submitted answers, grade from protected keys, and set score/pass/submission time atomically.
3. **Completion → certificate:** reconcile required lesson completion and enrollment completion, check eligibility, issue one unique certificate, and record its locale/token atomically.
4. **Role grant/revoke:** authorized admin action and membership row change in one trusted operation, recording grantor/time; a fuller append-only admin audit log is deferred. No user self-write.

Prefer `SECURITY INVOKER` for RPCs/views. Use `SECURITY DEFINER` only when a specific atomic operation or nonrecursive protected lookup requires it; place it in a non-exposed schema, set a fixed empty/safe `search_path`, qualify objects, validate `auth.uid()`/role, revoke default `PUBLIC` execute and grant only required roles, and review its RLS bypass explicitly. Keep the transaction short and make external network calls before opening locks. Do not use a definer function merely to simplify routine reads.

## 15. Performance and query shape

- Fetch a course curriculum with bounded joins/batched locale lookups rather than per-module/per-lesson N+1 requests.
- Scope learner dashboards by `auth.uid()` and batch enrollments, progress, and certificate rows. Derive course progress from required published lessons; do not add a materialized view before measuring.
- Fetch published assessment presentation separately from protected answer keys. A grading RPC can fetch keys internally without returning them.
- Admin roster/reporting queries are later, require course-scope checks, and should paginate. Organization-wide reporting is deferred with organizations.
- Use ordinary indexes and joins first. Add views/RPC for stable query/security boundaries; add materialization only for demonstrated aggregate cost and with a refresh/reconciliation strategy.

## 16. Privacy and data lifecycle

Keep email in Auth. Minimize profile fields, payment metadata, answers, video checkpoints, and AI history. Do not expose internal user UUIDs in public certificate verification. Retain payment events, submitted attempts, issued certificates, and enrollment history according to a product/legal retention policy; redact/anonymize personal fields if account deletion is required. AI history is not stored in V1. Define deletion, export, and retention periods before launch, especially for financial/assessment records.

## 17. Migration, seed, and TypeScript strategy

- All production DDL, RLS, functions, grants, bucket policies, and schema changes are committed in ordered `supabase/migrations/` files. Dashboard edits are not canonical; emergency changes must be reconciled into a migration immediately.
- Apply local development migrations from an empty database in order; inspect generated SQL/RLS behavior before staging and production. Never put secrets or real learner accounts in migrations/seeds.
- Use `supabase/seed.sql` (or an equivalent checked-in seed workflow) for deterministic development content based on the existing demo courses, clearly labeled as fixtures. Keep production data out of seeds.
- Generate TypeScript database types from the migrated Supabase schema. Consume generated row/insert/update types at the database boundary; map them into domain/UI types when presentation shape differs. Do not maintain a second handwritten schema type system indefinitely.

## 18. V1 versus later implementation sequence

1. **Foundation:** local Supabase workflow, migration conventions, generated types, RLS defaults, helper-function review, and nonproduction seed process.
2. **Identity and authorization:** profiles, preferences, elevated role grants, Auth lifecycle, and security tests.
3. **Catalog/content:** courses, translations, instructors, modules, lessons, resources, learning paths, publication rules, and catalog RLS.
4. **Entitlement/progress:** individual enrollments, lesson/video progress, protected resources/playback boundary, and derived progress queries.
5. **Assessments:** quiz content, isolated answer keys, timed attempts, selections, server grading transaction, and abuse/replay tests.
6. **Certificates:** eligibility transaction, unique verification token, limited public verification projection.
7. **Commerce:** order/payment records, verified idempotent webhook processing, and transactional enrollment grant. Add the nullable `enrollments.order_id` column/FK in this phase so the earlier enrollment migration does not depend on a not-yet-created orders table.
8. **Storage:** avatar/resource buckets and policies; Mux remains its separate later integration.
9. **Later product domains:** organizations and manager reporting; calendar/notifications; AI conversations only if persistence is required; admin audit log and any additional retention/reporting needs.

The sequence is dependency-oriented; no phase authorizes implementing the next backend phase until separately requested and its open product rules are settled.

## 19. Open product questions

Resolve these before implementing affected behavior; proposed schema fields are not a decision about policy.

1. Do courses or enrollments expire? Can an expired/revoked learner re-enroll, and does that create a new history row?
2. Must both English and Arabic content be complete before publication? Is fallback allowed? Can lesson resources or video assets differ by locale?
3. Are instructors login users or only course attributions? Which authoring/publishing actions can they perform, and what learner information/results may they see?
4. What assessment retry limits, timer behavior, autosave rules, passing thresholds, review/reveal rules, and supported question/grading types are required? Is null max-attempts unlimited? How are quiz versions protected after attempts exist?
5. How are learning-path prerequisites, course completion, optional lessons, and video completion thresholds defined? What happens to learner progress if published curriculum changes?
6. Are certificates English, Arabic, or bilingual? What eligibility threshold, reissue/revocation, recipient-name disclosure, and verification display policy applies?
7. Is V1 strictly one-time, one-course-per-order purchase, or are carts/bundles needed? Are free courses, coupons, refunds/partial refunds, or subscriptions required? Which currencies and tax/rounding rules apply, and does a refund revoke enrollment? The current USD checkout and 10% VAT display are demo UI, not production rules.
8. If company enrollment is introduced later, may managers see individual progress/results or only aggregates? Who can invite/remove members and assign seats?
9. Which calendar events persist, are they shared or learner-specific, is attendance tracked, and are external sync or timezone-specific reminders needed?
10. Which notification channels, consent rules, and retention periods apply? Should assistant history be persisted, and for how long? Which interface/source/response locale behavior should AI history retain?
11. Which profile attributes beyond name/avatar/bio/locale/timezone are necessary? What are account export/deletion rules and the anonymization process while retaining required financial/assessment history?
12. What admin audit retention/support-access model is required, including learner data, payment reconciliation, assessment disputes, and certificate corrections?

## 20. Proposed Supabase implementation sequence

Create migrations only after this architecture and the relevant open product decisions are approved. Start with local development and RLS tests; use staged deployment before production. Keep each migration reversible where practical, but use explicit forward data migrations for production history. Seed only nonproduction fixture content. Do not connect the production Supabase project during schema design review.

## 21. Public versus private data summary

- **Public:** published catalog fields, published path presentation, and a deliberately limited certificate-verification response.
- **Authenticated owner only:** profile/preferences, enrollment, progress, attempts/results, certificates, orders/payment status, and future AI history.
- **Privileged:** draft/admin content, role grants, answer keys, webhook event details, payment reconciliation, certificate issuance, and future audit logs.
- **Enrollment-gated:** lesson bodies, resources, quiz content, and protected video playback, subject to explicit previews.

## 22. Next step

Review and approve the database architecture, then implement the initial Supabase migrations and RLS foundation.
