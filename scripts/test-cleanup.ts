#!/usr/bin/env tsx

/**
 * Script de nettoyage pour les tests e2e
 * Supprime les données de test après exécution
 */

import { prisma } from "@/lib/prisma";

type CleanupOptions = {
  full?: boolean;
  emergency?: boolean;
  dryRun?: boolean;
};

class TestCleanup {
  private static readonly testEmailPattern =
    /^test[\w\-]*@(example\.com|test\.local)$/;

  /**
   * Point d'entrée principal
   */
  static async run(options: CleanupOptions = {}) {
    console.log("🧹 Démarrage du nettoyage des données de test...");

    if (options.dryRun) {
      console.log("📋 Mode DRY RUN - Aucune suppression ne sera effectuée");
    }

    try {
      const stats = await this.cleanupTestData(options);
      console.log("✅ Nettoyage terminé avec succès");
      console.log(`📊 Statistiques: ${JSON.stringify(stats, null, 2)}`);

      return stats;
    } catch (error) {
      console.error("❌ Erreur durant le nettoyage:", error);
      throw error;
    }
  }

  /**
   * Nettoyage principal des données de test
   */
  private static async cleanupTestData(options: CleanupOptions) {
    const stats = {
      usersDeleted: 0,
      auditsDeleted: 0,
      subscriptionsDeleted: 0,
      tablesReset: 0,
    };

    // En mode urgence, nettoyer tout
    if (options.emergency) {
      console.log("🚨 Mode urgence - Nettoyage complet");
      return await this.emergencyCleanup(options, stats);
    }

    // Nettoyage standard
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          regex: this.testEmailPattern.source,
        },
      },
      include: {
        audits: true,
        quota: true,
        subscriptions: true,
        organizations: {
          include: {
            members: true,
            audits: true,
            quota: true,
          },
        },
      },
    });

    console.log(`🔍 Trouvé ${testUsers.length} utilisateurs de test`);

    for (const user of testUsers) {
      if (!options.dryRun) {
        // Nettoyer les données liées à l'utilisateur
        await this.cleanupUser(user.email);
      }
      stats.usersDeleted++;
      stats.auditsDeleted += user.audits.length;
      stats.subscriptionsDeleted += user.subscriptions.length;
    }

    // Nettoyage des audits orphelins
    const orphanAudits = await prisma.audit.findMany({
      where: {
        url: {
          contains: "test-",
        },
      },
    });

    if (!options.dryRun && orphanAudits.length > 0) {
      await prisma.audit.deleteMany({
        where: {
          id: {
            in: orphanAudits.map((a) => a.id),
          },
        },
      });
    }

    stats.auditsDeleted += orphanAudits.length;

    // Nettoyage complet si demandé
    if (options.full) {
      await this.fullReset(options, stats);
    }

    return stats;
  }

  /**
   * Nettoyage d'urgence
   */
  private static async emergencyCleanup(options: CleanupOptions, stats: any) {
    console.log("⚠️ Suppression de TOUTES les données de test");

    const tables = [
      "audit_results",
      "audits",
      "subscriptions",
      "quota",
      "organization_members",
      "organizations",
      "accounts",
      "sessions",
      "verification_tokens",
      "users",
    ];

    for (const table of tables) {
      try {
        if (!options.dryRun) {
          await prisma.$executeRaw`DELETE FROM ${table} WHERE id > 0`;
        }
        console.log(`🗑️ Table ${table} nettoyée`);
        stats.tablesReset++;
      } catch (error) {
        console.warn(`⚠️ Impossible de nettoyer ${table}:`, error);
      }
    }

    return stats;
  }

  /**
   * Nettoyage complet avec remise à zéro
   */
  private static async fullReset(options: CleanupOptions, stats: any) {
    console.log("🔄 Remise à zéro complète des données de test");

    // Réinitialiser les séquences d'auto-increment
    const sequences = ["users_id_seq", "organizations_id_seq", "audits_id_seq"];

    for (const seq of sequences) {
      try {
        if (!options.dryRun) {
          await prisma.$executeRaw`SELECT setval('${seq}', 1, false)`;
        }
        console.log(`🔢 Séquence ${seq} réinitialisée`);
      } catch (error) {
        console.warn(`⚠️ Impossible de réinitialiser ${seq}:`, error);
      }
    }

    stats.tablesReset += sequences.length;
    return stats;
  }

  /**
   * Nettoyer un utilisateur spécifique
   */
  static async cleanupUser(email: string) {
    if (!this.testEmailPattern.test(email)) {
      throw new Error(
        `Email ${email} ne correspond pas au pattern de test autorisé`,
      );
    }

    console.log(`🧹 Nettoyage utilisateur: ${email}`);

    try {
      // Utiliser une transaction pour garantir la cohérence
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { email },
          include: {
            organizations: {
              include: {
                members: true,
                audits: true,
              },
            },
          },
        });

        if (!user) {
          console.log(`⚠️ Utilisateur ${email} non trouvé`);
          return;
        }

        // Supprimer les résultats d'audit
        await tx.auditResult.deleteMany({
          where: {
            audit: {
              userId: user.id,
            },
          },
        });

        // Supprimer les audits
        await tx.audit.deleteMany({
          where: { userId: user.id },
        });

        // Supprimer les abonnements
        await tx.subscription.deleteMany({
          where: { userId: user.id },
        });

        // Supprimer le quota
        await tx.quota.deleteMany({
          where: { userId: user.id },
        });

        // Supprimer les organisations si l'utilisateur en est propriétaire
        for (const org of user.organizations) {
          if (org.ownerId === user.id) {
            // Supprimer les membres de l'organisation
            await tx.organizationMember.deleteMany({
              where: { organizationId: org.id },
            });

            // Supprimer les audits de l'organisation
            await tx.audit.deleteMany({
              where: { organizationId: org.id },
            });

            // Supprimer l'organisation
            await tx.organization.delete({
              where: { id: org.id },
            });
          } else {
            // Juste retirer l'utilisateur de l'organisation
            await tx.organizationMember.deleteMany({
              where: {
                userId: user.id,
                organizationId: org.id,
              },
            });
          }
        }

        // Supprimer les comptes liés
        await tx.account.deleteMany({
          where: { userId: user.id },
        });

        // Supprimer les sessions
        await tx.session.deleteMany({
          where: { userId: user.id },
        });

        // Enfin, supprimer l'utilisateur
        await tx.user.delete({
          where: { id: user.id },
        });

        console.log(`✅ Utilisateur ${email} supprimé avec succès`);
      });
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression de ${email}:`, error);
      throw error;
    }
  }

  /**
   * Vérifier l'intégrité après nettoyage
   */
  static async verifyIntegrity() {
    console.log("🔍 Vérification de l'intégrité de la base de données...");

    const checks = [
      {
        name: "Utilisateurs orphelins",
        query: "SELECT COUNT(*) FROM users WHERE email LIKE '%test%'",
      },
      {
        name: "Audits orphelins",
        query:
          "SELECT COUNT(*) FROM audits WHERE user_id NOT IN (SELECT id FROM users)",
      },
      {
        name: "Quotas orphelins",
        query:
          "SELECT COUNT(*) FROM quota WHERE user_id NOT IN (SELECT id FROM users)",
      },
    ];

    const issues = [];

    for (const check of checks) {
      try {
        const result = await prisma.$queryRaw`${check.query}`;
        const count = Number(result[0].count);

        if (count > 0) {
          issues.push(`${check.name}: ${count}`);
          console.warn(`⚠️ ${check.name}: ${count} éléments trouvés`);
        } else {
          console.log(`✅ ${check.name}: OK`);
        }
      } catch (error) {
        console.warn(`⚠️ Impossible de vérifier ${check.name}:`, error);
      }
    }

    if (issues.length > 0) {
      console.warn("⚠️ Problèmes d'intégrité détectés:", issues);
      return false;
    }

    console.log("✅ Base de données intègre");
    return true;
  }
}

// Exécution en ligne de commande
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    full: args.includes("--full"),
    emergency: args.includes("--emergency"),
    dryRun: args.includes("--dry-run"),
  };

  TestCleanup.run(options)
    .then((stats) => {
      console.log("🎉 Nettoyage terminé:", stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Erreur fatale:", error);
      process.exit(1);
    });
}

export { TestCleanup };
