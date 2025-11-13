#!/usr/bin/env tsx

/**
 * Script de diagnostic pour le problème de quota Pro plan
 *
 * Ce script analyse l'état de la base de données pour comprendre pourquoi
 * un utilisateur avec plan Pro Mensuel voit seulement 5 audits au lieu de 500
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();

async function diagnoseQuotaIssue() {
  console.log("🔍 Diagnostic du problème de quota Pro plan\n");

  try {
    // 1. Rechercher tous les utilisateurs avec des plans payants
    console.log("1️⃣ Analyse des utilisateurs avec plans payants...");

    const paidUsers = await prisma.user.findMany({
      where: {
        subscriptionTier: {
          not: "free",
        },
      },
      include: {
        subscriptions: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    console.log(
      `   📊 Utilisateurs avec plans payants trouvés: ${paidUsers.length}\n`,
    );

    if (paidUsers.length === 0) {
      console.log("⚠️  Aucun utilisateur avec plan payant trouvé");
      return;
    }

    // 2. Analyser chaque utilisateur payant
    for (const user of paidUsers) {
      console.log(`👤 Utilisateur: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   📅 Créé le: ${user.createdAt.toISOString()}`);
      console.log(`   📋 Tier d'abonnement: ${user.subscriptionTier}`);
      console.log(`   📊 Quota mensuel: ${user.monthlyQuota}`);
      console.log(`   📈 Quota utilisé: ${user.quotaUsed}`);
      console.log(`   🔄 Reset date: ${user.quotaResetDate.toISOString()}`);
      console.log(
        `   💳 Stripe Customer ID: ${user.stripeCustomerId || "N/A"}`,
      );

      // Vérifier les quotas attendus selon le tier
      const expectedQuotas: Record<string, number> = {
        free: 5,
        basic: 500, // Pro plans
        premium: 2000,
        enterprise: 10000,
      };

      const expectedQuota = expectedQuotas[user.subscriptionTier || "free"];
      const isQuotaCorrect = user.monthlyQuota === expectedQuota;

      console.log(
        `   ✅ Quota attendu pour tier "${user.subscriptionTier}": ${expectedQuota}`,
      );
      console.log(
        `   ${isQuotaCorrect ? "✅" : "❌"} Quota ${isQuotaCorrect ? "CORRECT" : "INCORRECT"}`,
      );

      // Analyser l'abonnement Stripe associé
      if (user.subscriptions.length > 0) {
        const subscription = user.subscriptions[0];
        console.log(`   💰 Plan Stripe: ${subscription.plan}`);
        console.log(`   📄 Statut: ${subscription.status}`);
        console.log(
          `   🕐 Période: ${subscription.periodStart?.toISOString()} → ${subscription.periodEnd?.toISOString()}`,
        );
        console.log(
          `   🔄 Annulation en fin de période: ${subscription.cancelAtPeriodEnd ? "OUI" : "NON"}`,
        );
      } else {
        console.log(
          `   ❌ PROBLÈME: Aucun abonnement Stripe trouvé pour cet utilisateur payant!`,
        );
      }

      console.log("");
    }

    // 3. Vérifier l'API quota actuelle
    console.log("2️⃣ Test de l'API quota actuelle...");

    try {
      // Lire le contenu de l'API quota pour voir si elle utilise des valeurs hardcodées
      const quotaApiContent = await import("../app/api/user/quota/route");
      console.log("   📄 API quota chargée avec succès");
    } catch (error) {
      console.log(
        "   ❌ Erreur lors du chargement de l'API quota:",
        error.message,
      );
    }

    // 4. Compter les audits réels pour chaque utilisateur
    console.log("3️⃣ Comptage des audits réels...");

    for (const user of paidUsers) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const auditCount = await prisma.audit.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: firstDayOfMonth,
          },
        },
      });

      console.log(
        `   👤 ${user.email}: ${auditCount} audits ce mois (quotaUsed en DB: ${user.quotaUsed})`,
      );

      if (auditCount !== user.quotaUsed) {
        console.log(
          `   ⚠️  DÉSYNCHRONISATION: Audits réels (${auditCount}) ≠ quotaUsed DB (${user.quotaUsed})`,
        );
      }
    }

    // 5. Résumé des problèmes détectés
    console.log("\n📊 RÉSUMÉ DES PROBLÈMES DÉTECTÉS:");

    let problemsFound = 0;

    for (const user of paidUsers) {
      const expectedQuotas: Record<string, number> = {
        free: 5,
        basic: 500,
        premium: 2000,
        enterprise: 10000,
      };

      const expectedQuota = expectedQuotas[user.subscriptionTier || "free"];

      if (user.monthlyQuota !== expectedQuota) {
        console.log(
          `   ❌ ${user.email}: Quota incorrect (${user.monthlyQuota} au lieu de ${expectedQuota})`,
        );
        problemsFound++;
      }

      if (user.subscriptions.length === 0) {
        console.log(
          `   ❌ ${user.email}: Pas d'abonnement Stripe pour un utilisateur payant`,
        );
        problemsFound++;
      }
    }

    if (problemsFound === 0) {
      console.log("   ✅ Aucun problème détecté dans les données utilisateur");
      console.log(
        "   🔍 Le problème vient probablement de l'API quota temporaire avec valeurs hardcodées",
      );
    } else {
      console.log(
        `   ⚠️  ${problemsFound} problème(s) détecté(s) dans les données utilisateur`,
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  diagnoseQuotaIssue();
}

export { diagnoseQuotaIssue };
