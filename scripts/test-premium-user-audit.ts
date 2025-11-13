import { prisma } from "@/lib/prisma";
import { n8nClient } from "@/lib/n8n/client";
import { QuotaService } from "@/lib/quota/quota-service";
import { nanoid } from "nanoid";

async function testPremiumUserAudit() {
  console.log("🚀 Test d'audit pour utilisateur premium\n");

  try {
    // 1. Créer un utilisateur premium
    console.log("👤 Création d'un utilisateur premium...");
    const premiumUser = await prisma.user.create({
      data: {
        id: `premium-user-${nanoid()}`,
        name: "Premium User Test",
        email: `premium-${nanoid()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        subscriptionTier: "premium", // Plan 100€/mois
        monthlyQuota: 5000,
        quotaUsed: 0,
        quotaResetDate: new Date(),
      },
    });

    console.log("✅ Utilisateur premium créé:", {
      tier: premiumUser.subscriptionTier,
      quota: premiumUser.monthlyQuota,
    });

    // 2. Vérifier le quota et le plan
    const quotaInfo = await QuotaService.getUserQuota(premiumUser.id);
    console.log("📊 Quota premium:", quotaInfo);

    // 3. Déclencher l'audit
    console.log("\n🔗 Test webhook premium...");
    const correlationId = nanoid();

    const n8nResult = await n8nClient.triggerSingleAudit({
      url: "https://premium-site.com",
      email: premiumUser.email,
      userId: premiumUser.id,
      correlationId,
      planId: quotaInfo?.planId || "premium",
      orgSlug: undefined,
    });

    console.log("✅ Résultat:", {
      planId: quotaInfo?.planId,
      webhookUsed: n8nResult.webhookUsed,
      success: n8nResult.success,
    });

    // 4. Nettoyer
    await prisma.user.delete({ where: { id: premiumUser.id } });

    return n8nResult.webhookUsed;
  } catch (error) {
    console.error("❌ Erreur test premium:", error);
    throw error;
  }
}

async function testAllPlans() {
  console.log("🧪 TEST DE TOUS LES PLANS\n");

  const plans = [
    { tier: "free", quota: 5, description: "Plan gratuit" },
    { tier: "basic", quota: 500, description: "Plan 49€/mois" },
    { tier: "premium", quota: 5000, description: "Plan 100€/mois" },
  ];

  for (const plan of plans) {
    console.log(`\n📋 Test ${plan.description}:`);

    try {
      // Créer utilisateur avec ce plan
      const user = await prisma.user.create({
        data: {
          id: `${plan.tier}-user-${nanoid()}`,
          name: `${plan.tier} User`,
          email: `${plan.tier}-${nanoid()}@example.com`,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          subscriptionTier: plan.tier,
          monthlyQuota: plan.quota,
          quotaUsed: 0,
          quotaResetDate: new Date(),
        },
      });

      // Vérifier le quota
      const quotaInfo = await QuotaService.getUserQuota(user.id);

      // Tester le webhook
      const n8nResult = await n8nClient.triggerSingleAudit({
        url: `https://${plan.tier}-site.com`,
        email: user.email,
        userId: user.id,
        correlationId: nanoid(),
        planId: quotaInfo?.planId || plan.tier,
        orgSlug: undefined,
      });

      console.log(`✅ ${plan.description}: ${n8nResult.webhookUsed}`);

      // Nettoyer
      await prisma.user.delete({ where: { id: user.id } });
    } catch (error) {
      console.error(`❌ ${plan.description}: Erreur -`, error);
    }
  }
}

async function main() {
  console.log("🧪 TEST COMPLET DES WEBHOOKS PAR PLAN");
  console.log("=".repeat(50));

  try {
    await testAllPlans();

    console.log(`\n${  "=".repeat(50)}`);
    console.log("🎉 TOUS LES TESTS TERMINÉS!");
  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

main().catch(console.error);
