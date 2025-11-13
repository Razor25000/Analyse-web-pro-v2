import { prisma } from "@/lib/prisma";

/**
 * Utilities pour nettoyer les données de test
 * Garantit un environnement de test propre
 */

export class TestCleanup {
  private static readonly testEmailPattern = /^test\d+@example\.com$/;
  private static readonly testUserPattern = /^Test User \d+$/;
  private static readonly testBatchPattern = /^Test Batch \d+$/;
  private static readonly testUrlPattern = /^https:\/\/example.*\.com$/;

  /**
   * Supprime un utilisateur de test et toutes ses données liées
   */
  static async cleanupUser(email: string) {
    if (!this.testEmailPattern.test(email)) {
      throw new Error(`Email ${email} ne correspond pas au pattern de test`);
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          audits: true,
          quota: true,
          subscriptions: true,
        },
      });

      if (!user) return;

      // Supprimer dans l'ordre pour respecter les contraintes FK
      await prisma.$transaction(async (tx) => {
        // Supprimer les audits
        if (user.audits.length > 0) {
          await tx.audit.deleteMany({
            where: { userId: user.id },
          });
        }

        // Supprimer les quotas
        if (user.quota) {
          await tx.userQuota.delete({
            where: { userId: user.id },
          });
        }

        // Supprimer les abonnements
        if (user.subscriptions.length > 0) {
          await tx.subscription.deleteMany({
            where: { userId: user.id },
          });
        }

        // Supprimer l'utilisateur
        await tx.user.delete({
          where: { id: user.id },
        });
      });

      console.log(`✅ Utilisateur de test ${email} et ses données supprimés`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de la suppression de l'utilisateur ${email}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Supprime tous les utilisateurs de test créés dans les dernières heures
   */
  static async cleanupAllTestUsers(hoursAgo = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    try {
      const testUsers = await prisma.user.findMany({
        where: {
          AND: [
            { email: { contains: "test" } },
            { email: { contains: "@example.com" } },
            { createdAt: { gte: cutoffDate } },
          ],
        },
      });

      for (const user of testUsers) {
        if (this.testEmailPattern.test(user.email)) {
          await this.cleanupUser(user.email);
        }
      }

      console.log(`✅ ${testUsers.length} utilisateurs de test nettoyés`);
    } catch (error) {
      console.error(
        "❌ Erreur lors du nettoyage des utilisateurs de test:",
        error,
      );
      throw error;
    }
  }

  /**
   * Supprime tous les audits de test orphelins
   */
  static async cleanupTestAudits() {
    try {
      const testAudits = await prisma.audit.deleteMany({
        where: {
          OR: [
            { url: { regex: "https://example.*\\.com" } },
            { runId: { startsWith: "test_run_" } },
          ],
        },
      });

      console.log(`✅ ${testAudits.count} audits de test supprimés`);
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage des audits de test:", error);
      throw error;
    }
  }

  /**
   * Supprime les données de test de Stripe (via metadata)
   */
  static async cleanupTestStripeData() {
    try {
      const testSubscriptions = await prisma.subscription.deleteMany({
        where: {
          OR: [
            { stripeCustomerId: { startsWith: "cus_test_" } },
            { stripeSubscriptionId: { startsWith: "sub_test_" } },
          ],
        },
      });

      console.log(
        `✅ ${testSubscriptions.count} abonnements de test Stripe supprimés`,
      );
    } catch (error) {
      console.error(
        "❌ Erreur lors du nettoyage des données Stripe de test:",
        error,
      );
      throw error;
    }
  }

  /**
   * Réinitialise les quotas de test
   */
  static async resetTestQuotas() {
    try {
      const testUsers = await prisma.user.findMany({
        where: {
          email: { regex: this.testEmailPattern.source },
        },
        include: { quota: true },
      });

      for (const user of testUsers) {
        if (user.quota) {
          await prisma.userQuota.update({
            where: { userId: user.id },
            data: {
              used: 0,
              limit: 5, // Quota gratuit par défaut
              resetAt: new Date(),
            },
          });
        }
      }

      console.log(
        `✅ Quotas réinitialisés pour ${testUsers.length} utilisateurs de test`,
      );
    } catch (error) {
      console.error("❌ Erreur lors de la réinitialisation des quotas:", error);
      throw error;
    }
  }

  /**
   * Nettoyage complet de toutes les données de test
   */
  static async fullTestCleanup() {
    console.log("🧹 Début du nettoyage complet des données de test...");

    try {
      await this.cleanupTestAudits();
      await this.cleanupTestStripeData();
      await this.cleanupAllTestUsers();

      console.log("✅ Nettoyage complet terminé avec succès");
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage complet:", error);
      throw error;
    }
  }

  /**
   * Vérification de l'intégrité des données après nettoyage
   */
  static async verifyCleanup() {
    try {
      const remainingTestUsers = await prisma.user.count({
        where: {
          email: { regex: this.testEmailPattern.source },
        },
      });

      const remainingTestAudits = await prisma.audit.count({
        where: {
          url: { regex: "https://example.*\\.com" },
        },
      });

      console.log(
        `📊 Vérification - Utilisateurs de test restants: ${remainingTestUsers}`,
      );
      console.log(
        `📊 Vérification - Audits de test restants: ${remainingTestAudits}`,
      );

      return {
        testUsersRemaining: remainingTestUsers,
        testAuditsRemaining: remainingTestAudits,
        isClean: remainingTestUsers === 0 && remainingTestAudits === 0,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la vérification:", error);
      throw error;
    }
  }
}

/**
 * Hook de nettoyage automatique pour les tests
 */
export function setupTestCleanupHooks() {
  // Nettoyage avant les tests
  beforeAll(async () => {
    await TestCleanup.cleanupAllTestUsers(1); // Nettoyer les données de test de la dernière heure
  });

  // Nettoyage après chaque test
  afterEach(async () => {
    // Nettoyage léger après chaque test
    await TestCleanup.cleanupTestAudits();
  });

  // Nettoyage complet après tous les tests
  afterAll(async () => {
    await TestCleanup.fullTestCleanup();
    await TestCleanup.verifyCleanup();
  });
}
