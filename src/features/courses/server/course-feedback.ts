import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import type { Database } from "@/types/database";

// Reviews, Q&A and course resources for the learner course detail. The database functions decide
// visibility (published course, enrollment, admin moderation) and return display names, never user ids.

type Client = SupabaseClient<Database>;

export const FEEDBACK_PAGE_SIZE = 50;

export type CourseFeedbackSummary = {
  reviewCount: number;
  averageRating: number | null;
  ratingCounts: number[];
  questionCount: number;
};

export type CourseReview = {
  id: string;
  rating: number;
  body: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  canRemove: boolean;
};

export type CourseAnswer = {
  id: string;
  body: string;
  authorName: string | null;
  isStaff: boolean;
  createdAt: string;
  isMine: boolean;
  canRemove: boolean;
};

export type CourseQuestion = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  isMine: boolean;
  canRemove: boolean;
  answers: CourseAnswer[];
};

export type CourseResource = {
  resourceId: string;
  lessonId: string;
  lessonTitle: string;
  kind: string;
  label: string;
  description: string | null;
};

const EMPTY_SUMMARY: CourseFeedbackSummary = {
  reviewCount: 0,
  averageRating: null,
  ratingCounts: [0, 0, 0, 0, 0],
  questionCount: 0,
};

export async function getCourseFeedbackSummary(
  client: Client,
  courseId: string,
): Promise<CourseFeedbackSummary> {
  const { data, error } = await client.rpc("catalog_course_feedback_summary", {
    p_course_id: courseId,
  });
  const row = data?.[0];
  if (error || !row) return EMPTY_SUMMARY;
  return {
    reviewCount: row.review_count,
    averageRating:
      row.average_rating === null ? null : Number(row.average_rating),
    ratingCounts:
      row.rating_counts?.length === 5
        ? row.rating_counts
        : EMPTY_SUMMARY.ratingCounts,
    questionCount: row.question_count,
  };
}

export async function listCourseReviews(
  client: Client,
  courseId: string,
): Promise<CourseReview[]> {
  const { data, error } = await client.rpc("catalog_list_course_reviews", {
    p_course_id: courseId,
    p_limit: FEEDBACK_PAGE_SIZE,
    p_offset: 0,
  });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    rating: row.rating,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isMine: row.is_mine,
    canRemove: row.can_remove,
  }));
}

type AnswerJson = {
  id: string;
  body: string;
  authorName: string | null;
  isStaff: boolean;
  createdAt: string;
  isMine: boolean;
  canRemove: boolean;
};

/** Returns null when the caller may not read the Q&A (not signed in or not entitled). */
export async function listCourseQuestions(
  client: Client,
  courseId: string,
): Promise<CourseQuestion[] | null> {
  const { data, error } = await client.rpc("learner_list_course_questions", {
    p_course_id: courseId,
    p_limit: FEEDBACK_PAGE_SIZE,
    p_offset: 0,
  });
  if (error || !data) return null;
  return data.map((row) => ({
    id: row.id,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at,
    isMine: row.is_mine,
    canRemove: row.can_remove,
    answers: Array.isArray(row.answers)
      ? (row.answers as AnswerJson[]).map((answer) => ({
          id: answer.id,
          body: answer.body,
          authorName: answer.authorName,
          isStaff: answer.isStaff,
          createdAt: answer.createdAt,
          isMine: answer.isMine,
          canRemove: answer.canRemove,
        }))
      : [],
  }));
}

export async function listCourseResources(
  client: Client,
  courseId: string,
  locale: Locale,
): Promise<CourseResource[]> {
  const { data, error } = await client.rpc("learner_list_course_resources", {
    p_course_id: courseId,
    p_locale: locale,
  });
  if (error || !data) return [];
  return data.map((row) => ({
    resourceId: row.resource_id,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    kind: row.kind,
    label: row.label,
    description: row.description,
  }));
}
