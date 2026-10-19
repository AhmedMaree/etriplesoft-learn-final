export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          accessed_user_id: string | null
          action: string
          actor_id: string
          certificate_id: string | null
          coupon_id: string | null
          course_id: string | null
          enrollment_id: string | null
          id: string
          lesson_id: string | null
          lesson_resource_id: string | null
          lesson_video_id: string | null
          module_id: string | null
          occurred_at: string
          request_id: string | null
          safe_summary: string
          target_type: string
          user_role_id: string | null
        }
        Insert: {
          accessed_user_id?: string | null
          action: string
          actor_id: string
          certificate_id?: string | null
          coupon_id?: string | null
          course_id?: string | null
          enrollment_id?: string | null
          id?: string
          lesson_id?: string | null
          lesson_resource_id?: string | null
          lesson_video_id?: string | null
          module_id?: string | null
          occurred_at?: string
          request_id?: string | null
          safe_summary: string
          target_type?: string
          user_role_id?: string | null
        }
        Update: {
          accessed_user_id?: string | null
          action?: string
          actor_id?: string
          certificate_id?: string | null
          coupon_id?: string | null
          course_id?: string | null
          enrollment_id?: string | null
          id?: string
          lesson_id?: string | null
          lesson_resource_id?: string | null
          lesson_video_id?: string | null
          module_id?: string | null
          occurred_at?: string
          request_id?: string | null
          safe_summary?: string
          target_type?: string
          user_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_accessed_user_id_fkey"
            columns: ["accessed_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_lesson_resource_id_fkey"
            columns: ["lesson_resource_id"]
            isOneToOne: false
            referencedRelation: "lesson_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_lesson_video_id_fkey"
            columns: ["lesson_video_id"]
            isOneToOne: false
            referencedRelation: "lesson_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_user_role_id_fkey"
            columns: ["user_role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          kind: string
          locale: string
          message_count: number
          preview: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          locale: string
          message_count?: number
          preview?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          locale?: string
          message_count?: number
          preview?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: string
          sources: Json | null
          status: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: string
          sources?: Json | null
          status?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: string
          sources?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          course_id: string | null
          created_at: string
          id: number
          mode: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: never
          mode?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: never
          mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_completion_id: string
          course_title: string
          id: string
          issued_at: string
          learner_name: string
          locale: string
          revoked_at: string | null
          revoked_by: string | null
          verification_hash: string
        }
        Insert: {
          certificate_number: string
          course_completion_id: string
          course_title: string
          id?: string
          issued_at?: string
          learner_name: string
          locale: string
          revoked_at?: string | null
          revoked_by?: string | null
          verification_hash: string
        }
        Update: {
          certificate_number?: string
          course_completion_id?: string
          course_title?: string
          id?: string
          issued_at?: string
          learner_name?: string
          locale?: string
          revoked_at?: string | null
          revoked_by?: string | null
          verification_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_completion_id_fkey"
            columns: ["course_completion_id"]
            isOneToOne: false
            referencedRelation: "course_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      completion_lessons: {
        Row: {
          completion_id: string
          lesson_id: string
          quiz_attempt_id: string | null
        }
        Insert: {
          completion_id: string
          lesson_id: string
          quiz_attempt_id?: string | null
        }
        Update: {
          completion_id?: string
          lesson_id?: string
          quiz_attempt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "completion_lessons_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "course_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_lessons_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          amount_off_minor: number | null
          code: string
          course_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          percent_off: number | null
        }
        Insert: {
          amount_off_minor?: number | null
          code: string
          course_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
        }
        Update: {
          amount_off_minor?: number | null
          code?: string
          course_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_answers: {
        Row: {
          body: string
          created_at: string
          id: string
          is_staff: boolean
          question_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_staff?: boolean
          question_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "course_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_completions: {
        Row: {
          completed_at: string
          course_title: string
          enrollment_id: string
          id: string
          learner_name: string
          locale: string
          required_assessments: number
          required_lessons: number
          rule_version: number
        }
        Insert: {
          completed_at?: string
          course_title: string
          enrollment_id: string
          id?: string
          learner_name: string
          locale: string
          required_assessments: number
          required_lessons: number
          rule_version?: number
        }
        Update: {
          completed_at?: string
          course_title?: string
          enrollment_id?: string
          id?: string
          learner_name?: string
          locale?: string
          required_assessments?: number
          required_lessons?: number
          rule_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_completions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_event_translations: {
        Row: {
          description: string | null
          event_id: string
          locale: string
          title: string
        }
        Insert: {
          description?: string | null
          event_id: string
          locale: string
          title: string
        }
        Update: {
          description?: string | null
          event_id?: string
          locale?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_event_translations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "course_events"
            referencedColumns: ["id"]
          },
        ]
      }
      course_events: {
        Row: {
          cancelled_at: string | null
          course_id: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: string
          lesson_id: string | null
          meeting_url: string | null
          starts_at: string
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind: string
          lesson_id?: string | null
          meeting_url?: string | null
          starts_at: string
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          lesson_id?: string | null
          meeting_url?: string | null
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          assigned_at: string
          assigned_by: string
          course_id: string
          display_name: string
          id: string
          position: number
          profile_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          course_id: string
          display_name: string
          id?: string
          position: number
          profile_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          course_id?: string
          display_name?: string
          id?: string
          position?: number
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_required: boolean
          position: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          position: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_questions: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          locale: string
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          locale: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          locale?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          id: string
          locale: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          id?: string
          locale: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          id?: string
          locale?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_translations: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          locale: string
          publication_status: string
          published_at: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          locale: string
          publication_status?: string
          published_at?: string | null
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          locale?: string
          publication_status?: string
          published_at?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_translations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          currency: string
          id: string
          level: string | null
          price_minor: number
          published_at: string | null
          slug: string
          status: string
          thumbnail_object_key: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          level?: string | null
          price_minor?: number
          published_at?: string | null
          slug: string
          status?: string
          thumbnail_object_key?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          level?: string | null
          price_minor?: number
          published_at?: string | null
          slug?: string
          status?: string
          thumbnail_object_key?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          expires_at: string | null
          grant_source: string
          granted_at: string
          granted_by: string
          id: string
          order_item_id: string | null
          refund_confirmed_at: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          expires_at?: string | null
          grant_source?: string
          granted_at?: string
          granted_by: string
          id?: string
          order_item_id?: string | null
          refund_confirmed_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          expires_at?: string | null
          grant_source?: string
          granted_at?: string
          granted_by?: string
          id?: string
          order_item_id?: string | null
          refund_confirmed_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_preferences: {
        Row: {
          assignment_deadlines: boolean
          autoplay_next: boolean
          community_updates: boolean
          course_recommendations: boolean
          course_reminders: boolean
          daily_learning_reminders: boolean
          email_notifications: boolean
          preferred_locale: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_deadlines?: boolean
          autoplay_next?: boolean
          community_updates?: boolean
          course_recommendations?: boolean
          course_reminders?: boolean
          daily_learning_reminders?: boolean
          email_notifications?: boolean
          preferred_locale?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_deadlines?: boolean
          autoplay_next?: boolean
          community_updates?: boolean
          course_recommendations?: boolean
          course_reminders?: boolean
          daily_learning_reminders?: boolean
          email_notifications?: boolean
          preferred_locale?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_profiles: {
        Row: {
          birth_year: number | null
          company_name: string | null
          created_at: string
          faculty: string | null
          graduation_year: number | null
          job_title: string | null
          learner_type: string
          university: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          birth_year?: number | null
          company_name?: string | null
          created_at?: string
          faculty?: string | null
          graduation_year?: number | null
          job_title?: string | null
          learner_type: string
          university?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          birth_year?: number | null
          company_name?: string | null
          created_at?: string
          faculty?: string | null
          graduation_year?: number | null
          job_title?: string | null
          learner_type?: string
          university?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_study_sessions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          starts_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          starts_at: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          starts_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_activity_days: {
        Row: {
          activity_count: number
          activity_date: string
          first_at: string
          last_at: string
          user_id: string
        }
        Insert: {
          activity_count?: number
          activity_date: string
          first_at: string
          last_at: string
          user_id: string
        }
        Update: {
          activity_count?: number
          activity_date?: string
          first_at?: string
          last_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_activity_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          enrollment_id: string
          lesson_id: string
          percent: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          enrollment_id: string
          lesson_id: string
          percent?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          enrollment_id?: string
          lesson_id?: string
          percent?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resource_translations: {
        Row: {
          created_at: string
          description: string | null
          label: string
          locale: string
          publication_status: string
          published_at: string | null
          resource_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          label: string
          locale: string
          publication_status?: string
          published_at?: string | null
          resource_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          label?: string
          locale?: string
          publication_status?: string
          published_at?: string | null
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resource_translations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "lesson_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          created_by: string
          external_url: string | null
          id: string
          kind: string
          lesson_id: string
          locale: string | null
          position: number
          storage_object_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          external_url?: string | null
          id?: string
          kind: string
          lesson_id: string
          locale?: string | null
          position: number
          storage_object_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          external_url?: string | null
          id?: string
          kind?: string
          lesson_id?: string
          locale?: string | null
          position?: number
          storage_object_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_translations: {
        Row: {
          body: string | null
          created_at: string
          lesson_id: string
          locale: string
          publication_status: string
          published_at: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          lesson_id: string
          locale: string
          publication_status?: string
          published_at?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          lesson_id?: string
          locale?: string
          publication_status?: string
          published_at?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_translations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_video_captions: {
        Row: {
          created_at: string
          id: string
          locale: string
          mux_track_id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale: string
          mux_track_id: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          mux_track_id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_video_captions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_video_captions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "lesson_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_videos: {
        Row: {
          aspect_ratio: string | null
          bunny_video_id: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          id: string
          lesson_id: string
          locale: string | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          provider: string
          required_caption_locales: string[]
          resolution_tier: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string | null
          bunny_video_id?: string | null
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          id?: string
          lesson_id: string
          locale?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          provider?: string
          required_caption_locales?: string[]
          resolution_tier?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string | null
          bunny_video_id?: string | null
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          id?: string
          lesson_id?: string
          locale?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          provider?: string
          required_caption_locales?: string[]
          resolution_tier?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_videos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_videos_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          is_preview: boolean
          is_required: boolean
          lesson_type: string
          module_id: string
          position: number
          published_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          is_required?: boolean
          lesson_type: string
          module_id: string
          position: number
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          is_required?: boolean
          lesson_type?: string
          module_id?: string
          position?: number
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      message_thread_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          course_id: string | null
          created_at: string
          id: string
          last_message_at: string
          learner_id: string
          status: string
          subject: string
          topic: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          learner_id: string
          status?: string
          subject: string
          topic: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          learner_id?: string
          status?: string
          subject?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: string
          module_id: string
          publication_status: string
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: string
          module_id: string
          publication_status?: string
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: string
          module_id?: string
          publication_status?: string
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_translations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mux_webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          certificate_id: string | null
          course_id: string | null
          created_at: string
          data: Json
          dedupe_key: string
          event_id: string | null
          id: string
          kind: string
          lesson_id: string | null
          message_thread_id: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          certificate_id?: string | null
          course_id?: string | null
          created_at?: string
          data?: Json
          dedupe_key: string
          event_id?: string | null
          id?: string
          kind: string
          lesson_id?: string | null
          message_thread_id?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          certificate_id?: string | null
          course_id?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string
          event_id?: string | null
          id?: string
          kind?: string
          lesson_id?: string | null
          message_thread_id?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "course_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_message_thread_id_fkey"
            columns: ["message_thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      option_translations: {
        Row: {
          label: string
          locale: string
          option_id: string
        }
        Insert: {
          label: string
          locale: string
          option_id: string
        }
        Update: {
          label?: string
          locale?: string
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_translations_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          amount_minor: number
          course_id: string
          id: string
          order_id: string
          title: string
        }
        Insert: {
          amount_minor: number
          course_id: string
          id?: string
          order_id: string
          title: string
        }
        Update: {
          amount_minor?: number
          course_id?: string
          id?: string
          order_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_country: string | null
          billing_name: string | null
          billing_phone: string | null
          coupon_attempts: number
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          discount_minor: number
          expires_at: string
          id: string
          locale: string
          status: string
          subtotal_minor: number
          total_minor: number
          user_id: string
        }
        Insert: {
          billing_country?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          coupon_attempts?: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_minor?: number
          expires_at?: string
          id?: string
          locale: string
          status?: string
          subtotal_minor: number
          total_minor: number
          user_id: string
        }
        Update: {
          billing_country?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          coupon_attempts?: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_minor?: number
          expires_at?: string
          id?: string
          locale?: string
          status?: string
          subtotal_minor?: number
          total_minor?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_minor: number
          event_key: string
          id: number
          order_id: string
          received_at: string
          result: string
        }
        Insert: {
          amount_minor: number
          event_key: string
          id?: never
          order_id: string
          received_at?: string
          result: string
        }
        Update: {
          amount_minor?: number
          event_key?: string
          id?: never
          order_id?: string
          received_at?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          confirmed_at: string | null
          order_id: string
          provider_order_id: string | null
          refunded_at: string | null
          session_id: string | null
          session_url: string | null
        }
        Insert: {
          confirmed_at?: string | null
          order_id: string
          provider_order_id?: string | null
          refunded_at?: string | null
          session_id?: string | null
          session_url?: string | null
        }
        Update: {
          confirmed_at?: string | null
          order_id?: string
          provider_order_id?: string | null
          refunded_at?: string | null
          session_id?: string | null
          session_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_object_key: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_object_key?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_object_key?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          id: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          position: number
          question_id: string
        }
        Update: {
          id?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_translations: {
        Row: {
          explanation: string
          locale: string
          prompt: string
          question_id: string
        }
        Insert: {
          explanation?: string
          locale: string
          prompt: string
          question_id: string
        }
        Update: {
          explanation?: string
          locale?: string
          prompt?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_translations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          id: string
          points: number
          position: number
          question_type: string
          quiz_version_id: string
        }
        Insert: {
          id?: string
          points?: number
          position: number
          question_type: string
          quiz_version_id: string
        }
        Update: {
          id?: string
          points?: number
          position?: number
          question_type?: string
          quiz_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_version_id_fkey"
            columns: ["quiz_version_id"]
            isOneToOne: false
            referencedRelation: "quiz_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answer_selections: {
        Row: {
          attempt_id: string
          option_id: string
          question_id: string
        }
        Insert: {
          attempt_id: string
          option_id: string
          question_id: string
        }
        Update: {
          attempt_id?: string
          option_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answer_selections_attempt_id_question_id_fkey"
            columns: ["attempt_id", "question_id"]
            isOneToOne: false
            referencedRelation: "quiz_answers"
            referencedColumns: ["attempt_id", "question_id"]
          },
          {
            foreignKeyName: "quiz_answer_selections_question_id_option_id_fkey"
            columns: ["question_id", "option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["question_id", "id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          question_id: string
          quiz_version_id: string
        }
        Insert: {
          attempt_id: string
          question_id: string
          quiz_version_id: string
        }
        Update: {
          attempt_id?: string
          question_id?: string
          quiz_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_quiz_version_id_fkey"
            columns: ["attempt_id", "quiz_version_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id", "quiz_version_id"]
          },
          {
            foreignKeyName: "quiz_answers_quiz_version_id_question_id_fkey"
            columns: ["quiz_version_id", "question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["quiz_version_id", "id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          attempt_number: number
          deadline: string
          enrollment_id: string
          id: string
          last_sequence: number
          locale: string
          passed: boolean | null
          possible_score: number | null
          quiz_id: string
          quiz_version_id: string
          score: number | null
          started_at: string
          status: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          attempt_number: number
          deadline: string
          enrollment_id: string
          id?: string
          last_sequence?: number
          locale: string
          passed?: boolean | null
          possible_score?: number | null
          quiz_id: string
          quiz_version_id: string
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          deadline?: string
          enrollment_id?: string
          id?: string
          last_sequence?: number
          locale?: string
          passed?: boolean | null
          possible_score?: number | null
          quiz_id?: string
          quiz_version_id?: string
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_quiz_version_id_fkey"
            columns: ["quiz_id", "quiz_version_id"]
            isOneToOne: false
            referencedRelation: "quiz_versions"
            referencedColumns: ["quiz_id", "id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_translations: {
        Row: {
          instructions: string
          locale: string
          quiz_version_id: string
          title: string
        }
        Insert: {
          instructions?: string
          locale: string
          quiz_version_id: string
          title: string
        }
        Update: {
          instructions?: string
          locale?: string
          quiz_version_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_translations_quiz_version_id_fkey"
            columns: ["quiz_version_id"]
            isOneToOne: false
            referencedRelation: "quiz_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_versions: {
        Row: {
          duration_seconds: number | null
          id: string
          max_attempts: number
          pass_basis_points: number
          published_at: string | null
          quiz_id: string
          status: string
          version_number: number
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          max_attempts?: number
          pass_basis_points?: number
          published_at?: string | null
          quiz_id: string
          status?: string
          version_number: number
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          max_attempts?: number
          pass_basis_points?: number
          published_at?: string | null
          quiz_id?: string
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_versions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_staff: boolean
          sender_id: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_staff: boolean
          sender_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          completed_at: string | null
          duration_seconds: number
          enrollment_id: string
          lesson_video_id: string
          position_seconds: number
          updated_at: string
          watched_seconds: number
        }
        Insert: {
          completed_at?: string | null
          duration_seconds: number
          enrollment_id: string
          lesson_video_id: string
          position_seconds?: number
          updated_at?: string
          watched_seconds?: number
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number
          enrollment_id?: string
          lesson_video_id?: string
          position_seconds?: number
          updated_at?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_lesson_video_id_fkey"
            columns: ["lesson_video_id"]
            isOneToOne: false
            referencedRelation: "lesson_videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_ai_course_resources: {
        Args: { p_course_id: string }
        Returns: {
          extracted: boolean
          label: string
          lesson_id: string
          lesson_resource_id: string
          mime_type: string
          size_bytes: number
          storage_object_key: string
        }[]
      }
      admin_ai_course_videos: {
        Args: { p_course_id: string }
        Returns: {
          duration_seconds: number
          label: string
          lesson_id: string
          lesson_video_id: string
          provider: string
          provider_video_id: string
          transcribed: boolean
        }[]
      }
      admin_ai_finish_course_index: {
        Args: { p_course_id: string; p_model: string }
        Returns: number
      }
      admin_ai_index_overview: {
        Args: never
        Returns: {
          chunk_count: number
          course_id: string
          embedding_model: string
          indexed_at: string
          slug: string
          source_count: number
          status: string
          title: string
          transcribed_videos: number
          videos: number
        }[]
      }
      admin_ai_index_sources: {
        Args: { p_course_id: string; p_model: string }
        Returns: {
          content: string
          indexed: boolean
          label: string
          lesson_id: string
          lesson_position: number
          module_position: number
          source_hash: string
          source_key: string
          source_locale: string
          source_type: string
        }[]
      }
      admin_ai_replace_source_chunks: {
        Args: {
          p_chunks: Json
          p_course_id: string
          p_model: string
          p_source_hash: string
          p_source_key: string
        }
        Returns: number
      }
      admin_ai_save_resource_text: {
        Args: {
          p_content: string
          p_language: string
          p_lesson_resource_id: string
          p_method: string
          p_model?: string
          p_storage_object_key: string
        }
        Returns: undefined
      }
      admin_ai_save_transcript: {
        Args: {
          p_content: string
          p_language: string
          p_lesson_video_id: string
          p_model: string
          p_provider_video_id: string
        }
        Returns: undefined
      }
      admin_attach_bunny_video: {
        Args: {
          p_bunny_video_id: string
          p_duration_seconds: number
          p_lesson_id: string
        }
        Returns: string
      }
      admin_cancel_course_event: { Args: { p_id: string }; Returns: undefined }
      admin_create_coupon: {
        Args: {
          p_amount_off_minor: number | null
          p_code: string
          p_course_slug: string | null
          p_expires_at: string | null
          p_max_redemptions: number | null
          p_percent_off: number | null
        }
        Returns: string
      }
      admin_create_course: {
        Args: {
          p_category?: string
          p_level?: string
          p_price_minor?: number
          p_slug: string
          p_thumbnail_object_key?: string
        }
        Returns: string
      }
      admin_create_course_event: {
        Args: {
          p_course_id: string
          p_description_ar: string | null
          p_description_en: string | null
          p_ends_at: string | null
          p_kind: string
          p_lesson_id: string | null
          p_meeting_url: string | null
          p_starts_at: string
          p_title_ar: string | null
          p_title_en: string | null
        }
        Returns: string
      }
      admin_create_course_module: {
        Args: { p_course_id: string; p_is_required?: boolean }
        Returns: string
      }
      admin_create_lesson: {
        Args: {
          p_duration_seconds?: number
          p_is_preview?: boolean
          p_is_required?: boolean
          p_lesson_type: string
          p_module_id: string
        }
        Returns: string
      }
      admin_create_lesson_draft: {
        Args: {
          p_locale: string
          p_module_id: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      admin_create_lesson_resource: {
        Args: {
          p_external_url?: string
          p_kind: string
          p_lesson_id: string
          p_locale?: string
        }
        Returns: {
          resource_id: string
          storage_object_key: string
        }[]
      }
      admin_create_module_draft: {
        Args: { p_course_id: string; p_locale: string; p_title: string }
        Returns: string
      }
      admin_create_quiz_version: {
        Args: {
          p_instructions: string
          p_lesson_id: string
          p_locale: string
          p_questions: Json
          p_title: string
        }
        Returns: string
      }
      admin_edit_lesson: {
        Args: {
          p_body: string
          p_duration?: number
          p_id: string
          p_locale: string
          p_preview: boolean
          p_publish: boolean
          p_required: boolean
          p_summary: string
          p_title: string
        }
        Returns: undefined
      }
      admin_edit_module: {
        Args: {
          p_description: string
          p_id: string
          p_locale: string
          p_publish: boolean
          p_required: boolean
          p_title: string
        }
        Returns: undefined
      }
      admin_find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          display_name: string
          email: string
          user_id: string
        }[]
      }
      admin_get_course: { Args: { p_course_id: string }; Returns: Json }
      admin_get_curriculum: {
        Args: { p_course_id: string; p_locale: string }
        Returns: Json
      }
      admin_get_resource_upload: {
        Args: { p_id: string; p_locale: string }
        Returns: {
          lesson_id: string
          storage_object_key: string
        }[]
      }
      admin_grant_course_access: {
        Args: { p_email: string; p_reason: string; p_slug: string }
        Returns: string
      }
      admin_grant_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: string
      }
      admin_list_assessment_lessons: {
        Args: { p_locale: string }
        Returns: {
          course_slug: string
          lesson_id: string
          title: string
        }[]
      }
      admin_list_audit: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          action: string
          actor_email: string
          actor_name: string
          id: string
          occurred_at: string
          safe_summary: string
          subject_email: string
          subject_name: string
          target_type: string
          total_count: number
        }[]
      }
      admin_list_coupons: {
        Args: never
        Returns: {
          amount_off_minor: number
          code: string
          course_slug: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          max_redemptions: number
          percent_off: number
          redemptions: number
        }[]
      }
      admin_list_course_events: {
        Args: { p_locale: string }
        Returns: {
          course_id: string
          course_slug: string
          course_title: string | null
          ends_at: string | null
          id: string
          kind: string
          learner_count: number
          lesson_id: string | null
          meeting_url: string | null
          starts_at: string
          status: string
          title_ar: string | null
          title_en: string | null
        }[]
      }
      admin_list_courses: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          category: string
          currency: string
          id: string
          level: string
          locales_present: string[]
          locales_published: string[]
          price_minor: number
          published_at: string
          slug: string
          status: string
          total_count: number
          updated_at: string
        }[]
      }
      admin_list_role_grants: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          display_name: string
          email: string
          granted_at: string
          granted_by_name: string
          id: string
          revoked_at: string
          role: string
          total_count: number
          user_id: string
        }[]
      }
      admin_localize_quiz_draft: {
        Args: {
          p_instructions: string
          p_locale: string
          p_questions: Json
          p_title: string
          p_version_id: string
        }
        Returns: undefined
      }
      admin_prepare_resource_upload: {
        Args: { p_label: string; p_lesson_id: string; p_locale: string }
        Returns: {
          resource_id: string
          storage_object_key: string
        }[]
      }
      admin_preview_published_quiz: {
        Args: { p_lesson_id: string; p_locale: string }
        Returns: Json
      }
      admin_publish_quiz_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      admin_reorder_course_modules: {
        Args: { p_course_id: string; p_module_ids: string[] }
        Returns: undefined
      }
      admin_reorder_module_lessons: {
        Args: { p_lesson_ids: string[]; p_module_id: string }
        Returns: undefined
      }
      admin_revoke_certificate: {
        Args: { p_certificate_id: string }
        Returns: undefined
      }
      admin_revoke_enrollment: {
        Args: { p_enrollment_id: string }
        Returns: undefined
      }
      admin_revoke_role: { Args: { p_role_id: string }; Returns: undefined }
      admin_save_course_content: {
        Args: {
          p_category: string
          p_description: string
          p_id?: string
          p_level: string
          p_locale: string
          p_price_minor: number
          p_publish: boolean
          p_slug: string
          p_summary: string
          p_title: string
        }
        Returns: string
      }
      admin_save_lesson_translation: {
        Args: {
          p_body?: string
          p_lesson_id: string
          p_locale: string
          p_summary?: string
          p_title: string
        }
        Returns: undefined
      }
      admin_save_module_translation: {
        Args: {
          p_description?: string
          p_locale: string
          p_module_id: string
          p_title: string
        }
        Returns: undefined
      }
      admin_save_resource_translation: {
        Args: {
          p_description?: string
          p_label: string
          p_locale: string
          p_resource_id: string
        }
        Returns: undefined
      }
      admin_set_coupon_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: undefined
      }
      admin_set_course_instructors: {
        Args: { p_course_id: string; p_instructors: Json }
        Returns: undefined
      }
      admin_set_course_status: {
        Args: { p_course_id: string; p_status: string }
        Returns: undefined
      }
      admin_set_lesson_status: {
        Args: { p_lesson_id: string; p_status: string }
        Returns: undefined
      }
      admin_set_lesson_translation_publication: {
        Args: { p_lesson_id: string; p_locale: string; p_publish: boolean }
        Returns: undefined
      }
      admin_set_lesson_type: {
        Args: { p_lesson_id: string; p_type: string }
        Returns: undefined
      }
      admin_set_module_translation_publication: {
        Args: { p_locale: string; p_module_id: string; p_publish: boolean }
        Returns: undefined
      }
      admin_set_quiz_draft_untimed: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      admin_set_resource_translation_publication: {
        Args: { p_locale: string; p_publish: boolean; p_resource_id: string }
        Returns: undefined
      }
      admin_set_translation_publication: {
        Args: { p_course_id: string; p_locale: string; p_published: boolean }
        Returns: undefined
      }
      admin_update_course: {
        Args: {
          p_category: string
          p_course_id: string
          p_level: string
          p_price_minor: number
          p_slug: string
          p_thumbnail_object_key?: string
        }
        Returns: undefined
      }
      admin_update_lesson: {
        Args: {
          p_duration_seconds: number
          p_is_preview: boolean
          p_is_required: boolean
          p_lesson_id: string
        }
        Returns: undefined
      }
      admin_upsert_course_translation: {
        Args: {
          p_course_id: string
          p_description?: string
          p_locale: string
          p_summary: string
          p_title: string
        }
        Returns: undefined
      }
      assert_active_admin: { Args: never; Returns: string }
      catalog_count_courses: {
        Args: {
          p_category?: string
          p_level?: string
          p_locale: string
          p_search?: string
        }
        Returns: number
      }
      catalog_course_durations: {
        Args: { p_course_ids: string[]; p_locale: string }
        Returns: {
          course_id: string
          duration_seconds: number
        }[]
      }
      catalog_course_feedback_summary: {
        Args: { p_course_id: string }
        Returns: {
          average_rating: number
          question_count: number
          rating_counts: number[]
          review_count: number
        }[]
      }
      catalog_get_course: {
        Args: { p_locale: string; p_slug: string }
        Returns: {
          category: string
          currency: string
          description: string
          id: string
          instructors: string[]
          level: string
          price_minor: number
          published_at: string
          slug: string
          summary: string
          thumbnail_object_key: string
          title: string
        }[]
      }
      catalog_get_course_outline: {
        Args: {
          p_course_slug: string
          p_limit?: number
          p_locale: string
          p_offset?: number
        }
        Returns: {
          course_id: string
          course_slug: string
          duration_seconds: number
          is_preview: boolean
          is_required: boolean
          lesson_id: string
          lesson_position: number
          lesson_summary: string
          lesson_title: string
          lesson_type: string
          module_description: string
          module_id: string
          module_position: number
          module_title: string
        }[]
      }
      catalog_list_categories: {
        Args: { p_locale: string }
        Returns: {
          category: string
        }[]
      }
      catalog_list_course_reviews: {
        Args: { p_course_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          author_name: string
          body: string
          can_remove: boolean
          created_at: string
          id: string
          is_mine: boolean
          rating: number
          updated_at: string
        }[]
      }
      catalog_list_courses: {
        Args: {
          p_category?: string
          p_level?: string
          p_limit?: number
          p_locale: string
          p_offset?: number
        }
        Returns: {
          category: string
          currency: string
          id: string
          instructors: string[]
          level: string
          price_minor: number
          published_at: string
          slug: string
          summary: string
          thumbnail_object_key: string
          title: string
          total_count: number
        }[]
      }
      catalog_search_courses: {
        Args: {
          p_category?: string
          p_level?: string
          p_limit?: number
          p_locale: string
          p_offset?: number
          p_search?: string
        }
        Returns: {
          category: string
          currency: string
          id: string
          instructors: string[]
          level: string
          price_minor: number
          published_at: string
          slug: string
          summary: string
          thumbnail_object_key: string
          title: string
        }[]
      }
      checkout_lock_editable_order: {
        Args: { p_order_id: string }
        Returns: {
          billing_country: string | null
          billing_name: string | null
          billing_phone: string | null
          coupon_attempts: number
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          discount_minor: number
          expires_at: string
          id: string
          locale: string
          status: string
          subtotal_minor: number
          total_minor: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      commerce_bind_session: {
        Args: {
          p_amount: number
          p_id: string
          p_session_id: string
          p_url: string
        }
        Returns: undefined
      }
      commerce_confirm_order: {
        Args: {
          p_amount: number
          p_currency: string
          p_event_key: string
          p_id: string
          p_provider_order_id: string
          p_result: string
          p_session_id: string
        }
        Returns: undefined
      }
      commerce_get_order: { Args: { p_id: string }; Returns: Json }
      course_feedback_assert_rate: {
        Args: { p_user: string }
        Returns: undefined
      }
      course_feedback_is_admin: { Args: { p_user: string }; Returns: boolean }
      course_feedback_is_enrolled: {
        Args: { p_course_id: string; p_user: string }
        Returns: boolean
      }
      course_feedback_is_published: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      course_is_published: { Args: { p_course_id: string }; Returns: boolean }
      learner_ai_begin_turn: {
        Args: {
          p_content?: string
          p_conversation_id?: string
          p_course_id?: string
          p_kind?: string
          p_locale?: string
          p_mode?: string
        }
        Returns: {
          conversation_id: string
          created: boolean
          message_id: string
        }[]
      }
      learner_ai_complete_turn: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_input_tokens?: number
          p_model?: string
          p_output_tokens?: number
          p_sources?: Json
          p_status: string
        }
        Returns: string
      }
      learner_ai_insights: { Args: never; Returns: Json }
      learner_ai_rename_conversation: {
        Args: { p_conversation_id: string; p_title: string }
        Returns: undefined
      }
      learner_ai_search_course: {
        Args: {
          p_course_id: string
          p_embedding: string
          p_limit?: number
          p_model: string
        }
        Returns: {
          content: string
          label: string
          lesson_id: string
          lesson_position: number
          module_position: number
          similarity: number
          source_locale: string
          source_type: string
        }[]
      }
      learner_answer_course_question: {
        Args: { p_body: string; p_question_id: string }
        Returns: string
      }
      learner_apply_coupon: {
        Args: { p_code: string; p_order_id: string }
        Returns: Json
      }
      learner_ask_course_question: {
        Args: { p_body: string; p_course_id: string; p_locale: string }
        Returns: string
      }
      learner_calendar_events: {
        Args: { p_from: string; p_locale: string; p_to: string }
        Returns: {
          course_slug: string | null
          course_title: string | null
          description: string | null
          ends_at: string | null
          id: string
          kind: string
          lesson_id: string | null
          meeting_url: string | null
          source: string
          starts_at: string
          status: string
          title: string | null
        }[]
      }
      learner_checkpoint_video: {
        Args: {
          p_locale: string
          p_playing: boolean
          p_position: number
          p_sequence: number
          p_session_id: string
        }
        Returns: {
          completed: boolean
          duration_seconds: number
          percent: number
          position_seconds: number
          watched_seconds: number
        }[]
      }
      learner_complete_reading: {
        Args: { p_lesson_id: string; p_locale: string }
        Returns: undefined
      }
      learner_create_order: {
        Args: { p_course_id: string; p_locale: string }
        Returns: string
      }
      learner_create_study_session: {
        Args: { p_ends_at: string; p_starts_at: string; p_title: string }
        Returns: string
      }
      learner_delete_course_answer: {
        Args: { p_answer_id: string }
        Returns: undefined
      }
      learner_delete_course_question: {
        Args: { p_question_id: string }
        Returns: undefined
      }
      learner_delete_course_review: {
        Args: { p_review_id: string }
        Returns: undefined
      }
      learner_delete_study_session: {
        Args: { p_id: string }
        Returns: undefined
      }
      learner_evaluate_completion: {
        Args: { p_course_id: string; p_locale: string }
        Returns: Json
      }
      learner_get_lesson: {
        Args: { p_lesson_id: string; p_locale: string }
        Returns: {
          body: string
          course_id: string
          is_preview: boolean
          lesson_id: string
          lesson_type: string
          summary: string
          title: string
        }[]
      }
      learner_get_lesson_resources: {
        Args: { p_lesson_id: string; p_locale: string }
        Returns: {
          description: string
          external_url: string
          kind: string
          label: string
          resource_id: string
          storage_object_key: string
        }[]
      }
      learner_get_lesson_video: {
        Args: { p_lesson_id: string; p_locale: string }
        Returns: {
          bunny_video_id: string
          mux_playback_id: string
          provider: string
          video_id: string
        }[]
      }
      learner_grant_free_enrollment: {
        Args: { p_course_id: string }
        Returns: string
      }
      learner_issue_certificate: {
        Args: { p_completion_id: string; p_locale: string }
        Returns: string
      }
      learner_learning_streak: { Args: never; Returns: Json }
      learner_learning_summary: { Args: { p_locale: string }; Returns: Json }
      learner_list_assessments: {
        Args: { p_locale: string }
        Returns: {
          course_slug: string
          course_title: string
          lesson_id: string
          title: string
        }[]
      }
      learner_list_certificates: {
        Args: never
        Returns: {
          certificate_number: string
          course_completion_id: string
          course_title: string
          id: string
          issued_at: string
          learner_name: string
          revoked_at: string
          verification_token: string
        }[]
      }
      learner_list_course_questions: {
        Args: { p_course_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          answers: Json
          author_name: string
          body: string
          can_remove: boolean
          created_at: string
          id: string
          is_mine: boolean
        }[]
      }
      learner_list_course_resources: {
        Args: { p_course_id: string; p_locale: string }
        Returns: {
          description: string
          kind: string
          label: string
          lesson_id: string
          lesson_title: string
          resource_id: string
        }[]
      }
      learner_list_notifications: {
        Args: { p_limit?: number; p_locale: string }
        Returns: {
          certificate_id: string | null
          course_slug: string | null
          course_title: string | null
          created_at: string
          data: Json
          event_id: string | null
          event_kind: string | null
          event_starts_at: string | null
          event_title: string | null
          id: string
          kind: string
          lesson_id: string | null
          lesson_title: string | null
          read_at: string | null
        }[]
      }
      learner_mark_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: number
      }
      learner_quiz_action: {
        Args: {
          p_action: string
          p_answers?: Json
          p_attempt_id?: string
          p_lesson_id: string
          p_locale: string
          p_sequence?: number
        }
        Returns: Json
      }
      learner_remove_coupon: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      learner_save_course_review: {
        Args: {
          p_body: string
          p_course_id: string
          p_locale: string
          p_rating: number
        }
        Returns: string
      }
      learner_set_order_billing: {
        Args: {
          p_country: string
          p_name: string
          p_order_id: string
          p_phone: string
        }
        Returns: undefined
      }
      learner_start_video_session: {
        Args: { p_lesson_id: string; p_locale: string }
        Returns: {
          completed: boolean
          duration_seconds: number
          percent: number
          position_seconds: number
          session_id: string
          watched_seconds: number
        }[]
      }
      learner_sync_notifications: { Args: never; Returns: undefined }
      learner_unlocked_lessons: {
        Args: { p_course_id: string }
        Returns: {
          lesson_id: string
        }[]
      }
      learner_unread_notification_count: { Args: never; Returns: number }
      messages_export_mine: { Args: never; Returns: Json }
      messages_get_thread: {
        Args: {
          p_before?: string
          p_limit?: number
          p_locale: string
          p_thread_id: string
        }
        Returns: Json
      }
      messages_inbox_summary: { Args: never; Returns: Json }
      messages_list_course_options: {
        Args: { p_locale: string }
        Returns: {
          id: string
          instructors: string[]
          slug: string
          title: string
        }[]
      }
      messages_list_threads: {
        Args: {
          p_box: string
          p_filter: string
          p_limit?: number
          p_locale: string
          p_offset?: number
          p_search: string
        }
        Returns: {
          course_slug: string
          course_title: string
          created_at: string
          id: string
          last_body: string
          last_from_me: boolean
          last_is_staff: boolean
          last_message_at: string
          learner_name: string
          status: string
          subject: string
          topic: string
          unread_count: number
        }[]
      }
      messages_mark_thread_read: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
      messages_send: {
        Args: { p_body: string; p_thread_id: string }
        Returns: string
      }
      messages_set_thread_status: {
        Args: { p_status: string; p_thread_id: string }
        Returns: undefined
      }
      messages_start_thread: {
        Args: {
          p_body: string
          p_course_id: string
          p_subject: string
          p_topic: string
        }
        Returns: string
      }
      mux_attach_upload: {
        Args: { p_upload_id: string; p_video_id: string }
        Returns: undefined
      }
      mux_begin_lesson_upload: {
        Args: { p_lesson_id: string }
        Returns: string
      }
      mux_fail_lesson_upload: {
        Args: { p_video_id: string }
        Returns: undefined
      }
      mux_get_lesson_playback: {
        Args: { p_lesson_id: string; p_locale: string }
        Returns: {
          mux_playback_id: string
        }[]
      }
      mux_get_video_management: {
        Args: { p_lesson_id: string }
        Returns: {
          captions: Json
          duration_seconds: number
          mux_asset_id: string
          required_caption_locales: string[]
          status: string
          video_id: string
        }[]
      }
      mux_list_manageable_lessons: {
        Args: { p_locale: string }
        Returns: {
          course_slug: string
          course_title: string
          lesson_id: string
          lesson_title: string
        }[]
      }
      mux_process_webhook: {
        Args: { p_data: Json; p_event_id: string; p_event_type: string }
        Returns: boolean
      }
      mux_review_caption: {
        Args: { p_locale: string; p_track_id: string; p_video_id: string }
        Returns: undefined
      }
      mux_set_caption_requirements: {
        Args: { p_locales: string[]; p_video_id: string }
        Returns: undefined
      }
      staff_list_schedulable_courses: {
        Args: { p_locale: string }
        Returns: {
          id: string
          lessons: Json
          slug: string
          title: string | null
        }[]
      }
      verify_certificate: {
        Args: { p_token: string }
        Returns: {
          certificate_number: string
          course_title: string
          issued_at: string
          learner_name: string
          status: string
        }[]
      }
      write_course_audit: {
        Args: {
          p_action: string
          p_actor: string
          p_course_id: string
          p_summary: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
