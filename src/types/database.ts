export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          accessed_user_id: string | null;
          action: string;
          actor_id: string;
          course_id: string | null;
          enrollment_id: string | null;
          id: string;
          lesson_id: string | null;
          lesson_resource_id: string | null;
          lesson_video_id: string | null;
          module_id: string | null;
          occurred_at: string;
          request_id: string | null;
          safe_summary: string;
          target_type: string;
          user_role_id: string | null;
        };
        Insert: {
          accessed_user_id?: string | null;
          action: string;
          actor_id: string;
          course_id?: string | null;
          enrollment_id?: string | null;
          id?: string;
          lesson_id?: string | null;
          lesson_resource_id?: string | null;
          lesson_video_id?: string | null;
          module_id?: string | null;
          occurred_at?: string;
          request_id?: string | null;
          safe_summary: string;
          target_type?: string;
          user_role_id?: string | null;
        };
        Update: {
          accessed_user_id?: string | null;
          action?: string;
          actor_id?: string;
          course_id?: string | null;
          enrollment_id?: string | null;
          id?: string;
          lesson_id?: string | null;
          lesson_resource_id?: string | null;
          lesson_video_id?: string | null;
          module_id?: string | null;
          occurred_at?: string;
          request_id?: string | null;
          safe_summary?: string;
          target_type?: string;
          user_role_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_accessed_user_id_fkey";
            columns: ["accessed_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_lesson_resource_id_fkey";
            columns: ["lesson_resource_id"];
            isOneToOne: false;
            referencedRelation: "lesson_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_lesson_video_id_fkey";
            columns: ["lesson_video_id"];
            isOneToOne: false;
            referencedRelation: "lesson_videos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_user_role_id_fkey";
            columns: ["user_role_id"];
            isOneToOne: false;
            referencedRelation: "user_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_instructors: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          course_id: string;
          display_name: string;
          id: string;
          position: number;
          profile_id: string | null;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          course_id: string;
          display_name: string;
          id?: string;
          position: number;
          profile_id?: string | null;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          course_id?: string;
          display_name?: string;
          id?: string;
          position?: number;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "course_instructors_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_instructors_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_instructors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          grant_source: string;
          status: string;
          granted_by: string;
          granted_at: string;
          expires_at: string | null;
          completed_at: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          grant_source?: string;
          status?: string;
          granted_by: string;
          granted_at?: string;
          expires_at?: string | null;
          completed_at?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          grant_source?: string;
          status?: string;
          granted_by?: string;
          granted_at?: string;
          expires_at?: string | null;
          completed_at?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_modules: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          is_required: boolean;
          position: number;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          is_required?: boolean;
          position: number;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          is_required?: boolean;
          position?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      course_translations: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          locale: string;
          publication_status: string;
          published_at: string | null;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          locale: string;
          publication_status?: string;
          published_at?: string | null;
          summary: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          locale?: string;
          publication_status?: string;
          published_at?: string | null;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_translations_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          category: string | null;
          created_at: string;
          created_by: string;
          currency: string;
          id: string;
          level: string | null;
          price_minor: number;
          published_at: string | null;
          slug: string;
          status: string;
          thumbnail_object_key: string | null;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          created_by: string;
          currency?: string;
          id?: string;
          level?: string | null;
          price_minor?: number;
          published_at?: string | null;
          slug: string;
          status?: string;
          thumbnail_object_key?: string | null;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          created_by?: string;
          currency?: string;
          id?: string;
          level?: string | null;
          price_minor?: number;
          published_at?: string | null;
          slug?: string;
          status?: string;
          thumbnail_object_key?: string | null;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_preferences: {
        Row: {
          assignment_deadlines: boolean;
          autoplay_next: boolean;
          community_updates: boolean;
          course_recommendations: boolean;
          course_reminders: boolean;
          daily_learning_reminders: boolean;
          email_notifications: boolean;
          preferred_locale: string;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assignment_deadlines?: boolean;
          autoplay_next?: boolean;
          community_updates?: boolean;
          course_recommendations?: boolean;
          course_reminders?: boolean;
          daily_learning_reminders?: boolean;
          email_notifications?: boolean;
          preferred_locale?: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assignment_deadlines?: boolean;
          autoplay_next?: boolean;
          community_updates?: boolean;
          course_recommendations?: boolean;
          course_reminders?: boolean;
          daily_learning_reminders?: boolean;
          email_notifications?: boolean;
          preferred_locale?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_profiles: {
        Row: {
          birth_year: number | null;
          company_name: string | null;
          created_at: string;
          faculty: string | null;
          graduation_year: number | null;
          job_title: string | null;
          learner_type: string;
          university: string | null;
          updated_at: string;
          user_id: string;
          years_experience: number | null;
        };
        Insert: {
          birth_year?: number | null;
          company_name?: string | null;
          created_at?: string;
          faculty?: string | null;
          graduation_year?: number | null;
          job_title?: string | null;
          learner_type: string;
          university?: string | null;
          updated_at?: string;
          user_id: string;
          years_experience?: number | null;
        };
        Update: {
          birth_year?: number | null;
          company_name?: string | null;
          created_at?: string;
          faculty?: string | null;
          graduation_year?: number | null;
          job_title?: string | null;
          learner_type?: string;
          university?: string | null;
          updated_at?: string;
          user_id?: string;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "learner_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_resource_translations: {
        Row: {
          created_at: string;
          description: string | null;
          label: string;
          locale: string;
          publication_status: string;
          published_at: string | null;
          resource_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          label: string;
          locale: string;
          publication_status?: string;
          published_at?: string | null;
          resource_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          label?: string;
          locale?: string;
          publication_status?: string;
          published_at?: string | null;
          resource_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_resource_translations_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "lesson_resources";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_resources: {
        Row: {
          created_at: string;
          created_by: string;
          external_url: string | null;
          id: string;
          kind: string;
          lesson_id: string;
          locale: string | null;
          position: number;
          storage_object_key: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          external_url?: string | null;
          id?: string;
          kind: string;
          lesson_id: string;
          locale?: string | null;
          position: number;
          storage_object_key?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          external_url?: string | null;
          id?: string;
          kind?: string;
          lesson_id?: string;
          locale?: string | null;
          position?: number;
          storage_object_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_resources_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_videos: {
        Row: {
          aspect_ratio: string | null;
          created_at: string;
          created_by: string;
          duration_seconds: number | null;
          id: string;
          lesson_id: string;
          locale: string | null;
          mux_asset_id: string | null;
          mux_playback_id: string | null;
          mux_upload_id: string | null;
          required_caption_locales: string[];
          resolution_tier: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          aspect_ratio?: string | null;
          created_at?: string;
          created_by: string;
          duration_seconds?: number | null;
          id?: string;
          lesson_id: string;
          locale?: string | null;
          mux_asset_id?: string | null;
          mux_playback_id?: string | null;
          mux_upload_id?: string | null;
          required_caption_locales?: string[];
          resolution_tier?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          aspect_ratio?: string | null;
          created_at?: string;
          created_by?: string;
          duration_seconds?: number | null;
          id?: string;
          lesson_id?: string;
          locale?: string | null;
          mux_asset_id?: string | null;
          mux_playback_id?: string | null;
          mux_upload_id?: string | null;
          required_caption_locales?: string[];
          resolution_tier?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_videos_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_videos_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_video_captions: {
        Row: {
          created_at: string;
          id: string;
          locale: string;
          mux_track_id: string;
          review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          updated_at: string;
          video_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          locale: string;
          mux_track_id: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
          video_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          locale?: string;
          mux_track_id?: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_video_captions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_video_captions_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "lesson_videos";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_translations: {
        Row: {
          body: string | null;
          created_at: string;
          lesson_id: string;
          locale: string;
          publication_status: string;
          published_at: string | null;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          lesson_id: string;
          locale: string;
          publication_status?: string;
          published_at?: string | null;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          lesson_id?: string;
          locale?: string;
          publication_status?: string;
          published_at?: string | null;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_translations_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          id: string;
          is_preview: boolean;
          is_required: boolean;
          lesson_type: string;
          module_id: string;
          position: number;
          published_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          is_preview?: boolean;
          is_required?: boolean;
          lesson_type: string;
          module_id: string;
          position: number;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          is_preview?: boolean;
          is_required?: boolean;
          lesson_type?: string;
          module_id?: string;
          position?: number;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      module_translations: {
        Row: {
          created_at: string;
          description: string | null;
          locale: string;
          module_id: string;
          publication_status: string;
          published_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          locale: string;
          module_id: string;
          publication_status?: string;
          published_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          locale?: string;
          module_id?: string;
          publication_status?: string;
          published_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "module_translations_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      mux_webhook_events: {
        Row: {
          event_type: string;
          id: string;
          processed_at: string;
        };
        Insert: {
          event_type: string;
          id: string;
          processed_at?: string;
        };
        Update: {
          event_type?: string;
          id?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_object_key: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_object_key?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_object_key?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string;
          id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by: string;
          id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role: string;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string;
          id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_create_course: {
        Args: {
          p_category?: string;
          p_level?: string;
          p_price_minor?: number;
          p_slug: string;
          p_thumbnail_object_key?: string;
        };
        Returns: string;
      };
      admin_create_course_module: {
        Args: { p_course_id: string; p_is_required?: boolean };
        Returns: string;
      };
      admin_create_lesson: {
        Args: {
          p_duration_seconds?: number;
          p_is_preview?: boolean;
          p_is_required?: boolean;
          p_lesson_type: string;
          p_module_id: string;
        };
        Returns: string;
      };
      admin_create_lesson_resource: {
        Args: {
          p_external_url?: string;
          p_kind: string;
          p_lesson_id: string;
          p_locale?: string;
        };
        Returns: {
          resource_id: string;
          storage_object_key: string;
        }[];
      };
      admin_find_user_by_email: {
        Args: { p_email: string };
        Returns: {
          display_name: string;
          email: string;
          user_id: string;
        }[];
      };
      admin_get_course: { Args: { p_course_id: string }; Returns: Json };
      admin_grant_role: {
        Args: { p_role: string; p_user_id: string };
        Returns: string;
      };
      admin_list_audit: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          action: string;
          actor_email: string;
          actor_name: string;
          id: string;
          occurred_at: string;
          safe_summary: string;
          subject_email: string;
          subject_name: string;
          target_type: string;
          total_count: number;
        }[];
      };
      admin_list_courses: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string };
        Returns: {
          category: string;
          currency: string;
          id: string;
          level: string;
          locales_present: string[];
          locales_published: string[];
          price_minor: number;
          published_at: string;
          slug: string;
          status: string;
          total_count: number;
          updated_at: string;
        }[];
      };
      admin_list_role_grants: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          display_name: string;
          email: string;
          granted_at: string;
          granted_by_name: string;
          id: string;
          revoked_at: string;
          role: string;
          total_count: number;
          user_id: string;
        }[];
      };
      admin_reorder_course_modules: {
        Args: { p_course_id: string; p_module_ids: string[] };
        Returns: undefined;
      };
      admin_reorder_module_lessons: {
        Args: { p_lesson_ids: string[]; p_module_id: string };
        Returns: undefined;
      };
      admin_revoke_role: { Args: { p_role_id: string }; Returns: undefined };
      admin_revoke_enrollment: { Args: { p_enrollment_id: string }; Returns: undefined };
      admin_save_lesson_translation: {
        Args: {
          p_body?: string;
          p_lesson_id: string;
          p_locale: string;
          p_summary?: string;
          p_title: string;
        };
        Returns: undefined;
      };
      admin_save_module_translation: {
        Args: {
          p_description?: string;
          p_locale: string;
          p_module_id: string;
          p_title: string;
        };
        Returns: undefined;
      };
      admin_save_resource_translation: {
        Args: {
          p_description?: string;
          p_label: string;
          p_locale: string;
          p_resource_id: string;
        };
        Returns: undefined;
      };
      admin_set_course_instructors: {
        Args: { p_course_id: string; p_instructors: Json };
        Returns: undefined;
      };
      admin_set_course_status: {
        Args: { p_course_id: string; p_status: string };
        Returns: undefined;
      };
      admin_set_lesson_status: {
        Args: { p_lesson_id: string; p_status: string };
        Returns: undefined;
      };
      admin_set_lesson_translation_publication: {
        Args: { p_lesson_id: string; p_locale: string; p_publish: boolean };
        Returns: undefined;
      };
      admin_set_module_translation_publication: {
        Args: { p_locale: string; p_module_id: string; p_publish: boolean };
        Returns: undefined;
      };
      admin_set_resource_translation_publication: {
        Args: { p_locale: string; p_publish: boolean; p_resource_id: string };
        Returns: undefined;
      };
      admin_set_translation_publication: {
        Args: { p_course_id: string; p_locale: string; p_published: boolean };
        Returns: undefined;
      };
      admin_update_course: {
        Args: {
          p_category: string;
          p_course_id: string;
          p_level: string;
          p_price_minor: number;
          p_slug: string;
          p_thumbnail_object_key?: string;
        };
        Returns: undefined;
      };
      admin_update_lesson: {
        Args: {
          p_duration_seconds: number;
          p_is_preview: boolean;
          p_is_required: boolean;
          p_lesson_id: string;
        };
        Returns: undefined;
      };
      admin_upsert_course_translation: {
        Args: {
          p_course_id: string;
          p_description?: string;
          p_locale: string;
          p_summary: string;
          p_title: string;
        };
        Returns: undefined;
      };
      assert_active_admin: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      catalog_get_course: {
        Args: { p_locale: string; p_slug: string };
        Returns: {
          category: string;
          currency: string;
          description: string;
          id: string;
          instructors: string[];
          level: string;
          price_minor: number;
          published_at: string;
          slug: string;
          summary: string;
          thumbnail_object_key: string;
          title: string;
        }[];
      };
      catalog_get_course_outline: {
        Args: {
          p_course_slug: string;
          p_limit?: number;
          p_locale: string;
          p_offset?: number;
        };
        Returns: {
          course_id: string;
          course_slug: string;
          duration_seconds: number;
          is_preview: boolean;
          is_required: boolean;
          lesson_id: string;
          lesson_position: number;
          lesson_summary: string;
          lesson_title: string;
          lesson_type: string;
          module_description: string;
          module_id: string;
          module_position: number;
          module_title: string;
        }[];
      };
      catalog_count_courses: {
        Args: {
          p_category?: string;
          p_level?: string;
          p_locale: string;
          p_search?: string;
        };
        Returns: number;
      };
      catalog_list_categories: {
        Args: { p_locale: string };
        Returns: { category: string }[];
      };
      catalog_list_courses: {
        Args: {
          p_category?: string;
          p_level?: string;
          p_limit?: number;
          p_locale: string;
          p_offset?: number;
        };
        Returns: {
          category: string;
          currency: string;
          id: string;
          instructors: string[];
          level: string;
          price_minor: number;
          published_at: string;
          slug: string;
          summary: string;
          thumbnail_object_key: string;
          title: string;
          total_count: number;
        }[];
      };
      learner_grant_free_enrollment: { Args: { p_course_id: string }; Returns: string };
      mux_begin_lesson_upload: { Args: { p_lesson_id: string }; Returns: string };
      mux_attach_upload: { Args: { p_upload_id: string; p_video_id: string }; Returns: undefined };
      mux_fail_lesson_upload: { Args: { p_video_id: string }; Returns: undefined };
      mux_get_lesson_playback: {
        Args: { p_lesson_id: string; p_locale: string };
        Returns: { mux_playback_id: string }[];
      };
      mux_process_webhook: {
        Args: { p_data: Json; p_event_id: string; p_event_type: string };
        Returns: boolean;
      };
      mux_review_caption: {
        Args: { p_locale: string; p_track_id: string; p_video_id: string };
        Returns: undefined;
      };
      mux_set_caption_requirements: {
        Args: { p_locales: string[]; p_video_id: string };
        Returns: undefined;
      };
      learner_get_lesson: {
        Args: { p_lesson_id: string; p_locale: string };
        Returns: {
          body: string;
          course_id: string;
          is_preview: boolean;
          lesson_id: string;
          lesson_type: string;
          summary: string;
          title: string;
        }[];
      };
      learner_get_lesson_resources: {
        Args: { p_lesson_id: string; p_locale: string };
        Returns: {
          description: string;
          external_url: string;
          kind: string;
          label: string;
          resource_id: string;
          storage_object_key: string;
        }[];
      };
      catalog_search_courses: {
        Args: {
          p_category?: string;
          p_level?: string;
          p_limit?: number;
          p_locale: string;
          p_offset?: number;
          p_search?: string;
        };
        Returns: {
          category: string;
          currency: string;
          id: string;
          instructors: string[];
          level: string;
          price_minor: number;
          published_at: string;
          slug: string;
          summary: string;
          thumbnail_object_key: string;
          title: string;
        }[];
      };
      course_is_published: { Args: { p_course_id: string }; Returns: boolean };
      write_course_audit: {
        Args: {
          p_action: string;
          p_actor: string;
          p_course_id: string;
          p_summary: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
