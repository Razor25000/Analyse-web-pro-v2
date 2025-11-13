#!/usr/bin/env tsx

/**
 * Resynchronisation Complète - Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Resynchroniser tous les audits Prisma vers Supabase
 *
 * ⚠️ UTILISATION:
 * - En cas de désynchronisation majeure
 * - Après migration ou maintenance
 * - Pour récupération d'urgence
 *
 * PROCESSUS:
 * 1. Audit complet des données
 * 2. Nettoyage Supabase
 * 3. Re-sync complète Prisma → Supabase
 * 4. Vérification intégrité
 */

import { prisma } from "@/lib/prisma";
import { AuditSyncService } from "@/lib/supabase/audit-sync";

console.log("🔄 Resynchronisation Complète - Dual Database v2.0");
console.log("===================================================");

type ResyncStats = {
  totalAudits: number;
  processed: number;
  synced: number;
  skipped: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

async function confirmResync(): Promise<boolean> {
  console.log("⚠️ ATTENTION: Cette opération va:");
  console.log("   1. Analyser tous les audits Prisma");
  console.log("   2. Nettoyer les données Supabase obsolètes");
  console.log("   3. Re-synchroniser TOUS les audits");
  console.log("   4. Cette opération peut prendre du temps\n");

  // En mode script, on assume que l'utilisateur veut continuer
  // Dans un vrai environnement, on pourrait ajouter une confirmation interactive
  console.log("✅ Confirmation automatique - Démarrage de la resync...\n");
  return true;
}

async function analyzeCurrentState() {
  console.log("🔍 1. Analyse de l'état actuel...");

  try {
    // Stats Prisma
    const totalAudits = await prisma.audit.count();
    const recentAudits = await prisma.audit.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 jours
        },
      },
    });

    console.log(`   📊 Total audits Prisma: ${totalAudits}`);
    console.log(`   📅 Audits récents (7j): ${recentAudits}`);

    // Stats Supabase
    const supabaseStats = await AuditSyncService.getSyncStats();
    console.log(`   📋 Audits Supabase: ${supabaseStats.supabaseCount}`);
    console.log(`   🔗 Synchronisés: ${supabaseStats.syncedCount}`);
    console.log(`   👻 Orphelins: ${supabaseStats.orphanedCount}`);

    const syncRate =
      totalAudits > 0 ? (supabaseStats.syncedCount / totalAudits) * 100 : 100;
    console.log(`   📈 Taux de sync actuel: ${syncRate.toFixed(1)}%`);

    return {
      totalAudits,
      recentAudits,
      supabaseCount: supabaseStats.supabaseCount,
      syncedCount: supabaseStats.syncedCount,
      orphanedCount: supabaseStats.orphanedCount,
      syncRate,
    };
  } catch (error) {
    console.error("❌ Erreur analyse état:", (error as Error).message);
    throw error;
  }
}

async function cleanupSupabase() {
  console.log("\n🧹 2. Nettoyage préalable Supabase...");

  try {
    console.log("   🗑️ Suppression des audits orphelins...");
    const cleanup = await AuditSyncService.cleanupOrphanedAudits();

    console.log(`   ✅ Orphelins supprimés: ${cleanup.deleted}`);
    if (cleanup.errors > 0) {
      console.log(`   ⚠️ Erreurs nettoyage: ${cleanup.errors}`);
    }

    return cleanup;
  } catch (error) {
    console.error("❌ Erreur nettoyage:", (error as Error).message);
    // Continuer même en cas d'erreur de nettoyage
    return { deleted: 0, errors: 1 };
  }
}

async function resyncAllAudits(): Promise<ResyncStats> {
  console.log("\n🔄 3. Resynchronisation complète...");

  const stats: ResyncStats = {
    totalAudits: 0,
    processed: 0,
    synced: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date(),
  };

  try {
    // Récupérer tous les audits Prisma
    const allAudits = await prisma.audit.findMany({
      select: {
        id: true,
        email: true,
        url: true,
        auditType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    stats.totalAudits = allAudits.length;
    console.log(`   📊 ${stats.totalAudits} audits à synchroniser`);

    if (stats.totalAudits === 0) {
      console.log("   ⚠️ Aucun audit à synchroniser");
      return stats;
    }

    // Traitement par batch pour éviter la surcharge
    const batchSize = 50;
    const totalBatches = Math.ceil(stats.totalAudits / batchSize);

    console.log(
      `   📦 Traitement par batch de ${batchSize} (${totalBatches} batches)`,
    );

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, stats.totalAudits);
      const batch = allAudits.slice(startIndex, endIndex);

      console.log(
        `\n   📦 Batch ${batchIndex + 1}/${totalBatches} (${batch.length} audits)`,
      );

      // Traiter chaque audit du batch
      for (const audit of batch) {
        stats.processed++;

        try {
          // Générer un userId simple pour la sync
          const userId = `user-${audit.email.split("@")[0]}`;

          const result = await AuditSyncService.syncAuditToSupabase({
            auditId: audit.id,
            userId,
            email: audit.email,
            url: audit.url,
            auditType: audit.auditType as "manual" | "bulk" | "discovery",
          });

          if (result.success) {
            stats.synced++;
            if (stats.processed % 10 === 0) {
              console.log(
                `     ✅ ${stats.processed}/${stats.totalAudits} - ${result.operation}`,
              );
            }
          } else {
            stats.skipped++;
            console.log(`     ⚠️ Skipped ${audit.id}: ${result.error}`);
          }
        } catch (error) {
          stats.errors++;
          console.log(
            `     ❌ Erreur ${audit.id}: ${(error as Error).message}`,
          );
        }

        // Pause courte pour éviter la surcharge
        if (stats.processed % 20 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Affichage du progrès après chaque batch
      console.log(
        `   📊 Batch ${batchIndex + 1} terminé - Progrès: ${stats.processed}/${stats.totalAudits}`,
      );
      console.log(`      ✅ Synchronisés: ${stats.synced}`);
      console.log(`      ⚠️ Ignorés: ${stats.skipped}`);
      console.log(`      ❌ Erreurs: ${stats.errors}`);

      // Pause entre les batches
      if (batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    stats.endTime = new Date();
    stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

    return stats;
  } catch (error) {
    console.error("❌ Erreur resync:", (error as Error).message);
    stats.endTime = new Date();
    stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
    throw error;
  }
}

async function verifyIntegrity() {
  console.log("\n🔍 4. Vérification de l'intégrité post-resync...");

  try {
    const finalStats = await AuditSyncService.getSyncStats();

    console.log("   📊 Statistiques finales:");
    console.log(`      Prisma: ${finalStats.prismaCount} audits`);
    console.log(`      Supabase: ${finalStats.supabaseCount} audits`);
    console.log(`      Synchronisés: ${finalStats.syncedCount} audits`);
    console.log(`      Orphelins: ${finalStats.orphanedCount} audits`);

    const finalSyncRate =
      finalStats.prismaCount > 0
        ? (finalStats.syncedCount / finalStats.prismaCount) * 100
        : 100;

    console.log(`   📈 Taux de sync final: ${finalSyncRate.toFixed(1)}%`);

    // Évaluer le succès
    const isSuccess = finalSyncRate >= 95 && finalStats.orphanedCount <= 10;

    if (isSuccess) {
      console.log("   ✅ Vérification réussie - Système intègre");
    } else {
      console.log("   ⚠️ Vérification avec alertes - Surveillance recommandée");
    }

    return {
      ...finalStats,
      finalSyncRate,
      isSuccess,
    };
  } catch (error) {
    console.error("❌ Erreur vérification:", (error as Error).message);
    return {
      prismaCount: 0,
      supabaseCount: 0,
      syncedCount: 0,
      orphanedCount: 0,
      finalSyncRate: 0,
      isSuccess: false,
    };
  }
}

function displayFinalReport(
  initialState: any,
  resyncStats: ResyncStats,
  finalVerification: any,
) {
  console.log(`\n${  "=".repeat(60)}`);
  console.log("📊 RAPPORT FINAL DE RESYNCHRONISATION");
  console.log("=".repeat(60));

  console.log(`\n🕐 DURÉE:`);
  console.log(`   Début: ${resyncStats.startTime.toLocaleString()}`);
  if (resyncStats.endTime) {
    console.log(`   Fin: ${resyncStats.endTime.toLocaleString()}`);
    const durationMin = Math.round((resyncStats.duration || 0) / 60000);
    console.log(`   Durée totale: ${durationMin} minutes`);
  }

  console.log(`\n📊 TRAITEMENT:`);
  console.log(`   Total audits: ${resyncStats.totalAudits}`);
  console.log(`   Traités: ${resyncStats.processed}`);
  console.log(`   Synchronisés: ${resyncStats.synced}`);
  console.log(`   Ignorés: ${resyncStats.skipped}`);
  console.log(`   Erreurs: ${resyncStats.errors}`);

  console.log(`\n📈 RÉSULTATS:`);
  console.log(`   Taux de sync initial: ${initialState.syncRate.toFixed(1)}%`);
  console.log(
    `   Taux de sync final: ${finalVerification.finalSyncRate.toFixed(1)}%`,
  );
  console.log(
    `   Amélioration: ${(finalVerification.finalSyncRate - initialState.syncRate).toFixed(1)}%`,
  );

  console.log(`\n🎯 STATUT FINAL:`);
  if (finalVerification.isSuccess) {
    console.log(`   ✅ SUCCÈS - Resynchronisation réussie`);
    console.log(`   📋 Architecture Dual Database v2.0 opérationnelle`);
  } else {
    console.log(`   ⚠️ PARTIEL - Resynchronisation avec alertes`);
    console.log(`   🔧 Surveillance et ajustements recommandés`);
  }
}

async function main() {
  console.log("🎯 Démarrage de la resynchronisation complète");
  console.log("Architecture Dual Database v2.0\n");

  try {
    // Étape 1: Confirmation
    const confirmed = await confirmResync();
    if (!confirmed) {
      console.log("❌ Opération annulée");
      return;
    }

    // Étape 2: Analyse initiale
    const initialState = await analyzeCurrentState();

    // Étape 3: Nettoyage
    const cleanupResult = await cleanupSupabase();

    // Étape 4: Resync complète
    const resyncStats = await resyncAllAudits();

    // Étape 5: Vérification
    const finalVerification = await verifyIntegrity();

    // Étape 6: Rapport final
    displayFinalReport(initialState, resyncStats, finalVerification);

    // Code de sortie basé sur le succès
    const exitCode = finalVerification.isSuccess ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error("💥 Erreur fatale resync:", error);
    process.exit(1);
  }
}

// Export pour utilisation dans d'autres scripts
export { main as fullResyncAudits };

// Exécuter si appelé directement
if (require.main === module) {
  main();
}
