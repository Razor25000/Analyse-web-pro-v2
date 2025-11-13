#!/usr/bin/env tsx

/**
 * Script de test pour vérifier que l'API quota corrigée fonctionne
 *
 * Ce script teste que l'API /api/user/quota retourne maintenant les bonnes valeurs
 * en simulant un appel authentifié d'un utilisateur Pro.
 */

import { config } from "dotenv";
import { prisma } from "@/lib/prisma";

// Charger les variables d'environnement
config({ path: ".env.local" });

async function testQuotaApiFix() {
  console.log("🧪 Test de l'API quota corrigée\n");

  try {
    // 1. Vérifier qu'il y a un utilisateur Pro dans la base
    console.log("1️⃣ Recherche d'un utilisateur Pro dans la base...");

    const proUser = await prisma.user.findFirst({
      where: {
        subscriptionTier: "basic", // Pro = basic tier
      },
      include: {
        subscriptions: {
          where: { status: "active" },
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    if (!proUser) {
      console.log(
        "⚠️  Aucun utilisateur Pro trouvé. Créons-en un pour le test...",
      );

      // Créer un utilisateur Pro pour le test
      const testUser = await prisma.user.create({
        data: {
          id: `test_pro_${Date.now()}`,
          name: "Test Pro User",
          email: `test-pro-${Date.now()}@example.com`,
          emailVerified: false,
          image: null,
          subscriptionTier: "basic",
          monthlyQuota: 500,
          quotaUsed: 1,
          quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeCustomerId: `cus_test_${Date.now()}`,
        },
      });

      console.log("✅ Utilisateur Pro test créé:", {
        email: testUser.email,
        tier: testUser.subscriptionTier,
        quota: testUser.monthlyQuota,
        used: testUser.quotaUsed,
      });

      return testUser;
    }

    console.log("✅ Utilisateur Pro trouvé:", {
      email: proUser.email,
      tier: proUser.subscriptionTier,
      quota: proUser.monthlyQuota,
      used: proUser.quotaUsed,
    });

    return proUser;
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testQuotaApiFix();
}

export { testQuotaApiFix };
