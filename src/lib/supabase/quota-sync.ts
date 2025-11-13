/**
 * Service de Gestion Quotas - Architecture Dual v2.0
 *
 * 🎯 OBJECTIF: Gestion bidirectionnelle quotas Prisma ↔ Supabase
 *
 * STRUCTURE RÉELLE SUPABASE user_quota:
 * - auditsUsed, auditsLimit (pas quotaUsed, quotaLimit)
 * - currentPeriodStart, currentPeriodEnd
 * - resetDay, planId
 */

import { supabaseAdmin } from "../supabase";
import { prisma } from "../prisma";

export type QuotaUpdatePayload = {
  userId: string;
  auditsIncrement?: number; // Incrément audits utilisés
  newLimit?: number; // Nouvelle limite (changement de plan)
  planId?: string; // ID du plan
};

export type QuotaInfo = {
  userId: string;
  planId: string;
  auditsUsed: number;
  auditsLimit: number;
  canCreateAudit: boolean;
  periodStart: Date;
  periodEnd: Date;
  resetDay: number;
};

export class QuotaSyncService {
  private static readonly VERSION = "2.0.0";

  /**
   * Récupère les quotas d'un utilisateur (Supabase = source temps réel)
   */
  static async getUserQuota(userId: string): Promise<QuotaInfo | null> {
    console.log(`📊 [QuotaSync v${this.VERSION}] Get quota: ${userId}`);

    try {
      if (!supabaseAdmin) {
        console.warn("⚠️ Supabase indisponible - fallback Prisma");
        return await this.getFallbackQuotaFromPrisma(userId);
      }

      const { data: quota, error } = await supabaseAdmin!
        .from("user_quota")
        .select("*")
        .eq("userId", userId)
        .single();

      if (error || !quota) {
        console.warn(`⚠️ Quota non trouvé dans Supabase: ${userId}`);
        return await this.getFallbackQuotaFromPrisma(userId);
      }

      return {
        userId: quota.userId,
        planId: quota.planId,
        auditsUsed: quota.auditsUsed,
        auditsLimit: quota.auditsLimit,
        canCreateAudit: quota.auditsUsed < quota.auditsLimit,
        periodStart: new Date(quota.currentPeriodStart),
        periodEnd: new Date(quota.currentPeriodEnd),
        resetDay: quota.resetDay,
      };
    } catch (error) {
      console.error("❌ Erreur getUserQuota:", error);
      return await this.getFallbackQuotaFromPrisma(userId);
    }
  }

  /**
   * Incrémente les audits utilisés (workflow n8n → après création audit)
   */
  static async incrementAuditsUsed(userId: string): Promise<boolean> {
    console.log(`📈 [QuotaSync v${this.VERSION}] Increment audits: ${userId}`);

    try {
      // 1. Mettre à jour Supabase (source temps réel)
      const supabaseSuccess = await this.updateSupabaseQuota(userId, {
        auditsIncrement: 1,
      });

      // 2. Sync vers Prisma (source de vérité)
      const prismaSuccess = await this.syncQuotaToPrisma(userId);

      return supabaseSuccess && prismaSuccess;
    } catch (error) {
      console.error("❌ Erreur increment audits:", error);
      return false;
    }
  }

  /**
   * Change le plan d'un utilisateur (Stripe webhook → nouveau plan)
   */
  static async updateUserPlan(
    userId: string,
    planId: string,
  ): Promise<boolean> {
    console.log(
      `🔄 [QuotaSync v${this.VERSION}] Update plan: ${userId} → ${planId}`,
    );

    const planLimits = this.getPlanLimits(planId);

    try {
      // 1. Mettre à jour Supabase
      const { error } = await supabaseAdmin!
        .from("user_quota")
        .update({
          planId: planId,
          auditsLimit: planLimits.limit,
          auditsUsed: 0, // Reset du quota au changement de plan
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: this.calculatePeriodEnd(planId).toISOString(),
          resetDay: planLimits.resetDay,
          updatedAt: new Date().toISOString(),
        })
        .eq("userId", userId);

      if (error) {
        console.error("❌ Erreur update plan Supabase:", error);
        return false;
      }

      // 2. Sync vers Prisma
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: this.mapPlanIdToTier(planId),
          monthlyQuota: planLimits.limit,
          quotaUsed: 0,
          quotaResetDate: this.calculatePeriodEnd(planId),
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Plan mis à jour: ${userId} → ${planId}`);
      return true;
    } catch (error) {
      console.error("❌ Erreur update plan:", error);
      return false;
    }
  }

  /**
   * Assurer qu'un utilisateur existe dans Supabase user (requis pour FK)
   */
  private static async ensureSupabaseUser(
    userId: string,
    email: string,
    name?: string,
  ): Promise<boolean> {
    try {
      // Vérifier si user existe déjà
      const { data: existingUser } = await supabaseAdmin!
        .from("user")
        .select("id")
        .eq("id", userId)
        .single();

      if (existingUser) {
        return true; // User existe déjà
      }

      // Créer user dans Supabase avec structure réelle
      const { error } = await supabaseAdmin!.from("user").insert({
        id: userId,
        email: email,
        name: name || "User",
        emailVerified: false,
        image: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resendContactId: null,
        stripeCustomerId: null,
      });

      if (error) {
        console.error("❌ Erreur création user Supabase:", error);
        return false;
      }

      console.log(`✅ User créé dans Supabase: ${userId}`);
      return true;
    } catch (error) {
      console.error("❌ Erreur ensureSupabaseUser:", error);
      return false;
    }
  }

  /**
   * Initialise les quotas pour un nouvel utilisateur
   */
  static async initializeUserQuota(
    userId: string,
    email: string,
    planId = "gratuit",
  ): Promise<boolean> {
    console.log(
      `🆕 [QuotaSync v${this.VERSION}] Init quota: ${userId} → ${planId}`,
    );

    const planLimits = this.getPlanLimits(planId);

    try {
      // 1. S'assurer que l'utilisateur existe dans Supabase (requis pour FK)
      const userEnsured = await this.ensureSupabaseUser(userId, email);
      if (!userEnsured) {
        console.error("❌ Impossible de créer/vérifier user Supabase");
        return false;
      }

      // 2. Créer dans Supabase user_quota
      const quotaId = `quota-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { error: quotaError } = await supabaseAdmin!
        .from("user_quota")
        .insert({
          id: quotaId,
          userId: userId,
          planId: planId,
          auditsUsed: 0,
          auditsLimit: planLimits.limit,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: this.calculatePeriodEnd(planId).toISOString(),
          resetDay: planLimits.resetDay,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (quotaError) {
        console.error("❌ Erreur création quota:", quotaError);
        return false;
      }

      console.log(
        `✅ Quota initialisé: ${userId} → ${planId} (${planLimits.limit} audits)`,
      );
      return true;
    } catch (error) {
      console.error("❌ Erreur init quota:", error);
      return false;
    }
  }

  /**
   * Reset des quotas mensuels (cron job)
   */
  static async resetMonthlyQuotas(): Promise<{
    reset: number;
    errors: number;
  }> {
    console.log(`🔄 [QuotaSync v${this.VERSION}] Reset quotas mensuels...`);

    let reset = 0;
    let errors = 0;

    try {
      const now = new Date();
      const currentDay = now.getDate();

      // Récupérer les quotas à reset
      const { data: quotasToReset, error } = await supabaseAdmin!
        .from("user_quota")
        .select("*")
        .eq("resetDay", currentDay);

      if (error) throw error;

      for (const quota of quotasToReset || []) {
        try {
          await supabaseAdmin!
            .from("user_quota")
            .update({
              auditsUsed: 0,
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: this.calculatePeriodEnd(
                quota.planId,
                now,
              ).toISOString(),
              updatedAt: now.toISOString(),
            })
            .eq("id", quota.id);

          reset++;
        } catch (error) {
          console.error(`❌ Erreur reset quota ${quota.userId}:`, error);
          errors++;
        }
      }

      console.log(`✅ Reset terminé: ${reset} quotas reset, ${errors} erreurs`);
      return { reset, errors };
    } catch (error) {
      console.error("❌ Erreur reset global:", error);
      return { reset, errors: errors + 1 };
    }
  }

  // Méthodes utilitaires privées
  private static async updateSupabaseQuota(
    userId: string,
    updates: { auditsIncrement?: number },
  ): Promise<boolean> {
    try {
      if (updates.auditsIncrement) {
        // Utiliser SQL pour incrément atomique
        const { error } = await supabaseAdmin!.rpc("increment_audits_used", {
          target_user_id: userId,
          increment_by: updates.auditsIncrement,
        });

        if (error) {
          console.warn(
            "⚠️ RPC increment indisponible, utilisation UPDATE classique",
          );

          // Fallback: UPDATE classique
          const { data: currentQuota } = await supabaseAdmin!
            .from("user_quota")
            .select("auditsUsed")
            .eq("userId", userId)
            .single();

          if (currentQuota) {
            await supabaseAdmin!
              .from("user_quota")
              .update({
                auditsUsed: currentQuota.auditsUsed + updates.auditsIncrement,
                updatedAt: new Date().toISOString(),
              })
              .eq("userId", userId);
          }
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Erreur update Supabase quota:", error);
      return false;
    }
  }

  private static async syncQuotaToPrisma(userId: string): Promise<boolean> {
    try {
      // Récupérer quota depuis Supabase
      const { data: supabaseQuota } = await supabaseAdmin!
        .from("user_quota")
        .select("*")
        .eq("userId", userId)
        .single();

      if (!supabaseQuota) return false;

      // Sync vers Prisma
      await prisma.user.update({
        where: { id: userId },
        data: {
          quotaUsed: supabaseQuota.auditsUsed,
          monthlyQuota: supabaseQuota.auditsLimit,
          quotaResetDate: new Date(supabaseQuota.currentPeriodEnd),
          subscriptionTier: this.mapPlanIdToTier(supabaseQuota.planId),
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error("❌ Erreur sync vers Prisma:", error);
      return false;
    }
  }

  private static async getFallbackQuotaFromPrisma(
    userId: string,
  ): Promise<QuotaInfo | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return null;

      return {
        userId: user.id,
        planId: this.mapTierToPlanId(user.subscriptionTier || "free"),
        auditsUsed: user.quotaUsed,
        auditsLimit: user.monthlyQuota,
        canCreateAudit: user.quotaUsed < user.monthlyQuota,
        periodStart: new Date(),
        periodEnd: user.quotaResetDate,
        resetDay: user.quotaResetDate.getDate(),
      };
    } catch (error) {
      console.error("❌ Erreur fallback Prisma:", error);
      return null;
    }
  }

  private static getPlanLimits(planId: string): {
    limit: number;
    resetDay: number;
  } {
    const plans: Record<string, { limit: number; resetDay: number }> = {
      gratuit: { limit: 5, resetDay: 1 },
      pro_monthly: { limit: 500, resetDay: 1 },
      premium_monthly: { limit: 2000, resetDay: 1 },
      pro_yearly: { limit: 500, resetDay: 1 },
      premium_yearly: { limit: 2000, resetDay: 1 },
    };

    return plans[planId] || plans.gratuit;
  }

  private static calculatePeriodEnd(
    planId: string,
    from: Date = new Date(),
  ): Date {
    const end = new Date(from);

    if (planId.includes("yearly")) {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    return end;
  }

  private static mapPlanIdToTier(planId: string): string {
    const mapping: Record<string, string> = {
      gratuit: "free",
      pro_monthly: "basic",
      premium_monthly: "premium",
      pro_yearly: "basic",
      premium_yearly: "premium",
    };

    return mapping[planId] || "free";
  }

  private static mapTierToPlanId(tier: string): string {
    const mapping: Record<string, string> = {
      free: "gratuit",
      basic: "pro_monthly",
      premium: "premium_monthly",
    };

    return mapping[tier] || "gratuit";
  }
}

// Instance pour utilisation simple
export const quotaSync = QuotaSyncService;
