# Dependency map

Numbering is a recommended topological order, not a requirement to finish every lower number before an independent branch. Every solid edge is a mandatory VERIFIED predecessor; Blocks is its inverse. Domain implementation and quality verification remain scoped to their owner phases.

```mermaid
flowchart TD
  P00["00 Repository Baseline and Audit"]
  P01["01 Next.js Application Architecture"]
  P02["02 Design System and Responsive Foundation"]
  P03["03 English / Arabic / RTL Foundation"]
  P04["04 Supabase Database Foundation"]
  P05["05 Authentication / Profiles / Learner Onboarding"]
  P06["06 Admin Authorization and Audit Foundation"]
  P07["07 Course Domain"]
  P08["08 Curriculum and Resources Domain"]
  P09["09 Course Catalog and Content Integration"]
  P10["10 Enrollment and Entitlements"]
  P11["11 Protected Video / Mux Infrastructure"]
  P12["12 Learning Player"]
  P13["13 Progress Tracking"]
  P14["14 Assessment Domain"]
  P15["15 Assessment Attempts and Server Grading"]
  P16["16 Assessment UI Integration"]
  P17["17 Course Completion"]
  P18["18 Certificates"]
  P19["19 Orders and Checkout Domain"]
  P20["20 Kashier Payments"]
  P21["21 Learning Paths"]
  P22["22 Real Learner Dashboard"]
  P23["23 Calendar Scope and Integration"]
  P24["24 Notifications Scope and Integration"]
  P25["25 AI Learning Assistant"]
  P26["26 Community / Messages Disposition"]
  P27["27 Course and Content Administration"]
  P28["28 Learner / Enrollment Administration"]
  P29["29 Commerce Administration"]
  P30["30 SEO / Metadata / Public Discoverability"]
  P31["31 Accessibility Audit"]
  P32["32 Responsive and Visual QA"]
  P33["33 Performance Optimization"]
  P34["34 Security / Privacy / Legal Hardening"]
  P35["35 Observability / Error Monitoring / Analytics"]
  P36["36 Content and Translation Audit"]
  P37["37 Production Infrastructure"]
  P38["38 Production Migration / Deployment"]
  P39["39 Final End-to-End Production QA"]
  P40["40 Launch Readiness and Handoff"]
  P00 --> P01
  P01 --> P02
  P01 --> P03
  P02 --> P03
  P00 --> P04
  P01 --> P05
  P03 --> P05
  P04 --> P05
  P04 --> P06
  P05 --> P06
  P04 --> P07
  P06 --> P07
  P07 --> P08
  P03 --> P09
  P07 --> P09
  P08 --> P09
  P05 --> P10
  P07 --> P10
  P08 --> P10
  P08 --> P11
  P10 --> P11
  P03 --> P12
  P09 --> P12
  P10 --> P12
  P11 --> P12
  P12 --> P13
  P08 --> P14
  P10 --> P14
  P14 --> P15
  P03 --> P16
  P12 --> P16
  P15 --> P16
  P13 --> P17
  P15 --> P17
  P16 --> P17
  P17 --> P18
  P06 --> P18
  P07 --> P19
  P10 --> P19
  P19 --> P20
  P06 --> P20
  P07 --> P21
  P17 --> P21
  P09 --> P22
  P18 --> P22
  P21 --> P22
  P22 --> P23
  P22 --> P24
  P08 --> P25
  P10 --> P25
  P12 --> P25
  P00 --> P26
  P06 --> P27
  P08 --> P27
  P11 --> P27
  P14 --> P27
  P21 --> P27
  P06 --> P28
  P18 --> P28
  P06 --> P29
  P20 --> P29
  P09 --> P30
  P18 --> P30
  P21 --> P30
  P16 --> P31
  P22 --> P31
  P25 --> P31
  P27 --> P31
  P28 --> P31
  P29 --> P31
  P03 --> P32
  P16 --> P32
  P22 --> P32
  P25 --> P32
  P27 --> P32
  P28 --> P32
  P29 --> P32
  P31 --> P32
  P22 --> P33
  P25 --> P33
  P27 --> P33
  P28 --> P33
  P29 --> P33
  P20 --> P34
  P22 --> P34
  P25 --> P34
  P27 --> P34
  P28 --> P34
  P29 --> P34
  P20 --> P35
  P22 --> P35
  P25 --> P35
  P27 --> P35
  P28 --> P35
  P29 --> P35
  P03 --> P36
  P22 --> P36
  P25 --> P36
  P27 --> P36
  P30 --> P36
  P34 --> P36
  P32 --> P37
  P33 --> P37
  P34 --> P37
  P35 --> P37
  P36 --> P37
  P37 --> P38
  P38 --> P39
  P39 --> P40
```

## CRITICAL PATH

Without estimates, no mathematically longest-duration path can be claimed. The structural launch-critical chain is baseline → architecture/design/i18n plus database → auth → admin authority → courses/curriculum → catalog and entitlement → video/player/progress plus assessment domain/attempts/UI → completion → certificates/paths/dashboard → content/admin, security, accessibility, responsive, performance and monitoring gates → production infrastructure → deployment → final E2E → launch readiness.

Paid launch additionally requires courses + entitlement → orders → Kashier → commerce administration → production gates. AI requires real curriculum + entitlement + player; its tests and content/privacy readiness join the release gates. Course completion deliberately follows assessment grading. Commerce adds the order-item FK to enrollment after order_items exists, avoiding a forward schema dependency. Admin authority precedes authoring even though full admin UI waits for the domains it manages.

## PARALLELIZABLE WORK

- After Phase 00: Phase 01 architecture verification and Phase 04 database verification are independent.
- After Phase 01: Phase 02 design verification can proceed while Phase 04 closes hosted evidence.
- After curriculum/entitlements: Phase 14 assessment domain can proceed alongside Phase 11 video; Phase 15 grading can proceed alongside Phase 12/13 player/progress once their individual gates pass.
- After Phase 07 and Phase 10: Phase 19/20 commerce can proceed alongside learning/assessment work; paid grants use the shared entitlement contract.
- After Phase 08/10/12: Phase 25 AI can proceed alongside later completion/certification/commerce work.
- After their own prerequisites: Phase 27 course admin, Phase 28 learner admin and Phase 29 commerce admin may proceed independently; coordinate shared audit migrations.
- After feature prerequisites: SEO, accessibility, performance, security and observability audits can run independently. Phase 32 consumes accessibility fixes; Phase 36 consumes content/legal/SEO readiness. Phase 37 waits for all listed release gates.

Parallelizable is a planning property, not authorization to spawn agents or execute multiple phases. Coordinate shared migrations, types, messages and UI files. A phase can start only when ALL its listed predecessors are VERIFIED, even if another independent branch is progressing.

## Deferred scope and launch

Phases 23/24/26 have DEFERRED product disposition and are not release dependencies while excluded. Phase 36 verifies their truthful approved route/navigation treatment. If activated, add the activated phase as a predecessor of the relevant quality gates (31–36) and require it in production readiness; do not silently mark it VERIFIED or skip it. Organizations, review/rating systems, subscriptions and AI history require separate future phase contracts after explicit scope approval.
