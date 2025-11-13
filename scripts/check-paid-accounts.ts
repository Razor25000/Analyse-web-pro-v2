#!/usr/bin/env tsx

/**
 * Script pour vérifier les comptes payants dans Prisma
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPaidAccounts() {
  console.log("🔍 VÉRIFICATION DES COMPTES PAYANTS DANS PRISMA\n");
  console.log("=".repeat(60));

  try {
    // 1. Vérifier tous les utilisateurs
    console.log("📋 TOUS LES UTILISATEURS:");
    console.log("-".repeat(40));
    const allUsers = await prisma.user.findMany({
      include: {
        subscriptions: true,
        auditsCreated: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Total utilisateurs: ${allUsers.length}\n`);

    for (const user of allUsers) {
      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Subscription Tier: ${user.subscriptionTier}`);
      console.log(`   Monthly Quota: ${user.monthlyQuota}`);
      console.log(`   Quota Used: ${user.quotaUsed}`);
      console.log(`   Stripe Customer ID: ${user.stripeCustomerId || "N/A"}`);
      console.log(`   Created: ${user.createdAt}`);

      if (user.subscriptions.length > 0) {
        console.log(`   📦 Abonnements (${user.subscriptions.length}):`);
        for (const sub of user.subscriptions) {
          console.log(
            `      - Plan: ${sub.plan}, Status: ${sub.status}, ID: ${sub.id}`,
          );
          console.log(
            `        Stripe Subscription ID: ${sub.stripeSubscriptionId || "N/A"}`,
          );
          console.log(`        Période: ${sub.periodStart} → ${sub.periodEnd}`);
        }
      } else {
        console.log(`   📦 Aucun abonnement trouvé`);
      }

      console.log(`   📊 Audits créés: ${user.auditsCreated.length}`);
      console.log("");
    }

    // 2. Vérifier les abonnements payants
    console.log("💳 ABONNEMENTS PAYANTS:");
    console.log("-".repeat(40));
    const paidSubscriptions = await prisma.subscription.findMany({
      where: {
        status: {
          in: ["active", "trialing", "past_due"],
        },
      },
      include: {
        user: true,
      },
    });

    console.log(`Abonnements actifs: ${paidSubscriptions.length}\n`);

    for (const sub of paidSubscriptions) {
      console.log(`💳 ${sub.plan} - ${sub.status}`);
      console.log(`   User: ${sub.user?.name} (${sub.user?.email})`);
      console.log(`   User ID: ${sub.userId}`);
      console.log(`   Stripe Subscription ID: ${sub.stripeSubscriptionId}`);
      console.log(`   Stripe Customer ID: ${sub.stripeCustomerId}`);
      console.log(`   Période: ${sub.periodStart} → ${sub.periodEnd}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log("");
    }

    // 3. Vérifier les utilisateurs avec subscriptionTier != free
    console.log("🎯 UTILISATEURS AVEC TIER PAYANT:");
    console.log("-".repeat(40));
    const paidTierUsers = await prisma.user.findMany({
      where: {
        subscriptionTier: {
          not: "free",
        },
      },
      include: {
        subscriptions: true,
      },
    });

    console.log(`Utilisateurs avec tier payant: ${paidTierUsers.length}\n`);

    for (const user of paidTierUsers) {
      console.log(`🎯 ${user.name} (${user.email})`);
      console.log(`   Tier: ${user.subscriptionTier}`);
      console.log(`   Abonnements: ${user.subscriptions.length}`);
      console.log("");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaidAccounts().catch((error) => {
  console.error("💥 Erreur fatale:", error);
  process.exit(1);
});
