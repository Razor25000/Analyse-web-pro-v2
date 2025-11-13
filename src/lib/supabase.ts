import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Only create clients if Supabase is configured
const createSupabaseClient = () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.warn("Supabase not configured - URL or anon key missing");
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // We use Better Auth instead
      autoRefreshToken: false,
    },
  });
};

const createSupabaseAdminClient = () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.warn("Supabase admin not configured - URL or service key missing");
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Create clients
export const supabase = createSupabaseClient();
export const supabaseAdmin = createSupabaseAdminClient();

// Type definitions for our database tables
export type Database = {
  public: {
    Tables: {
      audits: {
        Row: {
          id: string; // uuid
          user_id: string | null; // uuid
          email: string;
          url: string;
          status: "pending" | "processing" | "completed" | "failed";
          audit_type: "manual" | "bulk" | "discovery";
          results_json: Record<string, unknown> | null;
          score_global: number | null;
          error_message: string | null;
          webhook_id: string | null;
          is_public: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          url: string;
          status?: "pending" | "processing" | "completed" | "failed";
          audit_type?: "manual" | "bulk" | "discovery";
          results_json?: Record<string, unknown> | null;
          score_global?: number | null;
          error_message?: string | null;
          webhook_id?: string | null;
          is_public?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          url?: string;
          status?: "pending" | "processing" | "completed" | "failed";
          audit_type?: "manual" | "bulk" | "discovery";
          results_json?: Record<string, unknown> | null;
          score_global?: number | null;
          error_message?: string | null;
          webhook_id?: string | null;
          is_public?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * SUPPRIMÉ: Architecture v2.0 optimisée - plus de table profiles
       * Les données utilisateurs sont gérées uniquement dans Prisma (source de vérité)
       * Seuls les audits sont synchronisés pour les workflows n8n
       *
       * @deprecated La table profiles a été supprimée dans l'architecture v2.0
       */
      // ARCHITECTURE DUAL OPTIMISÉE v2.0:
      // - Supabase: table 'audits' pour workflows n8n
      // - Prisma: users, quotas, subscriptions (source de vérité)
    };
    Views: {
      // Define your database views here
    };
    Functions: {
      increment_quota_used: {
        Args: {
          user_email: string;
          increment_by: number;
        };
        Returns: void;
      };
      reset_monthly_quotas: {
        Args: Record<PropertyKey, never>;
        Returns: {
          success: boolean;
          message: string;
          users_updated: number;
          reset_date: string;
        };
      };
      reset_monthly_quotas_active_only: {
        Args: Record<PropertyKey, never>;
        Returns: {
          success: boolean;
          message: string;
          users_updated: number;
          reset_date: string;
        };
      };
    };
    Enums: {
      subscription_tier: "free" | "basic" | "premium" | "enterprise";
    };
  };
};
