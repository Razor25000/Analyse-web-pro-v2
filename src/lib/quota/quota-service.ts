import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type QuotaInfo = {
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date;
  planId: string;
  canMakeRequest: boolean;
};

export type QuotaUsage = {
  userId: string;
  auditCount: number;
  timestamp: Date;
};

/**
 * Service de gestion des quotas utilisateurs
 * Refactorisé pour utiliser User.monthlyQuota et User.quotaUsed
 * Tables supprimées: UserQuota, AuditUsageLog
 */
export const QuotaService = {
  /**
   * Récupère les informations de quota d'un utilisateur
   * Utilise maintenant User.monthlyQuota et User.quotaUsed
   */
  async getUserQuota(userId: string): Promise<QuotaInfo | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          monthlyQuota: true,
          quotaUsed: true,
          quotaResetDate: true,
          subscriptions: {
            select: {
              plan: true,
              status: true,
            },
            where: {
              status: "active",
            },
            orderBy: {
              periodStart: "desc",
            },
            take: 1,
          },
        },
      });

      if (!user) {
        return null;
      }

      // Vérifier et réinitialiser le quota si nécessaire
      await QuotaService.checkAndResetQuotaIfNeeded(
        userId,
        user.quotaResetDate,
      );

      // Re-récupérer les données après reset potentiel
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          monthlyQuota: true,
          quotaUsed: true,
          quotaResetDate: true,
          subscriptions: {
            select: { plan: true },
            where: { status: "active" },
            orderBy: { periodStart: "desc" },
            take: 1,
          },
        },
      });

      if (!updatedUser) return null;

      const subscription = updatedUser.subscriptions[0];
      const planId = subscription?.plan ?? "free";

      return {
        used: updatedUser.quotaUsed,
        limit: updatedUser.monthlyQuota,
        remaining: Math.max(
          0,
          updatedUser.monthlyQuota - updatedUser.quotaUsed,
        ),
        resetDate: updatedUser.quotaResetDate,
        planId,
        canMakeRequest: updatedUser.quotaUsed < updatedUser.monthlyQuota,
      };
    } catch (error) {
      logger.error("Erreur récupération quota utilisateur", { error });
      return null;
    }
  },

  /**
   * Initialise le quota par défaut d'un nouvel utilisateur
   */
  async createDefaultQuota(userId: string): Promise<void> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyQuota: 3, // Quota gratuit par défaut (nouveau: 3 audits)
        quotaUsed: 0,
        quotaResetDate: nextMonth,
      },
    });
  },

  /**
   * Vérifie et remet à zéro le quota si la période est écoulée
   */
  async checkAndResetQuotaIfNeeded(
    userId: string,
    currentResetDate: Date,
  ): Promise<void> {
    const now = new Date();

    if (now >= currentResetDate) {
      // Calculer la prochaine date de reset (début du mois suivant)
      const nextResetDate = new Date(now);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      nextResetDate.setDate(1);
      nextResetDate.setHours(0, 0, 0, 0);

      // Réinitialiser le quota
      await prisma.user.update({
        where: { id: userId },
        data: {
          quotaUsed: 0,
          quotaResetDate: nextResetDate,
        },
      });

      logger.info(`Quota réinitialisé pour l'utilisateur ${userId}`);
    }
  },

  /**
   * Incrémente l'usage du quota de manière atomique
   */
  async incrementQuotaUsage(userId: string, increment = 1): Promise<boolean> {
    try {
      // Vérifier d'abord si l'utilisateur peut faire la requête
      const quota = await QuotaService.getUserQuota(userId);

      if (!quota) {
        logger.warn(`Impossible de récupérer le quota pour ${userId}`);
        return false;
      }

      if (increment <= 0) {
        logger.info(`Increment de quota nul ou négatif ignoré pour ${userId}`, {
          increment,
        });
        return true;
      }

      if (quota.remaining < increment) {
        logger.warn(`Quota insuffisant pour ${userId}`, {
          requested: increment,
          remaining: quota.remaining,
        });
        return false;
      }

      // Incrémenter de manière atomique
      await prisma.user.update({
        where: { id: userId },
        data: {
          quotaUsed: {
            increment: increment,
          },
          updatedAt: new Date(),
        },
      });

      logger.info(`Quota incrémenté pour ${userId}`, {
        increment,
        total: quota.used + increment,
      });
      return true;
    } catch (error) {
      logger.error("Erreur incrémentation quota", { error });
      return false;
    }
  },

  /**
   * Vérifie si un utilisateur peut faire une requête
   */
  async canMakeRequest(userId: string): Promise<boolean> {
    const quota = await QuotaService.getUserQuota(userId);
    return quota?.canMakeRequest ?? false;
  },

  /**
   * Met à jour le quota selon le plan d'abonnement
   */
  async updateQuotaForSubscription(
    userId: string,
    planId: string,
  ): Promise<void> {
    // Quotas alignés sur les plans du pricing-section.tsx
    const quotaLimits: Record<string, number> = {
      free: 3, // Plan Gratuit = 3 audits/mois
      starter: 20, // Plan Starter à 29€ = 20 audits/mois
      basic: 80, // Plan Pro à 79€ = 80 audits/mois (mappé vers "pro")
      premium: 250, // Plan Premium à 149€ = 250 audits/mois + batch
      enterprise: 10000,
    };

    // Mapper les plans Stripe vers les subscription tiers
    const subscriptionTierMapping: Record<string, string> = {
      free: "free",
      // Plans STARTER (29€/mois) → tier "starter" avec 20 audits
      starter: "starter",
      starter_monthly: "starter",
      starter_yearly: "starter",
      // Plans PRO (79€/mois) → tier "basic" avec 80 audits
      pro: "basic",
      pro_monthly: "basic",
      pro_yearly: "basic",
      // Plans PREMIUM (149€/mois) → tier "premium" avec 250 audits
      premium: "premium",
      premium_monthly: "premium",
      premium_yearly: "premium",
      // Plans ULTRA (ancien nom pour premium) → tier "premium"
      ultra: "premium",
      enterprise: "enterprise",
    };

    const subscriptionTier = subscriptionTierMapping[planId] || "free";
    const newQuota = quotaLimits[subscriptionTier] || 3;

    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyQuota: newQuota,
        subscriptionTier: subscriptionTier,
      },
    });

    logger.info(`Quota et tier mis à jour pour ${userId}`, {
      newQuota,
      planId,
      subscriptionTier,
    });
  },

  /**
   * Obtient les statistiques d'usage pour un utilisateur
   */
  async getUserUsageStats(userId: string): Promise<{
    currentUsage: number;
    totalLimit: number;
    usagePercentage: number;
    resetDate: Date;
    planId: string;
  } | null> {
    const quota = await QuotaService.getUserQuota(userId);

    if (!quota) {
      return null;
    }

    return {
      currentUsage: quota.used,
      totalLimit: quota.limit,
      usagePercentage: Math.round((quota.used / quota.limit) * 100),
      resetDate: quota.resetDate,
      planId: quota.planId,
    };
  },

  /**
   * DEPRECATED: Les logs d'usage sont maintenant directement dans les audits
   * Cette méthode retourne un compteur basé sur les audits créés
   */
  async getUsageHistoryFromAudits(
    userId: string,
    days = 30,
  ): Promise<QuotaUsage[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const audits = await prisma.audit.groupBy({
      by: ["userId"],
      where: {
        userId: userId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        userId: "desc",
      },
    });

    return audits.map((audit) => ({
      userId: audit.userId ?? userId,
      auditCount: audit._count.id,
      timestamp: new Date(),
    }));
  },

  /**
   * Nettoyage périodique - pas nécessaire avec la nouvelle architecture
   */
  async cleanupOldUsageLogs(): Promise<void> {
    logger.info(
      "Nettoyage automatique avec nouvelle architecture (pas d'action requise)",
    );
    // Les logs sont maintenant dans les audits avec TTL automatique
  },
};
