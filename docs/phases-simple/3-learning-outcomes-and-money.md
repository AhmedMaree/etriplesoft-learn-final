# Learning Outcomes and Money — Phases 14 to 22

These phases cover quizzes, finishing a course, certificates, paying for courses, learning paths, and the real dashboard. All are PLANNED today.

---

## Phase 14 — Assessment Domain
**What this phase does:** Creates the database model for quizzes: single choice, multiple choice and true/false. Published quiz versions can never be edited. Answer keys and explanations are stored where learners cannot read them.

**What you can expect when finished:** Quizzes live in the database in both languages, with the correct answers hidden. Today the correct answers are shipped in the browser (`demo-assessment.ts`). There is no attempt-taking yet.

**Needs:** Phases 08 and 10. **Open decisions:** D07 (attempt limits), D16 (pass marks and reveal rules).

---

## Phase 15 — Assessment Attempts and Server Grading
**What this phase does:** Lets a learner start a quiz attempt with a server-kept deadline and retry limit. Answers autosave, and the server marks the attempt and decides pass or fail in one safe step.

**What you can expect when finished:** Scores that cannot be tampered with from the browser. Repeat or simultaneous submissions are handled safely. It does not issue certificates or change the quiz screen.

**Needs:** Phase 14.

---

## Phase 16 — Assessment UI
**What this phase does:** Replaces the demo quiz screen (browser timer, localStorage answers, local scoring) with one that talks to the secure services from Phase 15.

**What you can expect when finished:** A quiz screen that shows the server timer, autosave state, retry and result rules, and lets a learner resume. Demo answer keys are removed from production code.

**Needs:** Phases 03, 12 and 15.

---

## Phase 17 — Course Completion
**What this phase does:** Decides when a learner has really finished a course: all required lessons done and all required assessments passed. It saves a permanent snapshot of the rules used.

**What you can expect when finished:** One trusted answer to "did this person complete the course?", which does not change later if the curriculum changes. Certificates and checkout are separate.

**Needs:** Phases 13, 15 and 16. **Open decision:** D17.

---

## Phase 18 — Certificates
**What this phase does:** Issues certificates only from real completion. A certificate can be in English or Arabic, can be verified publicly by a random token, and can be revoked or reissued with history kept.

**What you can expect when finished:** The fake "Ahmed Salah, March 2024" certificate page is replaced with real certificates and a public verification page. Whether the English and Arabic versions are combined or separate is still open (D06).

**Needs:** Phases 06 and 17.

---

## Phase 19 — Orders and Checkout
**What this phase does:** Creates real orders for one-time course purchases. The server stores the price and currency at purchase time and checks the totals. It also adds the link from a paid enrollment back to its order.

**What you can expect when finished:** The demo checkout (local USD math, `LEARN10` coupon) is replaced with a real order record in EGP. Coupons, subscriptions, bundles, tax and fake card handling are not included.

**Needs:** Phases 07 and 10. **Decisions:** D01 is approved (EGP only).

---

## Phase 20 — Kashier Payments
**What this phase does:** Starts payment on Kashier's hosted page from the server, receives and de-duplicates their webhooks, and grants paid access in one atomic step. It also covers reconciliation and the agreed refund rules.

**What you can expect when finished:** A learner pays through Kashier and gets access automatically. Today the pay button only shows a toast. The site never collects card numbers itself.

**Needs:** Phases 06 and 19. **Open decisions:** D02 (refunds), D15 (provider accounts).

---

## Phase 21 — Learning Paths
**What this phase does:** Lets admins publish ordered groups of courses in English and Arabic, and shows each learner's progress along a path.

**What you can expect when finished:** The three hard-coded paths in `learning-widgets.tsx` become real data. Whether prerequisites are enforced is still undecided (D19).

**Needs:** Phases 07 and 17.

---

## Phase 22 — Real Learner Dashboard
**What this phase does:** Fills the dashboard with the learner's own data: enrollments, recent lessons, progress, completions and certificates, with honest empty and error states.

**What you can expect when finished:** The fixed numbers and fake "continue learning" cards disappear. The streak and rating claims go too, unless you approve them (D20). No recommendation engine.

**Needs:** Phases 09, 18 and 21.
