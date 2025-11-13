import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

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
export class QuotaService {
  /**
   * Récupère les informations de quota d'un utilisateur
   * Utilise maintenant User.monthlyQuota et User.quotaUsed
   */
  static async getUserQuota(userId: string): Promise<QuotaInfo | null> {
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
      await this.checkAndResetQuotaIfNeeded(userId, user.quotaResetDate);

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
      const planId = subscription?.plan || "free";

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
      console.error("Erreur récupération quota utilisateur:", error);
      return null;
    }
  }

  /**
   * Initialise le quota par défaut d'un nouvel utilisateur
   */
  static async createDefaultQuota(userId: string): Promise<void> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyQuota: 5, // Quota gratuit par défaut
        quotaUsed: 0,
        quotaResetDate: nextMonth,
      },
    });
  }

  /**
   * Vérifie et remet à zéro le quota si la période est écoulée
   */
  static async checkAndResetQuotaIfNeeded(
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

      console.log(`✅ Quota réinitialisé pour l'utilisateur ${userId}`);
    }
  }

  /**
   * Incrémente l'usage du quota de manière atomique
   */
  static async incrementQuotaUsage(
    userId: string,
    increment = 1,
  ): Promise<boolean> {
    try {
      // Vérifier d'abord si l'utilisateur peut faire la requête
      const quota = await this.getUserQuota(userId);

      if (!quota?.canMakeRequest) {
        console.warn(`❌ Quota épuisé pour l'utilisateur ${userId}`);
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

      console.log(
        `✅ Quota incrémenté pour ${userId}: +${increment} (total: ${quota.used + increment})`,
      );
      return true;
    } catch (error) {
      console.error("Erreur incrémentation quota:", error);
      return false;
    }
  }

  /**
   * Vérifie si un utilisateur peut faire une requête
   */
  static async canMakeRequest(userId: string): Promise<boolean> {
    const quota = await this.getUserQuota(userId);
    return quota?.canMakeRequest ?? false;
  }

  /**
   * Met à jour le quota selon le plan d'abonnement
   */
  static async updateQuotaForSubscription(
    userId: string,
    planId: string,
  ): Promise<void> {
    const quotaLimits: Record<string, number> = {
      free: 5,
      basic: 50,
      pro: 500,
      premium: 2000,
      enterprise: 10000,
    };

    const newQuota = quotaLimits[planId] || 5;

    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyQuota: newQuota,
      },
    });

    console.log(
      `✅ Quota mis à jour pour ${userId}: ${newQuota} (plan: ${planId})`,
    );
  }

  /**
   * Obtient les statistiques d'usage pour un utilisateur
   */
  static async getUserUsageStats(userId: string): Promise<{
    currentUsage: number;
    totalLimit: number;
    usagePercentage: number;
    resetDate: Date;
    planId: string;
  } | null> {
    const quota = await this.getUserQuota(userId);

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
  }

  /**
   * DEPRECATED: Les logs d'usage sont maintenant directement dans les audits
   * Cette méthode retourne un compteur basé sur les audits créés
   */
  static async getUsageHistoryFromAudits(
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
      userId: audit.userId || userId,
      auditCount: audit._count.id,
      timestamp: new Date(),
    }));
  }

  /**
   * Nettoyage périodique - pas nécessaire avec la nouvelle architecture
   */
  static async cleanupOldUsageLogs(): Promise<void> {
    console.log(
      "✅ Nettoyage automatique avec nouvelle architecture (pas d'action requise)",
    );
    // Les logs sont maintenant dans les audits avec TTL automatique
  }
}
