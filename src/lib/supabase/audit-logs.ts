/**
 * Supabase utilities for n8n workflow audit logs (v2.0 Architecture)
 *
 * This file provides utilities for working with Supabase in the simplified v2.0 architecture
 * where Prisma is the single source of truth for all user data.
 *
 * Supabase is only used for:
 * - Storing audit logs for n8n workflows
 * - Providing real-time audit status updates
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Supabase client for server-side use
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
    },
  },
);

// Supabase client for client-side use (anon key)
export const supabaseAnon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  },
);

/**
 * Interface for audit log entries stored in Supabase
 */
export type AuditLogEntry = {
  id?: string;
  user_id: string;
  audit_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new audit log entry in Supabase for n8n workflow tracking
 */
export async function createAuditLog(
  entry: Omit<AuditLogEntry, "id" | "created_at" | "updated_at">,
) {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert([
      {
        ...entry,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating audit log in Supabase:", error);
    throw error;
  }

  return data;
}

/**
 * Update audit log status in Supabase
 */
export async function updateAuditLog(
  auditId: string,
  updates: Partial<
    Pick<AuditLogEntry, "status" | "progress" | "error_message" | "metadata">
  >,
) {
  const { data, error } = await supabase
    .from("audit_logs")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("audit_id", auditId)
    .select()
    .single();

  if (error) {
    console.error("Error updating audit log in Supabase:", error);
    throw error;
  }

  return data;
}

/**
 * Get audit logs for a specific user from Supabase
 */
export async function getUserAuditLogs(userId: string) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching audit logs from Supabase:", error);
    throw error;
  }

  return data || [];
}

/**
 * Subscribe to real-time audit status updates for a user
 */
export function subscribeToAuditUpdates(
  userId: string,
  callback: (payload: { new: AuditLogEntry }) => void,
) {
  const channel = supabaseAnon
    .channel("audit_updates")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "audit_logs",
        filter: `user_id=eq.${userId}`,
      },
      callback,
    )
    .subscribe();

  return channel;
}

/**
 * Clean up old audit logs (optional maintenance function)
 */
export async function cleanupOldAuditLogs(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { error } = await supabase
    .from("audit_logs")
    .delete()
    .lt("created_at", cutoffDate.toISOString());

  if (error) {
    console.error("Error cleaning up old audit logs:", error);
    throw error;
  }
}
