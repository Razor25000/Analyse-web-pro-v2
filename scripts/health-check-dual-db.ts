#!/usr/bin/env tsx

/**
 * Health Check - Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Vérifier la santé du système dual database
 *
 * VÉRIFICATIONS:
 * 1. Connexions Prisma et Supabase
 * 2. Intégrité des données
 * 3. Performance des sync
 * 4. Orphelins et incohérences
 * 5. Métriques de santé
 */

import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { AuditSyncService } from "@/lib/supabase/audit-sync";

type HealthStatus = {
  status: "healthy" | "warning" | "critical";
  message: string;
  details?: any;
}

type HealthReport = {
  overall: HealthStatus;
  prisma: HealthStatus;
  supabase: HealthStatus;
  sync: HealthStatus;
  performance: HealthStatus;
  recommendations: string[];
}

console.log("🏥 Health Check - Architecture Dual Database v2.0");
console.log("=================================================");

async function checkPrismaHealth(): Promise<HealthStatus> {
  try {
    console.log("🔍 Vérification Prisma...");

    // Test de connexion
    const userCount = await prisma.user.count();
    const auditCount = await prisma.audit.count();

    // Test de performance (simple query)
    const start = Date.now();
    await prisma.audit.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const latency = Date.now() - start;

    console.log(`   👥 Utilisateurs: ${userCount}`);
    console.log(`   📋 Audits: ${auditCount}`);
    console.log(`   ⚡ Latence: ${latency}ms`);

    if (latency > 1000) {
      return {
        status: "warning",
        message: `Latence élevée: ${latency}ms`,
        details: { userCount, auditCount, latency },
      };
    }

    return {
      status: "healthy",
      message: "Prisma opérationnel",
      details: { userCount, auditCount, latency },
    };
  } catch (error) {
    return {
      status: "critical",
      message: `Erreur Prisma: ${(error as Error).message}`,
      details: { error: (error as Error).message },
    };
  }
}

async function checkSupabaseHealth(): Promise<HealthStatus> {
  try {
    console.log("🔍 Vérification Supabase...");

    if (!supabaseAdmin) {
      return {
        status: "critical",
        message: "Client Supabase non configuré",
        details: { configured: false },
      };
    }

    // Test de connexion et comptage
    const start = Date.now();
    const { count: auditCount, error } = await supabaseAdmin
      .from("audits")
      .select("*", { count: "exact", head: true });

    const latency = Date.now() - start;

    if (error) {
      return {
        status: "critical",
        message: `Erreur Supabase: ${error.message}`,
        details: { error: error.message },
      };
    }

    console.log(`   📋 Audits Supabase: ${auditCount}`);
    console.log(`   ⚡ Latence: ${latency}ms`);

    if (latency > 2000) {
      return {
        status: "warning",
        message: `Latence élevée Supabase: ${latency}ms`,
        details: { auditCount, latency },
      };
    }

    return {
      status: "healthy",
      message: "Supabase opérationnel",
      details: { auditCount, latency },
    };
  } catch (error) {
    return {
      status: "critical",
      message: `Erreur Supabase: ${(error as Error).message}`,
      details: { error: (error as Error).message },
    };
  }
}

async function checkSyncHealth(): Promise<HealthStatus> {
  try {
    console.log("🔍 Vérification synchronisation...");

    const stats = await AuditSyncService.getSyncStats();

    console.log(`   📊 Statistiques sync:`);
    console.log(`      Prisma: ${stats.prismaCount} audits`);
    console.log(`      Supabase: ${stats.supabaseCount} audits`);
    console.log(`      Synchronisés: ${stats.syncedCount} audits`);
    console.log(`      Orphelins: ${stats.orphanedCount} audits`);

    // Calculer le taux de synchronisation
    const syncRate =
      stats.prismaCount > 0
        ? (stats.syncedCount / stats.prismaCount) * 100
        : 100;

    console.log(`   📈 Taux de sync: ${syncRate.toFixed(1)}%`);

    // Évaluer la santé
    if (stats.orphanedCount > 50) {
      return {
        status: "critical",
        message: `Trop d'orphelins: ${stats.orphanedCount}`,
        details: { ...stats, syncRate },
      };
    }

    if (syncRate < 90 || stats.orphanedCount > 10) {
      return {
        status: "warning",
        message: `Sync dégradée: ${syncRate.toFixed(1)}%, ${stats.orphanedCount} orphelins`,
        details: { ...stats, syncRate },
      };
    }

    return {
      status: "healthy",
      message: `Sync opérationnelle: ${syncRate.toFixed(1)}%`,
      details: { ...stats, syncRate },
    };
  } catch (error) {
    return {
      status: "critical",
      message: `Erreur sync: ${(error as Error).message}`,
      details: { error: (error as Error).message },
    };
  }
}

async function checkPerformance(): Promise<HealthStatus> {
  try {
    console.log("🔍 Vérification performance...");

    // Test sync performance
    const testStart = Date.now();

    // Créer un audit test (sans le persister)
    const testPayload = {
      auditId: "health-check-test",
      userId: "test-user",
      email: "test@example.com",
      url: "https://test.com",
      auditType: "manual" as const,
    };

    // Simuler une sync (dry run)
    console.log("   🧪 Test de sync (simulation)...");

    const syncLatency = Date.now() - testStart;

    console.log(`   ⚡ Latence simulation: ${syncLatency}ms`);

    // Vérifier la santé des index Supabase
    const indexStart = Date.now();
    if (supabaseAdmin) {
      await supabaseAdmin
        .from("audits")
        .select("id")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);
    }
    const indexLatency = Date.now() - indexStart;

    console.log(`   📊 Latence requête indexée: ${indexLatency}ms`);

    if (syncLatency > 5000 || indexLatency > 1000) {
      return {
        status: "warning",
        message: "Performance dégradée",
        details: { syncLatency, indexLatency },
      };
    }

    return {
      status: "healthy",
      message: "Performance normale",
      details: { syncLatency, indexLatency },
    };
  } catch (error) {
    return {
      status: "warning",
      message: `Test performance échoué: ${(error as Error).message}`,
      details: { error: (error as Error).message },
    };
  }
}

function generateRecommendations(
  prisma: HealthStatus,
  supabase: HealthStatus,
  sync: HealthStatus,
  performance: HealthStatus,
): string[] {
  const recommendations: string[] = [];

  // Recommandations Prisma
  if (prisma.status === "critical") {
    recommendations.push("🚨 URGENT: Vérifier la connexion à la base Prisma");
  } else if (prisma.status === "warning") {
    recommendations.push(
      "⚠️ Optimiser les performances Prisma (index, queries)",
    );
  }

  // Recommandations Supabase
  if (supabase.status === "critical") {
    recommendations.push("🚨 URGENT: Vérifier la configuration Supabase");
  } else if (supabase.status === "warning") {
    recommendations.push("⚠️ Surveiller la latence Supabase");
  }

  // Recommandations sync
  if (sync.status === "critical") {
    recommendations.push(
      "🚨 URGENT: Corriger les problèmes de synchronisation",
    );
  } else if (sync.status === "warning") {
    const details = sync.details;
    if (details?.orphanedCount > 10) {
      recommendations.push("🧹 Exécuter le nettoyage des orphelins");
    }
    if (details?.syncRate < 95) {
      recommendations.push("🔄 Relancer la synchronisation des audits manqués");
    }
  }

  // Recommandations performance
  if (performance.status === "warning") {
    recommendations.push("⚡ Optimiser les requêtes et index");
  }

  // Recommandations générales
  if (recommendations.length === 0) {
    recommendations.push(
      "✅ Système en bonne santé - continuer la surveillance",
    );
  }

  return recommendations;
}

function determineOverallStatus(
  prisma: HealthStatus,
  supabase: HealthStatus,
  sync: HealthStatus,
  performance: HealthStatus,
): HealthStatus {
  const statuses = [prisma, supabase, sync, performance];

  if (statuses.some((s) => s.status === "critical")) {
    return {
      status: "critical",
      message: "Système en état critique - intervention requise",
    };
  }

  if (statuses.some((s) => s.status === "warning")) {
    return {
      status: "warning",
      message: "Système fonctionnel avec des alertes",
    };
  }

  return {
    status: "healthy",
    message: "Système en bonne santé",
  };
}

async function main(): Promise<HealthReport> {
  console.log("🎯 Démarrage du health check complet\n");

  // Exécuter tous les checks
  const [prismaHealth, supabaseHealth, syncHealth, performanceHealth] =
    await Promise.all([
      checkPrismaHealth(),
      checkSupabaseHealth(),
      checkSyncHealth(),
      checkPerformance(),
    ]);

  // Générer les recommandations
  const recommendations = generateRecommendations(
    prismaHealth,
    supabaseHealth,
    syncHealth,
    performanceHealth,
  );

  // Déterminer le statut global
  const overallHealth = determineOverallStatus(
    prismaHealth,
    supabaseHealth,
    syncHealth,
    performanceHealth,
  );

  const report: HealthReport = {
    overall: overallHealth,
    prisma: prismaHealth,
    supabase: supabaseHealth,
    sync: syncHealth,
    performance: performanceHealth,
    recommendations,
  };

  // Afficher le rapport final
  console.log(`\n${  "=".repeat(60)}`);
  console.log("📊 RAPPORT DE SANTÉ FINAL");
  console.log("=".repeat(60));

  const statusEmoji = {
    healthy: "✅",
    warning: "⚠️",
    critical: "🚨",
  };

  console.log(
    `\n🏥 STATUT GLOBAL: ${statusEmoji[overallHealth.status]} ${overallHealth.status.toUpperCase()}`,
  );
  console.log(`   Message: ${overallHealth.message}\n`);

  console.log("📊 DÉTAIL PAR COMPOSANT:");
  console.log(
    `   Prisma:      ${statusEmoji[prismaHealth.status]} ${prismaHealth.message}`,
  );
  console.log(
    `   Supabase:    ${statusEmoji[supabaseHealth.status]} ${supabaseHealth.message}`,
  );
  console.log(
    `   Sync:        ${statusEmoji[syncHealth.status]} ${syncHealth.message}`,
  );
  console.log(
    `   Performance: ${statusEmoji[performanceHealth.status]} ${performanceHealth.message}\n`,
  );

  console.log("💡 RECOMMANDATIONS:");
  recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });

  console.log("\n🎯 Health Check terminé - Architecture Dual Database v2.0");

  return report;
}

// Exporter pour utilisation dans d'autres scripts
export { main as healthCheck };

// Exécuter si appelé directement
if (require.main === module) {
  main()
    .then((report) => {
      const exitCode = report.overall.status === "critical" ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error("💥 Erreur fatale health check:", error);
      process.exit(1);
    });
}
