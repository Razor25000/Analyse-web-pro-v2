#!/usr/bin/env tsx

/**
 * Suite de Tests Complète - Gestion des Quotas
 *
 * Exécute tous les tests de quota dans l'ordre:
 * 1. Tests fonctionnels de base
 * 2. Tests de performance et stress
 * 3. Tests d'intégration avec le système d'audit
 *
 * Génère un rapport consolidé de tous les résultats
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

import { QuotaTestSuite } from "./test-quota-management-complete";
import { QuotaPerformanceTestSuite } from "./test-quota-performance-stress";
import { QuotaAuditIntegrationTestSuite } from "./test-quota-audit-integration";
import { prisma } from "@/lib/prisma";

type ConsolidatedReport = {
  testSuite: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  duration: number;
  details: any[];
};

class QuotaCompleteTestSuite {
  private readonly reports: ConsolidatedReport[] = [];
  private startTime = 0;

  constructor() {
    console.log("🎯 SUITE COMPLÈTE DE TESTS - GESTION DES QUOTAS");
    console.log("=".repeat(80));
    console.log(
      "Cette suite exécute tous les tests de validation du système de quotas:",
    );
    console.log("• Tests fonctionnels de base");
    console.log("• Tests de performance et stress");
    console.log("• Tests d'intégration avec le système d'audit");
    console.log("=".repeat(80));
  }

  private async executeSuite(
    suiteName: string,
    suiteClass: any,
    skipIfSimulation = false,
  ): Promise<void> {
    const simulationMode =
      process.argv.includes("--simulation") ||
      !process.env.DATABASE_URL ||
      process.env.DATABASE_URL === "file:./dev.db";

    if (skipIfSimulation && simulationMode) {
      console.log(`\n⏭️ ${suiteName} sautée en mode simulation`);
      this.reports.push({
        testSuite: suiteName,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 100,
        duration: 0,
        details: [{ skipped: true, reason: "Mode simulation" }],
      });
      return;
    }

    console.log(`\n🚀 Démarrage: ${suiteName}`);
    console.log("-".repeat(60));

    const suiteStart = Date.now();

    try {
      const testSuite = new suiteClass(simulationMode);

      // Intercepter les résultats de test en surchargeant la méthode addResult
      const originalAddResult = testSuite.addResult?.bind(testSuite);
      const results: any[] = [];

      if (originalAddResult) {
        testSuite.addResult = (result: any) => {
          results.push(result);
          return originalAddResult(result);
        };
      }

      await testSuite.runAllTests();

      const duration = Date.now() - suiteStart;

      // Extraire les résultats depuis testResults si disponible
      const testResults = testSuite.testResults || testSuite.results || results;
      const totalTests = testResults.length;
      const passedTests = testResults.filter((r: any) => r.passed).length;
      const failedTests = totalTests - passedTests;
      const successRate =
        totalTests > 0 ? (passedTests / totalTests) * 100 : 100;

      this.reports.push({
        testSuite: suiteName,
        totalTests,
        passedTests,
        failedTests,
        successRate,
        duration,
        details: testResults,
      });

      console.log(`✅ ${suiteName} terminée en ${duration}ms`);
      console.log(
        `📊 Résultats: ${passedTests}/${totalTests} (${successRate.toFixed(1)}%)`,
      );
    } catch (error) {
      const duration = Date.now() - suiteStart;
      console.log(`❌ Erreur dans ${suiteName}:`, error);

      this.reports.push({
        testSuite: suiteName,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        successRate: 0,
        duration,
        details: [{ error: error instanceof Error ? error.message : error }],
      });
    }
  }

  async runCompleteSuite(): Promise<void> {
    this.startTime = Date.now();

    // 1. Tests fonctionnels de base
    await this.executeSuite(
      "Tests Fonctionnels de Base",
      QuotaTestSuite,
      false, // Peut fonctionner en simulation
    );

    // 2. Tests de performance (nécessitent une vraie DB)
    await this.executeSuite(
      "Tests de Performance et Stress",
      QuotaPerformanceTestSuite,
      true, // Skip en simulation
    );

    // 3. Tests d'intégration (nécessitent une vraie DB)
    await this.executeSuite(
      "Tests d'Intégration Quota ↔ Audit",
      QuotaAuditIntegrationTestSuite,
      true, // Skip en simulation
    );

    // Génération du rapport final
    this.generateConsolidatedReport();
  }

  private generateConsolidatedReport(): void {
    const totalDuration = Date.now() - this.startTime;

    console.log(`\n${  "=".repeat(80)}`);
    console.log("📊 RAPPORT CONSOLIDÉ - SUITE COMPLÈTE DE TESTS QUOTAS");
    console.log("=".repeat(80));

    // Statistiques globales
    const totalTests = this.reports.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = this.reports.reduce((sum, r) => sum + r.passedTests, 0);
    const totalFailed = this.reports.reduce((sum, r) => sum + r.failedTests, 0);
    const overallSuccessRate =
      totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    console.log(`🎯 RÉSULTATS GLOBAUX:`);
    console.log(`   Total des tests: ${totalTests}`);
    console.log(`   ✅ Réussis: ${totalPassed}`);
    console.log(`   ❌ Échoués: ${totalFailed}`);
    console.log(
      `   📈 Taux de réussite global: ${overallSuccessRate.toFixed(1)}%`,
    );
    console.log(
      `   ⏱️ Durée totale: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`,
    );

    // Détail par suite
    console.log(`\n📋 DÉTAIL PAR SUITE DE TESTS:`);
    this.reports.forEach((report) => {
      const status =
        report.successRate === 100
          ? "✅"
          : report.successRate >= 80
            ? "⚠️"
            : "❌";
      console.log(`${status} ${report.testSuite}:`);
      console.log(
        `   Tests: ${report.passedTests}/${report.totalTests} (${report.successRate.toFixed(1)}%)`,
      );
      console.log(`   Durée: ${report.duration}ms`);

      if (report.details.some((d: any) => d.skipped)) {
        console.log(`   ⏭️ Sautée (mode simulation)`);
      }
    });

    // Tests échoués
    const failedDetails = this.reports.flatMap((report) =>
      report.details.filter((detail: any) => detail.passed === false),
    );

    if (failedDetails.length > 0) {
      console.log(`\n❌ TESTS ÉCHOUÉS (${failedDetails.length}):`);
      failedDetails.forEach((detail: any, index: number) => {
        console.log(
          `${index + 1}. ${detail.testName || detail.message || "Test inconnu"}`,
        );
        if (detail.details || detail.error) {
          console.log(
            `   💡 ${JSON.stringify(detail.details || detail.error, null, 2)}`,
          );
        }
      });
    }

    // Recommandations
    console.log(`\n💡 RECOMMANDATIONS:`);

    if (overallSuccessRate === 100) {
      console.log(`   🎉 Félicitations ! Tous les tests passent.`);
      console.log(
        `   ✅ Le système de gestion des quotas est robuste et fonctionnel.`,
      );
    } else if (overallSuccessRate >= 90) {
      console.log(`   ✅ Très bon ! Le système est globalement stable.`);
      console.log(`   🔧 Quelques ajustements mineurs à apporter.`);
    } else if (overallSuccessRate >= 70) {
      console.log(
        `   ⚠️ Attention ! Des problèmes significatifs ont été détectés.`,
      );
      console.log(`   🔧 Révision du système de quota recommandée.`);
    } else {
      console.log(
        `   🚨 CRITIQUE ! Le système présente des défaillances majeures.`,
      );
      console.log(`   🛠️ Refactoring complet du système de quota nécessaire.`);
    }

    // Problèmes fréquents identifiés
    const hasQuotaInconsistency = failedDetails.some(
      (d: any) => d.message?.includes("quota") || d.testName?.includes("quota"),
    );
    const hasPlanMismatch = failedDetails.some(
      (d: any) => d.message?.includes("plan") || d.testName?.includes("Plan"),
    );

    if (hasQuotaInconsistency) {
      console.log(
        `   📋 Incohérences de quota détectées - vérifiez subscription-plans.ts`,
      );
    }
    if (hasPlanMismatch) {
      console.log(
        `   📋 Problèmes de mapping plan détectés - vérifiez quota-service.ts`,
      );
    }

    // Mode d'emploi pour résoudre les problèmes
    console.log(`\n🔧 POUR RÉSOUDRE LES PROBLÈMES:`);
    console.log(
      `   1. Vérifiez la cohérence entre subscription-plans.ts et quota-service.ts`,
    );
    console.log(
      `   2. Assurez-vous que les mappings Stripe → tiers sont corrects`,
    );
    console.log(
      `   3. Testez avec une vraie base de données (pas en mode simulation)`,
    );
    console.log(`   4. Vérifiez les logs d'application pour plus de détails`);

    console.log(`\n${  "=".repeat(80)}`);

    // Codes de sortie
    if (overallSuccessRate < 70) {
      console.log("❌ ÉCHEC CRITIQUE - Code de sortie: 1");
      process.exitCode = 1;
    } else if (overallSuccessRate < 90) {
      console.log("⚠️ AVERTISSEMENTS - Code de sortie: 0 (avec warnings)");
      process.exitCode = 0;
    } else {
      console.log("✅ SUCCÈS - Code de sortie: 0");
      process.exitCode = 0;
    }
  }
}

/**
 * EXÉCUTION PRINCIPALE
 */
async function main() {
  const completeSuite = new QuotaCompleteTestSuite();

  try {
    await completeSuite.runCompleteSuite();
  } catch (error) {
    console.error("❌ Erreur fatale dans la suite de tests:", error);
    process.exitCode = 1;
  } finally {
    // Déconnexion sûre de Prisma
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.log("⚠️ Erreur déconnexion Prisma (ignorée):", error);
    }
  }

  console.log("\n🏁 Suite complète de tests terminée!");
}

// Gestion des erreurs globales
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  process.exitCode = 1;
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  process.exitCode = 1;
});

// Point d'entrée
if (require.main === module) {
  main().catch((error) => {
    console.error("🚨 Erreur fatale:", error);
    process.exit(1);
  });
}

export { QuotaCompleteTestSuite };
