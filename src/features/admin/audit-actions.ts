// Audit actions written by the admin RPCs, mapped to message keys under admin.audit.actions and a
// display tone. Unknown actions fall back to the raw action name so new entries are never hidden.
const AUDIT_ACTIONS = {
  'user_role.granted': ['roleGranted', 'security'],
  'user_role.revoked': ['roleRevoked', 'danger'],
  'user.looked_up': ['userLookedUp', 'neutral'],
  'course.created': ['courseCreated', 'content'],
  'course.updated': ['courseUpdated', 'content'],
  'course.status_changed': ['courseStatusChanged', 'content'],
  'course.instructors_set': ['courseInstructorsSet', 'content'],
  'course.translation_saved': ['courseTranslationSaved', 'content'],
  'course.translation_published': ['courseTranslationPublished', 'success'],
  'course.translation_unpublished': ['courseTranslationUnpublished', 'neutral'],
  'course.feedback_removed': ['courseFeedbackRemoved', 'danger'],
  'course.event_scheduled': ['courseEventScheduled', 'content'],
  'course.event_cancelled': ['courseEventCancelled', 'danger'],
  'course.ai_indexed': ['courseAiIndexed', 'content'],
  'course_module.created': ['moduleCreated', 'content'],
  'course_module.updated': ['moduleUpdated', 'content'],
  'course_module.reordered': ['moduleReordered', 'content'],
  'course_module.translation_saved': ['moduleTranslationSaved', 'content'],
  'course_module.translation_published': ['moduleTranslationPublished', 'success'],
  'course_module.translation_unpublished': ['moduleTranslationUnpublished', 'neutral'],
  'lesson.created': ['lessonCreated', 'content'],
  'lesson.updated': ['lessonUpdated', 'content'],
  'lesson.reordered': ['lessonReordered', 'content'],
  'lesson.translation_saved': ['lessonTranslationSaved', 'content'],
  'lesson.translation_published': ['lessonTranslationPublished', 'success'],
  'lesson.translation_unpublished': ['lessonTranslationUnpublished', 'neutral'],
  'lesson_resource.created': ['resourceCreated', 'content'],
  'lesson_resource.translation_saved': ['resourceTranslationSaved', 'content'],
  'lesson_resource.translation_published': ['resourceTranslationPublished', 'success'],
  'lesson_resource.translation_unpublished': ['resourceTranslationUnpublished', 'neutral'],
  'lesson_video.upload_started': ['videoUploadStarted', 'content'],
  'lesson_video.ai_transcribed': ['videoTranscribed', 'content'],
  'enrollment.granted': ['enrollmentGranted', 'success'],
  'enrollment.revoked': ['enrollmentRevoked', 'danger'],
  'certificate.revoked': ['certificateRevoked', 'danger'],
  'coupon.created': ['couponCreated', 'commerce'],
  'coupon.activated': ['couponActivated', 'commerce'],
  'coupon.deactivated': ['couponDeactivated', 'neutral'],
} as const satisfies Record<string, readonly [string, AuditTone]>

export type AuditTone = 'security' | 'danger' | 'neutral' | 'content' | 'success' | 'commerce'
export type AuditActionKey = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS][0]

export function auditAction(action: string): { key: AuditActionKey | null; tone: AuditTone } {
  const entry = (AUDIT_ACTIONS as Record<string, readonly [AuditActionKey, AuditTone]>)[action]
  return entry ? { key: entry[0], tone: entry[1] } : { key: null, tone: 'neutral' }
}
