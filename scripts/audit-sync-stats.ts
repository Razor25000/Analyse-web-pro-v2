#!/usr/bin/env tsx

/**
 * Statistiques de Synchronisation - Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Afficher des statistiques détaillées sur la sync Prisma ↔ Supabase
 *
 * DONNÉES:
 * 1. Volumes de données
 * 2. Taux de synchronisation
 * 3. Performance historique
 * 4. Orphelins et incohérences
 * 5. Tendances temporelles
 */

import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { AuditSyncService } from "@/lib/supabase/audit-sync";

console.log("📊 Statistiques de Synchronisation - Dual Database v2.0");
console.log("========================================================");

type DetailedStats = {
  volumes: {
    prismaTotal: number;
    supabaseTotal: number;
    syncedCount: number;
    orphanedCount: number;
  };
  rates: {
    syncRate: number;
    orphanRate: number;
  };
  temporal: {
    last24h: {
      prisma: number;
      supabase: number;
    };
    last7days: {
      prisma: number;
      supabase: number;
    };
    last30days: {
      prisma: number;
      supabase: number;
    };
  };
  status: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  performance: {
    avgLatency?: number;
    syncHealth: "excellent" | "good" | "warning" | "critical";
  };
}

async function getBasicStats() {
  console.log("\n1. 📊 Statistiques de base...");

  const stats = await AuditSyncService.getSyncStats();

  console.log(`   🗃️ Audits Prisma:     ${stats.prismaCount}`);
  console.log(`   📋 Audits Supabase:   ${stats.supabaseCount}`);
  console.log(`   🔗 Synchronisés:      ${stats.syncedCount}`);
  console.log(`   👻 Orphelins:         ${stats.orphanedCount}`);

  const syncRate =
    stats.prismaCount > 0 ? (stats.syncedCount / stats.prismaCount) * 100 : 100;

  const orphanRate =
    stats.supabaseCount > 0
      ? (stats.orphanedCount / stats.supabaseCount) * 100
      : 0;

  console.log(`   📈 Taux de sync:      ${syncRate.toFixed(1)}%`);
  console.log(`   🚫 Taux d'orphelins:  ${orphanRate.toFixed(1)}%`);

  return { ...stats, syncRate, orphanRate };
}

async function getTemporalStats() {
  console.log("\n2. 📅 Statistiques temporelles...");

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Stats Prisma
    const [prisma24h, prisma7d, prisma30d] = await Promise.all([
      prisma.audit.count({ where: { createdAt: { gte: last24h } } }),
      prisma.audit.count({ where: { createdAt: { gte: last7days } } }),
      prisma.audit.count({ where: { createdAt: { gte: last30days } } }),
    ]);

    console.log(`   📊 Prisma - Nouveaux audits:`);
    console.log(`      Dernières 24h:  ${prisma24h}`);
    console.log(`      Derniers 7j:    ${prisma7d}`);
    console.log(`      Derniers 30j:   ${prisma30d}`);

    // Stats Supabase (si disponible)
    let supabase24h = 0,
      supabase7d = 0,
      supabase30d = 0;

    if (supabaseAdmin) {
      try {
        const [s24, s7, s30] = await Promise.all([
          supabaseAdmin
            .from("audits")
            .select("id", { count: "exact" })
            .gte("created_at", last24h.toISOString()),
          supabaseAdmin
            .from("audits")
            .select("id", { count: "exact" })
            .gte("created_at", last7days.toISOString()),
          supabaseAdmin
            .from("audits")
            .select("id", { count: "exact" })
            .gte("created_at", last30days.toISOString()),
        ]);

        supabase24h = s24.count || 0;
        supabase7d = s7.count || 0;
        supabase30d = s30.count || 0;

        console.log(`   📋 Supabase - Nouveaux audits:`);
        console.log(`      Dernières 24h:  ${supabase24h}`);
        console.log(`      Derniers 7j:    ${supabase7d}`);
        console.log(`      Derniers 30j:   ${supabase30d}`);
      } catch (error) {
        console.log(`   ❌ Erreur stats Supabase: ${(error as Error).message}`);
      }
    }

    return {
      last24h: { prisma: prisma24h, supabase: supabase24h },
      last7days: { prisma: prisma7d, supabase: supabase7d },
      last30days: { prisma: prisma30d, supabase: supabase30d },
    };
  } catch (error) {
    console.log(`   ❌ Erreur stats temporelles: ${(error as Error).message}`);
    return {
      last24h: { prisma: 0, supabase: 0 },
      last7days: { prisma: 0, supabase: 0 },
      last30days: { prisma: 0, supabase: 0 },
    };
  }
}

async function getStatusStats() {
  console.log("\n3. 🎯 Répartition par statut...");

  try {
    // Stats Prisma par statut
    const prismaStatuses = await prisma.audit.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    console.log(`   🗃️ Prisma - Répartition:`);
    const prismaStats: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    prismaStatuses.forEach((stat) => {
      const status = stat.status || "unknown";
      const count = stat._count.status;
      prismaStats[status] = count;
      console.log(`      ${status}: ${count}`);
    });

    // Stats Supabase par statut (si disponible)
    const supabaseStats = { pending: 0, processing: 0, completed: 0, failed: 0 };

    if (supabaseAdmin) {
      try {
        const { data: supabaseAudits } = await supabaseAdmin
          .from("audits")
          .select("status");

        if (supabaseAudits) {
          supabaseAudits.forEach((audit) => {
            const status = audit.status || "pending";
            if (status in supabaseStats) {
              supabaseStats[status as keyof typeof supabaseStats]++;
            }
          });

          console.log(`   📋 Supabase - Répartition:`);
          Object.entries(supabaseStats).forEach(([status, count]) => {
            console.log(`      ${status}: ${count}`);
          });
        }
      } catch (error) {
        console.log(
          `   ❌ Erreur stats statuts Supabase: ${(error as Error).message}`,
        );
      }
    }

    return { prisma: prismaStats, supabase: supabaseStats };
  } catch (error) {
    console.log(`   ❌ Erreur stats statuts: ${(error as Error).message}`);
    return {
      prisma: { pending: 0, processing: 0, completed: 0, failed: 0 },
      supabase: { pending: 0, processing: 0, completed: 0, failed: 0 },
    };
  }
}

async function getPerformanceStats() {
  console.log("\n4. ⚡ Performance de synchronisation...");

  try {
    // Test de latence simple
    const start = Date.now();
    await AuditSyncService.getSyncStats();
    const latency = Date.now() - start;

    console.log(`   📊 Latence getSyncStats: ${latency}ms`);

    // Évaluer la santé
    let syncHealth: "excellent" | "good" | "warning" | "critical";

    if (latency < 500) {
      syncHealth = "excellent";
      console.log(`   ✅ Performance: Excellente (<500ms)`);
    } else if (latency < 1000) {
      syncHealth = "good";
      console.log(`   👍 Performance: Bonne (<1s)`);
    } else if (latency < 3000) {
      syncHealth = "warning";
      console.log(`   ⚠️ Performance: Dégradée (<3s)`);
    } else {
      syncHealth = "critical";
      console.log(`   🚨 Performance: Critique (>3s)`);
    }

    return {
      avgLatency: latency,
      syncHealth,
    };
  } catch (error) {
    console.log(`   ❌ Erreur test performance: ${(error as Error).message}`);
    return {
      syncHealth: "critical" as const,
    };
  }
}

function generateInsights(stats: DetailedStats) {
  console.log("\n5. 💡 Insights et recommandations...");

  const insights: string[] = [];

  // Analyse du taux de synchronisation
  if (stats.rates.syncRate >= 98) {
    insights.push("✅ Excellent taux de synchronisation");
  } else if (stats.rates.syncRate >= 90) {
    insights.push("👍 Bon taux de synchronisation");
  } else if (stats.rates.syncRate >= 80) {
    insights.push(
      "⚠️ Taux de synchronisation dégradé - surveillance recommandée",
    );
  } else {
    insights.push("🚨 Taux de synchronisation critique - intervention requise");
  }

  // Analyse des orphelins
  if (stats.rates.orphanRate <= 2) {
    insights.push("✅ Niveau d'orphelins acceptable");
  } else if (stats.rates.orphanRate <= 10) {
    insights.push("⚠️ Niveau d'orphelins élevé - nettoyage recommandé");
  } else {
    insights.push("🚨 Niveau d'orphelins critique - nettoyage urgent");
  }

  // Analyse des tendances
  const growth24h = stats.temporal.last24h.prisma;
  const growth7d = stats.temporal.last7days.prisma;

  if (growth24h > 0) {
    const dailyAvg = growth7d / 7;
    if (growth24h > dailyAvg * 1.5) {
      insights.push("📈 Activité en forte hausse aujourd'hui");
    } else if (growth24h < dailyAvg * 0.5) {
      insights.push("📉 Activité plus faible aujourd'hui");
    } else {
      insights.push("📊 Activité stable");
    }
  }

  // Analyse de performance
  switch (stats.performance.syncHealth) {
    case "excellent":
      insights.push("⚡ Performance excellente du système");
      break;
    case "good":
      insights.push("👍 Performance satisfaisante");
      break;
    case "warning":
      insights.push("⚠️ Performance dégradée - optimisation recommandée");
      break;
    case "critical":
      insights.push("🚨 Performance critique - intervention urgente");
      break;
  }

  insights.forEach((insight, index) => {
    console.log(`   ${index + 1}. ${insight}`);
  });

  return insights;
}

function displaySummary(stats: DetailedStats) {
  console.log(`\n${  "=".repeat(60)}`);
  console.log("📊 RÉSUMÉ EXÉCUTIF");
  console.log("=".repeat(60));

  console.log(
    `\n🎯 SANTÉ GLOBALE: ${
      stats.rates.syncRate >= 95 && stats.performance.syncHealth !== "critical"
        ? "✅ EXCELLENTE"
        : stats.rates.syncRate >= 85 &&
            stats.performance.syncHealth !== "critical"
          ? "👍 BONNE"
          : stats.rates.syncRate >= 70
            ? "⚠️ DÉGRADÉE"
            : "🚨 CRITIQUE"
    }`,
  );

  console.log(`\n📊 MÉTRIQUES CLÉS:`);
  console.log(`   🔄 Taux de sync:     ${stats.rates.syncRate.toFixed(1)}%`);
  console.log(`   👻 Taux orphelins:   ${stats.rates.orphanRate.toFixed(1)}%`);
  console.log(
    `   ⚡ Performance:      ${stats.performance.syncHealth.toUpperCase()}`,
  );
  if (stats.performance.avgLatency) {
    console.log(`   🕐 Latence moyenne:  ${stats.performance.avgLatency}ms`);
  }

  console.log(`\n📈 ACTIVITÉ RÉCENTE:`);
  console.log(
    `   Dernières 24h:      ${stats.temporal.last24h.prisma} nouveaux audits`,
  );
  console.log(
    `   Derniers 7 jours:   ${stats.temporal.last7days.prisma} nouveaux audits`,
  );
  console.log(
    `   Derniers 30 jours:  ${stats.temporal.last30days.prisma} nouveaux audits`,
  );

  console.log(`\n🎯 Architecture Dual Database v2.0 - Monitoring actif`);
}

async function main() {
  console.log("🎯 Génération des statistiques complètes\n");

  try {
    // Collecter toutes les statistiques
    const [basicStats, temporalStats, statusStats, performanceStats] =
      await Promise.all([
        getBasicStats(),
        getTemporalStats(),
        getStatusStats(),
        getPerformanceStats(),
      ]);

    // Assembler le rapport complet
    const detailedStats: DetailedStats = {
      volumes: {
        prismaTotal: basicStats.prismaCount,
        supabaseTotal: basicStats.supabaseCount,
        syncedCount: basicStats.syncedCount,
        orphanedCount: basicStats.orphanedCount,
      },
      rates: {
        syncRate: basicStats.syncRate,
        orphanRate: basicStats.orphanRate,
      },
      temporal: temporalStats,
      status: statusStats.prisma, // Utiliser Prisma comme référence
      performance: performanceStats,
    };

    // Générer les insights
    generateInsights(detailedStats);

    // Afficher le résumé
    displaySummary(detailedStats);

    return detailedStats;
  } catch (error) {
    console.error("💥 Erreur génération stats:", error);
    process.exit(1);
  }
}

// Export pour utilisation dans d'autres scripts
export { main as getDetailedStats };

// Exécuter si appelé directement
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}
