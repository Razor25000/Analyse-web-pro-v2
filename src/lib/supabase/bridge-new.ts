import { prisma } from "../prisma";
import { supabase, supabaseAdmin } from "../supabase";

/**
 * Bridge modernisé pour utiliser Prisma pour les utilisateurs et quotas
 * et Supabase uniquement pour les audits
 */
export class ModernSupabaseBridge {
  /**
   * Indique si Supabase est disponible pour les audits
   */
  static isSupabaseAvailable(): boolean {
    return supabase !== null && supabaseAdmin !== null;
  }

  /**
   * Gère les erreurs de manière standardisée
   */
  private static handleError(operation: string, error: any): Error {
    console.error(`❌ ${operation} error:`, {
      message: error.message,
      code: error.code,
    });

    return new Error(`Erreur ${operation}: ${error.message}`);
  }

  /**
   * Convertit un ID en UUID valide pour Supabase
   */
  private static convertToValidUUID(id: string): string {
    if (
      id.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    ) {
      return id;
    }

    const paddedId = id.padEnd(32, "0").substring(0, 32);
    return [
      paddedId.substring(0, 8),
      paddedId.substring(8, 12),
      paddedId.substring(12, 16),
      paddedId.substring(16, 20),
      paddedId.substring(20, 32),
    ].join("-");
  }

  /**
   * Synchronise un utilisateur Better Auth - plus besoin avec l'approche unifiée
   * Garde la fonction pour compatibilité mais retourne toujours true
   */
  static async syncUserToSupabase(
    userId: string,
    userEmail: string,
    fullName?: string,
    company?: string,
  ): Promise<boolean> {
    console.log(
      `✅ Utilisateur ${userEmail} géré par Prisma, pas de sync Supabase nécessaire`,
    );
    return true;
  }

  /**
   * Récupère les informations d'abonnement d'un utilisateur via Prisma
   */
  static async getUserSubscription(userEmail: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
          id: true,
          email: true,
          monthlyQuota: true,
          quotaUsed: true,
          quotaResetDate: true,
          subscriptions: {
            where: { status: "active" },
            take: 1,
          },
        },
      });

      if (!user) {
        console.warn(`Utilisateur non trouvé: ${userEmail}`);
        return null;
      }

      // Format compatible avec l'ancien bridge
      const subscription = user.subscriptions[0];
      return {
        monthly_quota: user.monthlyQuota,
        quota_used: user.quotaUsed,
        subscription_tier: subscription?.plan || "free",
        subscribed: subscription?.status === "active",
        subscription_end: subscription?.periodEnd,
        quota_reset_date: user.quotaResetDate,
      };
    } catch (error) {
      console.error("Erreur getUserSubscription:", error);
      return null;
    }
  }

  /**
   * Met à jour l'usage du quota d'un utilisateur de manière atomique
   */
  static async incrementQuotaUsed(userEmail: string, increment = 1) {
    try {
      const updatedUser = await prisma.user.update({
        where: { email: userEmail },
        data: {
          quotaUsed: { increment },
        },
        select: {
          id: true,
          email: true,
          quotaUsed: true,
          monthlyQuota: true,
        },
      });

      console.log(
        `✅ Quota incrémenté pour ${userEmail}: ${updatedUser.quotaUsed}/${updatedUser.monthlyQuota}`,
      );
      return updatedUser;
    } catch (error) {
      console.error("Erreur incrementQuotaUsed:", error);
      throw this.handleError("increment quota", error);
    }
  }

  /**
   * Vérifie si un utilisateur peut créer un audit (quota disponible)
   */
  static async canCreateAudit(userEmail: string): Promise<{
    canCreate: boolean;
    quotaUsed: number;
    monthlyQuota: number;
    subscriptionTier: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
          quotaUsed: true,
          monthlyQuota: true,
          subscriptionTier: true,
        },
      });

      if (!user) {
        // Utilisateur non trouvé, créer avec quota par défaut
        await this.createUserIfNotExists(userEmail);
        return {
          canCreate: true,
          quotaUsed: 0,
          monthlyQuota: 10,
          subscriptionTier: "free",
        };
      }

      return {
        canCreate: user.quotaUsed < user.monthlyQuota,
        quotaUsed: user.quotaUsed,
        monthlyQuota: user.monthlyQuota,
        subscriptionTier: user.subscriptionTier || "free",
      };
    } catch (error) {
      console.error("Erreur canCreateAudit:", error);
      return {
        canCreate: false,
        quotaUsed: 0,
        monthlyQuota: 0,
        subscriptionTier: "free",
      };
    }
  }

  /**
   * Crée un utilisateur s'il n'existe pas
   */
  static async createUserIfNotExists(
    userEmail: string,
    userData?: {
      name?: string;
      userId?: string;
    },
  ) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (existingUser) {
        return existingUser;
      }

      // Créer l'utilisateur avec des valeurs par défaut
      const newUser = await prisma.user.create({
        data: {
          id: userData?.userId || `user_${Date.now()}`,
          email: userEmail,
          name: userData?.name || userEmail.split("@")[0],
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          monthlyQuota: 10,
          quotaUsed: 0,
          subscriptionTier: "free",
        },
      });

      console.log(`✅ Utilisateur créé: ${userEmail}`);
      return newUser;
    } catch (error) {
      console.error("Erreur createUserIfNotExists:", error);
      throw this.handleError("create user", error);
    }
  }

  // ========================================
  // FONCTIONS AUDITS (restent sur Supabase)
  // ========================================

  /**
   * Crée un audit dans Supabase
   */
  static async createAudit(auditData: {
    user_id: string;
    email: string;
    url: string;
    audit_type?: string;
    webhook_id?: string;
    status?: string;
  }) {
    if (!supabase) {
      console.warn("Supabase not available - skipping audit creation");
      return null;
    }

    try {
      const validUUID = this.convertToValidUUID(auditData.user_id);

      const { data, error } = await supabase
        .from("audits")
        .insert({
          user_id: validUUID,
          email: auditData.email,
          url: auditData.url,
          audit_type: auditData.audit_type || "manual",
          webhook_id: auditData.webhook_id,
          status: auditData.status || "pending",
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
   * Récupère les audits d'un utilisateur
   */
  static async getUserAudits(userId: string) {
    if (!supabase) {
      console.warn("Supabase not available - returning empty audits");
      return [];
    }

    try {
      const validUUID = this.convertToValidUUID(userId);

      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("user_id", validUUID)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user audits:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserAudits:", error);
      return [];
    }
  }

  /**
   * Met à jour un audit par son correlation ID
   */
  static async updateAuditByCorrelationId(
    correlationId: string,
    updates: {
      status?: "pending" | "processing" | "completed" | "failed";
      completed_at?: string;
      score_performance?: number;
      score_seo?: number;
      score_security?: number;
      score_modern?: number;
      score_global?: number;
      audit_results?: string;
      error_message?: string;
    },
  ) {
    if (!supabase) {
      console.warn("Supabase not available - skipping audit update");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("audits")
        .update(updates)
        .eq("webhook_id", correlationId)
        .select()
        .single();

      if (error) {
        console.error("Error updating audit by correlation ID:", error);
        throw new Error("Failed to update audit by correlation ID");
      }

      return data;
    } catch (error) {
      console.error("Error in updateAuditByCorrelationId:", error);
      throw error;
    }
  }

  /**
   * Récupère un audit par son webhook ID
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
   */
  static async getMonthlyAuditCount(userId: string) {
    if (!supabase) {
      console.warn("Supabase not available - returning 0");
      return 0;
    }

    try {
      const validUUID = this.convertToValidUUID(userId);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("audits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", validUUID)
        .gte("created_at", startOfMonth.toISOString());

      if (error) {
        console.error("Error counting monthly audits:", error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error("Error in getMonthlyAuditCount:", error);
      return 0;
    }
  }
}

// Export par défaut pour compatibilité
export const SupabaseBridge = ModernSupabaseBridge;
