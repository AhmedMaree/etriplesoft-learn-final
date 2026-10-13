# Quality, Production and Launch — Phases 30 to 40

These phases check, harden and ship the finished product. Most can only start once the feature phases are done.

---

## Phase 30 — SEO and Metadata
**What this phase does:** Finishes search-engine setup: which public pages are indexed, sitemap and robots files, and canonical and alternate links per language. Private pages (login, checkout, admin) stay out of the index.

**What you can expect when finished:** Search engines index course, path and certificate-verification pages correctly in both languages. Today localized metadata exists, but there is no sitemap or robots route, and the production hostname is hard-coded and unconfirmed (D23).

**Needs:** Phases 09, 18 and 21. **Status:** IN PROGRESS, though Phases 18 and 21 are only planned.

---

## Phase 31 — Accessibility Audit
**What this phase does:** Audits every learner and admin screen for keyboard use, focus, labels, contrast and screen-reader behavior, in English and Arabic, and fixes confirmed problems.

**What you can expect when finished:** A recorded accessibility audit against the agreed target (proposed WCAG 2.2 AA, decision D24). It is not a legal compliance statement.

**Needs:** Phases 16, 22, 25, 27, 28 and 29.

---

## Phase 32 — Responsive and Visual QA
**What this phase does:** Runs the full screen-by-screen check, logged in and logged out, in both languages and at the eight widths, and compares every changed screen to the approved reference.

**What you can expect when finished:** Proof that all included screens, including the new admin ones, look right on phones, tablets and desktops. Today's sweep does not log in, so protected pages may only be showing the login page.

**Needs:** Phases 03, 16, 22, 25, 27, 28, 29 and 31.

---

## Phase 33 — Performance
**What this phase does:** Measures real workflows for slow database queries, heavy pages and images, then fixes the measured problems.

**What you can expect when finished:** Written performance budgets with reproducible results. Budgets are not set yet (D25).

**Needs:** Phases 22, 25, 27, 28 and 29.

---

## Phase 34 — Security, Privacy and Legal Hardening
**What this phase does:** Reviews every trust boundary from end to end, fixes real findings, and builds the approved data retention, export and deletion processes. It also puts real, reviewed English and Arabic terms, privacy and refund pages behind the checkout links.

**What you can expect when finished:** A tested security review and real legal links instead of demo toasts. It is not legal advice, and legal wording needs a human owner (D24).

**Needs:** Phases 20, 22, 25, 27, 28 and 29. **Open decisions:** D02, D03.

---

## Phase 35 — Observability
**What this phase does:** Adds error monitoring and alerts for login, learning, payment and provider failures, using safe correlation IDs. It collects only approved analytics.

**What you can expect when finished:** You find out about problems before learners report them, without collecting unnecessary personal data. The monitoring tool is not chosen yet (D26).

**Needs:** Phases 20, 22, 25, 27, 28 and 29.

---

## Phase 36 — Content and Translation Audit
**What this phase does:** Loads and reviews the real launch courses, lessons and quizzes in English and Arabic, checks media rights and captions, and removes leftover demo claims, dead links and promises of unsupported features.

**What you can expect when finished:** Launch content that is genuinely bilingual and approved, and a site that does not advertise anything it cannot do, including the truthful handling of calendar, notifications and community.

**Needs:** Phases 03, 22, 25, 27, 30 and 34.

---

## Phase 37 — Production Infrastructure
**What this phase does:** Sets up the real production environment: a separate Supabase project, Vercel, domains and TLS, approved auth callbacks, branded email, Mux, Kashier and OpenAI production keys, backups and restore runbooks.

**What you can expect when finished:** An empty, ready production environment. No schema is applied and no learner can use it yet. Backup targets and ownership are undecided (D27).

**Needs:** Phases 32, 33, 34, 35 and 36.

---

## Phase 38 — Production Deployment
**What this phase does:** Applies the reviewed migrations to production in order, deploys the exact verified build with approved content, runs smoke checks, and records rollback points.

**What you can expect when finished:** The app live on production infrastructure with a full record of what was applied and how to go back. Public launch does not happen automatically.

**Needs:** Phase 37.

---

## Phase 39 — Final End-to-End QA
**What this phase does:** Tests complete journeys on the release candidate: free and paid learner paths from sign-up to certificate, the admin lifecycle, and provider failure recovery, then repeats the language, responsive, accessibility and security smoke checks on the deployed build.

**What you can expect when finished:** Evidence that the whole product works as one. A sandbox payment passing does not prove the live merchant account is configured.

**Needs:** Phase 38.

---

## Phase 40 — Launch Readiness and Handoff
**What this phase does:** Reviews every gate, resolves launch blockers, confirms owners, support, incident response, backup and rollback drills, and obtains an explicit release decision.

**What you can expect when finished:** A signed-off launch decision and an operating handoff. After it, nothing else runs automatically.

**Needs:** Phase 39.

---

## Reference files in `docs/phases/`

| File | What it is |
|---|---|
| `README.md` | Rules for running phases, status words, and the final-report format |
| `DEPENDENCY-MAP.md` | Which phase needs which, and what can run in parallel |
| `VERIFICATION-MATRIX.md` | Tracking table of required checks per phase |
| `OPEN-DECISIONS.md` | Product decisions D01–D27 that still need your answer |
| `PRODUCTION-READINESS.md` | Launch checklist by area (currently NOT READY overall) |
| `PHASE-TEMPLATE.md` | The 28-section template every phase follows |
| `PHASE-10-HOSTED-DEV-PREFLIGHT.md` | The plan and approvals needed before applying Phase 10 to hosted DEV |
