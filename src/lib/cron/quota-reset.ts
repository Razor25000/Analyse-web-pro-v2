/**
 * Service de réinitialisation des quotas mensuels basé sur les dates d'anniversaire
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export class QuotaResetService {
  /**
   * Réinitialise les quotas pour tous les utilisateurs dont la période est écoulée
   */
  static async resetExpiredQuotas(): Promise<{
    resetCount: number;
    errors: string[];
  }> {
    const now = new Date();
    const errors: string[] = [];
    let resetCount = 0;

    try {
      logger.info("🔄 Début de la réinitialisation des quotas expirés");

      // Récupérer tous les utilisateurs avec quota expiré
      const expiredQuotas = await prisma.user.findMany({
        where: {
          quotaResetDate: {
            lte: now,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          monthlyQuota: true,
          quotaUsed: true,
          quotaResetDate: true,
        },
      });

      logger.info(`📊 Trouvé ${expiredQuotas.length} quotas à réinitialiser`);

      // Traiter chaque quota expiré
      for (const quota of expiredQuotas) {
        try {
          const nextPeriodEnd = this.calculateNextResetDate(
            now,
            now.getDate(), // Use current day as reset day
          );

          await prisma.user.update({
            where: { id: quota.id },
            data: {
              quotaUsed: 0,
              quotaResetDate: nextPeriodEnd,
              updatedAt: now,
            },
          });

          resetCount++;
          logger.info(
            `✅ Quota réinitialisé pour ${quota.email} (${quota.monthlyQuota})`,
          );
        } catch (error) {
          const errorMsg = `Erreur réinitialisation quota ${quota.id}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(
        `🎉 Réinitialisation terminée: ${resetCount} quotas mis à jour`,
      );
    } catch (error) {
      const errorMsg = `Erreur globale réinitialisation quotas: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return { resetCount, errors };
  }

  /**
   * Calcule la prochaine date de réinitialisation basée sur le jour anniversaire
   */
  private static calculateNextResetDate(
    currentDate: Date,
    resetDay: number,
  ): Date {
    const nextReset = new Date(currentDate);

    // Aller au mois suivant
    nextReset.setMonth(nextReset.getMonth() + 1);

    // Définir le jour de réinitialisation
    // Si le jour n'existe pas dans le mois (ex: 31 février), prendre le dernier jour du mois
    const lastDayOfMonth = new Date(
      nextReset.getFullYear(),
      nextReset.getMonth() + 1,
      0,
    ).getDate();
    const actualResetDay = Math.min(resetDay, lastDayOfMonth);

    nextReset.setDate(actualResetDay);

    // Réinitialiser l'heure à 00:00:00
    nextReset.setHours(0, 0, 0, 0);

    return nextReset;
  }

  /**
   * Réinitialise manuellement le quota d'un utilisateur spécifique
   */
  static async resetUserQuota(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        logger.warn(`Aucun utilisateur trouvé pour l'ID ${userId}`);
        return false;
      }

      const now = new Date();
      const nextPeriodEnd = this.calculateNextResetDate(now, now.getDate());

      await prisma.user.update({
        where: { id: userId },
        data: {
          quotaUsed: 0,
          quotaResetDate: nextPeriodEnd,
          updatedAt: now,
        },
      });

      logger.info(
        `✅ Quota réinitialisé manuellement pour l'utilisateur ${user.email}`,
      );
      return true;
    } catch (error) {
      logger.error(`Erreur réinitialisation manuelle quota ${userId}:`, error);
      return false;
    }
  }

  /**
   * Obtient les statistiques des prochaines réinitialisations
   */
  static async getUpcomingResets(days = 7): Promise<
    {
      userId: string;
      userEmail: string;
      monthlyQuota: number;
      resetDate: Date;
      daysUntilReset: number;
    }[]
  > {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + days);

    const upcomingResets = await prisma.user.findMany({
      where: {
        quotaResetDate: {
          gte: now,
          lte: futureDate,
        },
      },
      select: {
        id: true,
        email: true,
        monthlyQuota: true,
        quotaResetDate: true,
      },
      orderBy: {
        quotaResetDate: "asc",
      },
    });

    return upcomingResets.map((user) => ({
      userId: user.id,
      userEmail: user.email,
      monthlyQuota: user.monthlyQuota,
      resetDate: user.quotaResetDate,
      daysUntilReset: Math.ceil(
        (user.quotaResetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Fonction de nettoyage des anciens audits
   */
  static async cleanupOldAuditLogs(daysToKeep = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.audit.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(
        `🗑️ Supprimé ${result.count} audits de plus de ${daysToKeep} jours`,
      );
      return result.count;
    } catch (error) {
      logger.error("Erreur nettoyage logs audit:", error);
      return 0;
    }
  }
}

// Cron job ou script d'exécution
export async function runQuotaResetJob() {
  const startTime = new Date();
  logger.info("🚀 Démarrage du job de réinitialisation des quotas");

  const result = await QuotaResetService.resetExpiredQuotas();

  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  logger.info(
    `⏱️ Job terminé en ${duration}ms: ${result.resetCount} quotas réinitialisés`,
  );

  if (result.errors.length > 0) {
    logger.error(
      `⚠️ ${result.errors.length} erreurs lors de la réinitialisation:`,
      result.errors,
    );
  }

  return result;
}

// Si le script est exécuté directement
if (require.main === module) {
  runQuotaResetJob()
    .then((result) => {
      console.log("✅ Job de réinitialisation terminé:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erreur job:", error);
      process.exit(1);
    });
}
