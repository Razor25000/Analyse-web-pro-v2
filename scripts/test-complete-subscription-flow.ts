#!/usr/bin/env tsx

/**
 * Script pour tester le flux complet d'abonnement
 * Simule tout le processus depuis la création d'utilisateur jusqu'à l'abonnement
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { QuotaService } from "@/lib/quota/quota-service";

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function testCompleteSubscriptionFlow() {
  try {
    console.log("🎯 Test du flux complet d'abonnement...\n");

    // 1. Créer un utilisateur de test
    const testUser = await prisma.user.create({
      data: {
        id: `test_user_${Date.now()}`,
        email: `test+${Date.now()}@example.com`,
        name: "Test User",
        emailVerified: true,
        subscriptionTier: "free",
        monthlyQuota: 5,
        quotaUsed: 0,
        quotaResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ 1. Utilisateur créé: ${testUser.email}`);
    console.log(`   - Plan initial: ${testUser.subscriptionTier}`);
    console.log(`   - Quota initial: ${testUser.monthlyQuota}\n`);

    // 2. Simuler le clic sur le bouton pricing (pro_monthly)
    console.log("🖱️  2. Simulation du clic sur 'essayer 30 jours gratuits'...");
    const planSelected = "pro_monthly";
    console.log(`   - Plan sélectionné: ${planSelected}\n`);

    // 3. Simuler la redirection vers Stripe checkout
    console.log("💳 3. Simulation de la création de session Stripe...");
    const mockStripeSession = {
      id: `cs_test_${Date.now()}`,
      customer: `cus_test_${Date.now()}`,
      subscription: `sub_test_${Date.now()}`,
      metadata: {
        userId: testUser.id,
        plan: "pro", // Note: le plan est mappé vers "pro"
      },
    };
    console.log(`   - Session créée: ${mockStripeSession.id}\n`);

    // 4. Simuler le paiement réussi et le webhook
    console.log("🎉 4. Simulation du webhook checkout.session.completed...");

    // Créer l'abonnement comme le ferait le webhook
    const subscription = await prisma.subscription.create({
      data: {
        id: mockStripeSession.subscription,
        plan: "pro",
        referenceId: mockStripeSession.subscription,
        stripeCustomerId: mockStripeSession.customer,
        stripeSubscriptionId: mockStripeSession.subscription,
        status: "active",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        cancelAtPeriodEnd: false,
        seats: 1,
        userId: testUser.id,
      },
    });

    // Mettre à jour le quota via le service (comme le webhook)
    await QuotaService.updateQuotaForSubscription(testUser.id, "pro");

    // Mettre à jour le stripeCustomerId
    await prisma.user.update({
      where: { id: testUser.id },
      data: { stripeCustomerId: mockStripeSession.customer },
    });

    console.log(`   - Abonnement créé: ${subscription.id}`);
    console.log(`   - Status: ${subscription.status}\n`);

    // 5. Vérifier le résultat final
    console.log("🔍 5. Vérification du résultat final...");
    const finalUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: {
        email: true,
        subscriptionTier: true,
        monthlyQuota: true,
        quotaUsed: true,
        stripeCustomerId: true,
        subscriptions: {
          select: {
            plan: true,
            status: true,
          },
          where: {
            status: "active",
          },
        },
      },
    });

    if (finalUser) {
      console.log("✅ Résultat final:");
      console.log(`   - Email: ${finalUser.email}`);
      console.log(`   - Subscription Tier: ${finalUser.subscriptionTier}`);
      console.log(`   - Quota mensuel: ${finalUser.monthlyQuota}`);
      console.log(
        `   - Stripe Customer ID: ${finalUser.stripeCustomerId ? "Configuré" : "Non configuré"}`,
      );
      console.log(`   - Abonnements actifs: ${finalUser.subscriptions.length}`);

      if (finalUser.subscriptions.length > 0) {
        finalUser.subscriptions.forEach((sub, index) => {
          console.log(
            `     ${index + 1}. Plan: ${sub.plan}, Status: ${sub.status}`,
          );
        });
      }

      // Vérifier que tout est correct
      const isSuccess =
        finalUser.subscriptionTier === "basic" &&
        finalUser.monthlyQuota === 500 &&
        finalUser.subscriptions.length === 1 &&
        finalUser.subscriptions[0].plan === "pro" &&
        finalUser.subscriptions[0].status === "active";

      if (isSuccess) {
        console.log(
          "\n🎉 SUCCÈS ! Le flux d'abonnement fonctionne parfaitement !",
        );
      } else {
        console.log("\n❌ ÉCHEC ! Problème détecté dans le flux d'abonnement.");
      }
    }

    // 6. Nettoyage
    console.log("\n🧹 Nettoyage des données de test...");
    await prisma.subscription.delete({ where: { id: subscription.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log("✅ Nettoyage terminé !");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testCompleteSubscriptionFlow();
}
