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
      profiles: {
        Row: {
          id: string; // uuid
          user_id: string; // uuid
          email: string;
          full_name: string | null;
          company: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          full_name?: string | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          full_name?: string | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscribers: {
        Row: {
          id: string; // uuid
          user_id: string | null; // uuid
          email: string;
          stripe_customer_id: string | null;
          subscribed: boolean;
          subscription_tier: string | null; // subscription_tier enum
          subscription_end: string | null;
          monthly_quota: number | null;
          quota_used: number | null;
          quota_reset_date: string | null; // date
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          stripe_customer_id?: string | null;
          subscribed?: boolean;
          subscription_tier?: string | null;
          subscription_end?: string | null;
          monthly_quota?: number | null;
          quota_used?: number | null;
          quota_reset_date?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          stripe_customer_id?: string | null;
          subscribed?: boolean;
          subscription_tier?: string | null;
          subscription_end?: string | null;
          monthly_quota?: number | null;
          quota_used?: number | null;
          quota_reset_date?: string | null;
          updated_at?: string;
          created_at?: string;
        };
      };
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
