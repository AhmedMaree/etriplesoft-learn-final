# Learning features — DEV checkpoint, 2026-10-14

## What you can use now

| Feature | What AI implemented | Your next manual action | Benefit |
| --- | --- | --- | --- |
| Course documents | 12 private PDFs attached to matching lessons; eight newly uploaded and hash-verified, four existing crash-course PDFs retained without duplication. | Open one document in each course as an enrolled learner. | Course material is organized and protected. |
| Assessments | Immutable versions, single/multiple/true-false questions, exact-set grading, autosave/resume, server deadlines and limits, answer review after submission. | Enter and review approved questions under `/en/admin/assessments` or `/ar/admin/assessments`. | Learners cannot change scores or obtain keys before submission. |
| Assessment translations | An optional translation step before publication preserves the same question/option identities and grading rules. | Provide translated wording in the same order as the original. Save it before publishing. | Changing language does not create a different attempt or grading identity. |
| Completion | Explicit article/PDF acknowledgement; passing quizzes and 90% distinct watched video progress; required lessons inside required modules; immutable completion snapshots. | Finish the required content, then press **Check course completion** on the course or lesson page. | Actual learning records establish completion; later additions preserve legitimate history. |
| Certificates | Owner-authorized issuance after completion, one identity per completion, separate EN/AR presentation, opaque public verification, audited administrator revocation. | Review the branded layouts. Use **Print / save as PDF** and the browser's PDF destination. | Certificates represent real completion and can be verified publicly. |
| Dashboard | Real enrollment/completion/assessment/certificate counts and course-specific continue links. | Check your account's values against its learning history. | Removes invented dashboard percentages and ratings. |

Quiz defaults: 70% pass, three attempts per immutable version across enrollment history, 30 minutes enforced by database time. Uniform one-point questions; multiple selection requires all correct choices and no incorrect choices. Unanswered questions score zero. When the deadline passes, the next assessment operation finalizes the last saved answers; late selections cannot change the score. A browser timer can request finalization but never extend the deadline. No background expiry scheduler or proctoring is implied.

The legacy `/assessment` URL now offers entitled course assessments after login. It no longer loads the demo client-grading screen or guesses a course. Actual questions remain awaiting approved content; no public Odoo quiz keys were invented or bypassed.

## Document placement

| Course | Document → lesson |
| --- | --- |
| Python Fundamentals (`python-development` folder) | Python Guide → Python Guide; Calculator-program → Calculator program; To-do list app → To-do list app (CLI); Number guessing game → Number guessing game |
| Crash Course Odoo ERP | Course Agenda → first Course Agenda document lesson; Business Workflows → first Business Workflows document lesson; Accounting Fundamental → Accounting Fundamental; Supply Chain → Supply Chain |
| Odoo Implementation | odoo-user-guide → Odoo_User_Guide; Implementation Cycle → Implementation Cycle |
| Odoo System Admin (`system-admin` folder) | System Admin Guide → System Admin Guide |
| Odoo User Guide | User Guide → User Guide |

The files live in private `course-resources` Storage, with authorized short-lived download links. English resource metadata is published; this is not Arabic document-content approval. Original local files are preserved.

## Matching the source courses

Source: [ETripleSoft Odoo courses](https://etriple.odoo.com/slides). The public course outlines were fetched directly and parsed using `scripts/snapshot-course-source.mjs`; snapshots are in ignored `tmp/course-source`. The five document-bearing course outlines match source lesson counts: Python 17, crash course 10, implementation 48, user guide 6, system administration 10. Ninety imported lesson types were corrected through audited administrator operations, and the missing Administration video lesson was inserted first.

The user explicitly approved retaining the six working Mux videos and adding the eight source-outline lessons as pending content. Odoo Development therefore has eight source-outline lessons plus the six working supplied Mux videos. Existing videos and their progress IDs are preserved. The source lessons are pending media/documents; the six supplied files are not silently claimed to be a match for differently named source lessons. Only the previously approved first supplied video is a preview. Missing resources/videos/quiz questions are unavailable and cannot be acknowledged as completed. Current learners use the current published curriculum; legitimate completed snapshots remain historical.

Other retained DEV fixture courses were not deleted or promoted to approved launch content. Prices were not changed by this content work. Remaining videos can be attached through `/en/video-management` using the existing Mux workflow; see [the video guide](COURSE-VIDEO-GUIDE.md).

## Verification and limits

Applied locally and to the confirmed hosted DEV project:

- `20261014050330_assessment_domain_and_attempts.sql`
- `20261014050935_learning_completion_and_content_types.sql`
- `20261014052104_certificates_and_learning_summary.sql`
- `20261014054213_learner_assessment_directory.sql`

A restricted public/learning-private logical backup was taken before applying these changes: ignored `tmp/finish-feature-backup`. This is a logical backup, not certification of full Auth/Storage disaster recovery. Generated public TypeScript types were refreshed from hosted DEV. Database function lint passed. Local RLS/domain suites pass 404 checks across eight suites; hosted transactional assessment/completion/certificate validation passes 14 checks and rolls back its synthetic records. No real learner progress or earned certificate was fabricated.

The complete local learning/browser batch passed 10 tests; a targeted legacy assessment authentication check also passed. Browser verification covers actual login, enrollment, private PDFs, signed Mux playback, persisted progress, quiz authoring/attempts, completion, issuance, public verification and dashboard. EN/AR captures for learner quiz, authoring, certificate and dashboard exist at all eight widths, alongside existing player/upload/access captures. Synthetic test accounts/content are local and clearly labeled; audited history is retained with fixture courses archived afterward.

Manual course-content/Arabic review, certificate layout and print acceptance, fresh Mux recovery checks, operational retention policy, assessment version migration/reissue workflows and broader administration remain open. Certificate PDF saving currently uses the browser print dialog; no automatic server-generated PDF file or signature approval is claimed. Revoked certificates require administrator review for reissue; no learner self-reissue shortcut exists. Existing Supabase advisor notices for deliberately default-denied tables/constrained SECURITY DEFINER RPCs and disabled leaked-password protection remain documented; production acceptance is still pending.

The user explicitly deferred payments until learning features are finished. Payments later require Kashier sandbox configuration and approved refund/access rules. Production deployment and release acceptance are separate steps. This checkpoint does not mark entire phases VERIFIED or the site production-ready.
