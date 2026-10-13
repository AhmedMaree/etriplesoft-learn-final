# Foundation — Phases 00 to 06

These phases build the ground everything else stands on: a checked baseline, a clean app structure, the design rules, two languages, the database, login, and admin permissions.

---

## Phase 00 — Repository Baseline
**What this phase does:** Takes inventory of the whole project: routes, source files, migrations, types, tests, and the names of environment variables. It also writes the roadmap and the phase documents themselves.

**What you can expect when finished:** An accurate map of what exists today, stale status documents corrected, and the roadmap and phase contracts in place. It does not test the app, so it says nothing about whether the app is healthy.

**Where it stands:** VERIFIED.

---

## Phase 01 — Next.js Application Architecture
**What this phase does:** Checks that the Next.js structure is sound: the `[locale]` routes, the `(learner)` and `(auth)` route groups, which pages are Server Components, and how features are organised under `src/features/`.

**What you can expect when finished:** Confidence that all 30 routes work in English and Arabic at eight screen widths, that old URLs redirect properly, and that unknown locales return 404. No code is rewritten. It only confirms the structure is good.

**Where it stands:** VERIFIED.

---

## Phase 02 — Design System and Responsive Foundation
**What this phase does:** Compares the shared building blocks (buttons, inputs, header, footer, shell) with the approved design and writes down the design tokens. It fixes only real regressions and does not redesign anything.

**What you can expect when finished:** Screenshot evidence that shared UI matches the approved design for guests and for logged-in users, in both languages.

**Where it stands:** VERIFICATION REQUIRED. Guest screenshots exist, but logged-in screenshots are missing because there is no test session available. Some broken Arabic text was repaired (76 strings, plus garbled symbols).

---

## Phase 03 — English / Arabic / RTL Foundation
**What this phase does:** Moves all interface text into the message files (`messages/en.json`, `messages/ar.json`) and makes sure Arabic lays out right-to-left correctly, with Western digits and mixed English/Arabic text handled well.

**What you can expect when finished:** Every screen reads properly in both languages, the Arabic font is signed off, and page metadata is localized.

**Where it stands:** VERIFIED on your manual English/Arabic review. The font is approved (IBM Plex Sans Arabic). Native-speaker review of the retranslated Arabic is still open (decision D09).

---

## Phase 04 — Supabase Database Foundation
**What this phase does:** Checks that the local migrations match the hosted DEV database without resetting anything. It validates the security rules (RLS), permissions, triggers and the private avatar storage.

**What you can expect when finished:** Proof that the identity tables (profiles, roles, preferences, audit log) and avatar storage are locked down correctly, and that the generated types match the real database.

**Where it stands:** VERIFIED (by your decision). The missing local database test run was completed once Docker was installed.

---

## Phase 05 — Auth, Profiles and Onboarding
**What this phase does:** Proves that real sign-up, email confirmation, login, password recovery, logout and session refresh work in English and Arabic. It also checks that student/professional onboarding saves correctly and that profile, preferences and avatar upload work.

**What you can expect when finished:** People can create an account, log in, reset a password and manage their profile for real. It covers individual accounts only. Company invitations and production email are not part of it.

**Where it stands:** VERIFIED, with documented accepted gaps (see its Evidence checkpoint 3).

---

## Phase 06 — Admin Authorization and Audit
**What this phase does:** Sets up who counts as an admin and how that is enforced on the server. It adds a controlled way to make the first admin, to grant and revoke roles, and an audit log that records those actions.

**What you can expect when finished:** An admin role that cannot be faked from the browser, with every grant or revoke recorded permanently. This is the base for all admin screens later. It has no course editor or support console yet.

**Where it stands:** VERIFIED (by your decision). Local database tests 74/74 and the live lifecycle test 11/11 passed. Native Arabic review, a manual reviewer sign-off and a screen-reader pass were not done and are accepted gaps.
