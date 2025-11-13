#!/usr/bin/env tsx

/**
 * Script pour tester tous les plans d'abonnement de manière complète
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { QuotaService } from "@/lib/quota/quota-service";

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function testAllPlansComplete() {
  try {
    console.log("🎯 Test complet de tous les plans d'abonnement...\n");

    const plansToTest = [
      {
        plan: "pro",
        expectedTier: "basic",
        expectedQuota: 500,
        description: "Plan Pro (49€/mois)",
      },
      {
        plan: "pro_monthly",
        expectedTier: "basic",
        expectedQuota: 500,
        description: "Plan Pro Mensuel",
      },
      {
        plan: "pro_yearly",
        expectedTier: "basic",
        expectedQuota: 500,
        description: "Plan Pro Annuel",
      },
      {
        plan: "premium",
        expectedTier: "premium",
        expectedQuota: 2000,
        description: "Plan Premium",
      },
      {
        plan: "premium_monthly",
        expectedTier: "premium",
        expectedQuota: 2000,
        description: "Plan Premium Mensuel",
      },
      {
        plan: "premium_yearly",
        expectedTier: "premium",
        expectedQuota: 2000,
        description: "Plan Premium Annuel",
      },
      {
        plan: "ultra",
        expectedTier: "premium",
        expectedQuota: 2000,
        description: "Plan Ultra (Legacy)",
      },
    ];

    const testResults = [];

    for (const testCase of plansToTest) {
      console.log(`🔍 Test: ${testCase.description} (${testCase.plan})...`);

      // Créer un utilisateur de test
      const testUser = await prisma.user.create({
        data: {
          id: `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: `test+${Date.now()}+${testCase.plan}@example.com`,
          name: `Test User ${testCase.plan}`,
          emailVerified: true,
          subscriptionTier: "free",
          monthlyQuota: 5,
          quotaUsed: 0,
          quotaResetDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Appliquer le plan via QuotaService
      await QuotaService.updateQuotaForSubscription(testUser.id, testCase.plan);

      // Vérifier le résultat
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: {
          subscriptionTier: true,
          monthlyQuota: true,
        },
      });

      const isSuccess =
        updatedUser?.subscriptionTier === testCase.expectedTier &&
        updatedUser?.monthlyQuota === testCase.expectedQuota;

      console.log(
        `   - Tier attendu: ${testCase.expectedTier}, obtenu: ${updatedUser?.subscriptionTier}`,
      );
      console.log(
        `   - Quota attendu: ${testCase.expectedQuota}, obtenu: ${updatedUser?.monthlyQuota}`,
      );
      console.log(`   - Résultat: ${isSuccess ? "✅ RÉUSSI" : "❌ ÉCHOUÉ"}\n`);

      testResults.push({
        plan: testCase.plan,
        description: testCase.description,
        success: isSuccess,
        expectedTier: testCase.expectedTier,
        actualTier: updatedUser?.subscriptionTier,
        expectedQuota: testCase.expectedQuota,
        actualQuota: updatedUser?.monthlyQuota,
      });

      // Nettoyer
      await prisma.user.delete({ where: { id: testUser.id } });
    }

    // Résumé final
    console.log("📊 RÉSUMÉ FINAL:\n");
    const successCount = testResults.filter((r) => r.success).length;
    const totalCount = testResults.length;

    testResults.forEach((result, index) => {
      const status = result.success ? "✅" : "❌";
      console.log(`${index + 1}. ${status} ${result.description}`);
      if (!result.success) {
        console.log(
          `   ⚠️  Attendu: ${result.expectedTier} (${result.expectedQuota} audits)`,
        );
        console.log(
          `   🔍 Obtenu: ${result.actualTier} (${result.actualQuota} audits)`,
        );
      }
    });

    console.log(`\n🎉 RÉSULTAT: ${successCount}/${totalCount} tests réussis`);

    if (successCount === totalCount) {
      console.log("✅ Tous les plans fonctionnent correctement !");
    } else {
      console.log("❌ Certains plans nécessitent des corrections.");
    }
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testAllPlansComplete();
}
