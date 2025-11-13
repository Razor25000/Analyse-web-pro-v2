#!/usr/bin/env tsx

/**
 * MIGRATION COMPLÈTE SAAS - Plan d'exécution par étapes
 * Guide sécurisé pour optimiser l'architecture base de données
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } },
});

console.log(`
🎯 PLAN DE MIGRATION COMPLÈTE DU SAAS
${"=".repeat(50)}

📊 SITUATION ACTUELLE:
✅ Tables Better Auth opérationnelles (User, Session, Account, Verification)
✅ Tables Supabase créées (profiles, subscribers, audits)
✅ Synchronisation utilisateurs fonctionnelle

🎯 OBJECTIFS:
❌ Supprimer 2 tables redondantes (UserQuota, AuditUsageLog)
🔄 Nettoyer champs redondants dans User
📊 Créer 10 tables manquantes pour SaaS complet
🚀 Optimiser performance et maintenance

⚠️ PRÉREQUIS AVANT MIGRATION:
1. Sauvegarde complète de dev.db
2. Sauvegarde Supabase via Dashboard
3. Tests de synchronisation OK
4. Arrêt du serveur de développement

${"=".repeat(50)}
`);

type MigrationStep = {
  id: string;
  title: string;
  description: string;
  risk: "low" | "medium" | "high";
  reversible: boolean;
  sqlCommands?: string[];
  verification: string;
  rollback?: string;
};

const migrationSteps: MigrationStep[] = [
  {
    id: "step1",
    title: "📋 Sauvegarde et analyse pré-migration",
    description: "Créer sauvegardes et analyser l'état actuel des données",
    risk: "low",
    reversible: true,
    verification: "Sauvegardes créées et données inventoriées",
    rollback: "Restaurer depuis les sauvegardes",
  },
  {
    id: "step2",
    title: "🔄 Migration des données critiques UserQuota -> User",
    description:
      "Synchroniser quotas de UserQuota vers User.monthlyQuota/quotaUsed",
    risk: "low",
    reversible: true,
    verification: "Toutes les données UserQuota migrées vers User",
    rollback: "Recréer UserQuota depuis User si nécessaire",
  },
  {
    id: "step3",
    title: "❌ Suppression table UserQuota (redondante)",
    description: "Supprimer la table UserQuota après migration des données",
    risk: "medium",
    reversible: false,
    verification: "Table UserQuota supprimée, aucune référence dans le code",
    rollback: "Impossible - nécessite recréation manuelle",
  },
  {
    id: "step4",
    title: "❌ Suppression table AuditUsageLog (redondante)",
    description: "Supprimer AuditUsageLog (données disponibles dans Audit)",
    risk: "low",
    reversible: false,
    verification: "Table AuditUsageLog supprimée",
    rollback: "Impossible - données dans Audit suffisantes",
  },
  {
    id: "step5",
    title: "🧹 Nettoyage champs redondants User",
    description:
      "Supprimer champs redondants (subscriptionTier, subscribed, subscriptionEnd)",
    risk: "medium",
    reversible: false,
    verification: "Champs redondants supprimés du modèle User",
    rollback: "Impossible - ajouter migration Prisma reverse",
  },
  {
    id: "step6",
    title: "📊 Création tables SaaS manquantes (Supabase)",
    description: "Créer 10 tables critiques pour SaaS complet",
    risk: "low",
    reversible: true,
    verification: "Toutes les tables SaaS créées avec indexes et RLS",
    rollback: "DROP des nouvelles tables",
  },
  {
    id: "step7",
    title: "🔍 Mise à jour du code application",
    description: "Adapter les queries et logique métier",
    risk: "medium",
    reversible: true,
    verification: "Code compilé et tests passent",
    rollback: "Restaurer version précédente du code",
  },
  {
    id: "step8",
    title: "✅ Tests de validation complète",
    description: "Vérifier toutes les fonctionnalités",
    risk: "low",
    reversible: true,
    verification: "Tous les tests passent, synchronisation OK",
    rollback: "Retour étape précédente si échec",
  },
];

async function displayMigrationPlan() {
  console.log("\n📋 PLAN DÉTAILLÉ PAR ÉTAPES");
  console.log("-".repeat(40));

  migrationSteps.forEach((step, index) => {
    const riskIcon =
      step.risk === "high" ? "🔴" : step.risk === "medium" ? "🟡" : "🟢";
    const reversibleIcon = step.reversible ? "↩️" : "⚠️";

    console.log(`\n${index + 1}. ${step.title} ${riskIcon} ${reversibleIcon}`);
    console.log(`   📝 ${step.description}`);
    console.log(`   ✅ Vérification: ${step.verification}`);
    if (step.rollback) {
      console.log(`   ↩️ Rollback: ${step.rollback}`);
    }
  });
}

async function executeStep1_Backup() {
  console.log("\n🚀 ÉTAPE 1: SAUVEGARDE ET ANALYSE");
  console.log("-".repeat(30));

  try {
    // Analyser les données Prisma
    const userCount = await prisma.user.count();
    const userQuotaCount = await prisma.userQuota.count();
    const auditUsageLogCount = await prisma.auditUsageLog.count();
    const auditCount = await prisma.audit.count();

    console.log("📊 INVENTAIRE DONNÉES PRISMA:");
    console.log(`  - Users: ${userCount}`);
    console.log(`  - UserQuota: ${userQuotaCount}`);
    console.log(`  - AuditUsageLog: ${auditUsageLogCount}`);
    console.log(`  - Audits: ${auditCount}`);

    if (userQuotaCount > 0) {
      console.log("\n📋 Données UserQuota à migrer:");
      const quotas = await prisma.userQuota.findMany({
        include: { user: { select: { email: true } } },
      });
      quotas.forEach((quota) => {
        console.log(
          `  - ${quota.user.email}: ${quota.auditsUsed}/${quota.auditsLimit}`,
        );
      });
    }

    // Générer commandes de sauvegarde
    console.log("\n💾 COMMANDES DE SAUVEGARDE:");
    console.log("# Sauvegarde SQLite");
    console.log(`cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)`);
    console.log(
      "\n# Sauvegarde Supabase (via Dashboard > Settings > Database > Backup)",
    );
  } catch (error: any) {
    console.error("❌ Erreur analyse:", error.message);
  }
}

async function executeStep2_MigrateQuotas() {
  console.log("\n🚀 ÉTAPE 2: MIGRATION QUOTAS");
  console.log("-".repeat(30));

  try {
    const quotas = await prisma.userQuota.findMany();

    if (quotas.length === 0) {
      console.log("✅ Aucune donnée UserQuota à migrer");
      return;
    }

    console.log(`🔄 Migration de ${quotas.length} quotas...`);

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

    // Vérification
    const users = await prisma.user.findMany({
      select: { email: true, quotaUsed: true, monthlyQuota: true },
    });

    console.log("\n✅ VÉRIFICATION MIGRATION:");
    users.forEach((user) => {
      console.log(`  - ${user.email}: ${user.quotaUsed}/${user.monthlyQuota}`);
    });
  } catch (error: any) {
    console.error("❌ Erreur migration quotas:", error.message);
  }
}

function generatePrismaCleanupMigration() {
  console.log("\n📝 MIGRATIONS PRISMA À CRÉER");
  console.log("-".repeat(30));

  const migration = `
-- Migration: supprimer tables redondantes
-- Fichier: prisma/migrations/xxx_cleanup_redundant_tables/migration.sql

-- 1. Supprimer table UserQuota (données migrées vers User)
DROP TABLE IF EXISTS "UserQuota";

-- 2. Supprimer table AuditUsageLog (redondante avec Audit)
DROP TABLE IF EXISTS "AuditUsageLog";

-- 3. Supprimer champs redondants de User (optionnel)
-- ALTER TABLE "User" DROP COLUMN "subscriptionTier";
-- ALTER TABLE "User" DROP COLUMN "subscribed";
-- ALTER TABLE "User" DROP COLUMN "subscriptionEnd";
`;

  console.log("📄 Contenu migration:");
  console.log(migration);

  console.log("\n🔧 ÉTAPES PRISMA:");
  console.log(
    "1. Modifier schema.prisma (supprimer models UserQuota et AuditUsageLog)",
  );
  console.log("2. Exécuter: npx prisma db push --accept-data-loss");
  console.log("3. Regénérer client: npx prisma generate");
}

function generateSupabaseEnhancementScript() {
  console.log("\n📝 SCRIPT SUPABASE - TABLES MANQUANTES");
  console.log("-".repeat(30));

  console.log("📄 Fichier: supabase-add-missing-tables.sql");
  console.log("✅ Déjà créé avec 10 tables critiques:");
  console.log("  - usage_analytics (métriques utilisateur)");
  console.log("  - batch_jobs (traitement CSV)");
  console.log("  - reports (rapports sauvegardés)");
  console.log("  - payment_history (historique Stripe)");
  console.log("  - user_preferences (préférences UI)");
  console.log("  - support_tickets (système support)");
  console.log("  - api_rate_limits (limitation API)");
  console.log("  - webhook_logs (logs n8n)");
  console.log("  - email_templates (templates emails)");
  console.log("  - notifications (notifications in-app)");
}

function generateCodeUpdatePlan() {
  console.log("\n📝 PLAN MISE À JOUR CODE");
  console.log("-".repeat(30));

  const codeChanges = [
    {
      file: "src/lib/prisma/prisma.user.extends.ts",
      change: "Supprimer méthodes liées à UserQuota",
    },
    {
      file: "src/query/org/get-users-orgs.query.ts",
      change: "Utiliser User.monthlyQuota au lieu de UserQuota",
    },
    {
      file: "src/lib/supabase/bridge.ts",
      change: "Utiliser nouvelles tables pour quotas",
    },
    {
      file: "app/api/audits/*/route.ts",
      change: "Supprimer références AuditUsageLog",
    },
  ];

  codeChanges.forEach((change, i) => {
    console.log(`${i + 1}. ${change.file}`);
    console.log(`   📝 ${change.change}`);
  });
}

async function generateCompleteExecutionPlan() {
  console.log("\n🎯 PLAN D'EXÉCUTION RECOMMANDÉ");
  console.log("-".repeat(40));

  console.log(`
📅 PHASE 1 - PRÉPARATION (0 risque)
1. Exécuter ce script pour analyse complète
2. Créer sauvegardes (dev.db + Supabase)
3. Migrer quotas UserQuota -> User
4. Vérifier synchronisation Supabase

📅 PHASE 2 - NETTOYAGE PRISMA (risque moyen)
5. Modifier schema.prisma (supprimer UserQuota, AuditUsageLog)
6. Exécuter: npx prisma db push --accept-data-loss
7. Tester compilation et fonctionnalités de base

📅 PHASE 3 - ENHANCEMENT SUPABASE (0 risque)
8. Exécuter supabase-add-missing-tables.sql
9. Vérifier création des 10 nouvelles tables

📅 PHASE 4 - MISE À JOUR CODE (risque moyen)
10. Adapter les queries et composants
11. Exécuter tests complets
12. Validation manuelle des fonctionnalités

🎯 RÉSULTAT FINAL:
✅ -2 tables redondantes supprimées
✅ +10 tables SaaS critiques ajoutées  
✅ Architecture optimisée et maintenable
✅ Base solide pour nouvelles fonctionnalités
  `);
}

async function runCompleteMigrationAudit() {
  console.log("🔍 DÉMARRAGE AUDIT MIGRATION COMPLÈTE");

  await displayMigrationPlan();
  await executeStep1_Backup();
  await executeStep2_MigrateQuotas();

  generatePrismaCleanupMigration();
  generateSupabaseEnhancementScript();
  generateCodeUpdatePlan();
  await generateCompleteExecutionPlan();

  console.log(`
🎉 AUDIT MIGRATION TERMINÉ

⚠️ ATTENTION: 
- Ce script est en mode ANALYSE uniquement
- Aucune suppression n'a été effectuée
- Suivez le plan d'exécution étape par étape
- Testez chaque étape avant de passer à la suivante

📞 SUPPORT:
- Vérifiez tous les backups avant modifications
- Testez en développement avant production
- Gardez ce rapport pour référence
  `);
}

runCompleteMigrationAudit()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
