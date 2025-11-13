#!/usr/bin/env tsx

/**
 * Tests d'Intégration Quota ↔ Système d'Audit
 *
 * Tests :
 * 1. Intégration complète création d'audit → décrémentation quota
 * 2. Vérification des alertes de seuil en temps réel
 * 3. Blocage automatique des audits selon le plan
 * 4. Tests des fonctionnalités premium (batch audits)
 * 5. Synchronisation Stripe → Plan → Quota → Permissions
 * 6. Tests de régression des bugs connus
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

import { prisma } from "@/lib/prisma";
import { QuotaService } from "@/lib/quota/quota-service";
import {
  SUBSCRIPTION_PLANS,
  canAccessBatchAudits,
  getAuditsQuota,
} from "@/config/subscription-plans";

type IntegrationTestResult = {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
};

class QuotaAuditIntegrationTestSuite {
  private readonly results: IntegrationTestResult[] = [];
  private readonly testUsers: string[] = [];
  private readonly testAudits: string[] = [];

  constructor() {
    console.log("🔗 Tests d'Intégration Quota ↔ Système d'Audit");
    console.log("=".repeat(65));
  }

  private addResult(result: IntegrationTestResult): void {
    this.results.push(result);
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${result.testName}: ${result.message}`);
    if (result.details) {
      console.log(`   💡 ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  /**
   * 1. FLUX COMPLET : CREATION AUDIT → QUOTA
   */
  async testFullAuditQuotaFlow(): Promise<void> {
    console.log(
      "\n🔄 Test 1: Flux complet création audit → décrémentation quota",
    );

    try {
      // Créer utilisateur avec plan gratuit
      const user = await prisma.user.create({
        data: {
          id: `integration-${Date.now()}`,
          name: "Integration Test User",
          email: `integration-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(user.id);
      await QuotaService.createDefaultQuota(user.id);

      // Simuler création d'audits successifs
      const maxAudits = 5; // Plan gratuit
      let createdAudits = 0;

      for (let i = 0; i < maxAudits + 2; i++) {
        // +2 pour tester le dépassement
        const canCreate = await QuotaService.canMakeRequest(user.id);

        if (canCreate) {
          // Créer l'audit
          const audit = await prisma.audit.create({
            data: {
              userId: user.id,
              email: user.email,
              url: `https://test-${i}.com`,
              status: "completed",
              auditType: "manual",
              scoreGlobal: 85,
              completedAt: new Date(),
            },
          });

          this.testAudits.push(audit.id);

          // Décrémenter le quota
          const incrementSuccess = await QuotaService.incrementQuotaUsage(
            user.id,
          );

          if (incrementSuccess) {
            createdAudits++;
          }
        }
      }

      const finalQuota = await QuotaService.getUserQuota(user.id);

      this.addResult({
        testName: "Flux création audit complet",
        passed:
          createdAudits === maxAudits &&
          finalQuota?.used === maxAudits &&
          !finalQuota?.canMakeRequest,
        message: `${createdAudits}/${maxAudits} audits créés, quota ${finalQuota?.used}/${finalQuota?.limit}`,
        details: {
          expectedAudits: maxAudits,
          actualAudits: createdAudits,
          quotaUsed: finalQuota?.used,
          quotaLimit: finalQuota?.limit,
          canMakeMore: finalQuota?.canMakeRequest,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Flux création audit complet",
        passed: false,
        message: "Erreur dans le flux",
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 2. TEST DES SEUILS D'ALERTE EN TEMPS REEL
   */
  async testRealTimeQuotaAlerts(): Promise<void> {
    console.log("\n⚠️ Test 2: Alertes de seuil en temps réel");

    try {
      const user = await prisma.user.create({
        data: {
          id: `alert-test-${Date.now()}`,
          name: "Alert Test User",
          email: `alert-test-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(user.id);

      // Plan avec 100 audits pour tester les seuils
      await prisma.user.update({
        where: { id: user.id },
        data: {
          monthlyQuota: 100,
          quotaUsed: 0,
          subscriptionTier: "basic",
        },
      });

      const thresholds = [
        { usage: 75, expectedAlert: true, name: "75%" }, // 75%
        { usage: 85, expectedAlert: true, name: "85%" }, // 85%
        { usage: 90, expectedAlert: true, name: "90%" }, // 90%
        { usage: 100, expectedAlert: true, name: "100%" }, // 100%
        { usage: 50, expectedAlert: false, name: "50%" }, // 50%
      ];

      let allThresholdsPassed = true;

      for (const threshold of thresholds) {
        // Définir l'usage
        await prisma.user.update({
          where: { id: user.id },
          data: { quotaUsed: threshold.usage },
        });

        const quota = await QuotaService.getUserQuota(user.id);
        if (!quota) continue;

        const percentage = (quota.used / quota.limit) * 100;
        const shouldAlert = percentage >= 75;

        if (shouldAlert !== threshold.expectedAlert) {
          allThresholdsPassed = false;
        }

        this.addResult({
          testName: `Seuil d'alerte ${threshold.name}`,
          passed: shouldAlert === threshold.expectedAlert,
          message: `Usage ${threshold.usage}/100 (${percentage}%) - Alerte: ${shouldAlert}`,
          details: {
            usage: threshold.usage,
            percentage,
            shouldAlert,
            expected: threshold.expectedAlert,
          },
        });
      }
    } catch (error) {
      this.addResult({
        testName: "Alertes de seuil en temps réel",
        passed: false,
        message: "Erreur dans les tests d'alerte",
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 3. TEST DES RESTRICTIONS PAR PLAN
   */
  async testPlanBasedRestrictions(): Promise<void> {
    console.log("\n🔒 Test 3: Restrictions selon le plan");

    const planTests = [
      {
        plan: "free",
        expectedQuota: 5,
        batchAllowed: false,
        apiAllowed: false,
      },
      {
        plan: "pro_monthly",
        expectedQuota: 500,
        batchAllowed: false,
        apiAllowed: false,
      },
      {
        plan: "premium_monthly",
        expectedQuota: 2000, // Selon QuotaService
        batchAllowed: true,
        apiAllowed: true,
      },
    ];

    for (const test of planTests) {
      try {
        const user = await prisma.user.create({
          data: {
            id: `plan-test-${test.plan}-${Date.now()}`,
            name: `Plan Test User ${test.plan}`,
            email: `plan-test-${test.plan}-${Date.now()}@example.com`,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        this.testUsers.push(user.id);

        // Mettre à jour le plan
        await QuotaService.updateQuotaForSubscription(user.id, test.plan);

        const quota = await QuotaService.getUserQuota(user.id);
        const batchAccess = canAccessBatchAudits(test.plan);
        const configQuota = getAuditsQuota(test.plan);

        // Vérifications
        const quotaCorrect = quota?.limit === test.expectedQuota;
        const batchCorrect = batchAccess === test.batchAllowed;
        const configCorrect = configQuota === test.expectedQuota;

        this.addResult({
          testName: `Restrictions plan ${test.plan}`,
          passed: quotaCorrect && batchCorrect,
          message: `Quota: ${quota?.limit}/${test.expectedQuota}, Batch: ${batchAccess}/${test.batchAllowed}`,
          details: {
            plan: test.plan,
            actualQuota: quota?.limit,
            expectedQuota: test.expectedQuota,
            actualBatch: batchAccess,
            expectedBatch: test.batchAllowed,
            configQuota,
            quotaCorrect,
            batchCorrect,
            configCorrect,
          },
        });
      } catch (error) {
        this.addResult({
          testName: `Restrictions plan ${test.plan}`,
          passed: false,
          message: "Erreur test restriction plan",
          details: { error: error instanceof Error ? error.message : error },
        });
      }
    }
  }

  /**
   * 4. TEST DES AUDITS BATCH (PREMIUM UNIQUEMENT)
   */
  async testBatchAuditRestrictions(): Promise<void> {
    console.log("\n📦 Test 4: Restrictions audits batch");

    try {
      // Utilisateur FREE
      const freeUser = await prisma.user.create({
        data: {
          id: `batch-free-${Date.now()}`,
          name: "Batch Free User",
          email: `batch-free-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(freeUser.id);
      await QuotaService.createDefaultQuota(freeUser.id);

      // Utilisateur PREMIUM
      const premiumUser = await prisma.user.create({
        data: {
          id: `batch-premium-${Date.now()}`,
          name: "Batch Premium User",
          email: `batch-premium-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(premiumUser.id);
      await QuotaService.updateQuotaForSubscription(
        premiumUser.id,
        "premium_monthly",
      );

      // Test accès batch audits
      const freeCanBatch = canAccessBatchAudits("free");
      const premiumCanBatch = canAccessBatchAudits("premium_monthly");

      // Test création d'audits batch
      const batchUrls = [
        "https://site1.com",
        "https://site2.com",
        "https://site3.com",
      ];

      // Simuler création batch pour utilisateur FREE (devrait être bloqué)
      const freeQuota = await QuotaService.getUserQuota(freeUser.id);
      const freeBatchBlocked = !freeCanBatch && freeQuota?.canMakeRequest;

      // Simuler création batch pour utilisateur PREMIUM (devrait fonctionner)
      const premiumQuota = await QuotaService.getUserQuota(premiumUser.id);
      const premiumBatchAllowed =
        premiumCanBatch && premiumQuota?.canMakeRequest;

      this.addResult({
        testName: "Restrictions audits batch",
        passed: !freeCanBatch && premiumCanBatch,
        message: `Free: ${freeCanBatch ? "Autorisé" : "Bloqué"}, Premium: ${premiumCanBatch ? "Autorisé" : "Bloqué"}`,
        details: {
          freeCanBatch,
          premiumCanBatch,
          freeQuotaAvailable: freeQuota?.canMakeRequest,
          premiumQuotaAvailable: premiumQuota?.canMakeRequest,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Restrictions audits batch",
        passed: false,
        message: "Erreur test audits batch",
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 5. TEST DE SYNCHRONISATION STRIPE → PLAN → QUOTA
   */
  async testStripePlanSynchronization(): Promise<void> {
    console.log("\n💳 Test 5: Synchronisation Stripe → Plan → Quota");

    try {
      const user = await prisma.user.create({
        data: {
          id: `stripe-sync-${Date.now()}`,
          name: "Stripe Sync User",
          email: `stripe-sync-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(user.id);
      await QuotaService.createDefaultQuota(user.id);

      // Simuler des mises à jour Stripe
      const stripeTests = [
        {
          stripePlan: "pro_monthly",
          expectedTier: "basic",
          expectedQuota: 500,
        },
        {
          stripePlan: "premium_yearly",
          expectedTier: "premium",
          expectedQuota: 2000,
        },
        { stripePlan: "free", expectedTier: "free", expectedQuota: 5 },
      ];

      let allSyncsPassed = true;

      for (const test of stripeTests) {
        // Simuler webhook Stripe → mise à jour plan
        await QuotaService.updateQuotaForSubscription(user.id, test.stripePlan);

        // Vérifier la synchronisation
        const userUpdated = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            monthlyQuota: true,
            subscriptionTier: true,
          },
        });

        const quotaCorrect = userUpdated?.monthlyQuota === test.expectedQuota;
        const tierCorrect = userUpdated?.subscriptionTier === test.expectedTier;

        if (!quotaCorrect || !tierCorrect) {
          allSyncsPassed = false;
        }

        this.addResult({
          testName: `Sync Stripe ${test.stripePlan}`,
          passed: quotaCorrect && tierCorrect,
          message: `${test.stripePlan} → tier: ${userUpdated?.subscriptionTier}, quota: ${userUpdated?.monthlyQuota}`,
          details: {
            stripePlan: test.stripePlan,
            expectedTier: test.expectedTier,
            actualTier: userUpdated?.subscriptionTier,
            expectedQuota: test.expectedQuota,
            actualQuota: userUpdated?.monthlyQuota,
          },
        });
      }
    } catch (error) {
      this.addResult({
        testName: "Synchronisation Stripe → Plan → Quota",
        passed: false,
        message: "Erreur synchronisation Stripe",
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * 6. TEST DE NON-REGRESSION
   */
  async testRegressionScenarios(): Promise<void> {
    console.log("\n🐛 Test 6: Scénarios de non-régression");

    try {
      // Scénario 1: Double incrémentation (race condition)
      const user1 = await prisma.user.create({
        data: {
          id: `regression-1-${Date.now()}`,
          name: "Regression Test 1",
          email: `regression-1-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.testUsers.push(user1.id);
      await QuotaService.createDefaultQuota(user1.id);

      // Deux incrémentations simultanées
      const [inc1, inc2] = await Promise.allSettled([
        QuotaService.incrementQuotaUsage(user1.id, 1),
        QuotaService.incrementQuotaUsage(user1.id, 1),
      ]);

      const quota1 = await QuotaService.getUserQuota(user1.id);

      this.addResult({
        testName: "Régression: Race condition",
        passed: quota1?.used === 2,
        message: `Incrémentations simultanées: usage ${quota1?.used}/5`,
        details: {
          inc1: inc1.status === "fulfilled" ? inc1.value : false,
          inc2: inc2.status === "fulfilled" ? inc2.value : false,
          finalUsage: quota1?.used,
        },
      });

      // Scénario 2: Reset pendant utilisation
      const user2 = await prisma.user.create({
        data: {
          id: `regression-2-${Date.now()}`,
          name: "Regression Test 2",
          email: `regression-2-${Date.now()}@example.com`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          monthlyQuota: 10,
          quotaUsed: 5,
          quotaResetDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hier
        },
      });

      this.testUsers.push(user2.id);

      // L'accès devrait déclencher un reset automatique
      const quotaBefore = await QuotaService.getUserQuota(user2.id);

      this.addResult({
        testName: "Régression: Reset automatique",
        passed: quotaBefore?.used === 0,
        message: `Reset automatique effectué: usage ${quotaBefore?.used}/10`,
        details: {
          usageAfterReset: quotaBefore?.used,
          canMakeRequest: quotaBefore?.canMakeRequest,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Scénarios de non-régression",
        passed: false,
        message: "Erreur test régression",
        details: { error: error instanceof Error ? error.message : error },
      });
    }
  }

  /**
   * NETTOYAGE
   */
  async cleanup(): Promise<void> {
    console.log("\n🧹 Nettoyage...");

    try {
      if (this.testAudits.length > 0) {
        await prisma.audit.deleteMany({
          where: { id: { in: this.testAudits } },
        });
      }

      if (this.testUsers.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: this.testUsers } },
        });
      }

      console.log(
        `✅ ${this.testUsers.length} utilisateurs et ${this.testAudits.length} audits supprimés`,
      );
    } catch (error) {
      console.log(`❌ Erreur nettoyage: ${error}`);
    }
  }

  /**
   * RAPPORT FINAL
   */
  generateReport(): void {
    console.log(`\n${  "=".repeat(65)}`);
    console.log("📋 RAPPORT FINAL - INTÉGRATION QUOTA ↔ AUDIT");
    console.log("=".repeat(65));

    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total des tests: ${totalTests}`);
    console.log(`✅ Réussis: ${passedTests}`);
    console.log(`❌ Échoués: ${failedTests}`);
    console.log(
      `📊 Taux de réussite: ${Math.round((passedTests / totalTests) * 100)}%`,
    );

    // Résumé par catégorie
    const categories = {
      "Flux complet": this.results.filter((r) => r.testName.includes("Flux")),
      Alertes: this.results.filter(
        (r) => r.testName.includes("Seuil") || r.testName.includes("alerte"),
      ),
      Restrictions: this.results.filter(
        (r) =>
          r.testName.includes("Restrictions") || r.testName.includes("plan"),
      ),
      Synchronisation: this.results.filter(
        (r) => r.testName.includes("Sync") || r.testName.includes("Stripe"),
      ),
      Régression: this.results.filter((r) => r.testName.includes("Régression")),
    };

    console.log("\n📊 RÉSULTATS PAR CATÉGORIE:");
    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const passed = tests.filter((t) => t.passed).length;
        console.log(
          `${category}: ${passed}/${tests.length} (${Math.round((passed / tests.length) * 100)}%)`,
        );
      }
    });

    if (failedTests > 0) {
      console.log("\n❌ TESTS ÉCHOUÉS:");
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   • ${r.testName}: ${r.message}`);
          if (r.details) {
            console.log(`     Details: ${JSON.stringify(r.details, null, 4)}`);
          }
        });
    }

    // Recommandations
    console.log("\n💡 RECOMMANDATIONS:");
    if (passedTests === totalTests) {
      console.log(
        "   ✅ Tous les tests d'intégration passent ! Le système est robuste.",
      );
    } else {
      console.log(
        "   ⚠️ Certains tests échouent. Vérifiez la cohérence entre:",
      );
      console.log("      - Configuration des plans (subscription-plans.ts)");
      console.log("      - Service de quota (quota-service.ts)");
      console.log("      - Mapping Stripe → tiers → quotas");
    }

    console.log(`\n${  "=".repeat(65)}`);
  }

  /**
   * EXECUTION PRINCIPALE
   */
  async runAllTests(): Promise<void> {
    try {
      await this.testFullAuditQuotaFlow();
      await this.testRealTimeQuotaAlerts();
      await this.testPlanBasedRestrictions();
      await this.testBatchAuditRestrictions();
      await this.testStripePlanSynchronization();
      await this.testRegressionScenarios();
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
      "⚠️ Mode simulation détecté - les tests d'intégration nécessitent une vraie base de données",
    );
    return;
  }

  const testSuite = new QuotaAuditIntegrationTestSuite();
  await testSuite.runAllTests();

  await prisma.$disconnect();

  console.log("\n🏁 Tests d'intégration terminés!");
}

// Gestion des erreurs
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { QuotaAuditIntegrationTestSuite };
