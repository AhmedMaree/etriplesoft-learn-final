# Phases in Plain Language — Start Here

These files explain the 41 phase documents in `docs/phases/` (Phase 00 to Phase 40) without the jargon.
They are a **reading guide only**. The real contracts, gates and evidence stay in `docs/phases/`, and those win if the two ever disagree.

Snapshot taken from the docs on **2026-10-12**. Status words come straight from each phase file.

## How to read each phase

Every phase entry has the same three parts:

- **What this phase does** — the job, in one or two sentences.
- **What you can expect when it is finished** — what will exist and work.
- **Where it stands now** — the status written in the phase file.

## The files

| File | Phases | Theme |
|---|---|---|
| [1-foundation.md](1-foundation.md) | 00–06 | Baseline, Next.js structure, design, languages, database, login, admin permissions |
| [2-courses-and-enrollment.md](2-courses-and-enrollment.md) | 07–13 | Courses, lessons, catalog, enrollment, video, learning player, progress |
| [3-learning-outcomes-and-money.md](3-learning-outcomes-and-money.md) | 14–22 | Quizzes, completion, certificates, checkout, payments, paths, dashboard |
| [4-optional-features-and-admin.md](4-optional-features-and-admin.md) | 23–29 | Calendar, notifications, AI assistant, community, admin screens |
| [5-quality-and-launch.md](5-quality-and-launch.md) | 30–40 | SEO, accessibility, performance, security, production, launch |

## Status at a glance

| Phase | Name | Status |
|---|---|---|
| 00 | Repository baseline | VERIFIED |
| 01 | Next.js architecture | VERIFIED |
| 02 | Design and responsive foundation | VERIFICATION REQUIRED |
| 03 | English / Arabic / RTL foundation | VERIFIED |
| 04 | Supabase database foundation | VERIFIED |
| 05 | Login, profiles, onboarding | VERIFIED |
| 06 | Admin authorization and audit | VERIFIED |
| 07 | Course domain | VERIFIED |
| 08 | Curriculum domain | VERIFIED |
| 09 | Catalog and content integration | VERIFIED |
| 10 | Enrollment and entitlements | VERIFIED (user EN/AR visual/accessibility sign-off recorded 2026-10-12) |
| 11 | Protected video / Mux | IN PROGRESS (Mux-specific D15 decisions approved; local DB/provider verification pending) |
| 12–22 | Player, progress, quizzes, completion, certificates, orders, payments, paths, dashboard | PLANNED |
| 23, 24, 26 | Calendar, notifications, community | PLANNED, scope DEFERRED |
| 25 | AI assistant | PLANNED |
| 27–29 | Admin screens (courses, learners, commerce) | PLANNED |
| 30 | SEO and metadata | IN PROGRESS |
| 31–40 | Accessibility, QA, performance, security, observability, content audit, infrastructure, deployment, E2E, launch | PLANNED |

`PRODUCTION-READINESS.md` currently says the overall product is **NOT READY** for launch.

## The big picture in one paragraph

You already had a polished demo (fake courses, fake progress, fake checkout). The phases replace each fake piece with a real, secure, server-controlled one, in this order:
**foundation → courses → who may watch them → video and player → progress → quizzes → completion → certificates → payments → dashboard → admin tools → quality checks → production → launch.**

## Audit findings (things worth your attention)

These are inconsistencies I found while reading the phase files. None of them were changed. They are for you to decide on.

1. **Phase 03 is VERIFIED but its predecessor Phase 02 is not.** The README rule says a dependent phase must not start until its predecessor is VERIFIED. Phase 03 notes that you accepted this with limits. Phase 05 depends on Phase 03, so the chain 02 → 03 → 05 rests on an unverified Phase 02.
2. **Phase 30 (SEO) is IN PROGRESS but needs Phases 18 and 21, which are only PLANNED.** Only the already-existing metadata work should count. Anything needing certificates or learning paths cannot be finished yet.
3. **Phase 10 is VERIFIED.** Local database checks passed 263/263, concurrency passed 8/8, Hosted DEV enrollment checks passed 32/32, and the user reviewed the captures and approved the manual EN/AR visual/accessibility checklist on 2026-10-12. A pre-migration backup was not taken; a transient retry simulation remains untested.
4. **Several "Evidence" lines inside older phase files are stale.** Phase 04 says "four migrations exist" (there are now 15 files in `supabase/migrations`). Phase 06 says "no admin routes exist" while the phase is VERIFIED. Read the status line and the later evidence sections, not the first "Evidence" sentence.
5. **Phase 11 (video) is in progress.** On 2026-10-12, Mux ownership, separate Development/Production environments, signed playback, authorized admin/assigned-instructor uploads and reviewed English/Arabic captions when required were approved. Local DB and provider lifecycle verification remains pending; Hosted DEV has not been changed. Kashier/OpenAI decisions remain open under D15.
6. **Open decisions block real work later.** D02 (refunds), D03 (privacy and retention), D07/D16 (quiz limits and grading), D08 (video completion), D17 (completion rules), D19 (paths), D21 (AI scope) and D27 (launch ownership) are all still OPEN. Each one stops a specific phase from being finished. The list is in `docs/phases/OPEN-DECISIONS.md`.
7. **Arabic typography (D09) is only partly approved.** The font is approved. Full eight-width visual sign-off and native-speaker review are still open.
8. **The working tree is uncommitted.** Phase 09 and Phase 10 work (catalog pages, enrollment actions, migrations, tests) shows as modified or untracked in git, so none of it is in a commit yet.
