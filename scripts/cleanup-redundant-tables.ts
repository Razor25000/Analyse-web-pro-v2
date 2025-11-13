#!/usr/bin/env tsx

/**
 * Script de nettoyage des tables redondantes
 * ATTENTION: Script destructif, sauvegarder avant usage
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } },
});

async function cleanupRedundantTables() {
  console.log("🧹 NETTOYAGE DES TABLES REDONDANTES");
  console.log("=".repeat(50));
  console.log("⚠️ ATTENTION: Script destructif!");
  console.log("📁 Sauvegardez dev.db avant de continuer");

  try {
    // 1. Analyser les données existantes avant suppression
    console.log("\n📊 ANALYSE DES DONNÉES EXISTANTES");
    console.log("-".repeat(30));

    const userQuotaCount = await prisma.userQuota.count();
    const auditUsageLogCount = await prisma.auditUsageLog.count();

    console.log(`UserQuota records: ${userQuotaCount}`);
    console.log(`AuditUsageLog records: ${auditUsageLogCount}`);

    if (userQuotaCount > 0) {
      console.log("\n📋 Données UserQuota existantes:");
      const quotas = await prisma.userQuota.findMany({
        include: { user: { select: { email: true } } },
      });
      quotas.forEach((quota) => {
        console.log(
          `  - ${quota.user.email}: ${quota.auditsUsed}/${quota.auditsLimit} (plan: ${quota.planId})`,
        );
      });
    }

    if (auditUsageLogCount > 0) {
      console.log("\n📋 Données AuditUsageLog existantes:");
      const logs = await prisma.auditUsageLog.findMany({
        take: 5,
        include: { user: { select: { email: true } } },
      });
      logs.forEach((log) => {
        console.log(
          `  - ${log.user.email}: ${log.auditType} ${log.url} (${log.status})`,
        );
      });
      if (auditUsageLogCount > 5) {
        console.log(
          `  ... et ${auditUsageLogCount - 5} autres enregistrements`,
        );
      }
    }

    // 2. Migrer les données importantes vers User si nécessaire
    console.log("\n🔄 MIGRATION DES DONNÉES CRITIQUES");
    console.log("-".repeat(30));

    if (userQuotaCount > 0) {
      console.log("Synchronisation des quotas UserQuota -> User...");
      const quotas = await prisma.userQuota.findMany();

      for (const quota of quotas) {
        await prisma.user.update({
          where: { id: quota.userId },
          data: {
            quotaUsed: quota.auditsUsed,
            monthlyQuota: quota.auditsLimit,
          },
        });
        console.log(`✅ Quota migré pour userId: ${quota.userId}`);
      }
    }

    // 3. Vérifier que les données sont bien migrées
    console.log("\n🔍 VÉRIFICATION DE LA MIGRATION");
    console.log("-".repeat(30));

    const users = await prisma.user.findMany({
      select: { email: true, quotaUsed: true, monthlyQuota: true },
    });

    users.forEach((user) => {
      console.log(`✅ ${user.email}: ${user.quotaUsed}/${user.monthlyQuota}`);
    });

    console.log("\n⚠️ SIMULATION MODE - Aucune suppression effectuée");
    console.log("Pour effectuer les suppressions, modifiez le script");
    console.log("\nCommandes SQL qui seraient exécutées:");
    console.log("  DROP TABLE AuditUsageLog;");
    console.log("  DROP TABLE UserQuota;");

    // Mode simulation - décommentez pour exécuter
    /*
    // 4. Supprimer les tables redondantes
    console.log("\n❌ SUPPRESSION DES TABLES REDONDANTES");
    console.log("-".repeat(30));

    // Note: Prisma ne permet pas DROP TABLE directement
    // Ces commandes doivent être exécutées via une migration
    console.log("⚠️ Les tables doivent être supprimées via migration Prisma");
    console.log("1. Supprimez les models du schema.prisma");
    console.log("2. Exécutez: npx prisma db push");
    */
  } catch (error: any) {
    console.error("❌ Erreur lors du nettoyage:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateCleanupMigration() {
  console.log("\n📝 GÉNÉRATION DE LA MIGRATION DE NETTOYAGE");
  console.log("-".repeat(40));

  const migrationSQL = `
-- Migration pour supprimer les tables redondantes
-- À exécuter après sauvegarde et tests

-- 1. Vérifier que les données sont migrées vers User
SELECT email, quota_used, monthly_quota FROM user;

-- 2. Supprimer les tables redondantes
DROP TABLE IF EXISTS audit_usage_log;
DROP TABLE IF EXISTS user_quota;

-- 3. Nettoyer les champs redondants dans User (optionnel)
-- ALTER TABLE user DROP COLUMN subscription_tier;
-- ALTER TABLE user DROP COLUMN subscribed;
-- ALTER TABLE user DROP COLUMN subscription_end;

-- 4. Vérification finale
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
`;

  console.log("📄 Migration SQL générée:");
  console.log(migrationSQL);
}

cleanupRedundantTables()
  .then(async () => generateCleanupMigration())
  .then(() => console.log("\n🎉 Analyse de nettoyage terminée"))
  .catch(console.error);
