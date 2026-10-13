# Courses and Enrollment — Phases 07 to 13

These phases replace the fake demo courses with real ones, decide who may access them, and add the video, the lesson player and progress tracking.

---

## Phase 07 — Course Domain
**What this phase does:** Creates the real database tables for courses: identity, slug, price, status, an English and Arabic translation for each course, and the list of instructors shown on a course.

**What you can expect when finished:** Courses live in the database, not in a code file. Each language is published separately, so an unpublished translation never appears. Prices are stored in EGP only (decision D01). Instructors are labels only and give no permissions. The six demo courses are loaded as clearly marked DEV placeholders.

**Where it stands:** VERIFIED (2026-10-11), locally and on hosted DEV.

---

## Phase 08 — Curriculum and Resources
**What this phase does:** Adds ordered modules and lessons (typed, required or optional, with a preview flag), their English/Arabic text, and a private storage bucket for downloadable resources.

**What you can expect when finished:** A course can have a real outline. The public sees only an outline (titles), never lesson bodies. Resource files sit in a private bucket that anonymous users cannot download. No real curriculum data has been imported yet.

**Where it stands:** VERIFIED (2026-10-11), applied to shared DEV.

---

## Phase 09 — Catalog and Content Integration
**What this phase does:** Connects the website to the real course data. The public catalog (`/catalog`), the learner course list (`/courses`) and the course detail page (`/catalog/[slug]`) now read from the database, with search, filters, pagination, and loading, empty and error states.

**What you can expect when finished:** Visitors see real published courses in their language. If a course has no Arabic version, they get a friendly "not available" message with a link to the English one, never a silent fallback. Old `/detail-course?slug=` links redirect to the new URL. Ratings and review counts no longer appear.

**Where it stands:** VERIFIED (2026-10-12). Local tests, hosted RPC and security checks, and your Arabic review all passed. The 28 temporary test courses were archived afterwards. Real launch courses, prices and Arabic copy are still undecided (D12).

---

## Phase 10 — Enrollment and Entitlements
**What this phase does:** Lets a signed-in learner enroll in a free course and checks that they are allowed to see course content. It keeps a history of enrollments (revoked, expired, re-enrolled) and lets an admin revoke access with an audit record.

**What you can expect when finished:**
- A "Enroll" button on free courses that works safely, even if clicked twice at once (only one active enrollment is created).
- Access rules enforced in the database: only the owner sees their enrollment, and paid access cannot be granted from the browser.
- Learners with access get lesson bodies and resources in the exact language. Everyone else is denied.
- Completed learners keep access until it is revoked or expires (decision D14).
- It does not include payments, course completion, or the lesson player (that is Phase 12).

**Where it stands:** VERIFIED (2026-10-12). The 4 migrations are applied locally and on Hosted DEV. Local tests pass (263/263 database, 8/8 concurrency), the Hosted DEV security suite passes 32/32, and typecheck, lint and build pass. You reviewed the screenshot pack and approved the manual EN/AR visual/accessibility checklist. No pre-migration backup was taken; a transient retry simulation remains untested.

---

## Phase 11 — Protected Video (Mux)
**What this phase does:** Connects Mux for course video. It stores video metadata, listens for Mux events, and creates short-lived signed playback links, but only after confirming the learner is entitled.

**What you can expect when finished:** Course video that cannot be shared by copying a link. English and Arabic course versions share the same video assets (you confirmed this on 2026-10-11). It does not include the player screen or progress credit.

**Where it stands:** IN PROGRESS. Mux-specific D15 decisions were approved 2026-10-12. Local code/config and signature checks pass; local DB/RLS and provider lifecycle checks remain pending. Hosted DEV and deployment settings have not been changed.

---

## Phase 12 — Learning Player
**What this phase does:** Builds the actual lesson screen: module and lesson navigation, lesson text, video, and resources, with deep links and loading, missing and error states.

**What you can expect when finished:** An enrolled learner can open a course at `/learn/{slug}` and work through lessons with accessible controls. Completion is not computed here, and the browser is never the authority on it.

**Where it stands:** PLANNED. Needs Phases 03, 09, 10 and 11.

---

## Phase 13 — Progress Tracking
**What this phase does:** Saves which lessons a learner has finished and where they stopped in a video. It validates checkpoints and calculates progress from required lessons only.

**What you can expect when finished:** Real progress bars, real "continue where you left off" positions, and honest learning-time totals instead of the fixed 30% / 2-of-10 numbers on screen today. Streaks and gamification are not included.

**Where it stands:** PLANNED. Needs Phase 12. Depends on decision D08 (what counts as "video watched").
