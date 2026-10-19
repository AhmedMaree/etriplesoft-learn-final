# Phase 25 — AI Learning Assistant

## 1. Status

IN_PROGRESS

Implemented 2026-10-18 on explicit user instruction, which supersedes two earlier contract points: the provider is **Google Gemini** (not OpenAI) and **conversations are saved** (V1 history was previously out of scope).

- Models (server-only, `src/features/ai-assistant/server/gemini.ts`, REST `streamGenerateContent`): `gemini-3.8-flash` with `thinkingConfig.thinkingLevel: "low"` for streamed replies; the opt-in **Deep thinking** mode uses `gemini-4-argon` at `"high"` and falls back to `gemini-3.8-flash` at `"high"` when the key has no access or quota for it (404/403/429; the reply then shows a note); `gemini-3.5-flash-lite` writes conversation titles after the reply is released. Override with `GEMINI_CHAT_MODEL`, `GEMINI_DEEP_MODEL`, `GEMINI_LIGHT_MODEL`; `GEMINI_API_KEY` is required. Transient provider 5xx/network failures are retried once before any output. Sampling parameters are not sent.
- Measured 2026-10-18 with the DEV key: default thinking took ~57–80 s per Flash reply versus ~2–4 s at `"low"` (first text ~1.5 s); the key's free tier has no `gemini-4-argon` quota (429 `GenerateRequestsPerDayPerProjectPerModel-FreeTier`), so Deep thinking currently always uses the fallback until billing is enabled; Flash-Lite latency varied from ~1 s to ~21 s, which is why titles no longer block the reply.
- Two chats (each conversation has a fixed `kind`):
  - **General chat** — Odoo tutor from general knowledge plus the published catalog for recommendations; no course material.
  - **Course chat (RAG)** — bound to one course the learner is enrolled in (or a current admin). Answers only from that course's indexed content, cites excerpts as [n], and shows source chips that link to the lesson (video sources marked). It says when the course does not cover a question.
- Course content index (migration `20261018200000_ai_course_rag.sql`, schema `ai_private`, pgvector):
  - Sources: published exact-locale course, module, lesson (title, summary, body) and resource text, plus **AI transcripts of the lesson videos** — most published lessons are video-only (on 2026-10-18 the Bunny library held 67 videos / ~663 min with no captions). Assessment lessons are never indexed.
  - Transcripts: operator command `npm run ai:transcribe -- --course=<slug> [--apply]` (or `--all`). It downloads the 240p MP4 rendition from Bunny, uploads it to the Gemini Files API, transcribes 10-minute segments with `gemini-3.5-flash-lite` at low media resolution (~91 tokens/s of video), saves via the audited `admin_ai_save_transcript` RPC and deletes the upload. Instructors speak Egyptian Arabic; the prompt keeps Odoo/technical terms in English. A transcript is tied to the provider video id, so a replaced video is no longer used.
  - Embeddings: `gemini-embedding-2`, 768 dimensions, RETRIEVAL_DOCUMENT/RETRIEVAL_QUERY, ~1,200-character chunks with 150-character overlap and a context header (course › module › lesson — source type). Multilingual: an English question scored 0.82 against the matching Arabic transcript versus 0.47 for unrelated text.
  - Building: Admin › AI index (`/{locale}/admin/ai`) shows transcripts and index state per course and rebuilds a course (server action → `admin_ai_index_sources`, `admin_ai_replace_source_chunks`, `admin_ai_finish_course_index`; unchanged sources are skipped; audited as `course.ai_indexed`).
  - Retrieval: `learner_ai_search_course` re-checks enrollment and returns only chunks whose source is still published and unchanged (content-hash match) for the current embedding model, so edited or unpublished content never reaches the model even before a rebuild. Top 8 by cosine similarity, kept when ≥ 0.5 and within 0.12 of the best match. The question plus the previous learner message form the retrieval query. Only cited sources are saved with the reply.
- Reply language: detected from the learner's question (Arabic vs Latin script, else the interface locale) and stated explicitly to the model, because a backup model otherwise drifted to the Arabic of the transcripts.
- Locales: the interface locale selects course/catalog content; replies follow the language of the learner's message, falling back to the interface locale.
- Storage: migrations `20261018121201_ai_assistant_conversations.sql` and `20261018122716_ai_assistant_rpc_defaults.sql` (optional RPC arguments default to NULL so PostgREST resolves calls that omit them) add owner-scoped `ai_conversations`/`ai_messages` (owner SELECT/DELETE via RLS, writes only through `learner_ai_*` SECURITY DEFINER RPCs) and a client-inaccessible `ai_usage_events` ledger. Limits: 6 questions/minute, 150/day, 200 messages per conversation, 4,000 characters per question. Deleting history does not reset limits.
- API: `POST /api/ai/chat` (NDJSON stream; trusted origin, bounded body, authenticated), `GET`/`DELETE /api/ai/conversations/{id}`.
- Applied to Hosted DEV 2026-10-18 (versions 20261018121201 and 20261018122716). Hosted security advisor: only the intended findings (deny-all `ai_usage_events` with no policies; `learner_ai_*` executable by `authenticated`, none by `anon`).
- Verification 2026-10-18: local pgTAP `supabase/tests/database/ai_assistant.sql` 27/27 (owner isolation, entitlement, one reply per question, direct-write denial, private ledger, rate limit, cascade delete, named-argument calls, anonymous denial); live opt-in Playwright `tests/ai-assistant.spec.ts` 2/2 against local Supabase and the real Gemini API (grounded reply naming the course's module/lesson, follow-up from saved history, reload/reopen, delete, Arabic replies, Deep thinking fallback, no overflow at all eight widths in EN and AR; screenshots in `tmp/ai-review/`); public auth/API boundary case in `tests/learning.spec.ts`. Run the live suite with `AI_LOCAL_TEST=1` and an app server on local Supabase (see the spec header).
- RAG verification 2026-10-18 (local Supabase, real Gemini): pgTAP `supabase/tests/database/ai_course_rag.sql` 30/30 and `ai_assistant.sql` 27/27; live `tests/ai-assistant.spec.ts` 3/3 (General chat; Arabic, Deep thinking and eight widths in EN/AR; Course chat: admin rebuild through the UI, an English question answered in English from an Arabic transcript with a correct lesson citation, citations after reload, Arabic course chat). The transcription command was run against two real library videos and produced Arabic transcripts with English technical terms.
- Hosted DEV: `20261018200000_ai_course_rag.sql` applied on 2026-10-18 with `supabase db query --linked --file …` and recorded with `supabase migration repair --status applied 20261018200000 --linked` (verified: pgvector 0.8.2, 3 `ai_private` tables, 13 AI functions, new `learner_ai_begin_turn` signature). Transcription completed the same day: 73 lesson videos (67 Bunny + 6 Mux; 4 Mux copies of Bunny lessons skipped), 0 failures. The command sends audio only when ffmpeg is on PATH (16 kbps mono Opus, 10-minute segments, inline — ~12× smaller and ~3.6× fewer tokens than video; this machine's upload was ~28 KB/s, which made video uploads of 100+ MB lessons fail), reads Mux lessons from a short-lived signed HLS URL, retries network drops, and falls back to chunked resumable video upload without ffmpeg. All six courses were then rebuilt from Admin › AI index in one pass each (650 passages in total; the indexer embeds in groups of 10 and waits out per-minute limits within a 270 s budget, resuming on the next rebuild). Hosted retrieval check: "How do I back up my database on Odoo.sh?" → System Admin lesson 1.9 Backups (0.79); "إزاي أسجّل فاتورة مورد وأدفعها؟" → Implementation lesson 3.3 Vendor Bill (0.76). Migration `20261018210000_ai_overview_video_count.sql` (applied the same way) makes the admin overview count only transcribed videos.
- Key pool: `GEMINI_API_KEY`, `GEMINI_API_KEY_2` … `_9` are tried in order by the app and `npm run ai:transcribe`. A key that hits a daily quota rests for that model until the next daily reset (07:00 UTC), a per-minute limit for 60 s, and a rejected key (401/403 or 400 `API_KEY_INVALID`) for an hour; then the next model in the fallback chain is tried. The transcription command re-uploads the current video under the next key (uploaded files belong to one Google project). On 2026-10-18 all four configured keys returned the same `GenerateRequestsPerDayPerProjectPerModel-FreeTier` error for `gemini-3.8-flash`, including unused ones, so they appear to share one Google project and therefore one quota.
- Free-tier note: `gemini-3.8-flash` exhausted its free daily request quota during testing; replies fall back to `gemini-3.5-flash-lite` (separate quota) and show a "backup model" note. Enable billing for predictable capacity.
- Lesson documents (migration `20261018221500_ai_course_documents.sql`, applied to Hosted DEV and recorded in history; renumbered from 220000 to avoid a version collision with `20261018220000_sequential_lesson_unlock.sql`): `npm run ai:documents -- --all --apply` extracts PDF attachments (local pdfjs text; Gemini vision only when a deck has under ~400 characters per page; `--force` re-extracts) and saves through the audited `admin_ai_save_resource_text`. Text is tied to the stored file key and counts only while the lesson and a resource translation are published. The service-role key is used only to download from the private `course-resources` bucket. On 2026-10-18 all 12 published PDFs were extracted (~160k characters; the Accounting Fundamental and Supply Chain decks via Gemini) and the indexes rebuilt: 846 passages in total. Content note: the "To-do list app (CLI)" and "Number guessing game" PDFs in Python Fundamentals are byte-identical.
- Shared operator plumbing lives in `scripts/lib/ai-operator.mjs` (env checks, admin session with retrying RPCs, Gemini key pool, network retries).
- Evaluation: `npm run ai:eval` runs `scripts/ai-eval/course-chat-cases.json` (12 EN/AR questions across all six courses) through `learner_ai_search_course` and requires an expected lesson in the top 3 (fails below 80%). Result on Hosted DEV 2026-10-18: 12/12 after widening one case whose 41-minute session recording legitimately covers the topic (11/12 before). Local pgTAP: `ai_course_documents.sql` 12/12 (with `ai_course_rag.sql` 30/30 and `ai_assistant.sql` 27/27).
- 2026-10-19 (user request): a floating AI button in the learner shell (`assistant-launcher.tsx`, hidden on `/ai-page`) opens a compact General chat over the same API. General chat also answers how-to questions about the platform from `server/platform-guide.ts` (~1,200 tokens; keep it in step with learner flows and labels). Cost changes: the system prompt now puts shared text first and per-request text (excerpts, mode, name, reply language) last so Gemini's implicit prefix caching can apply; recorded `output_tokens` now include thinking tokens (`thoughtsTokenCount`, billed at the output rate); history sent per turn reduced from 20 to 10 messages. Migration `20261019170000_ai_deep_thinking_limit.sql` adds `ai_usage_events.mode` and limits Deep thinking to 10 questions per rolling 24 hours inside `learner_ai_begin_turn` (new `p_mode` argument; error `ai_rate_deep` → API `rateDeep` 429); a fallback reply still counts as deep. pgTAP `ai_assistant.sql` extended to 30 cases — not yet run locally (WSL/Docker was unresponsive). Hosted DEV has the migration in its history (local and remote match through `20261019170000`); a rollback-only check on 2026-10-19 confirmed the 11th deep question is refused with `ai_rate_deep`, fast questions continue, unknown modes are rejected, `authenticated` (not `anon`) can execute, and no test rows remained.
- Not done: answer-quality (generation) review beyond retrieval; D03 retention period; cost budget/monitoring.

Previous evidence: ai-page.tsx used in-memory seeded messages and regex-selected English replies.

## 2. Goal

Authorize course-scoped retrieval from real published content.

## 3. Why This Phase Exists

This phase owns ai learning assistant. Its verified contract enables [Phase 31](PHASE-31-ACCESSIBILITY.md), [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md), [Phase 33](PHASE-33-PERFORMANCE.md), [Phase 34](PHASE-34-SECURITY-PRIVACY.md), [Phase 35](PHASE-35-OBSERVABILITY.md), [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md), [Phase 12](PHASE-12-LEARNING-PLAYER.md)

Blocks: [Phase 31](PHASE-31-ACCESSIBILITY.md), [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md), [Phase 33](PHASE-33-PERFORMANCE.md), [Phase 34](PHASE-34-SECURITY-PRIVACY.md), [Phase 35](PHASE-35-OBSERVABILITY.md), [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

ai-page.tsx uses in-memory seeded messages and regex-selected English replies. No OpenAI calls, retrieval, citations or provider keys exist in application source.

## 6. In Scope

- Authorize course-scoped retrieval from real published content
- Separate interface locale, source locale and response locale
- Add grounded cited responses, rate/cost limits and failure states without persistent V1 history

## 7. Out of Scope

Persistent AI conversations, autonomous admin tools and training on private learner data.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D21; D03 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

No conversation/history tables in V1. Retrieval index/chunk metadata only after D21 selects design; bind any source index to exact course/locale/publication and invalidate on change.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Server-only model adapter, input limits, entitled retrieval, bounded context and no unrestricted tools/database access. Verify current official provider documentation during implementation.

## 12. Frontend Work

/ai-page with streaming/busy/error/citation states and real course context; retain existing visual identity.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. /ai-page with streaming/busy/error/citation states and real course context; retain existing visual identity.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Prompt cannot retrieve another course, private user data or answer keys
- No key or raw sensitive prompt in client/logs
- Rate limits enforced server-side despite browser changes

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Authorize course-scoped retrieval from real published content
5. Separate interface locale, source locale and response locale
6. Add grounded cited responses, rate/cost limits and failure states without persistent V1 history
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Evaluation set for correct citations, unsupported questions and EN/AR responses over mixed source locales
- Test revoked entitlement, changed publication, prompt injection and provider outage
- Load/rate/cost budget tests and no answer-key retrieval

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Evaluation set for correct citations, unsupported questions and EN/AR responses over mixed source locales.
- [ ] Manually exercise and inspect: Test revoked entitlement, changed publication, prompt injection and provider outage.
- [ ] Manually exercise and inspect: Load/rate/cost budget tests and no answer-key retrieval.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Prompt cannot retrieve another course, private user data or answer keys
- [ ] No key or raw sensitive prompt in client/logs
- [ ] Rate limits enforced server-side despite browser changes

## 22. Data Verification

No conversation/history tables in V1. Retrieval index/chunk metadata only after D21 selects design; bind any source index to exact course/locale/publication and invalidate on change.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Authorize course-scoped retrieval from real published content
- [ ] Separate interface locale, source locale and response locale
- [ ] Add grounded cited responses, rate/cost limits and failure states without persistent V1 history
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
NO

AUTOMATED VERIFICATION:
NOT RUN

MANUAL VERIFICATION:
NOT RUN

SECURITY VERIFICATION:
FAIL

EN/AR VERIFICATION:
FAIL

READY TO MARK VERIFIED:
NO

READY FOR NEXT PHASE:
NO

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 26](PHASE-26-COMMUNITY-MESSAGES.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
