#!/usr/bin/env tsx

/**
 * Tests de Performance et Stress pour la Gestion des Quotas
 *
 * Tests :
 * 1. Performance des requêtes de quota avec grande base de données
 * 2. Concurrence et race conditions lors de l'incrémentation
 * 3. Tests de stress avec de multiples utilisateurs
 * 4. Performance du reset mensuel automatique
 * 5. Tests de limites extrêmes (très gros quotas)
 * 6. Benchmarks des opérations critiques
 */

import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Fallback pour DATABASE_URL si non défini
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
  console.log(
    "⚠️ DATABASE_URL non défini, utilisation de SQLite en mémoire pour les tests",
  );
}

import { prisma } from "@/lib/prisma";
import { QuotaService } from "@/lib/quota/quota-service";
import { logger } from "@/lib/logger";

type PerformanceResult = {
  testName: string;
  passed: boolean;
  duration: number;
  operations: number;
  opsPerSecond: number;
  details?: any;
};

class QuotaPerformanceTestSuite {
  private readonly results: PerformanceResult[] = [];
  private readonly testUsers: string[] = [];

  constructor() {
    console.log("🚀 Tests de Performance et Stress - Gestion des Quotas");
    console.log("=".repeat(70));
  }

  private addResult(result: PerformanceResult): void {
    this.results.push(result);
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${result.testName}`);
    console.log(
      `   ⏱️ Durée: ${result.duration}ms | Ops: ${result.operations} | ${result.opsPerSecond.toFixed(2)} ops/sec`,
    );
    if (result.details) {
      console.log(`   💡 ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  /**
   * 1. TEST DE PERFORMANCE : LECTURE DE QUOTA
   */
  async testQuotaReadPerformance(): Promise<void> {
    console.log("\n📖 Test 1: Performance lecture de quota");

    try {
      // Créer un utilisateur de test
      const testUser = await prisma.user.create({
        data: {
          id: `perf-test-${Date.now()}`,
          name: "Performance Test User",
          email: `perf-test-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(testUser.id);
      await QuotaService.createDefaultQuota(testUser.id);

      // Test de performance : 100 lectures consécutives
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await QuotaService.getUserQuota(testUser.id);
      }

      const duration = Date.now() - startTime;
      const opsPerSecond = (iterations / duration) * 1000;

      this.addResult({
        testName: "Lecture répétée de quota",
        passed: duration < 5000, // Moins de 5 secondes pour 100 lectures
        duration,
        operations: iterations,
        opsPerSecond,
        details: {
          averageTime: duration / iterations,
          threshold: "< 50ms par lecture",
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Lecture répétée de quota",
        passed: false,
        duration: 0,
        operations: 0,
        opsPerSecond: 0,
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 2. TEST DE CONCURRENCE : INCREMENTATION SIMULTANEE
   */
  async testConcurrentIncrements(): Promise<void> {
    console.log("\n🔀 Test 2: Incrémentations concurrentes");

    try {
      // Créer un utilisateur avec un quota élevé
      const testUser = await prisma.user.create({
        data: {
          id: `concurrent-test-${Date.now()}`,
          name: "Concurrent Test User",
          email: `concurrent-test-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(testUser.id);
      await QuotaService.updateQuotaForSubscription(testUser.id, "premium");

      // Test de concurrence : 50 incrémentations simultanées
      const concurrentOps = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentOps }, async () =>
        QuotaService.incrementQuotaUsage(testUser.id, 1),
      );

      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value,
      ).length;
      const finalQuota = await QuotaService.getUserQuota(testUser.id);

      // Vérifier l'intégrité : le quota utilisé doit être égal au nombre de succès
      const integrityCheck = finalQuota?.used === successCount;

      this.addResult({
        testName: "Incrémentations concurrentes",
        passed: integrityCheck && successCount > 0,
        duration,
        operations: concurrentOps,
        opsPerSecond: (concurrentOps / duration) * 1000,
        details: {
          successfulIncrements: successCount,
          expectedUsage: successCount,
          actualUsage: finalQuota?.used,
          integrityCheck,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Incrémentations concurrentes",
        passed: false,
        duration: 0,
        operations: 0,
        opsPerSecond: 0,
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 3. TEST DE STRESS : MULTIPLES UTILISATEURS
   */
  async testMultiUserStress(): Promise<void> {
    console.log("\n👥 Test 3: Stress test multi-utilisateurs");

    try {
      const userCount = 20;
      const operationsPerUser = 10;
      const startTime = Date.now();

      // Créer plusieurs utilisateurs
      const users = await Promise.all(
        Array.from({ length: userCount }, async (_, i) => {
          const user = await prisma.user.create({
            data: {
              id: `stress-user-${i}-${Date.now()}`,
              name: `Stress Test User ${i}`,
              email: `stress-user-${i}-${Date.now()}@example.com`,
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          this.testUsers.push(user.id);
          await QuotaService.createDefaultQuota(user.id);
          return user.id;
        }),
      );

      // Opérations simultanées sur tous les utilisateurs
      const allOperations = users.flatMap((userId) =>
        Array.from({ length: operationsPerUser }, () => async () => {
          const canMake = await QuotaService.canMakeRequest(userId);
          if (canMake) {
            await QuotaService.incrementQuotaUsage(userId, 1);
          }
          return canMake;
        }),
      );

      const results = await Promise.allSettled(allOperations.map(async (op) => op()));

      const duration = Date.now() - startTime;
      const totalOps = allOperations.length;
      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;

      this.addResult({
        testName: "Stress test multi-utilisateurs",
        passed: successCount >= totalOps * 0.9, // 90% de succès attendu
        duration,
        operations: totalOps,
        opsPerSecond: (totalOps / duration) * 1000,
        details: {
          userCount,
          operationsPerUser,
          totalOperations: totalOps,
          successfulOperations: successCount,
          successRate: (successCount / totalOps) * 100,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Stress test multi-utilisateurs",
        passed: false,
        duration: 0,
        operations: 0,
        opsPerSecond: 0,
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 4. TEST DE PERFORMANCE : RESET MENSUEL
   */
  async testMonthlyResetPerformance(): Promise<void> {
    console.log("\n🔄 Test 4: Performance reset mensuel");

    try {
      const userCount = 100;
      const startTime = Date.now();

      // Créer plusieurs utilisateurs avec quota utilisé et date passée
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const userPromises = Array.from({ length: userCount }, async (_, i) => {
        const user = await prisma.user.create({
          data: {
            id: `reset-test-${i}-${Date.now()}`,
            name: `Reset Test User ${i}`,
            email: `reset-test-${i}-${Date.now()}@example.com`,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            monthlyQuota: 100,
            quotaUsed: 50,
            quotaResetDate: pastDate,
          },
        });

        this.testUsers.push(user.id);
        return user.id;
      });

      const users = await Promise.all(userPromises);

      // Effectuer le reset sur tous les utilisateurs
      const resetPromises = users.map(async (userId) =>
        QuotaService.checkAndResetQuotaIfNeeded(userId, pastDate),
      );

      await Promise.all(resetPromises);
      const duration = Date.now() - startTime;

      // Vérifier que tous les quotas ont été réinitialisés
      const finalUsers = await prisma.user.findMany({
        where: {
          id: { in: users },
        },
        select: {
          id: true,
          quotaUsed: true,
          quotaResetDate: true,
        },
      });

      const resetCount = finalUsers.filter((u) => u.quotaUsed === 0).length;

      this.addResult({
        testName: "Reset mensuel en masse",
        passed: resetCount === userCount,
        duration,
        operations: userCount,
        opsPerSecond: (userCount / duration) * 1000,
        details: {
          totalUsers: userCount,
          successfulResets: resetCount,
          averageTimePerReset: duration / userCount,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Reset mensuel en masse",
        passed: false,
        duration: 0,
        operations: 0,
        opsPerSecond: 0,
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 5. TEST DE LIMITES EXTREMES
   */
  async testExtremeLimits(): Promise<void> {
    console.log("\n🚀 Test 5: Limites extrêmes");

    try {
      // Test avec des quotas très élevés
      const testUser = await prisma.user.create({
        data: {
          id: `extreme-test-${Date.now()}`,
          name: "Extreme Test User",
          email: `extreme-test-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(testUser.id);

      // Tester avec des quotas extrêmes
      const extremeQuota = 1000000; // 1 million d'audits
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          monthlyQuota: extremeQuota,
          quotaUsed: 0,
        },
      });

      const startTime = Date.now();

      // Test de performance avec gros quota
      const quota1 = await QuotaService.getUserQuota(testUser.id);

      // Increment significatif
      await QuotaService.incrementQuotaUsage(testUser.id, 100000);

      const quota2 = await QuotaService.getUserQuota(testUser.id);

      const duration = Date.now() - startTime;

      const correctIncrement = quota2?.used === 100000;
      const correctLimit = quota1?.limit === extremeQuota;

      this.addResult({
        testName: "Gestion quotas extrêmes",
        passed: correctIncrement && correctLimit,
        duration,
        operations: 3, // 2 lectures + 1 increment
        opsPerSecond: (3 / duration) * 1000,
        details: {
          extremeQuota,
          initialUsage: quota1?.used,
          finalUsage: quota2?.used,
          incrementCorrect: correctIncrement,
          limitCorrect: correctLimit,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Gestion quotas extrêmes",
        passed: false,
        duration: 0,
        operations: 0,
        opsPerSecond: 0,
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 6. BENCHMARK DES OPERATIONS CRITIQUES
   */
  async benchmarkCriticalOperations(): Promise<void> {
    console.log("\n⚡ Test 6: Benchmark opérations critiques");

    try {
      const testUser = await prisma.user.create({
        data: {
          id: `benchmark-${Date.now()}`,
          name: "Benchmark User",
          email: `benchmark-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(testUser.id);
      await QuotaService.createDefaultQuota(testUser.id);

      const benchmarks = [
        {
          name: "getUserQuota",
          operation: async () => QuotaService.getUserQuota(testUser.id),
          iterations: 50,
        },
        {
          name: "canMakeRequest",
          operation: async () => QuotaService.canMakeRequest(testUser.id),
          iterations: 50,
        },
        {
          name: "incrementQuotaUsage",
          operation: async () => QuotaService.incrementQuotaUsage(testUser.id, 1),
          iterations: 5, // Limité car on a un quota de 5
        },
        {
          name: "getUserUsageStats",
          operation: async () => QuotaService.getUserUsageStats(testUser.id),
          iterations: 50,
        },
      ];

      for (const benchmark of benchmarks) {
        const startTime = Date.now();

        for (let i = 0; i < benchmark.iterations; i++) {
          await benchmark.operation();
        }

        const duration = Date.now() - startTime;
        const avgTime = duration / benchmark.iterations;
        const opsPerSecond = (benchmark.iterations / duration) * 1000;

        this.addResult({
          testName: `Benchmark ${benchmark.name}`,
          passed: avgTime < 100, // Moins de 100ms en moyenne
          duration,
          operations: benchmark.iterations,
          opsPerSecond,
          details: {
            averageTime: avgTime,
            threshold: "< 100ms par opération",
          },
        });
      }
    } catch (error) {
      this.addResult({
        testName: "Benchmark opérations critiques",
        passed: false,
        duration: 0,
        operations: 0,
        opsPerSecond: 0,
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * NETTOYAGE
   */
  async cleanup(): Promise<void> {
    console.log("\n🧹 Nettoyage des utilisateurs de test...");

    if (this.testUsers.length > 0) {
      try {
        // Supprimer les audits de test
        await prisma.audit.deleteMany({
          where: { userId: { in: this.testUsers } },
        });

        // Supprimer les utilisateurs de test
        const deleteResult = await prisma.user.deleteMany({
          where: { id: { in: this.testUsers } },
        });

        console.log(`✅ ${deleteResult.count} utilisateurs de test supprimés`);
      } catch (error) {
        console.log(`❌ Erreur nettoyage: ${error}`);
      }
    }
  }

  /**
   * RAPPORT FINAL
   */
  generateReport(): void {
    console.log(`\n${  "=".repeat(70)}`);
    console.log("📊 RAPPORT FINAL - TESTS DE PERFORMANCE");
    console.log("=".repeat(70));

    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total des tests: ${totalTests}`);
    console.log(`✅ Réussis: ${passedTests}`);
    console.log(`❌ Échoués: ${failedTests}`);
    console.log(
      `📊 Taux de réussite: ${Math.round((passedTests / totalTests) * 100)}%`,
    );

    // Statistiques de performance
    const totalOperations = this.results.reduce(
      (sum, r) => sum + r.operations,
      0,
    );
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgOpsPerSecond =
      this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / totalTests;

    console.log(`\n📈 STATISTIQUES DE PERFORMANCE:`);
    console.log(`Opérations totales: ${totalOperations}`);
    console.log(`Durée totale: ${totalDuration}ms`);
    console.log(`Moyenne ops/sec: ${avgOpsPerSecond.toFixed(2)}`);

    // Top 3 des tests les plus rapides
    const sortedBySpeed = [...this.results]
      .filter((r) => r.passed && r.opsPerSecond > 0)
      .sort((a, b) => b.opsPerSecond - a.opsPerSecond)
      .slice(0, 3);

    console.log(`\n🏆 TOP 3 PLUS RAPIDES:`);
    sortedBySpeed.forEach((result, index) => {
      console.log(
        `${index + 1}. ${result.testName}: ${result.opsPerSecond.toFixed(2)} ops/sec`,
      );
    });

    if (failedTests > 0) {
      console.log("\n❌ TESTS ÉCHOUÉS:");
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   • ${r.testName}`);
          if (r.details) {
            console.log(`     Details: ${JSON.stringify(r.details, null, 4)}`);
          }
        });
    }

    console.log(`\n${  "=".repeat(70)}`);
  }

  /**
   * EXECUTION PRINCIPALE
   */
  async runAllTests(): Promise<void> {
    try {
      await this.testQuotaReadPerformance();
      await this.testConcurrentIncrements();
      await this.testMultiUserStress();
      await this.testMonthlyResetPerformance();
      await this.testExtremeLimits();
      await this.benchmarkCriticalOperations();
    } catch (error) {
      console.error("❌ Erreur lors de l'exécution des tests:", error);
    } finally {
      await this.cleanup();
      this.generateReport();
    }
  }
}

/**
 * EXÉCUTION PRINCIPALE
 */
async function main() {
  const simulationMode =
    process.argv.includes("--simulation") ||
    !process.env.DATABASE_URL ||
    process.env.DATABASE_URL === "file:./dev.db";

  if (simulationMode) {
    console.log(
      "⚠️ Mode simulation détecté - les tests de performance nécessitent une vraie base de données",
    );
    console.log("Utilisez une vraie DATABASE_URL pour exécuter ces tests");
    return;
  }

  const testSuite = new QuotaPerformanceTestSuite();
  await testSuite.runAllTests();

  // Déconnexion Prisma
  await prisma.$disconnect();

  console.log("\n🏁 Tests de performance terminés!");
}

// Gestion des erreurs non capturées
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Exécution si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { QuotaPerformanceTestSuite };
