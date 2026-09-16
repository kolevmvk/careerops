export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  careerops: {
    Tables: {
      document_sources: {
        Row: {
          created_at: string;
          document_version_id: string;
          employment_highlight_id: string | null;
          employment_id: string | null;
          id: string;
          project_id: string | null;
          section: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_version_id: string;
          employment_highlight_id?: string | null;
          employment_id?: string | null;
          id?: string;
          project_id?: string | null;
          section: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_version_id?: string;
          employment_highlight_id?: string | null;
          employment_id?: string | null;
          id?: string;
          project_id?: string | null;
          section?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_sources_document_version_id_fkey";
            columns: ["document_version_id"];
            isOneToOne: false;
            referencedRelation: "document_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_sources_employment_highlight_id_fkey";
            columns: ["employment_highlight_id"];
            isOneToOne: false;
            referencedRelation: "employment_highlights";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_sources_employment_id_fkey";
            columns: ["employment_id"];
            isOneToOne: false;
            referencedRelation: "employments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_sources_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      document_versions: {
        Row: {
          content: Json;
          created_at: string;
          document_id: string;
          frozen_at: string | null;
          generator: Database["careerops"]["Enums"]["document_generator"];
          id: string;
          rendered_md: string | null;
          status: Database["careerops"]["Enums"]["document_status"];
          updated_at: string | null;
          user_id: string;
          version: number;
        };
        Insert: {
          content?: Json;
          created_at?: string;
          document_id: string;
          frozen_at?: string | null;
          generator?: Database["careerops"]["Enums"]["document_generator"];
          id?: string;
          rendered_md?: string | null;
          status?: Database["careerops"]["Enums"]["document_status"];
          updated_at?: string | null;
          user_id: string;
          version: number;
        };
        Update: {
          content?: Json;
          created_at?: string;
          document_id?: string;
          frozen_at?: string | null;
          generator?: Database["careerops"]["Enums"]["document_generator"];
          id?: string;
          rendered_md?: string | null;
          status?: Database["careerops"]["Enums"]["document_status"];
          updated_at?: string | null;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string;
          id: string;
          job_id: string | null;
          kind: Database["careerops"]["Enums"]["document_kind"];
          language: string;
          organization_id: string | null;
          project_id: string | null;
          target_role_id: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id?: string | null;
          kind: Database["careerops"]["Enums"]["document_kind"];
          language?: string;
          organization_id?: string | null;
          project_id?: string | null;
          target_role_id?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string | null;
          kind?: Database["careerops"]["Enums"]["document_kind"];
          language?: string;
          organization_id?: string | null;
          project_id?: string | null;
          target_role_id?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      employment_highlights: {
        Row: {
          created_at: string;
          employment_id: string;
          id: string;
          sort_order: number;
          text: string;
          updated_at: string | null;
          user_id: string;
          verified_at: string | null;
          visibility: Database["careerops"]["Enums"]["visibility"];
        };
        Insert: {
          created_at?: string;
          employment_id: string;
          id?: string;
          sort_order?: number;
          text: string;
          updated_at?: string | null;
          user_id: string;
          verified_at?: string | null;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Update: {
          created_at?: string;
          employment_id?: string;
          id?: string;
          sort_order?: number;
          text?: string;
          updated_at?: string | null;
          user_id?: string;
          verified_at?: string | null;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "employment_highlights_employment_id_fkey";
            columns: ["employment_id"];
            isOneToOne: false;
            referencedRelation: "employments";
            referencedColumns: ["id"];
          },
        ];
      };
      employments: {
        Row: {
          ai_allowed: boolean;
          created_at: string;
          date_precision: Database["careerops"]["Enums"]["date_precision"];
          disclosure_status: Database["careerops"]["Enums"]["disclosure_status"];
          employment_type: Database["careerops"]["Enums"]["employment_type"];
          end_date: string | null;
          id: string;
          location: string | null;
          organization: string;
          public_organization: string | null;
          public_title: string | null;
          start_date: string;
          summary: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
          visibility: Database["careerops"]["Enums"]["visibility"];
        };
        Insert: {
          ai_allowed?: boolean;
          created_at?: string;
          date_precision?: Database["careerops"]["Enums"]["date_precision"];
          disclosure_status?: Database["careerops"]["Enums"]["disclosure_status"];
          employment_type: Database["careerops"]["Enums"]["employment_type"];
          end_date?: string | null;
          id?: string;
          location?: string | null;
          organization: string;
          public_organization?: string | null;
          public_title?: string | null;
          start_date: string;
          summary?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Update: {
          ai_allowed?: boolean;
          created_at?: string;
          date_precision?: Database["careerops"]["Enums"]["date_precision"];
          disclosure_status?: Database["careerops"]["Enums"]["disclosure_status"];
          employment_type?: Database["careerops"]["Enums"]["employment_type"];
          end_date?: string | null;
          id?: string;
          location?: string | null;
          organization?: string;
          public_organization?: string | null;
          public_title?: string | null;
          start_date?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Relationships: [];
      };
      fact_translations: {
        Row: {
          approved_at: string | null;
          body: string;
          created_at: string;
          employment_highlight_id: string | null;
          generator: Database["careerops"]["Enums"]["document_generator"];
          id: string;
          locale: string;
          project_id: string | null;
          source_hash: string;
          status: Database["careerops"]["Enums"]["translation_status"];
          title: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          approved_at?: string | null;
          body: string;
          created_at?: string;
          employment_highlight_id?: string | null;
          generator?: Database["careerops"]["Enums"]["document_generator"];
          id?: string;
          locale: string;
          project_id?: string | null;
          source_hash: string;
          status?: Database["careerops"]["Enums"]["translation_status"];
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          approved_at?: string | null;
          body?: string;
          created_at?: string;
          employment_highlight_id?: string | null;
          generator?: Database["careerops"]["Enums"]["document_generator"];
          id?: string;
          locale?: string;
          project_id?: string | null;
          source_hash?: string;
          status?: Database["careerops"]["Enums"]["translation_status"];
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fact_translations_employment_highlight_id_fkey";
            columns: ["employment_highlight_id"];
            isOneToOne: false;
            referencedRelation: "employment_highlights";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fact_translations_locale_fkey";
            columns: ["locale"];
            isOneToOne: false;
            referencedRelation: "locales";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "fact_translations_locale_fkey";
            columns: ["locale"];
            isOneToOne: false;
            referencedRelation: "public_facts";
            referencedColumns: ["locale"];
          },
          {
            foreignKeyName: "fact_translations_locale_fkey";
            columns: ["locale"];
            isOneToOne: false;
            referencedRelation: "translation_status_report";
            referencedColumns: ["locale"];
          },
          {
            foreignKeyName: "fact_translations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          company: string;
          content_hash: string;
          created_at: string;
          employment_type: string | null;
          id: string;
          imported_at: string;
          language: string | null;
          location: string | null;
          organization_id: string | null;
          parser_version: string | null;
          posted_at: string | null;
          raw_text: string;
          relevance: number | null;
          remote_policy: Database["careerops"]["Enums"]["remote_policy"];
          salary_currency: string | null;
          salary_max: number | null;
          salary_min: number | null;
          seniority: string | null;
          source_kind: Database["careerops"]["Enums"]["job_source_kind"];
          source_url: string | null;
          status: Database["careerops"]["Enums"]["job_status"];
          target_role_id: string | null;
          title: string;
          updated_at: string | null;
          url_hash: string | null;
          user_id: string;
        };
        Insert: {
          company: string;
          content_hash: string;
          created_at?: string;
          employment_type?: string | null;
          id?: string;
          imported_at?: string;
          language?: string | null;
          location?: string | null;
          organization_id?: string | null;
          parser_version?: string | null;
          posted_at?: string | null;
          raw_text: string;
          relevance?: number | null;
          remote_policy?: Database["careerops"]["Enums"]["remote_policy"];
          salary_currency?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          seniority?: string | null;
          source_kind?: Database["careerops"]["Enums"]["job_source_kind"];
          source_url?: string | null;
          status?: Database["careerops"]["Enums"]["job_status"];
          target_role_id?: string | null;
          title: string;
          updated_at?: string | null;
          url_hash?: string | null;
          user_id: string;
        };
        Update: {
          company?: string;
          content_hash?: string;
          created_at?: string;
          employment_type?: string | null;
          id?: string;
          imported_at?: string;
          language?: string | null;
          location?: string | null;
          organization_id?: string | null;
          parser_version?: string | null;
          posted_at?: string | null;
          raw_text?: string;
          relevance?: number | null;
          remote_policy?: Database["careerops"]["Enums"]["remote_policy"];
          salary_currency?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          seniority?: string | null;
          source_kind?: Database["careerops"]["Enums"]["job_source_kind"];
          source_url?: string | null;
          status?: Database["careerops"]["Enums"]["job_status"];
          target_role_id?: string | null;
          title?: string;
          updated_at?: string | null;
          url_hash?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      locales: {
        Row: {
          code: string;
          is_source: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          is_source?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          is_source?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      opportunities: {
        Row: {
          angle: string | null;
          comp_basis: Database["careerops"]["Enums"]["comp_basis"];
          comp_currency: string | null;
          comp_period: Database["careerops"]["Enums"]["comp_period"];
          contract_type: Database["careerops"]["Enums"]["contract_type"] | null;
          created_at: string;
          expected_comp: number | null;
          first_contact_at: string | null;
          fit: number | null;
          id: string;
          job_id: string | null;
          next_action: string | null;
          next_action_due: string | null;
          offered_comp: number | null;
          organization_id: string | null;
          origin: Database["careerops"]["Enums"]["opportunity_origin"];
          outcome: Database["careerops"]["Enums"]["opportunity_outcome"];
          project_id: string | null;
          receptiveness: number | null;
          remote_policy: Database["careerops"]["Enums"]["remote_policy"];
          stage: Database["careerops"]["Enums"]["opportunity_stage"];
          target_role_id: string | null;
          terms_notes: string | null;
          title: string;
          track: Database["careerops"]["Enums"]["opportunity_track"];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          angle?: string | null;
          comp_basis?: Database["careerops"]["Enums"]["comp_basis"];
          comp_currency?: string | null;
          comp_period?: Database["careerops"]["Enums"]["comp_period"];
          contract_type?: Database["careerops"]["Enums"]["contract_type"] | null;
          created_at?: string;
          expected_comp?: number | null;
          first_contact_at?: string | null;
          fit?: number | null;
          id?: string;
          job_id?: string | null;
          next_action?: string | null;
          next_action_due?: string | null;
          offered_comp?: number | null;
          organization_id?: string | null;
          origin: Database["careerops"]["Enums"]["opportunity_origin"];
          outcome?: Database["careerops"]["Enums"]["opportunity_outcome"];
          project_id?: string | null;
          receptiveness?: number | null;
          remote_policy?: Database["careerops"]["Enums"]["remote_policy"];
          stage?: Database["careerops"]["Enums"]["opportunity_stage"];
          target_role_id?: string | null;
          terms_notes?: string | null;
          title: string;
          track?: Database["careerops"]["Enums"]["opportunity_track"];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          angle?: string | null;
          comp_basis?: Database["careerops"]["Enums"]["comp_basis"];
          comp_currency?: string | null;
          comp_period?: Database["careerops"]["Enums"]["comp_period"];
          contract_type?: Database["careerops"]["Enums"]["contract_type"] | null;
          created_at?: string;
          expected_comp?: number | null;
          first_contact_at?: string | null;
          fit?: number | null;
          id?: string;
          job_id?: string | null;
          next_action?: string | null;
          next_action_due?: string | null;
          offered_comp?: number | null;
          organization_id?: string | null;
          origin?: Database["careerops"]["Enums"]["opportunity_origin"];
          outcome?: Database["careerops"]["Enums"]["opportunity_outcome"];
          project_id?: string | null;
          receptiveness?: number | null;
          remote_policy?: Database["careerops"]["Enums"]["remote_policy"];
          stage?: Database["careerops"]["Enums"]["opportunity_stage"];
          target_role_id?: string | null;
          terms_notes?: string | null;
          title?: string;
          track?: Database["careerops"]["Enums"]["opportunity_track"];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunity_documents: {
        Row: {
          created_at: string;
          document_version_id: string;
          id: string;
          opportunity_id: string;
          role: Database["careerops"]["Enums"]["document_kind"];
          sent_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_version_id: string;
          id?: string;
          opportunity_id: string;
          role: Database["careerops"]["Enums"]["document_kind"];
          sent_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_version_id?: string;
          id?: string;
          opportunity_id?: string;
          role?: Database["careerops"]["Enums"]["document_kind"];
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunity_documents_document_version_id_fkey";
            columns: ["document_version_id"];
            isOneToOne: false;
            referencedRelation: "document_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunity_documents_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunity_events: {
        Row: {
          created_at: string;
          from_stage: Database["careerops"]["Enums"]["opportunity_stage"] | null;
          id: string;
          interview_kind: Database["careerops"]["Enums"]["interview_kind"] | null;
          note: string | null;
          occurred_at: string;
          opportunity_id: string;
          to_stage: Database["careerops"]["Enums"]["opportunity_stage"] | null;
          type: Database["careerops"]["Enums"]["opportunity_event_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          from_stage?: Database["careerops"]["Enums"]["opportunity_stage"] | null;
          id?: string;
          interview_kind?: Database["careerops"]["Enums"]["interview_kind"] | null;
          note?: string | null;
          occurred_at?: string;
          opportunity_id: string;
          to_stage?: Database["careerops"]["Enums"]["opportunity_stage"] | null;
          type: Database["careerops"]["Enums"]["opportunity_event_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          from_stage?: Database["careerops"]["Enums"]["opportunity_stage"] | null;
          id?: string;
          interview_kind?: Database["careerops"]["Enums"]["interview_kind"] | null;
          note?: string | null;
          occurred_at?: string;
          opportunity_id?: string;
          to_stage?: Database["careerops"]["Enums"]["opportunity_stage"] | null;
          type?: Database["careerops"]["Enums"]["opportunity_event_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunity_events_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          known_systems: string | null;
          local_presence: string | null;
          name: string;
          need_hypothesis: string | null;
          need_signals: string[];
          notes: string | null;
          origin_country: string | null;
          researched_at: string | null;
          sector: string | null;
          source_urls: string[];
          updated_at: string | null;
          user_id: string;
          visibility: Database["careerops"]["Enums"]["visibility"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          known_systems?: string | null;
          local_presence?: string | null;
          name: string;
          need_hypothesis?: string | null;
          need_signals?: string[];
          notes?: string | null;
          origin_country?: string | null;
          researched_at?: string | null;
          sector?: string | null;
          source_urls?: string[];
          updated_at?: string | null;
          user_id: string;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Update: {
          created_at?: string;
          id?: string;
          known_systems?: string | null;
          local_presence?: string | null;
          name?: string;
          need_hypothesis?: string | null;
          need_signals?: string[];
          notes?: string | null;
          origin_country?: string | null;
          researched_at?: string | null;
          sector?: string | null;
          source_urls?: string[];
          updated_at?: string | null;
          user_id?: string;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          headline: string | null;
          id: string;
          location: string | null;
          open_to_relocation: boolean;
          public_slug: string | null;
          remote_preference: Database["careerops"]["Enums"]["remote_policy"];
          summary: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string;
          work_authorization: string[];
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          headline?: string | null;
          id?: string;
          location?: string | null;
          open_to_relocation?: boolean;
          public_slug?: string | null;
          remote_preference?: Database["careerops"]["Enums"]["remote_policy"];
          summary?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id: string;
          work_authorization?: string[];
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          headline?: string | null;
          id?: string;
          location?: string | null;
          open_to_relocation?: boolean;
          public_slug?: string | null;
          remote_preference?: Database["careerops"]["Enums"]["remote_policy"];
          summary?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string;
          work_authorization?: string[];
        };
        Relationships: [];
      };
      projects: {
        Row: {
          ai_allowed: boolean;
          architecture_md: string | null;
          code_visibility: Database["careerops"]["Enums"]["code_visibility"];
          constraints: string | null;
          created_at: string;
          date_precision: Database["careerops"]["Enums"]["date_precision"];
          disclosure_status: Database["careerops"]["Enums"]["disclosure_status"];
          employment_id: string | null;
          ended_at: string | null;
          id: string;
          ip_owner: Database["careerops"]["Enums"]["ip_owner"];
          kind: Database["careerops"]["Enums"]["project_kind"];
          live_url: string | null;
          name: string;
          operational_status: Database["careerops"]["Enums"]["operational_status"];
          ownership: Database["careerops"]["Enums"]["project_ownership"];
          parent_project_id: string | null;
          problem: string | null;
          repo_url: string | null;
          result: string | null;
          role: string | null;
          slug: string;
          solution: string | null;
          started_at: string | null;
          store_urls: Json;
          updated_at: string | null;
          user_id: string;
          visibility: Database["careerops"]["Enums"]["visibility"];
        };
        Insert: {
          ai_allowed?: boolean;
          architecture_md?: string | null;
          code_visibility?: Database["careerops"]["Enums"]["code_visibility"];
          constraints?: string | null;
          created_at?: string;
          date_precision?: Database["careerops"]["Enums"]["date_precision"];
          disclosure_status?: Database["careerops"]["Enums"]["disclosure_status"];
          employment_id?: string | null;
          ended_at?: string | null;
          id?: string;
          ip_owner?: Database["careerops"]["Enums"]["ip_owner"];
          kind: Database["careerops"]["Enums"]["project_kind"];
          live_url?: string | null;
          name: string;
          operational_status?: Database["careerops"]["Enums"]["operational_status"];
          ownership?: Database["careerops"]["Enums"]["project_ownership"];
          parent_project_id?: string | null;
          problem?: string | null;
          repo_url?: string | null;
          result?: string | null;
          role?: string | null;
          slug: string;
          solution?: string | null;
          started_at?: string | null;
          store_urls?: Json;
          updated_at?: string | null;
          user_id: string;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Update: {
          ai_allowed?: boolean;
          architecture_md?: string | null;
          code_visibility?: Database["careerops"]["Enums"]["code_visibility"];
          constraints?: string | null;
          created_at?: string;
          date_precision?: Database["careerops"]["Enums"]["date_precision"];
          disclosure_status?: Database["careerops"]["Enums"]["disclosure_status"];
          employment_id?: string | null;
          ended_at?: string | null;
          id?: string;
          ip_owner?: Database["careerops"]["Enums"]["ip_owner"];
          kind?: Database["careerops"]["Enums"]["project_kind"];
          live_url?: string | null;
          name?: string;
          operational_status?: Database["careerops"]["Enums"]["operational_status"];
          ownership?: Database["careerops"]["Enums"]["project_ownership"];
          parent_project_id?: string | null;
          problem?: string | null;
          repo_url?: string | null;
          result?: string | null;
          role?: string | null;
          slug?: string;
          solution?: string | null;
          started_at?: string | null;
          store_urls?: Json;
          updated_at?: string | null;
          user_id?: string;
          visibility?: Database["careerops"]["Enums"]["visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "projects_employment_id_fkey";
            columns: ["employment_id"];
            isOneToOne: false;
            referencedRelation: "employments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_parent_project_id_fkey";
            columns: ["parent_project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      target_roles: {
        Row: {
          accepted_contract_types: Database["careerops"]["Enums"]["contract_type"][];
          comp_basis: Database["careerops"]["Enums"]["comp_basis"];
          comp_currency: string | null;
          comp_floor: number | null;
          comp_period: Database["careerops"]["Enums"]["comp_period"];
          created_at: string;
          id: string;
          name: string;
          positioning_note: string | null;
          seniority_band: string | null;
          status: string;
          tier: Database["careerops"]["Enums"]["role_tier"];
          updated_at: string | null;
          user_id: string;
          weight: number;
        };
        Insert: {
          accepted_contract_types?: Database["careerops"]["Enums"]["contract_type"][];
          comp_basis?: Database["careerops"]["Enums"]["comp_basis"];
          comp_currency?: string | null;
          comp_floor?: number | null;
          comp_period?: Database["careerops"]["Enums"]["comp_period"];
          created_at?: string;
          id?: string;
          name: string;
          positioning_note?: string | null;
          seniority_band?: string | null;
          status?: string;
          tier?: Database["careerops"]["Enums"]["role_tier"];
          updated_at?: string | null;
          user_id: string;
          weight?: number;
        };
        Update: {
          accepted_contract_types?: Database["careerops"]["Enums"]["contract_type"][];
          comp_basis?: Database["careerops"]["Enums"]["comp_basis"];
          comp_currency?: string | null;
          comp_floor?: number | null;
          comp_period?: Database["careerops"]["Enums"]["comp_period"];
          created_at?: string;
          id?: string;
          name?: string;
          positioning_note?: string | null;
          seniority_band?: string | null;
          status?: string;
          tier?: Database["careerops"]["Enums"]["role_tier"];
          updated_at?: string | null;
          user_id?: string;
          weight?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      public_facts: {
        Row: {
          body: string | null;
          happened_at: string | null;
          id: string | null;
          is_fallback: boolean | null;
          kind: string | null;
          live_url: string | null;
          locale: string | null;
          public_slug: string | null;
          repo_url: string | null;
          slug: string | null;
          title: string | null;
        };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          full_name: string | null;
          headline: string | null;
          location: string | null;
          public_slug: string | null;
          summary: string | null;
        };
        Insert: {
          full_name?: string | null;
          headline?: string | null;
          location?: string | null;
          public_slug?: string | null;
          summary?: string | null;
        };
        Update: {
          full_name?: string | null;
          headline?: string | null;
          location?: string | null;
          public_slug?: string | null;
          summary?: string | null;
        };
        Relationships: [];
      };
      published_facts: {
        Row: {
          fact_id: string | null;
          happened_at: string | null;
          highlight_id: string | null;
          kind: string | null;
          live_url: string | null;
          project_id: string | null;
          public_slug: string | null;
          repo_url: string | null;
          slug: string | null;
          source_body: string | null;
          source_title: string | null;
        };
        Relationships: [];
      };
      translation_status_report: {
        Row: {
          fact_id: string | null;
          kind: string | null;
          locale: string | null;
          public_slug: string | null;
          source_body: string | null;
          state: string | null;
          title: string | null;
          translated_body: string | null;
          translation_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      disclosure_ceiling: {
        Args: { status: Database["careerops"]["Enums"]["disclosure_status"] };
        Returns: Database["careerops"]["Enums"]["visibility"];
      };
      document_kind_visibility_minimum: {
        Args: { kind: Database["careerops"]["Enums"]["document_kind"] };
        Returns: Database["careerops"]["Enums"]["visibility"];
      };
      fact_source_hash: { Args: { source_text: string }; Returns: string };
    };
    Enums: {
      code_visibility: "public" | "private" | "employer_owned";
      comp_basis: "gross" | "net" | "b2b_invoice";
      comp_period: "month" | "year";
      contract_type: "employment" | "b2b_contract" | "freelance";
      date_precision: "day" | "month" | "year";
      disclosure_status: "not_required" | "approval_required" | "approved" | "restricted";
      document_generator: "manual" | "template" | "ai_assisted";
      document_kind:
        | "cv"
        | "cover_letter"
        | "linkedin_profile"
        | "case_study"
        | "pitch"
        | "one_pager"
        | "integration_brief"
        | "article";
      document_status: "draft" | "frozen";
      employment_type:
        "full_time" | "part_time" | "contract" | "freelance" | "military" | "internship";
      interview_kind: "screening" | "technical" | "hiring_manager" | "final";
      ip_owner: "self" | "employer" | "client" | "shared" | "unclear";
      job_source_kind: "paste" | "url_fetch" | "ats_api" | "share_intent" | "bookmarklet";
      job_status: "new" | "parsed" | "reviewed" | "archived";
      operational_status: "concept" | "prototype" | "production" | "maintained" | "retired";
      opportunity_event_type:
        | "stage_change"
        | "message_sent"
        | "message_received"
        | "call"
        | "interview"
        | "proposal"
        | "offer"
        | "follow_up"
        | "note";
      opportunity_origin: "job_ad" | "outreach" | "referral" | "inbound";
      opportunity_outcome:
        "open" | "won" | "declined_by_me" | "rejected" | "withdrawn" | "no_response" | "parked";
      opportunity_stage:
        | "identified"
        | "researched"
        | "contacted"
        | "conversation"
        | "evaluation"
        | "negotiation"
        | "closed";
      opportunity_track: "employment" | "contract" | "consulting";
      project_kind: "product" | "client_work" | "internal_tool" | "lab" | "infrastructure";
      project_ownership: "sole" | "lead" | "core_contributor" | "contributor";
      remote_policy: "remote" | "hybrid" | "onsite" | "unknown";
      role_tier: "primary" | "bridge" | "stretch" | "fallback";
      translation_status: "draft" | "approved" | "rejected";
      visibility: "private" | "cv_safe" | "portfolio_public";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
  careerops: {
    Enums: {
      code_visibility: ["public", "private", "employer_owned"],
      comp_basis: ["gross", "net", "b2b_invoice"],
      comp_period: ["month", "year"],
      contract_type: ["employment", "b2b_contract", "freelance"],
      date_precision: ["day", "month", "year"],
      disclosure_status: ["not_required", "approval_required", "approved", "restricted"],
      document_generator: ["manual", "template", "ai_assisted"],
      document_kind: [
        "cv",
        "cover_letter",
        "linkedin_profile",
        "case_study",
        "pitch",
        "one_pager",
        "integration_brief",
        "article",
      ],
      document_status: ["draft", "frozen"],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "freelance",
        "military",
        "internship",
      ],
      interview_kind: ["screening", "technical", "hiring_manager", "final"],
      ip_owner: ["self", "employer", "client", "shared", "unclear"],
      job_source_kind: ["paste", "url_fetch", "ats_api", "share_intent", "bookmarklet"],
      job_status: ["new", "parsed", "reviewed", "archived"],
      operational_status: ["concept", "prototype", "production", "maintained", "retired"],
      opportunity_event_type: [
        "stage_change",
        "message_sent",
        "message_received",
        "call",
        "interview",
        "proposal",
        "offer",
        "follow_up",
        "note",
      ],
      opportunity_origin: ["job_ad", "outreach", "referral", "inbound"],
      opportunity_outcome: [
        "open",
        "won",
        "declined_by_me",
        "rejected",
        "withdrawn",
        "no_response",
        "parked",
      ],
      opportunity_stage: [
        "identified",
        "researched",
        "contacted",
        "conversation",
        "evaluation",
        "negotiation",
        "closed",
      ],
      opportunity_track: ["employment", "contract", "consulting"],
      project_kind: ["product", "client_work", "internal_tool", "lab", "infrastructure"],
      project_ownership: ["sole", "lead", "core_contributor", "contributor"],
      remote_policy: ["remote", "hybrid", "onsite", "unknown"],
      role_tier: ["primary", "bridge", "stretch", "fallback"],
      translation_status: ["draft", "approved", "rejected"],
      visibility: ["private", "cv_safe", "portfolio_public"],
    },
  },
} as const;
