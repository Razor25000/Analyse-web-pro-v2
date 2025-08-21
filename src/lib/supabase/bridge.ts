import { supabase, supabaseAdmin } from "../supabase";

/**
 * Bridge pour interagir avec Supabase
 * Centralise toutes les opérations sur les données métier
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SupabaseBridge {
  /**
   * Synchronise un utilisateur de Better Auth vers Supabase profiles
   * @param userId - ID utilisateur Better Auth (UUID)
   * @param userEmail - Email de l'utilisateur
   * @param fullName - Nom complet optionnel
   * @param company - Entreprise optionnelle
   */
  static async syncUserToSupabase(
    userId: string,
    userEmail: string,
    fullName?: string,
    company?: string
  ) {
    if (!supabaseAdmin) {
      console.warn("Supabase admin not available - skipping user sync");
      return;
    }

    try {
      // Vérifier si l'utilisateur existe déjà dans profiles
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!existingProfile) {
        // Créer le profil utilisateur dans Supabase
        const { error } = await supabaseAdmin
          .from("profiles")
          .insert({
            user_id: userId,
            email: userEmail,
            full_name: fullName ?? null,
            company: company ?? null,
          });

        if (error) {
          console.error("Error syncing user to Supabase:", error);
          throw new Error("Failed to sync user");
        }
      }
    } catch (error) {
      console.error("Error in syncUserToSupabase:", error);
      // Ne pas faire échouer la requête principale
    }
  }

  /**
   * Récupère les audits d'un utilisateur
   * @param userId - ID de l'utilisateur (UUID)
   * @returns Liste des audits
   */
  static async getUserAudits(userId: string) {
    if (!supabase) {
      console.warn("Supabase not available - returning empty audits");
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user audits:", error);
        throw new Error("Failed to fetch audits");
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserAudits:", error);
      throw error;
    }
  }

  /**
   * Crée un nouvel audit
   * @param audit - Données de l'audit
   */
  static async createAudit(audit: {
    user_id: string; // UUID
    email: string;
    url: string;
    audit_type?: "manual" | "bulk" | "discovery";
    status?: "pending" | "processing" | "completed" | "failed";
    webhook_id?: string;
    is_public?: boolean;
  }) {
    if (!supabase) {
      console.warn("Supabase not available - skipping audit creation");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("audits")
        .insert({
          user_id: audit.user_id,
          email: audit.email,
          url: audit.url,
          audit_type: audit.audit_type ?? "manual",
          status: audit.status ?? "pending",
          webhook_id: audit.webhook_id ?? null,
          is_public: audit.is_public ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating audit:", error);
        throw new Error("Failed to create audit");
      }

      return data;
    } catch (error) {
      console.error("Error in createAudit:", error);
      throw error;
    }
  }

  /**
   * Met à jour un audit avec status, résultats et score
   * @param auditId - ID de l'audit (UUID)
   * @param updates - Données à mettre à jour
   */
  static async updateAudit(
    auditId: string,
    updates: {
      status?: "pending" | "processing" | "completed" | "failed";
      results_json?: Record<string, unknown>;
      score_global?: number;
      error_message?: string;
    }
  ) {
    if (!supabase) {
      console.warn("Supabase not available - skipping audit update");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("audits")
        .update(updates)
        .eq("id", auditId)
        .select()
        .single();

      if (error) {
        console.error("Error updating audit:", error);
        throw new Error("Failed to update audit");
      }

      return data;
    } catch (error) {
      console.error("Error in updateAudit:", error);
      throw error;
    }
  }

  /**
   * Récupère un audit par son webhook ID
   * @param webhookId - ID du webhook
   */
  static async getAuditByWebhookId(webhookId: string) {
    if (!supabase) {
      console.warn("Supabase not available - returning null");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("webhook_id", webhookId)
        .single();

      if (error) {
        console.error("Error fetching audit by webhook ID:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getAuditByWebhookId:", error);
      return null;
    }
  }

  /**
   * Compte les audits d'un utilisateur pour le mois en cours
   * @param userId - ID de l'utilisateur
   */
  static async getMonthlyAuditCount(userId: string) {
    if (!supabase) {
      console.warn("Supabase not available - returning 0");
      return 0;
    }

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("audits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString());

      if (error) {
        console.error("Error counting monthly audits:", error);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      console.error("Error in getMonthlyAuditCount:", error);
      return 0;
    }
  }

  /**
   * Récupère les informations d'abonnement d'un utilisateur
   * @param userEmail - Email de l'utilisateur
   */
  static async getUserSubscription(userEmail: string) {
    if (!supabase) {
      console.warn("Supabase not available - returning null");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("subscribers")
        .select("*")
        .eq("email", userEmail)
        .single();

      if (error) {
        console.error("Error fetching user subscription:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getUserSubscription:", error);
      return null;
    }
  }

  /**
   * Met à jour l'usage du quota d'un utilisateur de manière atomique
   * @param userEmail - Email de l'utilisateur
   * @param increment - Nombre à ajouter au quota utilisé (défaut: 1)
   */
  static async incrementQuotaUsed(userEmail: string, increment = 1) {
    if (!supabase) {
      console.warn("Supabase not available - skipping quota update");
      return null;
    }

    try {
      // Essayer d'abord la fonction SQL atomique
      const { data, error } = await supabase
        .rpc('increment_quota_used', {
          user_email: userEmail,
          increment_by: increment
        });

      if (error) {
        console.warn("RPC increment_quota_used failed, using fallback:", error.message);
        
        // Fallback: mise à jour manuelle (moins atomique mais fonctionnel)
        const subscription = await this.getUserSubscription(userEmail);
        if (subscription) {
          const { data: updateData, error: updateError } = await supabase
            .from("subscribers")
            .update({ 
              quota_used: (subscription.quota_used ?? 0) + increment,
              updated_at: new Date().toISOString()
            })
            .eq("email", userEmail)
            .select()
            .single();
          
          if (updateError) {
            console.error("Error in quota fallback update:", updateError);
            throw new Error("Failed to update quota");
          }
          
          return updateData;
        } else {
          throw new Error(`User with email ${userEmail} not found in subscribers`);
        }
      }

      return data;
    } catch (error) {
      console.error("Error in incrementQuotaUsed:", error);
      throw error;
    }
  }

  /**
   * Récupère les quotas et leur statut pour un utilisateur
   * @param userEmail - Email de l'utilisateur
   * @returns Informations complètes sur les quotas
   */
  static async getQuotaStatus(userEmail: string) {
    const subscription = await this.getUserSubscription(userEmail);
    
    if (!subscription) {
      return {
        email: userEmail,
        quota_used: 0,
        monthly_quota: 10, // Quota par défaut pour non-abonnés
        quota_remaining: 10,
        subscription_tier: "free",
        subscribed: false,
        quota_exceeded: false,
      };
    }

    const quotaUsed = subscription.quota_used ?? 0;
    const monthlyQuota = subscription.monthly_quota ?? 0;
    const quotaRemaining = Math.max(0, monthlyQuota - quotaUsed);
    const quotaExceeded = quotaUsed >= monthlyQuota;

    return {
      email: userEmail,
      quota_used: quotaUsed,
      monthly_quota: monthlyQuota,
      quota_remaining: quotaRemaining,
      subscription_tier: subscription.subscription_tier ?? "free",
      subscribed: subscription.subscribed ?? false,
      quota_exceeded: quotaExceeded,
      quota_reset_date: subscription.quota_reset_date,
      subscription_end: subscription.subscription_end,
    };
  }
}