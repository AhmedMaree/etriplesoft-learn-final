# ETripleSoft Learn — Database Architecture

**Status: HOSTED DEV IDENTITY FOUNDATION AND RLS VALIDATED.** The approved architecture describes the complete proposed production schema. The initial identity/RLS subset and hosted platform-trigger ACL hardening are implemented in `supabase/migrations/` and applied to the dedicated hosted DEV project; the remaining domains are not implemented. Hosted schema metadata, owner/cross-user policy behavior, role protection, and generated types have been checked against DEV. Product decisions for later behavior remain listed in section 19.

## 1. Design principles

- PostgreSQL is the authority for identity links, entitlements, progress, assessment results, certificates, and payment state. Browser state and provider redirects are never authoritative.
- Model business entities relationally with foreign keys, unique/check constraints, explicit ownership, and indexes that support known reads and RLS predicates. Avoid large JSONB business records and polymorphic foreign keys.
- Keep the course, lesson, path, question, and option identities independent of locale. Store application UI messages in `messages/`; this schema covers future database-backed LMS content.
- Use `public` for application tables. Keep Supabase credentials, privileged operations, and answer keys outside learner-readable paths.
- Prefer soft lifecycle states for courses and enrollments. Retain financial, assessment, and certificate history for auditability rather than deleting completed records.
- V1 means the first individual-learner production learning flow. Company enrollment is deferred.

## 2. Domain overview

The production core connects Supabase Auth users to minimal profiles, independently published English/Arabic course content, learning paths, course entitlements, lesson/video progress, immutable assessment versions, completion snapshots, certificates, one-time orders/items, payments, and focused privileged-action audit records. Instructor attribution grants no permissions. Catalog data can be read without enrollment; protected lesson access requires exact-locale published content plus active enrollment or an explicit server-authorized preview.

The current demo shows course title/description/category/level/price, instructors, a module-like curriculum, lessons, resources, quizzes, learning paths, learner settings, certificates, and checkout. Its ratings, review counts, calendar entries, profile values, progress totals, and payment outcomes are mock data, not confirmed production requirements. The database design does not make those demo values authoritative.

## 3. Relationship map

```text
auth.users
  +-- profiles -- learner_preferences
  +-- user_roles (protected grants)

courses -- course_translations [publication per locale]
  +-- course_instructors -- optional profiles (attribution only)
  +-- course_modules -- module_translations
       +-- lessons -- lesson_translations
            +-- lesson_resources -- lesson_resource_translations
            +-- lesson_videos [localized or explicitly language-neutral]
            +-- quizzes -- quiz_versions -- quiz_translations
                 +-- questions -- question_translations
                      +-- question_options -- option_translations
                           +-- quiz_answer_keys (protected)
  +-- learning_path_courses -- learning_paths -- path_translations

profiles -- enrollments -- courses
  +-- lesson_progress -- lessons
  +-- video_progress -- lesson_videos
  +-- quiz_attempts -- quiz_versions -- quiz_answers/selections
  +-- course_completions -- certificates (issue/revoke/reissue history)
  +-- orders -- order_items -- courses
       +-- payments -- payment_webhook_events
            verified payment grants one enrollment per item transactionally

admin_audit_log -- profiles (actor and typed action targets)
```

Organizations, persistent calendar, notifications, and AI history are later domains. V1 audit records cover high-value privileged actions.

## 4. Table inventory

RLS is enabled on every exposed application table. “Private” means owner-scoped or server-only; “Catalog” means only published, non-sensitive fields are anonymously readable. “Main owner” identifies the row authority, not necessarily who may write it.

| Table | Purpose | Scope | Classification | Main owner |
|---|---|---|---|---|
| `profiles` | Minimal app profile linked 1:1 to Auth | V1 | Private; limited instructor display fields may appear in catalog | Auth user |
| `learner_preferences` | Locale, timezone, and explicit learning/notification settings | V1 | Private | Auth user |
| `user_roles` | Elevated application roles such as admin and instructor | V1 | Privileged | Trusted admin process |
| `courses` | Language-independent course identity, state, level, category, price, and creator | V1 | Catalog when published; drafts privileged | Course admin |
| `course_translations` | Localized course text with independent locale publication | V1 | Published requested locale only | Course admin |
| `course_instructors` | Ordered attribution; optional Auth profile link; grants no permissions | V1 | Published attribution | Course admin |
| `course_modules` | Ordered course modules and required flag | V1 | Catalog when parent is published | Course admin |
| `module_translations` | Localized module title/description | V1 | Catalog when parent is published | Course admin |
| `lessons` | Ordered lesson identity, supported type, duration, required flag, and state | V1 | Enrolled learner; published outline may be catalog-visible | Course admin |
| `lesson_translations` | Localized lesson title, summary, and article body | V1 | Enrolled learner | Course admin |
| `lesson_resources` | File/external resource identity, kind, locale, and storage/link reference | V1 | Entitled learner or authorized preview | Course admin |
| `lesson_resource_translations` | Localized resource label/description | V1 | Entitled learner or authorized preview | Course admin |
| `lesson_videos` | Provider asset/playback reference with locale-specific or explicitly neutral mapping | V1 | Server-only metadata | Video service |
| `learning_paths` | Language-independent path identity and publication state | V1 | Catalog when published | Course admin |
| `path_translations` | Localized path title/description | V1 | Catalog when parent is published | Course admin |
| `learning_path_courses` | Ordered path-to-course membership | V1 | Catalog when path is published | Course admin |
| `enrollments` | Individual entitlement with retained re-enrollment history | V1 | Private/server-managed | Grant service |
| `lesson_progress` | Learner lesson started/completed state and timestamps | V1 | Private | Auth user via constrained server operation |
| `video_progress` | Playback position, watched duration, and completion checkpoint | V1 | Private | Auth user via constrained server operation |
| `quizzes` | Stable language-independent assessment identity | V1 | Safe identity only | Course admin |
| `quiz_versions` | Immutable rules/content version bound to historical attempts | V1 | Safe version settings only | Course admin |
| `quiz_translations` | Localized quiz-version text with independent publication | V1 | Entitled learner, exact locale | Course admin |
| `questions` | Ordered question identity, supported choice type, and points | V1 | Entitled learner may read safe fields | Course admin |
| `question_translations` | Localized question wording | V1 | Entitled learner | Course admin |
| `question_options` | Ordered answer-option identity | V1 | Entitled learner may read safe fields | Course admin |
| `option_translations` | Localized option text | V1 | Entitled learner | Course admin |
| `quiz_answer_keys` | Correct-option mapping, withheld from learner clients | V1 | Privileged/server-only | Assessment service |
| `quiz_attempts` | Server-timed attempt state and final result | V1 | Private | Auth user via assessment service |
| `quiz_answers` | Per-attempt question answer record | V1 | Private | Auth user via assessment service |
| `quiz_answer_selections` | Selected option rows, supporting single/multiple choice | V1 | Private | Auth user via assessment service |
| `course_completions` | Immutable completion-rule snapshot for an enrollment | V1 | Private/server-created | Completion service |
| `certificates` | Issuance linked to completion, locale and opaque verification token | V1 | Private; limited public verification | Certificate service |
| `orders` | One-time order and immutable amount/currency snapshot | V1 | Private/server-managed | Commerce service |
| `order_items` | Per-course order item and entitlement/commercial snapshot | V1 | Private/server-managed | Commerce service |
| `payments` | Provider-neutral payment references and authoritative payment state | V1 | Private/server-managed | Payment service |
| `payment_webhook_events` | Deduplicated provider event receipt and processing outcome | V1 | Privileged/server-only | Payment service |
| `organizations` | Company identity | Later | Private/organization-scoped | Organization admin |
| `organization_members` | User membership and company-manager relationship | Later | Private/organization-scoped | Organization admin |
| `organization_invitations` | Expiring, single-use invitations | Later | Private/organization-scoped | Organization admin |
| `organization_course_assignments` | Company course allocation/entitlement source | Later | Private/organization-scoped | Organization admin |
| `calendar_events` | Persisted live sessions, due dates, and learner calendar entries | Later | Private/entitled | Event owner/service |
| `notifications` | User notification records and read/delivery state | Later | Private | Notification service |
| `ai_conversations` | Optional persisted assistant conversation metadata | Later | Private | Auth user/AI service |
| `ai_messages` | Conversation messages and safe metadata | Later | Private | Auth user/AI service |
| `admin_audit_log` | Append-only high-value privileged actions and sensitive access | V1 | Privileged | Trusted admin process |

**Inventory total: 45 tables: 37 V1 and 8 later.** No table is proposed for reviews/ratings, coupon rules, subscriptions, bundles, or general-purpose files until the product confirms those workflows. Course cards can display ratings only after a review/rating product and moderation policy are specified.

### Column, key, and ownership catalogue

Use UUID primary keys for independent V1/deferred entities, generated by the database. Translation/junction/progress/answer tables use composite primary keys where stated. IDs are internal identifiers, not authorization. Mutable entities and translations have `created_at`/`updated_at` `timestamptz` values in UTC; immutable event/history rows use `received_at`, `issued_at`, or equivalent instead of mutable timestamps. Amounts are integer minor units and durations/positions are integers. Foreign-key actions below describe the proposed default; archived/history-bearing rows use `RESTRICT` rather than cascade deletion.

| Table | Proposed columns and keys | Ownership, foreign keys, and delete behavior |
|---|---|---|
| `profiles` | `id uuid PK`; `display_name`; nullable `avatar_object_key`; created/updated | `id references auth.users.id`; deletion follows approved de-identification/retention workflow; retained-history FKs can restrict hard deletion |
| `learner_preferences` | `user_id uuid PK`; `preferred_locale text`; `timezone text`; booleans `email_notifications`, `course_reminders`, `assignment_deadlines`, `community_updates`, `daily_learning_reminders`, `course_recommendations`, `autoplay_next`; `updated_at` | `user_id → profiles.id ON DELETE CASCADE`; one row per learner |
| `user_roles` | `id uuid PK`; `user_id uuid`; `role text`; `granted_by uuid`; `granted_at`; nullable `revoked_by uuid`, `revoked_at` | User/grantor/revoker reference profiles with delete restricted; no self-write; preserve revoked grants; only one unrevoked row per user/role |
| `courses` | `id uuid PK`; unique `slug`; `status`; nullable `level`, `category`; `price_minor bigint`; `currency char(3)`; nullable `thumbnail_object_key`; `created_by`, `updated_by`; `published_at`, `created_at`, `updated_at` | Creator/updater reference profiles with delete restricted; referenced by course history, so archive instead of delete |
| `course_translations` | PK `(course_id,locale)`; localized title/descriptions; `publication_status`, `published_at`, timestamps | Course FK; locale `en`/`ar`; exact-locale publication; restrict once history depends on content |
| `course_instructors` | `id uuid PK`; `course_id`; `position`; nullable `profile_id`; display-name snapshot; assigner/time | Course FK restrict; optional profile set null; unique `(course_id,position)`; attribution alone grants no permission |
| `course_modules` | `id uuid PK`; `course_id`; `position`; `is_required`; `created_at`, `updated_at` | Course FK restricts deletion; unique `(course_id, position)` |
| `module_translations` | PK `(module_id,locale)`; localized title/description; publication status/time; timestamps | Module FK; locale check; exact-locale publication |
| `lessons` | `id uuid PK`; `module_id`; `position`; `lesson_type`; `status`; `is_required`, `is_preview`; nullable `duration_seconds`; `published_at`, `created_at`, `updated_at` | Module FK restricts deletion; unique `(module_id, position)`; referenced by progress/assessment/video history |
| `lesson_translations` | PK `(lesson_id,locale)`; localized title/summary/body; publication status/time; timestamps | Lesson FK; locale check; retain versions used by attempts/completions |
| `lesson_resources` | `id uuid PK`; `lesson_id`; `kind`; nullable `locale`; `position`; nullable `storage_object_key`, `external_url`; `created_by`; `created_at`, `updated_at` | Lesson FK restricts deletion; creator references profile; unique `(lesson_id, position)`; resource translation children cascade; Storage object removal is handled by a separate authorized cleanup workflow |
| `lesson_resource_translations` | PK `(resource_id,locale)`; localized label/description; publication status/time | Resource FK; locale check; exact-locale publication |
| `lesson_videos` | `id uuid PK`; `lesson_id`; nullable `locale`; `is_language_neutral`; provider/asset/playback IDs; state/duration/timestamps | Lesson FK restrict; unique lesson/locale and provider/asset; null locale only when explicitly neutral |
| `learning_paths` | `id uuid PK`; `status`; `created_by`, `updated_by`; `published_at`, `created_at`, `updated_at` | Creator/updater reference profiles; archive instead of deleting published paths |
| `path_translations` | PK `(path_id,locale)`; title/description; publication status/time | Path FK; locale check; exact-locale publication |
| `learning_path_courses` | Composite PK `(path_id, course_id)`; `position`; `created_at` | Path and course FKs restrict deletion; unique `(path_id, position)` |
| `enrollments` | `id uuid PK`; user/course/source/status; nullable `order_item_id`, grantor, `enrolled_at`, `completed_at`, `expires_at`; timestamps | User/course/order item/grantor FKs restrict; one active user/course and one grant per nonnull order item; re-enrollment is a new row |
| `lesson_progress` | PK `(enrollment_id,lesson_id)`; status/percent; start/completion/access/update timestamps | Enrollment and lesson FKs restrict; trusted validation ensures same course/owner |
| `video_progress` | PK `(enrollment_id,lesson_video_id)`; position/watched/duration seconds; completion/update timestamps | Enrollment/video FKs restrict; server validates values and same course |
| `quizzes` | `id uuid PK`; unique `lesson_id`; lifecycle/timestamps | Lesson FK restrict; stable assessment identity; rules stored per version |
| `quiz_versions` | `id uuid PK`; `quiz_id`; positive version number; draft/published/retired state; pass basis points; nullable duration/max attempts; reveal flags; timestamps | Quiz FK restrict; unique `(quiz_id,version_number)`; published version immutable |
| `course_completions` | `id uuid PK`; unique enrollment; completion-rule version; required/completed lesson and assessment counts; required final attempt reference; `completed_at` | Enrollment FK restrict; immutable snapshot |
| `order_items` | `id uuid PK`; `order_id`; `course_id`; course title and amount snapshots; timestamp | Order/course FKs restrict; unique `(order_id,course_id)`; entitlement points here |
| `quiz_translations` | PK `(quiz_version_id,locale)`; title/instructions; publication status/time | Version FK restrict after attempts; exact-locale content |
| `questions` | `id uuid PK`; `quiz_version_id`; position/type/points/required; timestamps | Version FK restrict; unique `(quiz_version_id,position)`; immutable once published |
| `question_translations` | PK `(question_id,locale)`; prompt/explanation; publication status/time | Question FK; exact-locale; immutable with published assessment version |
| `question_options` | `id uuid PK`; `question_id`; `position`; `created_at` | Question FK restricts deletion when answer keys/selections exist; unique `(question_id, position)` and `(question_id, id)` |
| `option_translations` | PK `(option_id,locale)`; option text; publication status/time | Option FK; exact-locale; immutable with published assessment version |
| `quiz_answer_keys` | Composite PK `(question_id, option_id)`; `created_at` | Composite FK to an option belonging to the question; delete restricted; no learner/instructor grants |
| `quiz_attempts` | `id uuid PK`; `user_id`, `enrollment_id`, `quiz_id`, `quiz_version_id`; attempt number/status; server timestamps; score/pass | User/enrollment/version FKs restrict; unique user/version/attempt; one active per user/version |
| `quiz_answers` | PK `(attempt_id,question_id)`; answered/finalized timestamps | Composite FK binds question to attempt version; preserve submitted history |
| `quiz_answer_selections` | Composite PK `(attempt_id, question_id, option_id)`; `selected_at` | Composite FK to `quiz_answers` and composite FK `(question_id, option_id)` to options; delete restricted |
| `certificates` | `id uuid PK`; `course_completion_id`; unique number/token hash; locale; issue/revoke/replacement; display snapshots | Completion/revoker/replaced certificate FKs restrict; one active certificate per completion; retain history |
| `orders` | `id uuid PK`; `user_id`, status, currency, subtotal/discount/tax/total minor snapshots, timestamps | User FK restrict; no course ID; immutable after confirmation |
| `payments` | `id uuid PK`; `order_id`; `provider`; nullable `provider_reference`; `amount_minor`, `currency`; `status`; nullable `succeeded_at`, `failure_code`; `created_at`, `updated_at` | Order FK restricts deletion; unique provider/reference when reference exists; multiple attempts may belong to one order |
| `payment_webhook_events` | `id uuid PK`; `provider`; `provider_event_id`; nullable `payment_id`; `event_type`; `signature_verified_at`; `received_at`; `processing_status`; nullable `processed_at`, `safe_error_code`, `payload_digest` | Unique `(provider, provider_event_id)`; payment FK `ON DELETE SET NULL` so event evidence remains; raw payload/PII is not retained |
| `organizations` (later) | `id uuid PK`; `name`; `status`; `created_by`; `created_at`, `updated_at` | Creator profile FK restricts deletion; organization soft-deleted/deactivated |
| `organization_members` (later) | `id uuid PK`; `organization_id`, `user_id`; `membership_role`; `status`; `invited_by`; `joined_at`, nullable `left_at` | Organization/profile/inviter FKs restrict deletion; at most one active membership per organization/user |
| `organization_invitations` (later) | `id uuid PK`; `organization_id`; normalized `invited_email`; unique `token_hash`; `membership_role`; `invited_by`; `created_at`, nullable `expires_at`; nullable `accepted_by`, `accepted_at`, `revoked_at` | Organization/inviter/acceptor FKs restrict deletion; token is single-use and expires; raw token is never stored |
| `organization_course_assignments` (later) | `id uuid PK`; `organization_id`, `course_id`; `assigned_by`; `status`; `assigned_at`; nullable `starts_at`, `ends_at` | Organization/course/assigner FKs restrict deletion; assignment rules and seat counts require product decision |
| `calendar_events` (later) | `id uuid PK`; `event_type`; nullable `course_id`, `lesson_id`; `title`; `starts_at`, `ends_at`; `timezone`; `created_by`; timestamps | Course/lesson/creator FKs restrict deletion; participant/visibility relation is intentionally undecided |
| `notifications` (later) | `id uuid PK`; `user_id`; `notification_type`; `message_key`; nullable `course_id`, `lesson_id`; `created_at`, nullable `read_at`, `delivered_at` | User FK restricts deletion until retention workflow; optional course/lesson FKs set null; channels/consent remain undecided |
| `ai_conversations` (later) | `id uuid PK`; `user_id`; nullable `course_id`; `interface_locale`, nullable `source_locale`, `response_locale`; `created_at`, `updated_at`, nullable `closed_at` | User FK restricts deletion until retention policy; course FK set null; locale dimensions remain distinct |
| `ai_messages` (later) | `id uuid PK`; `conversation_id`; `speaker`; `content text`; `created_at`; optional provider/model metadata | Conversation FK cascades only under an approved retention/deletion policy; never persist provider secrets |
| `admin_audit_log` | `id uuid PK`; `actor_id`, `action`, `occurred_at`; typed target FKs `course_id`, `user_role_id`, `enrollment_id`, `certificate_id`, `payment_id`, `quiz_attempt_id`; nullable `accessed_user_id`; request ID/safe summary | Actor/target FKs restrict; supported-target check; append-only, high-value actions only |

This is a schema proposal, not DDL. Exact SQL types, generated IDs, triggers, grants, and policy expressions are implementation details to review against the selected Supabase/PostgreSQL versions before migrations.


## 5. Core table design

### Identity, settings, and roles

`auth.users` owns credentials and email. `profiles` contains minimal display name/avatar only; `learner_preferences` separately stores locale, timezone, and explicit settings. No profile role or duplicated authoritative email. `user_roles` is a protected grant/revoke ledger; role checks and privileged writes are server/database-authoritative, not client claims. `course_instructors` is attribution only; a linked profile does not acquire permissions.

### Course content and publication

Course/module/lesson/path/quiz/question/option identity and business properties remain language-independent. Normalized translation tables use `(entity_id,locale)`, with publication state and `published_at` per locale. English and Arabic publish independently. Reads require the exact requested locale and published ancestors; there is no silent fallback for missing LMS content. UI-message fallback is separate. Resources and videos may differ by locale; neutral video assets must be explicitly marked language-neutral.

Normalized translation tables are preferred to JSONB because locale uniqueness, publication lifecycle, RLS, and locale-first indexing are required. Duplicated content entities per language are rejected because they split identity, price, ordering, enrollment, and history.

Use explicit `position` fields for modules, lessons, path courses, questions, options, instructor attribution, and ordered resources; enforce unique parent/position constraints. Archive content referenced by learner history rather than deleting it.

### Enrollment and progress

Enrollment states are `active`, `completed`, `revoked`, `expired`; `expires_at` is nullable and V1 has no default expiry. Re-enrollment after revocation/expiry creates a new row and preserves prior history. Partial uniqueness allows only one active enrollment per user/course. Free courses grant enrollment directly without a fake payment; paid enrollment references a unique `order_item_id`.

Progress is scoped to the enrollment, not only the user/course, so re-enrollment preserves separate learning history. All progress mutations are validated by a trusted server operation. Required lessons and required assessments must be complete/passed; optional content does not block. Video completion defaults to at least 90% watched or a verified ended event; server validation prevents simple client forgery.

`course_completions` stores an immutable snapshot of completion rule version and requirement counts. Later required curriculum changes do not invalidate a learner's earlier legitimate completion or certificate.

### Assessments

`quizzes` is stable identity; `quiz_versions` stores version number, immutable published rules, pass threshold, nullable timer/attempt limits, and reveal behavior. Published questions/options/translations/answer keys are immutable. Changes create a new version. Attempts bind to the exact version; `max_attempts = NULL` means unlimited. Exact per-course defaults remain open.

V1 supports single choice, multiple choice, and true/false. Free-text/manual grading is deferred. Answers autosave through owner/state/deadline-checked server operations. Server timestamps control attempt start/expiry/submission; scoring and pass status are server-computed. Score/pass may be revealed after submission by version policy; correctness/explanations only when explicitly configured. Answer keys have no learner/instructor access and are not included in content projections. Historical answers/results remain tied to the exact version.

### Certificates

Eligibility requires an authoritative completion snapshot and any required final assessment passed. Store issue locale (`en`/`ar`), unique certificate number, random public verification token hash, issued/revoked times, and replacement link. Reissue creates a new row; it never overwrites prior history. At most one certificate is active per completion. Public verification reveals only learner display name, course name, issue date, certificate number, and status. No private profile fields or internal IDs.

### Orders and payments

V1 supports one-time course purchases and free courses; checkout initially may contain one course, but model `orders` and `order_items`. No subscriptions, bundles, complex cart, or tax engine in V1. Store currency on each order/payment and amounts in integer minor units. Do not hardcode launch currency; it remains open. Webhooks are verified and idempotent; paid item grants one enrollment. Full refund normally revokes paid access if refunds are enabled; explicit admin override is allowed and audited. Detailed refund policy/ledger remains open.

## 10. RLS and authorization model

RLS is enabled on every one of the 45 proposed tables; default deny. The instructor column below describes no additional access from attribution.

Enable RLS on every table in an exposed schema, including tables that are intended to be server-only. Deny by default. The service-role key remains server-only and bypass use is limited to explicitly privileged operations. Use `auth.uid()` for row ownership; never treat hidden controls or a submitted `user_id` as authorization.

RLS and SQL privileges are separate gates: grant Data API/table access only to intended roles, then use row policies for authorization. The Supabase Data API exposure setting is separate from grants and RLS; expose only the intended schema/tables. `TO authenticated` is not an ownership check; policies must compare the row owner with `(select auth.uid())`. Any owner update policy needs both `USING` and `WITH CHECK`, and PostgreSQL also requires a matching SELECT policy for an UPDATE to affect rows. Index columns used by owner, membership, and entitlement predicates. Views bypass RLS by default; any exposed projection must use invoker security on supported PostgreSQL versions or live in an unexposed schema/server endpoint with narrowly granted access. Avoid `auth.role()` checks; target the intended database role and verify a real user identity.

| Table | Anonymous | Learner | Instructor | Organization manager | Admin |
|---|---|---|---|---|---|
| `profiles` | No direct table access; curated public instructor projection only | Read/update own allowlisted fields | No permission from attribution; own learner rights only | Later: scoped member display fields only | Trusted server; privileged edits audited |
| `learner_preferences` | No access | Read/update own | No permission from attribution; own learner rights only | No member preference access | Trusted support only when required |
| `user_roles` | No access | Read own grants; cannot mutate | No permission from attribution; own learner rights only | No access | Trusted role-grant service only |
| `courses` | Read published catalog fields | Read published catalog | No permission from attribution; own learner rights only | Later: catalog and assigned allocations | Trusted authoring service; draft access |
| `course_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | Later: allocated course outline | Trusted authoring service |
| `course_instructors` | Read published instructor attribution | Read published attribution | No permission from attribution; own learner rights only | Later: allocated course attribution | Trusted authoring service |
| `course_modules` | Read published outline only | Read published outline | No permission from attribution; own learner rights only | Later: allocated outline only | Trusted authoring service |
| `module_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | Later: allocated outline only | Trusted authoring service |
| `lessons` | No protected lesson data; approved preview only | Read published lesson metadata/body only with enrollment or preview | No permission from attribution; own learner rights only | Later: outline only unless separately enrolled | Trusted authoring service |
| `lesson_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | Later: allocated outline only | Trusted authoring service |
| `lesson_resources` | No access unless approved public preview | Entitled/preview resource via signed access | No permission from attribution; own learner rights only | Later: no file access without entitlement | Trusted authoring service; issue signed links after checks |
| `lesson_resource_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | Later: allocated outline only | Trusted authoring service |
| `lesson_videos` | No access | No provider metadata; playback token issued by server after entitlement check | No permission from attribution; own learner rights only | Later: no playback bypass | Trusted video service only |
| `learning_paths` | Read published path fields | Read published paths | No permission from attribution; own learner rights only | Later: published/allocated paths | Trusted authoring service |
| `path_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | Later: allocated path content | Trusted authoring service |
| `learning_path_courses` | Read rows for published paths | Read published path membership | No permission from attribution; own learner rights only | Later: allocated path membership | Trusted authoring service |
| `enrollments` | No access | Read own; no direct grant/revoke | No permission from attribution; own learner rights only | Later: enrollment/completion/progress and aggregate only; never detailed answers | Trusted grant/revoke service |
| `lesson_progress` | No access | Read own; update via constrained server operation | No permission from attribution; own learner rights only | Later: scoped completion/progress and aggregates only | Trusted support operation, audited |
| `video_progress` | No access | Read own; checkpoint via constrained server operation | No permission from attribution; own learner rights only | Later: no individual checkpoint access by default | Trusted support operation, audited |
| `quizzes` | No access | Read safe published fields with enrollment | No permission from attribution; own learner rights only | Later: no quiz results/keys | Trusted authoring and grading service |
| `quiz_versions` | No access | Entitled published safe settings only | No permission from attribution; own learner rights only | No individual assessment data | Trusted authoring/grading; published immutable |
| `quiz_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | Later: allocated metadata only | Trusted authoring service |
| `questions` | No access | Read safe published question structure with enrollment | No permission from attribution; own learner rights only | No access to assessment content by manager role | Trusted authoring/grading service |
| `question_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | No access by default | Trusted authoring service |
| `question_options` | No access | Read safe options with enrollment | No permission from attribution; own learner rights only | No access by default | Trusted authoring/grading service |
| `option_translations` | Exact-locale published row only | Exact-locale published row only | No permission from attribution; own learner rights only | No access by default | Trusted authoring service |
| `quiz_answer_keys` | No access | No access | No permission from attribution; own learner rights only | No access | Assessment service only; never direct admin client read |
| `quiz_attempts` | No access | Read own safe results; create/start/submit through assessment service | No permission from attribution; own learner rights only | Later: aggregates only, no detailed answers | Trusted grading/support operation, audited |
| `quiz_answers` | No access | Read own permitted answer state; writes only through assessment service while valid | No permission from attribution; own learner rights only | No individual answers | Trusted grading/support operation, audited |
| `quiz_answer_selections` | No access | Read own permitted selections; writes only through assessment service while valid | No permission from attribution; own learner rights only | No individual answers | Trusted grading/support operation, audited |
| `course_completions` | No access | Own completion summary | No permission from attribution; own learner rights only | Later completion/progress summary only; no detailed answers | Completion service; support access audited |
| `certificates` | No direct table access; limited verification endpoint only | Read own certificates by joining enrollment ownership | No permission from attribution; own learner rights only | Later: approved completion aggregates only | Trusted issue/revoke service |
| `orders` | No access | Read own order | No permission from attribution; own learner rights only | No payment/member detail access | Trusted commerce service |
| `order_items` | No access | Own item snapshots | No permission from attribution; own learner rights only | No access | Commerce service |
| `payments` | No access | Read own safe payment status only | No permission from attribution; own learner rights only | No access | Payment service only |
| `payment_webhook_events` | No access | No access | No permission from attribution; own learner rights only | No access | Payment service only; no client mutation |
| `organizations` | No access | Later: own organization metadata only | No permission from attribution; own learner rights only | Later: own organization only | Trusted organization service |
| `organization_members` | No access | Later: own membership only | No permission from attribution; own learner rights only | Later: own organization membership scope | Trusted organization service |
| `organization_invitations` | No access | Later: accept own opaque invitation only | No permission from attribution; own learner rights only | Later: create/revoke own organization invitations | Trusted organization service |
| `organization_course_assignments` | No access | Later: own assignment only | No permission from attribution; own learner rights only | Later: own organization assignments | Trusted organization service |
| `calendar_events` | No access unless explicitly public | Later: own or entitled events | No permission from attribution; own learner rights only | Later: approved organization events only | Trusted event service |
| `notifications` | No access | Later: read/update own notification state | No permission from attribution; own learner rights only | No member notification access | Trusted notification service |
| `ai_conversations` | No access | Later: own conversation metadata | No permission from attribution; own learner rights only | No access | Restricted, audited support only if approved |
| `ai_messages` | No access | Later: own messages | No permission from attribution; own learner rights only | No access | Restricted, audited support only if approved |
| `admin_audit_log` | No access | No access | No permission from attribution; own learner rights only | No access | Trusted append/read, restricted and audited; append-only |

The organization-manager column is explicitly future policy, not permission to inspect employees by default. Build one documented authorization helper or server policy per trust boundary; test owner spoofing, cross-user IDs, unpublished content, answer-key reads, and direct writes to server-managed state.

## 11. Constraints and deletion behavior

- **Identity/roles:** profile ID equals Auth UUID. Roles are protected `admin`/`instructor` grant records with grantor/revoker and retained history; no client self-write. Instructor attribution is not authorization.
- **Localization:** every normalized translation uses unique `(entity_id,locale)` and locale check `en`/`ar`; locale publication status/time is independent. A published locale requires its own required text and published ancestors. No fallback across LMS content locales.
- **Ordering/content:** positive unique positions for modules/course, lessons/module, path courses/path, questions/version, options/question, instructor attribution/course, and lesson resources/locale. Course slug unique; lifecycle checks and nonnegative price. Resources require exactly one object key or external URL. Videos support locale-specific assets; null locale requires an explicit language-neutral flag, at most one neutral mapping per lesson, and no ambiguous overlap with locale-specific rows.
- **Enrollment/progress:** status `active/completed/revoked/expired`; nullable `expires_at`, no V1 default expiry; if set, after enrollment time. Completed time agrees with state. Re-enrollment creates history row. Partial unique active `(user_id,course_id)` and partial unique nonnull order item. Progress unique per enrollment/lesson or enrollment/video; percentage 0-100; seconds nonnegative and bounded; completion fields agree with status. Server verifies course and owner consistency.
- **Assessment:** one quiz per lesson; unique positive version number per quiz; pass basis points 0-10000; nullable positive duration/max attempts (`NULL` means unlimited); question types limited to single choice/multiple choice/true-false; points nonnegative; unique ordered questions/options. Composite FKs ensure answers and protected answer keys belong to the same version/question. Published version content is immutable. Attempt binds exact version, attempt number positive, server timestamps ordered, score bounded by possible score, final state has submission/result. One active attempt per user/version. Validate required answer-key cardinality before publishing.
- **Completion/certificates:** one immutable completion snapshot per enrollment; counts valid and completion time captured. Certificate references completion, has unique number and random token hash, locale `en`/`ar`, issue before revocation, and at most one unrevoked certificate per completion. Reissue is a new linked row.
- **Commerce/audit:** amounts are nonnegative integer minor units; order totals reconcile to item snapshots; currency matches across confirmed order/items/payment. Unique `(order_id,course_id)`, provider/reference, and `(provider,provider_event_id)`. One enrollment per order item. Confirmed snapshots are immutable. Audit log is append-only, typed target FKs (no polymorphic target), safe metadata only, and high-value events only.
- **Deletion:** cascade only dependent translations/preferences without independent history. Restrict deletion of courses/content with progress or attempts, enrollments, quiz versions used by attempts, completions, certificates, orders, payments, role grants, and audit history. Use `SET NULL` only where event evidence survives and privacy handling is defined. Archive/revoke instead of deleting history. Storage cleanup is separately authorized.

## 12. Index plan

Primary and unique indexes are implicit. Add indexes for non-leading FK lookups and known catalog, learner, idempotency, and audit paths; do not duplicate unique/order indexes.

| Index | Reason |
|---|---|
| Partial `courses(category,level,created_at DESC) WHERE status='published'` | Published catalog filters and newest listing |
| `(locale,parent_id)` on each translation table | Exact-locale catalog/content fetch; parent-first PK does not cover locale-first lookup |
| Partial unique `user_roles(user_id,role) WHERE revoked_at IS NULL` | Current role check and no duplicate active grants |
| `course_instructors(profile_id,course_id)` | Reverse lookup of profile-linked attribution only; never an authorization grant |
| Unique parent/position keys for modules, lessons, path items, resources, questions, options | Ordered reads and no duplicate positions; no extra index required |
| `lesson_resources(lesson_id,locale,position)` and `lesson_videos(lesson_id,locale)` | Exact-locale ordered resources/media |
| `learning_path_courses(course_id,path_id)` | Reverse path lookup |
| Partial unique `enrollments(user_id,course_id) WHERE status='active'`; `(user_id,status,enrolled_at DESC)`; `(course_id,status)` | Entitlement uniqueness and dashboard/authorized roster |
| Partial unique `enrollments(order_item_id) WHERE order_item_id IS NOT NULL` | Prevent duplicate grant from one paid item |
| `lesson_progress(enrollment_id,updated_at DESC)`, `(lesson_id,enrollment_id)`; video equivalents | Dashboard/resume and parent FK/course joins |
| Unique `quiz_versions(quiz_id,version_number)` | Resolve immutable version history |
| `quiz_attempts(user_id,quiz_version_id,started_at DESC)`, `(quiz_version_id,status,submitted_at)`; partial unique active `(user_id,quiz_version_id)` | History, retry checks, reporting and concurrency |
| Answer/selection reverse FK indexes on question/option IDs | Validate composite relationships; attempt PK covers direct answer lookup |
| Unique `course_completions(enrollment_id)` | One snapshot per enrollment |
| Partial unique `certificates(course_completion_id) WHERE revoked_at IS NULL`; `(course_completion_id,issued_at DESC)` | Current certificate and reissue history |
| `orders(user_id,created_at DESC)` | Learner order history |
| Unique `(order_id,course_id)` plus `(course_id,order_id)` on order items | Item uniqueness and course reconciliation |
| `payments(order_id,created_at DESC)`; unique provider/reference | Payment history and provider idempotency |
| Unique `(provider,provider_event_id)`; webhook `(payment_id,received_at)` and `(processing_status,received_at)` | Deduplication, reconciliation and retry queue |
| `admin_audit_log(actor_id,occurred_at DESC)`, `(accessed_user_id,occurred_at DESC)`, `(action,occurred_at DESC)` | Actor, sensitive access and action investigations |
| Later organization `(organization_id,status)`, `(user_id,organization_id)` | Scoped future manager queries |
| Later notification `(user_id,read_at,created_at DESC)` | Inbox if shipped |
| Later calendar `(starts_at)`, `(course_id,starts_at)` | Event lookup if shipped |
| Later AI `(conversation_id,created_at)` | Ordered history if persisted |

Every FK used by joins, RLS, or deletion checks needs an index whose leading columns cover the lookup. Composite primary/unique indexes cover leftmost prefixes. Validate plans against actual queries before adding more.

## 13. Storage plan

Use Supabase Storage only for files, not relational records. Candidate buckets:

- `avatars`: private user-owned images, constrained size/type; serve through short-lived signed URLs or an explicitly reviewed public profile-image policy.
- `course-resources`: private by default; access checks must verify published preview or enrollment before issuing a signed URL. Object paths are identifiers, not authorization.
- `certificate-files`: defer until generated/downloadable certificate requirements are confirmed; private and tied to an issued certificate.
- Course video bytes stay with Mux, not Supabase Storage. Keep provider IDs in `lesson_videos` and issue playback access only after server-side enrollment checks.

Define bucket object policies alongside migrations. Never trust a client-supplied path, MIME type, or user ID as authorization.

## 14. Transaction boundaries and database functions

1. **Payment confirmation to entitlement:** verify webhook signature; persist unique provider event; lock payment/order; validate provider reference, amount, currency and legal state; update payment and finalize order; create one enrollment per paid order item; mark event processed atomically. Duplicate events cannot repeat transitions/grants. Free enrollment bypasses payment. A confirmed full refund, if supported, normally revokes access; explicit admin override is audited. Preserve refund/payment history.
2. **Assessment submission to result/completion:** validate owner, exact immutable version, active state, deadline and answer relationships; freeze autosaved answers; score/pass server-side using protected keys; finalize attempt; evaluate whether completion requirements are met in one transaction. Reject replay and post-submit writes.
3. **Course completion to certificate:** evaluate all required lessons and required assessments against the completion rule; write immutable completion snapshot; update enrollment; issue certificate if eligible; enforce uniqueness and retain revoke/reissue history atomically. Later curriculum edits do not invalidate prior completion.
4. **Privileged action/audit:** role changes, manual enrollment grant/revoke, certificate issue/revoke/reissue, payment reconciliation/refunds, assessment corrections, and sensitive support/admin reads are purpose-authorized and recorded in `admin_audit_log`; do not log ordinary CRUD or sensitive values.

Use short trusted transactions. Prefer `SECURITY INVOKER`; justified `SECURITY DEFINER` functions require fixed safe `search_path`, qualified relations, caller/role validation, narrow grants, revoked default `PUBLIC` execute, and documented RLS bypass.

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

1. Foundation and protected Auth/profile/role/audit model.
2. Catalog, exact-locale translations and independent publication, attribution, ordered curriculum, resources/video boundary, paths.
3. Individual enrollment and per-enrollment lesson/video progress; completion-rule snapshot.
4. Immutable quiz versions, isolated answer keys, autosaved attempts, server grading.
5. Completion and certificate issue/revoke/reissue with narrow verification.
6. Orders/order_items, payments and webhook receipts; add enrollment `order_item_id` FK with commerce phase; grant idempotently per item.
7. Storage policies and cleanup plan.
8. Later domains only after separate scope: organizations/manager reporting, calendar/live sessions, notifications, AI history, refund ledger if needed.

This is a design sequence only. It does not authorize creating SQL, migrations, connecting Supabase, or beginning the next phase.

## 19. Open product questions

Only these launch/business decisions remain unresolved:

1. Launch currency/currencies.
2. Refund policy and access behavior details, including partial refunds and whether a dedicated refund ledger is needed.
3. Legal/data retention periods and account-deletion/anonymization obligations.
4. Whether persistent calendar/live sessions are required in V1.
5. Whether notifications are required in V1.
6. Final Arabic/English certificate visual policy if bilingual presentation is desired.
7. Exact assessment attempt limits/defaults per course.
8. Exact video-completion threshold if different from the recommended 90% watched or verified ended event.

The schema accommodates these choices without changing the approved core relationships: currency is per order/payment, attempt limits are configurable with nullable unlimited semantics, and the video threshold can be configured. Calendar and notifications remain deferred unless the launch decision changes.

## 20. Migration design readiness

The architecture is ready for initial migration design. Migration design must preserve these relationships and must not invent the eight open launch decisions. This document creates no SQL or migrations; implementation requires a separate request.

## 21. Public versus private data summary

- **Public:** published catalog fields, published path presentation, and a deliberately limited certificate-verification response.
- **Authenticated owner only:** profile/preferences, enrollment, progress, attempts/results, certificates, orders/payment status, and future AI history.
- **Privileged:** draft/admin content, role grants, answer keys, webhook event details, payment reconciliation, certificate issuance, and V1 audit records are privileged and restricted.
- **Enrollment-gated:** lesson bodies, resources, quiz content, and protected video playback, subject to explicit previews.

## 22. Next step

The initial identity foundation migration creates `profiles`, `learner_preferences`, `user_roles`, and role-grant audit records. It includes profile/preference update timestamps, safe profile/preference creation for new Auth users, protected elevated-role history, explicit grants, and owner-scoped RLS. There is no learner role row; ordinary learners receive no elevated grant.

The current workflow connects local Next.js to the dedicated hosted Supabase DEV project. The migrations in `supabase/migrations/` are applied there, and the CLI reports local and remote migration histories in sync. `npm run db:types` generates `src/types/database.ts` from the linked database. `npm run db:test:hosted` passed using ordinary anonymous/authenticated clients for authorization assertions; its server-only service key was limited to disposable user setup and cleanup. The pgTAP suite in `supabase/tests/database/` is retained and **NOT RUN** because it requires a local/CI PostgreSQL/Supabase environment with Docker. Local `supabase/config.toml`, `db:reset`, and `db:test` remain optional future workflows. Never run remote reset/drop commands.

Signup remains a demo UI. The localized Proxy refreshes Supabase sessions and composes its cookies with next-intl routing, but it does not gate routes. Auth onboarding, password recovery, email verification, and app-level role grants remain a separate phase. Courses, learning, assessments, certificates, commerce, storage, and other later domains remain unimplemented.
