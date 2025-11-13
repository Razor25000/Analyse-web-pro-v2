#!/usr/bin/env tsx

/**
 * Script de test pour vérifier la configuration du starter plan
 * Ce script vérifie que les variables d'environnement du starter plan sont correctement définies
 */

import { env } from "../src/lib/env";
import { loadEnvConfig } from "@next/env";

console.log("🧪 Test de la configuration du starter plan...\n");

// 1. Vérifier les variables d'environnement
console.log("1. Vérification des variables d’environnement du starter plan...");

try {
  // Charger la configuration depuis .env.local
  loadEnvConfig(process.cwd());

  // Tester l'accès aux variables via le schéma env
  const starterMonthlyPriceId = env.STRIPE_STARTER_MONTHLY_PRICE_ID;
  const starterYearlyPriceId = env.STRIPE_STARTER_YEARLY_PRICE_ID;

  console.log("✅ Variables d’environnement du starter plan:");
  console.log(`   - STRIPE_STARTER_MONTHLY_PRICE_ID: ${starterMonthlyPriceId}`);
  console.log(`   - STRIPE_STARTER_YEARLY_PRICE_ID: ${starterYearlyPriceId}`);

  // Vérifier que les IDs ne sont pas vides
  if (!starterMonthlyPriceId || starterMonthlyPriceId.trim() === "") {
    throw new Error("STRIPE_STARTER_MONTHLY_PRICE_ID est vide ou non défini");
  }

  if (!starterYearlyPriceId || starterYearlyPriceId.trim() === "") {
    throw new Error("STRIPE_STARTER_YEARLY_PRICE_ID est vide ou non défini");
  }

  console.log("✅ Les IDs de prix du starter plan sont valides");
} catch (error) {
  console.error(
    "❌ Erreur lors de la vérification des variables d’environnement:",
  );
  console.error(error);
  process.exit(1);
}

// 2. Vérifier la cohérence avec les autres plans
console.log("\n2. Vérification de la cohérence avec les autres plans...");

try {
  const plans = {
    starter: {
      monthly: env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      yearly: env.STRIPE_STARTER_YEARLY_PRICE_ID,
    },
    pro: {
      monthly: env.STRIPE_PRO_MONTHLY_PRICE_ID,
      yearly: env.STRIPE_PRO_YEARLY_PRICE_ID,
    },
    premium: {
      monthly: env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      yearly: env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    },
  };

  console.log("✅ Configuration des plans:");
  console.log(
    `   - Starter: ${plans.starter.monthly} (mensuel), ${plans.starter.yearly} (annuel)`,
  );
  console.log(
    `   - Pro: ${plans.pro.monthly} (mensuel), ${plans.pro.yearly} (annuel)`,
  );
  console.log(
    `   - Premium: ${plans.premium.monthly} (mensuel), ${plans.premium.yearly} (annuel)`,
  );

  // Vérifier qu'aucun ID n'est identique (éviter les conflits)
  const allIds = Object.values(plans).flatMap((plan) => Object.values(plan));
  const uniqueIds = new Set(allIds);

  if (allIds.length !== uniqueIds.size) {
    console.warn(
      "⚠️ Attention: Certains IDs de prix sont identiques entre les plans",
    );
  } else {
    console.log("✅ Tous les IDs de prix sont uniques");
  }
} catch (error) {
  console.error("❌ Erreur lors de la vérification des plans:");
  console.error(error);
  process.exit(1);
}

// 3. Vérifier que les variables sont bien accessibles au runtime
console.log("\n3. Vérification de l'accès au runtime...");

try {
  // Simuler l'accès aux variables comme dans l'application
  const testEnv = {
    STRIPE_STARTER_MONTHLY_PRICE_ID:
      process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    STRIPE_STARTER_YEARLY_PRICE_ID: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    STRIPE_PREMIUM_MONTHLY_PRICE_ID:
      process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    STRIPE_PREMIUM_YEARLY_PRICE_ID: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  };

  const missingVars = Object.entries(testEnv)
    .filter(([_, value]) => !value || value.trim() === "")
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error("❌ Variables d’environnement manquantes au runtime:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  console.log(
    "✅ Toutes les variables d’environnement sont accessibles au runtime",
  );
} catch (error) {
  console.error("❌ Erreur lors de la vérification du runtime:");
  console.error(error);
  process.exit(1);
}

console.log(
  "\n🎉 Test réussi ! La configuration du starter plan est correcte.",
);
console.log("\n📝 Résumé:");
console.log("   - Les variables d’environnement du starter plan sont définies");
console.log("   - Les IDs de prix sont valides et non vides");
console.log("   - La configuration est cohérente avec les autres plans");
console.log("   - Les variables sont accessibles au runtime");
console.log(
  "\n🚀 Le starter plan (29€/mois) est maintenant prêt à être utilisé !",
);
