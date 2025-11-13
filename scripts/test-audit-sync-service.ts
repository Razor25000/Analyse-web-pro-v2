#!/usr/bin/env tsx

/**
 * Test du Service de Synchronisation Audits
 * Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Tester le système de sync Prisma ↔ Supabase
 *
 * TESTS:
 * 1. Sync audit Prisma → Supabase
 * 2. Statistiques de synchronisation
 * 3. Nettoyage des orphelins
 */

import { prisma } from "@/lib/prisma";
import { AuditSyncService } from "@/lib/supabase/audit-sync";
import { nanoid } from "nanoid";

console.log("🧪 Test AuditSyncService v2.0");
console.log("=============================");

async function createTestAuditInPrisma() {
  console.log("\n1. 🏗️ Création d'un audit test dans Prisma...");

  try {
    const testAudit = await prisma.audit.create({
      data: {
        id: `test-audit-${nanoid()}`,
        email: "test@example.com",
        url: "https://test-site.com",
        auditType: "manual",
        status: "pending",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Audit créé dans Prisma:", {
      id: testAudit.id,
      email: testAudit.email,
      url: testAudit.url,
      status: testAudit.status,
    });

    return testAudit;
  } catch (error) {
    console.error("❌ Erreur création audit Prisma:", (error as Error).message);
    return null;
  }
}

async function testAuditSync(auditId: string) {
  console.log("\n2. 🔄 Test synchronisation Prisma → Supabase...");

  try {
    const result = await AuditSyncService.syncAuditToSupabase({
      auditId,
      userId: `user-${nanoid()}`,
      email: "test@example.com",
      url: "https://test-site.com",
      auditType: "manual",
      orgId: `org-${nanoid()}`,
    });

    console.log("📊 Résultat synchronisation:", result);

    if (result.success) {
      console.log("✅ Synchronisation réussie!");
      console.log("🆔 ID Supabase:", result.supabaseId);
      console.log("🔄 Opération:", result.operation);
    } else {
      console.log("❌ Échec synchronisation:", result.error);
    }

    return result;
  } catch (error) {
    console.error("❌ Erreur test sync:", (error as Error).message);
    return null;
  }
}

async function testSyncStats() {
  console.log("\n3. 📊 Test statistiques de synchronisation...");

  try {
    const stats = await AuditSyncService.getSyncStats();

    console.log("📈 Statistiques actuelles:");
    console.log(`   🗃️ Audits Prisma: ${stats.prismaCount}`);
    console.log(`   📋 Audits Supabase: ${stats.supabaseCount}`);
    console.log(`   🔗 Audits synchronisés: ${stats.syncedCount}`);
    console.log(`   👻 Audits orphelins: ${stats.orphanedCount}`);

    return stats;
  } catch (error) {
    console.error("❌ Erreur stats sync:", (error as Error).message);
    return null;
  }
}

async function testOrphanCleanup() {
  console.log("\n4. 🧹 Test nettoyage des orphelins...");

  try {
    const cleanup = await AuditSyncService.cleanupOrphanedAudits();

    console.log("🗑️ Résultat nettoyage:");
    console.log(`   ✅ Supprimés: ${cleanup.deleted}`);
    console.log(`   ❌ Erreurs: ${cleanup.errors}`);

    return cleanup;
  } catch (error) {
    console.error("❌ Erreur nettoyage orphelins:", (error as Error).message);
    return null;
  }
}

async function testResultsBackSync(auditId: string) {
  console.log("\n5. 🔙 Test sync résultats Supabase → Prisma...");

  try {
    // Simuler des résultats d'audit
    console.log("📊 Simulation de résultats d'audit n8n...");

    const success = await AuditSyncService.syncResultsBackToPrisma(auditId);

    if (success) {
      console.log("✅ Sync résultats réussi!");
    } else {
      console.log("❌ Sync résultats échoué");
    }

    return success;
  } catch (error) {
    console.error("❌ Erreur sync résultats:", (error as Error).message);
    return false;
  }
}

async function cleanupTestData(auditId: string) {
  console.log("\n6. 🧽 Nettoyage des données de test...");

  try {
    // Supprimer l'audit de Prisma
    await prisma.audit.delete({
      where: { id: auditId },
    });

    console.log("✅ Audit test supprimé de Prisma");

    // Note: L'audit Supabase sera automatiquement détecté comme orphelin
    // lors du prochain nettoyage
  } catch (error) {
    console.error("❌ Erreur nettoyage:", (error as Error).message);
  }
}

async function main() {
  console.log("🎯 Test complet du système de synchronisation");
  console.log("Architecture Dual Database v2.0\n");

  // Étape 1: Créer un audit test dans Prisma
  const testAudit = await createTestAuditInPrisma();
  if (!testAudit) {
    console.error("💥 Impossible de créer l'audit test");
    return;
  }

  // Étape 2: Tester la synchronisation
  const syncResult = await testAuditSync(testAudit.id);

  // Étape 3: Vérifier les statistiques
  const statsResult = await testSyncStats();

  // Étape 4: Tester le nettoyage des orphelins
  const cleanupResult = await testOrphanCleanup();

  // Étape 5: Tester la sync des résultats (optionnel)
  await testResultsBackSync(testAudit.id);

  // Étape 6: Nettoyer les données de test
  await cleanupTestData(testAudit.id);

  // Résumé final
  console.log(`\n${  "=".repeat(50)}`);
  console.log("📊 RÉSUMÉ DU TEST");
  console.log("=".repeat(50));

  console.log("✅ Résultats:");
  console.log(`   🔄 Synchronisation: ${syncResult?.success ? "✅" : "❌"}`);
  console.log(`   📊 Statistiques: ${statsResult ? "✅" : "❌"}`);
  console.log(`   🧹 Nettoyage: ${cleanupResult ? "✅" : "❌"}`);

  if (syncResult?.success) {
    console.log(
      "\n🎯 Architecture Dual v2.0 - Service de synchronisation opérationnel!",
    );
    console.log("📋 Prêt pour les workflows n8n");
  } else {
    console.log("\n⚠️ Des améliorations sont nécessaires");
  }
}

main().catch((error) => {
  console.error("💥 Erreur fatale test:", error);
  process.exit(1);
});
