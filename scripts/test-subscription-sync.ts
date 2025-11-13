#!/usr/bin/env tsx

/**
 * Script pour tester manuellement la synchronisation d'un abonnement
 * Simule ce qui se passe quand un webhook Stripe est reçu
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { QuotaService } from "@/lib/quota/quota-service";

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function testSubscriptionSync() {
  try {
    console.log("🔍 Test de la synchronisation d'abonnement...");

    // Trouver l'utilisateur le plus récent (probablement celui qui vient de payer)
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: true,
      },
    });

    if (!user) {
      console.log("❌ Aucun utilisateur trouvé");
      return;
    }

    console.log(`👤 Utilisateur trouvé: ${user.email} (ID: ${user.id})`);
    console.log(`📊 Plan actuel: ${user.subscriptionTier}`);
    console.log(`💰 Quota mensuel: ${user.monthlyQuota}`);
    console.log(`📈 Quota utilisé: ${user.quotaUsed}`);

    // Vérifier les abonnements existants
    if (user.subscriptions.length > 0) {
      console.log("\n📋 Abonnements existants:");
      user.subscriptions.forEach((sub, index) => {
        console.log(`  ${index + 1}. Plan: ${sub.plan}, Status: ${sub.status}`);
      });
    } else {
      console.log(
        "\n⚠️  Aucun abonnement trouvé - c'est probablement le problème !",
      );
    }

    // Simuler l'activation d'un abonnement pro_monthly
    console.log(
      "\n🚀 Simulation de l'activation d'un abonnement pro_monthly...",
    );

    // Créer un faux abonnement
    const fakeSubscription = await prisma.subscription.create({
      data: {
        id: `test_sub_${Date.now()}`,
        plan: "pro",
        referenceId: `stripe_sub_${Date.now()}`,
        stripeCustomerId: user.stripeCustomerId || `cus_test_${Date.now()}`,
        stripeSubscriptionId: `sub_test_${Date.now()}`,
        status: "active",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        cancelAtPeriodEnd: false,
        seats: 1,
        userId: user.id,
      },
    });

    console.log(`✅ Abonnement créé: ${fakeSubscription.id}`);

    // Mettre à jour le quota de l'utilisateur via le service
    await QuotaService.updateQuotaForSubscription(user.id, "pro");

    // Vérifier le résultat
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscriptionTier: true,
        monthlyQuota: true,
        quotaUsed: true,
      },
    });

    console.log("\n🎉 Résultat après mise à jour:");
    console.log(`📊 Plan: ${updatedUser?.subscriptionTier}`);
    console.log(`💰 Quota mensuel: ${updatedUser?.monthlyQuota}`);
    console.log(`📈 Quota utilisé: ${updatedUser?.quotaUsed}`);

    // Nettoyer le test
    console.log("\n🧹 Nettoyage du test...");
    await prisma.subscription.delete({
      where: { id: fakeSubscription.id },
    });

    console.log("✅ Test terminé avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testSubscriptionSync();
}
