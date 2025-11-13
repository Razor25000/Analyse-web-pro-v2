#!/usr/bin/env tsx

/**
 * Script de diagnostic pour vérifier l'état des utilisateurs avec plan payant
 * Vérifie la cohérence entre subscriptionTier, monthlyQuota, quotaUsed et les données d'abonnement
 */

import { config } from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), ".env.local") });

import { prisma } from "@/lib/prisma";

// Configuration des quotas attendus par tier
const EXPECTED_QUOTAS = {
  free: 10, // Quota gratuit
  basic: 50, // Plan Pro dans Prisma mais basic dans Supabase
  premium: 500, // Plan Premium
  enterprise: 2000,
} as const;

// Mapping Stripe plan → subscription tier
const STRIPE_PLAN_MAPPING = {
  free: "free",
  pro: "basic",
  pro_monthly: "basic",
  pro_yearly: "basic",
  premium: "premium",
  premium_monthly: "premium",
  premium_yearly: "premium",
  enterprise: "enterprise",
} as const;

type DiagnosticResult = {
  userId: string;
  email: string;
  name: string;
  subscriptionTier: string | null;
  monthlyQuota: number;
  quotaUsed: number;
  quotaResetDate: Date;
  stripeCustomerId: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  expectedQuota: number;
  quotaMismatch: boolean;
  tierMismatch: boolean;
  issues: string[];
}

async function diagnosePaidUserData() {
  console.log("🔍 Diagnostic des utilisateurs avec plan payant...\n");

  try {
    // 1. Récupérer tous les utilisateurs avec leurs abonnements
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          orderBy: { id: "desc" },
          take: 1, // Prendre le plus récent
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`📊 Total d'utilisateurs trouvés: ${users.length}\n`);

    // 2. Analyser chaque utilisateur
    const diagnostics: DiagnosticResult[] = [];
    const issues = {
      quotaMismatch: 0,
      tierMismatch: 0,
      missingSubscription: 0,
      orphanedSubscription: 0,
      inactiveSubscription: 0,
    };

    for (const user of users) {
      const subscription = user.subscriptions[0]; // Le plus récent
      const issues: string[] = [];

      // Déterminer le tier attendu basé sur l'abonnement
      let expectedTier = "free";
      let expectedQuota = EXPECTED_QUOTAS.free;

      if (subscription?.plan) {
        expectedTier =
          STRIPE_PLAN_MAPPING[
            subscription.plan as keyof typeof STRIPE_PLAN_MAPPING
          ] || "free";
        expectedQuota =
          EXPECTED_QUOTAS[expectedTier as keyof typeof EXPECTED_QUOTAS] ||
          EXPECTED_QUOTAS.free;
      }

      // Vérifications
      const quotaMismatch = user.monthlyQuota !== expectedQuota;
      const tierMismatch = user.subscriptionTier !== expectedTier;

      if (quotaMismatch) {
        issues.push(
          `Quota incorrect: ${user.monthlyQuota} au lieu de ${expectedQuota}`,
        );
      }

      if (tierMismatch) {
        issues.push(
          `Tier incorrect: "${user.subscriptionTier}" au lieu de "${expectedTier}"`,
        );
      }

      if (subscription && !subscription.status) {
        issues.push("Abonnement sans statut");
      }

      if (
        subscription &&
        subscription.status &&
        subscription.status !== "active"
      ) {
        issues.push(`Abonnement inactif: ${subscription.status}`);
      }

      if (!subscription && user.subscriptionTier !== "free") {
        issues.push("Tier payant sans abonnement correspondant");
      }

      if (user.stripeCustomerId && !subscription) {
        issues.push("Client Stripe sans abonnement");
      }

      // Vérifier la date de reset du quota
      const now = new Date();
      const resetDate = new Date(user.quotaResetDate);
      if (resetDate < now) {
        issues.push("Date de reset du quota dépassée");
      }

      const diagnostic: DiagnosticResult = {
        userId: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        monthlyQuota: user.monthlyQuota,
        quotaUsed: user.quotaUsed,
        quotaResetDate: user.quotaResetDate,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionStatus: subscription?.status || "none",
        subscriptionPlan: subscription?.plan || null,
        expectedQuota,
        quotaMismatch,
        tierMismatch,
        issues,
      };

      diagnostics.push(diagnostic);

      // Compter les problèmes
      if (quotaMismatch) issues.quotaMismatch++;
      if (tierMismatch) issues.tierMismatch++;
      if (!subscription && user.subscriptionTier !== "free")
        issues.missingSubscription++;
      if (user.stripeCustomerId && !subscription) issues.orphanedSubscription++;
      if (subscription && subscription.status !== "active")
        issues.inactiveSubscription++;
    }

    // 3. Afficher les résultats
    console.log("📈 RÉSUMÉ DES PROBLÈMES DÉTECTÉS:");
    console.log(`   Quotas incorrects: ${issues.quotaMismatch}`);
    console.log(`   Tiers incorrects: ${issues.tierMismatch}`);
    console.log(`   Abonnements manquants: ${issues.missingSubscription}`);
    console.log(`   Clients Stripe orphelins: ${issues.orphanedSubscription}`);
    console.log(`   Abonnements inactifs: ${issues.inactiveSubscription}\n`);

    // 4. Détails des utilisateurs avec des problèmes
    const usersWithIssues = diagnostics.filter((d) => d.issues.length > 0);

    if (usersWithIssues.length > 0) {
      console.log("🚨 UTILISATEURS AVEC PROBLÈMES:");
      usersWithIssues.forEach((user) => {
        console.log(`\n   👤 ${user.name} (${user.email})`);
        console.log(`      ID: ${user.userId}`);
        console.log(`      Tier actuel: ${user.subscriptionTier || "null"}`);
        console.log(
          `      Quota actuel: ${user.monthlyQuota} (utilisé: ${user.quotaUsed})`,
        );
        console.log(
          `      Abonnement: ${user.subscriptionPlan || "aucun"} (${user.subscriptionStatus})`,
        );
        console.log(
          `      Stripe Customer: ${user.stripeCustomerId || "aucun"}`,
        );
        console.log(`      Quota attendu: ${user.expectedQuota}`);
        console.log(`      Problèmes:`);
        user.issues.forEach((issue) => {
          console.log(`        - ${issue}`);
        });
      });
    } else {
      console.log(
        "✅ Aucun problème détecté ! Tous les utilisateurs ont des données cohérentes.",
      );
    }

    // 5. Utilisateurs avec plan payant actif
    const paidUsers = diagnostics.filter(
      (d) => d.subscriptionTier !== "free" && d.subscriptionStatus === "active",
    );

    if (paidUsers.length > 0) {
      console.log(
        `\n💰 UTILISATEURS AVEC PLAN PAYANT ACTIF (${paidUsers.length}):`,
      );
      paidUsers.forEach((user) => {
        console.log(`   ${user.name} (${user.email})`);
        console.log(
          `     Plan: ${user.subscriptionPlan} → Tier: ${user.subscriptionTier}`,
        );
        console.log(`     Quota: ${user.quotaUsed}/${user.monthlyQuota}`);
        const percentage = Math.round(
          (user.quotaUsed / user.monthlyQuota) * 100,
        );
        console.log(`     Utilisation: ${percentage}%`);
        console.log("");
      });
    }

    // 6. Statistiques par tier
    const tierStats = diagnostics.reduce(
      (acc, user) => {
        const tier = user.subscriptionTier || "null";
        if (!acc[tier]) acc[tier] = { count: 0, totalQuota: 0, totalUsed: 0 };
        acc[tier].count++;
        acc[tier].totalQuota += user.monthlyQuota;
        acc[tier].totalUsed += user.quotaUsed;
        return acc;
      },
      {} as Record<
        string,
        { count: number; totalQuota: number; totalUsed: number }
      >,
    );

    console.log("\n📊 STATISTIQUES PAR TIER:");
    Object.entries(tierStats).forEach(([tier, stats]) => {
      const avgQuota = Math.round(stats.totalQuota / stats.count);
      const avgUsed = Math.round(stats.totalUsed / stats.count);
      console.log(`   ${tier}: ${stats.count} utilisateurs`);
      console.log(`     Quota moyen: ${avgQuota}, Usage moyen: ${avgUsed}`);
    });

    return {
      totalUsers: users.length,
      usersWithIssues: usersWithIssues.length,
      paidUsers: paidUsers.length,
      issues,
      diagnostics,
    };
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script principal
if (require.main === module) {
  diagnosePaidUserData()
    .then((result) => {
      console.log("\n🎉 Diagnostic terminé avec succès!");
      console.log(`   Utilisateurs analysés: ${result.totalUsers}`);
      console.log(`   Utilisateurs avec problèmes: ${result.usersWithIssues}`);
      console.log(`   Utilisateurs payants actifs: ${result.paidUsers}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Échec du diagnostic:", error);
      process.exit(1);
    });
}

export { diagnosePaidUserData };
