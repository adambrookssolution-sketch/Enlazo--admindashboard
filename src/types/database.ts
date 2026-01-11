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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          category_key: string
          category_name: string
          created_at: string | null
          id: number
        }
        Insert: {
          category_key: string
          category_name: string
          created_at?: string | null
          id: number
        }
        Update: {
          category_key?: string
          category_name?: string
          created_at?: string | null
          id?: number
        }
        Relationships: []
      }
      category_keywords: {
        Row: {
          category_id: number
          created_at: string | null
          id: number
          keyword: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id: number
          keyword: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: number
          keyword?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_keywords_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_tags: {
        Row: {
          category_id: number
          created_at: string | null
          id: number
          tag_key: string
          tag_name: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id: number
          tag_key: string
          tag_name: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: number
          tag_key?: string
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reviews: {
        Row: {
          average_score: number | null
          claridad_cumplimiento_pago: number
          claridad_necesidades: number
          client_id: string
          created_at: string
          facilito_condiciones_trabajo: number
          id: string
          order_id: string
          puntualidad_disponibilidad: number
          respeto_profesionalismo_cliente: number
          specialist_id: string
          updated_at: string
          volveria_trabajar_con_cliente: boolean
        }
        Insert: {
          average_score?: number | null
          claridad_cumplimiento_pago: number
          claridad_necesidades: number
          client_id: string
          created_at?: string
          facilito_condiciones_trabajo: number
          id?: string
          order_id: string
          puntualidad_disponibilidad: number
          respeto_profesionalismo_cliente: number
          specialist_id: string
          updated_at?: string
          volveria_trabajar_con_cliente: boolean
        }
        Update: {
          average_score?: number | null
          claridad_cumplimiento_pago?: number
          claridad_necesidades?: number
          client_id?: string
          created_at?: string
          facilito_condiciones_trabajo?: number
          id?: string
          order_id?: string
          puntualidad_disponibilidad?: number
          respeto_profesionalismo_cliente?: number
          specialist_id?: string
          updated_at?: string
          volveria_trabajar_con_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_reviews_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string
          created_at: string
          ext_number: string | null
          id: string
          int_number: string | null
          label: string
          lat: number | null
          lng: number | null
          neighborhood: string | null
          state: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          ext_number?: string | null
          id?: string
          int_number?: string | null
          label: string
          lat?: number | null
          lng?: number | null
          neighborhood?: string | null
          state: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          ext_number?: string | null
          id?: string
          int_number?: string | null
          label?: string
          lat?: number | null
          lng?: number | null
          neighborhood?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          quote_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          quote_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          quote_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_privacy_at: string | null
          accepted_terms_at: string | null
          avatar_url: string | null
          avg_claridad_cumplimiento_pago: number | null
          avg_claridad_necesidades: number | null
          avg_facilito_condiciones_trabajo: number | null
          avg_puntualidad_disponibilidad: number | null
          avg_respeto_profesionalismo_cliente: number | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          first_name: string
          gender: string | null
          id: string
          last_name_materno: string | null
          last_name_paterno: string | null
          nationality: string | null
          phone: string | null
          porcentaje_volveria_trabajar_cliente: number | null
          rating_promedio_cliente: number | null
          total_reviews_cliente: number | null
          updated_at: string
        }
        Insert: {
          accepted_privacy_at?: string | null
          accepted_terms_at?: string | null
          avatar_url?: string | null
          avg_claridad_cumplimiento_pago?: number | null
          avg_claridad_necesidades?: number | null
          avg_facilito_condiciones_trabajo?: number | null
          avg_puntualidad_disponibilidad?: number | null
          avg_respeto_profesionalismo_cliente?: number | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name: string
          gender?: string | null
          id: string
          last_name_materno?: string | null
          last_name_paterno?: string | null
          nationality?: string | null
          phone?: string | null
          porcentaje_volveria_trabajar_cliente?: number | null
          rating_promedio_cliente?: number | null
          total_reviews_cliente?: number | null
          updated_at?: string
        }
        Update: {
          accepted_privacy_at?: string | null
          accepted_terms_at?: string | null
          avatar_url?: string | null
          avg_claridad_cumplimiento_pago?: number | null
          avg_claridad_necesidades?: number | null
          avg_facilito_condiciones_trabajo?: number | null
          avg_puntualidad_disponibilidad?: number | null
          avg_respeto_profesionalismo_cliente?: number | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name_materno?: string | null
          last_name_paterno?: string | null
          nationality?: string | null
          phone?: string | null
          porcentaje_volveria_trabajar_cliente?: number | null
          rating_promedio_cliente?: number | null
          total_reviews_cliente?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          additional_notes: string | null
          attachments: string[] | null
          created_at: string
          description: string | null
          estimated_duration_hours: number | null
          exclusions: string | null
          has_warranty: boolean | null
          id: string
          includes_materials: boolean | null
          materials_list: string | null
          price_fixed: number | null
          price_max: number | null
          price_min: number | null
          proposed_date: string | null
          proposed_time_end: string | null
          proposed_time_start: string | null
          request_id: string
          requires_visit: boolean | null
          scope: string | null
          specialist_id: string
          status: Database["public"]["Enums"]["quote_status"]
          visit_cost: number | null
          warranty_days: number | null
          warranty_description: string | null
        }
        Insert: {
          additional_notes?: string | null
          attachments?: string[] | null
          created_at?: string
          description?: string | null
          estimated_duration_hours?: number | null
          exclusions?: string | null
          has_warranty?: boolean | null
          id?: string
          includes_materials?: boolean | null
          materials_list?: string | null
          price_fixed?: number | null
          price_max?: number | null
          price_min?: number | null
          proposed_date?: string | null
          proposed_time_end?: string | null
          proposed_time_start?: string | null
          request_id: string
          requires_visit?: boolean | null
          scope?: string | null
          specialist_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          visit_cost?: number | null
          warranty_days?: number | null
          warranty_description?: string | null
        }
        Update: {
          additional_notes?: string | null
          attachments?: string[] | null
          created_at?: string
          description?: string | null
          estimated_duration_hours?: number | null
          exclusions?: string | null
          has_warranty?: boolean | null
          id?: string
          includes_materials?: boolean | null
          materials_list?: string | null
          price_fixed?: number | null
          price_max?: number | null
          price_min?: number | null
          proposed_date?: string | null
          proposed_time_end?: string | null
          proposed_time_start?: string | null
          request_id?: string
          requires_visit?: boolean | null
          scope?: string | null
          specialist_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          visit_cost?: number | null
          warranty_days?: number | null
          warranty_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_cancellation_feedback: {
        Row: {
          created_at: string
          id: string
          improvement_text: string | null
          main_reason: string
          other_reason_text: string | null
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improvement_text?: string | null
          main_reason: string
          other_reason_text?: string | null
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improvement_text?: string | null
          main_reason?: string
          other_reason_text?: string | null
          request_id?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          average_score: number | null
          calidad_trabajo: number | null
          comment: string | null
          created_at: string
          cumplimiento_servicio: number | null
          id: string
          profesionalismo: number | null
          puntualidad: number | null
          rating: number
          relacion_calidad_precio: number | null
          request_id: string
          specialist_id: string
          user_id: string
          volveria_trabajar: boolean | null
        }
        Insert: {
          average_score?: number | null
          calidad_trabajo?: number | null
          comment?: string | null
          created_at?: string
          cumplimiento_servicio?: number | null
          id?: string
          profesionalismo?: number | null
          puntualidad?: number | null
          rating: number
          relacion_calidad_precio?: number | null
          request_id: string
          specialist_id: string
          user_id: string
          volveria_trabajar?: boolean | null
        }
        Update: {
          average_score?: number | null
          calidad_trabajo?: number | null
          comment?: string | null
          created_at?: string
          cumplimiento_servicio?: number | null
          id?: string
          profesionalismo?: number | null
          puntualidad?: number | null
          rating?: number
          relacion_calidad_precio?: number | null
          request_id?: string
          specialist_id?: string
          user_id?: string
          volveria_trabajar?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          activity: string
          category: string
          client_review_submitted: boolean | null
          created_at: string
          description: string | null
          evidence_urls: string[] | null
          id: string
          is_urgent: boolean | null
          location_id: string | null
          price_max: number | null
          price_min: number | null
          review_submitted: boolean | null
          scheduled_date: string | null
          service_description: string | null
          service_title: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          time_end: string | null
          time_preference: string | null
          time_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: string
          category: string
          client_review_submitted?: boolean | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          is_urgent?: boolean | null
          location_id?: string | null
          price_max?: number | null
          price_min?: number | null
          review_submitted?: boolean | null
          scheduled_date?: string | null
          service_description?: string | null
          service_title?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          time_end?: string | null
          time_preference?: string | null
          time_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          category?: string
          client_review_submitted?: boolean | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          is_urgent?: boolean | null
          location_id?: string | null
          price_max?: number | null
          price_min?: number | null
          review_submitted?: boolean | null
          scheduled_date?: string | null
          service_description?: string | null
          service_title?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          time_end?: string | null
          time_preference?: string | null
          time_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_categories: {
        Row: {
          category_id: number
          created_at: string | null
          experience_years: number | null
          id: string
          specialist_id: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          experience_years?: number | null
          id?: string
          specialist_id: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          experience_years?: number | null
          id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_categories_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_credentials: {
        Row: {
          attachment_url: string | null
          created_at: string
          description: string | null
          end_year: number | null
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer: string
          specialist_id: string
          start_year: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          end_year?: number | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer: string
          specialist_id: string
          start_year?: number | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          end_year?: number | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string
          specialist_id?: string
          start_year?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_credentials_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_portfolio: {
        Row: {
          created_at: string
          id: string
          image_url: string
          specialist_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          specialist_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          specialist_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_portfolio_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_problem_reports: {
        Row: {
          created_at: string
          id: string
          main_reason: string
          other_reason_text: string | null
          quote_id: string
          request_id: string
          specialist_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_reason: string
          other_reason_text?: string | null
          quote_id: string
          request_id: string
          specialist_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          main_reason?: string
          other_reason_text?: string | null
          quote_id?: string
          request_id?: string
          specialist_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_problem_reports_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_problem_reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_profiles: {
        Row: {
          accepted_terms_at: string | null
          address_proof_url: string | null
          avg_calidad_trabajo: number | null
          avg_cumplimiento_servicio: number | null
          avg_profesionalismo: number | null
          avg_puntualidad: number | null
          avg_relacion_calidad_precio: number | null
          birth_or_constitution_date: string | null
          city: string | null
          created_at: string
          csf_document_url: string | null
          email: string | null
          id: string
          id_document_url: string
          licenses_certifications: string | null
          materials_policy: boolean | null
          neighborhood: string | null
          person_type: string | null
          phone: string
          porcentaje_volveria: number | null
          postal_code: string | null
          professional_description: string | null
          profile_photo_url: string | null
          rating_promedio: number | null
          razon_social: string | null
          rfc: string
          specialist_type: string | null
          state: string | null
          status: string
          street: string | null
          street_number: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          warranty_days: number | null
        }
        Insert: {
          accepted_terms_at?: string | null
          address_proof_url?: string | null
          avg_calidad_trabajo?: number | null
          avg_cumplimiento_servicio?: number | null
          avg_profesionalismo?: number | null
          avg_puntualidad?: number | null
          avg_relacion_calidad_precio?: number | null
          birth_or_constitution_date?: string | null
          city?: string | null
          created_at?: string
          csf_document_url?: string | null
          email?: string | null
          id?: string
          id_document_url: string
          licenses_certifications?: string | null
          materials_policy?: boolean | null
          neighborhood?: string | null
          person_type?: string | null
          phone: string
          porcentaje_volveria?: number | null
          postal_code?: string | null
          professional_description?: string | null
          profile_photo_url?: string | null
          rating_promedio?: number | null
          razon_social?: string | null
          rfc: string
          specialist_type?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          warranty_days?: number | null
        }
        Update: {
          accepted_terms_at?: string | null
          address_proof_url?: string | null
          avg_calidad_trabajo?: number | null
          avg_cumplimiento_servicio?: number | null
          avg_profesionalismo?: number | null
          avg_puntualidad?: number | null
          avg_relacion_calidad_precio?: number | null
          birth_or_constitution_date?: string | null
          city?: string | null
          created_at?: string
          csf_document_url?: string | null
          email?: string | null
          id?: string
          id_document_url?: string
          licenses_certifications?: string | null
          materials_policy?: boolean | null
          neighborhood?: string | null
          person_type?: string | null
          phone?: string
          porcentaje_volveria?: number | null
          postal_code?: string | null
          professional_description?: string | null
          profile_photo_url?: string | null
          rating_promedio?: number | null
          razon_social?: string | null
          rfc?: string
          specialist_type?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "specialist_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_request_rejections: {
        Row: {
          created_at: string
          id: string
          main_reason: string
          other_reason_text: string | null
          request_id: string
          specialist_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_reason: string
          other_reason_text?: string | null
          request_id: string
          specialist_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          main_reason?: string
          other_reason_text?: string | null
          request_id?: string
          specialist_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_request_rejections_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_request_rejections_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_tags: {
        Row: {
          created_at: string | null
          id: string
          specialist_id: string
          tag_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          specialist_id: string
          tag_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          specialist_id?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "specialist_tags_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "category_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_work_zones: {
        Row: {
          cities: string[]
          coverage_municipalities: string[] | null
          created_at: string
          id: string
          specialist_id: string
          state: string
        }
        Insert: {
          cities: string[]
          coverage_municipalities?: string[] | null
          created_at?: string
          id?: string
          specialist_id: string
          state: string
        }
        Update: {
          cities?: string[]
          coverage_municipalities?: string[] | null
          created_at?: string
          id?: string
          specialist_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_work_zones_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          id: string
          user_id: string
          last_seen: string
          is_online: boolean
          current_quote_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          last_seen?: string
          is_online?: boolean
          current_quote_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          last_seen?: string
          is_online?: boolean
          current_quote_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_submit_review: {
        Args: { p_request_id: string; p_user_id: string }
        Returns: Json
      }
      delete_specialist_role: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_presence: {
        Args: { p_is_online: boolean; p_current_quote_id?: string | null }
        Returns: void
      }
      mark_messages_as_read: {
        Args: { p_quote_id: string }
        Returns: number
      }
      get_unread_count: {
        Args: { p_user_id: string }
        Returns: { quote_id: string; unread_count: number }[]
      }
    }
    Enums: {
      app_role: "user" | "specialist" | "admin"
      quote_status: "pending" | "accepted" | "rejected" | "pre_selected"
      service_request_status:
        | "draft"
        | "active"
        | "in_progress"
        | "completed"
        | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "specialist", "admin"],
      quote_status: ["pending", "accepted", "rejected", "pre_selected"],
      service_request_status: [
        "draft",
        "active",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
