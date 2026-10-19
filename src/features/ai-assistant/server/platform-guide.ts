import "server-only";

// How the learner side of ETripleSoft Learn works, for "how do I…" questions in General chat.
// Keep every line true to the shipped screens: names match the English UI labels in messages/en.json
// and the rules match docs/ROUTES.md, docs/LEARNING-FEATURES-GUIDE.md and the learning migrations.
// Update this text whenever a learner-facing flow or label changes.
export const PLATFORM_GUIDE = `
Navigation: the sidebar holds Overview, My Courses, Course Catalog, AI Assistant, Messages, Calendar, Certificates and Settings; on phones it opens from the menu button in the header. The header has the notifications bell and the learner's profile. The interface language (English / Arabic) is changed from the switcher in the page footer or in Settings › Profile.

Overview (dashboard): enrolled courses, progress, assessment and certificate counts, the learning streak (complete a lesson each day to keep it) and a Continue learning card that resumes the last lesson.

Finding and buying a course: Course Catalog lists published courses with search and category/level filters; open a course to see its description, instructor and outline. Press "Enroll now" (signed-out visitors see "Sign in to enroll"). Checkout has three steps: Review Order (a coupon code can be applied here), Billing Details (name, country, phone), then Payment, which continues to Kashier's secure hosted page for cards and wallets; card details are never entered on ETripleSoft Learn. After paying, the learner returns to the order page; if the result is not shown yet, press "Check payment status". A successful payment shows "You're enrolled!" and the course appears in My Courses. Refunds follow the Refund and Course Exchange policy page linked in the footer.

Learning a course: open it from My Courses (or Continue learning). Lessons can be videos, articles, PDF documents or assessments, grouped in modules. Lessons unlock in order: a lesson opens once every required lesson before it is complete; optional lessons and practice checks never block progress. A video counts as complete after about 90% of it has actually been watched (skipping ahead does not count), and the player resumes where the learner stopped. Articles and documents are completed with "Mark complete". Short optional practice checks after some videos do not affect completion. Course documents download from the lesson page.

Final assessment and completion: the final assessment opens after every required lesson is complete; it is the assessment lesson at the end of the course. Default rules (an assessment may differ): 70% to pass, 3 attempts, 30 minutes measured on the server; answers autosave and can be resumed; navigation is paused until the attempt is submitted; when time runs out the last saved answers are graded; correct answers are shown after submitting. Once every required lesson and assessment is done, press "Check course completion" on the course or lesson page.

Certificates: after a course is completed the certificate appears under Certificates. From there the learner can "Print / save as PDF" (choose "Save as PDF" in the print dialog) and "Copy verification link", a public page anyone can open to confirm the certificate is genuine. English and Arabic layouts are available.

AI Assistant (sidebar › AI Assistant): General chat for Odoo/ERP questions and help using the platform; Course chat answers from an enrolled course's own lessons and video transcripts with source links; "Deep thinking" for harder questions; conversations are saved under Recent Conversations. The round AI button at the bottom corner of other pages opens a quick General chat. There are limits on questions per minute and per day.

Messages: private conversations with the instructors of a course the learner is enrolled in, or with ETripleSoft support. Use "New message", then choose who to contact. Learners cannot message each other. Unread conversations show a dot in the sidebar.

Calendar: course events (for example live sessions, with a "Join session" button) and the learner's own study time ("Plan study time"), in Month, Week or Agenda view, shown in the learner's time zone (set in Settings › Profile). "Download calendar file" under Sync Your Calendar exports the events to another calendar app such as Google Calendar or Outlook.

Notifications: the bell in the header shows course updates and reminders; "Mark all as read" clears them. Which reminders arrive is set in Settings › Notifications. Notifications are in-app only; there are no emails yet.

Settings tabs: Profile (name, photo, language, time zone), Account (sign-in email, "Download your data" as a file, request account deletion through support), Security (change password, sign out other devices), Notifications (which reminders to get), Learning preferences (for example autoplay of the next lesson), AI Assistant Preferences.

Account access: forgot password → "Forgot password?" on the login page sends a reset email. Help Center and Contact pages are linked in the footer; for anything about payments, refunds, account deletion or access problems, the learner should message ETripleSoft support from Messages.
`.trim();
