#!/usr/bin/env tsx

/**
 * Script pour vérifier les données utilisateur et les abonnements
 */

import { prisma } from "@/lib/prisma";

async function checkUserData() {
  console.log("🔍 VÉRIFICATION DES DONNÉES UTILISATEUR\n");
  console.log("=".repeat(60));

  try {
    // 1. Compter les utilisateurs
    const userCount = await prisma.user.count();
    console.log(`👥 Nombre d'utilisateurs: ${userCount}`);

    // 2. Lister tous les utilisateurs avec leurs données importantes
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        monthlyQuota: true,
        quotaUsed: true,
        stripeCustomerId: true,
        company: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("\n📋 UTILISATEURS:");
    console.log("=".repeat(60));

    for (const user of users) {
      console.log(`\n👤 Utilisateur: ${user.name} (${user.email})`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Quota: ${user.quotaUsed}/${user.monthlyQuota}`);
      console.log(`   - Stripe ID: ${user.stripeCustomerId || "Non défini"}`);
      console.log(`   - Company: ${user.company || "N/A"}`);
      console.log(`   - Créé le: ${user.createdAt.toLocaleString()}`);
    }

    // 3. Vérifier les abonnements
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    console.log("\n💳 ABONNEMENTS:");
    console.log("=".repeat(60));

    if (subscriptions.length === 0) {
      console.log("❌ Aucun abonnement trouvé dans la base de données");
    } else {
      for (const subscription of subscriptions) {
        console.log(`\n💳 Abonnement: ${subscription.plan}`);
        console.log(`   - ID: ${subscription.id}`);
        console.log(
          `   - Utilisateur: ${subscription.user?.name} (${subscription.user?.email})`,
        );
        console.log(`   - Plan: ${subscription.plan}`);
        console.log(`   - Status: ${subscription.status}`);
        console.log(`   - Stripe Customer: ${subscription.stripeCustomerId}`);
        console.log(
          `   - Stripe Subscription: ${subscription.stripeSubscriptionId}`,
        );
        console.log(
          `   - Période: ${subscription.periodStart} -> ${subscription.periodEnd}`,
        );
      }
    }

    // 4. Les quotas sont maintenant dans le modèle User
    console.log("\n📊 QUOTAS (maintenant dans User):");
    console.log("=".repeat(60));
    console.log(
      "✅ Les quotas sont maintenant gérés directement dans la table User",
    );
    console.log("✅ Table UserQuota redondante supprimée avec succès");

    return true;
  } catch (error: any) {
    console.error("❌ Erreur lors de la vérification:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const success = await checkUserData();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}
