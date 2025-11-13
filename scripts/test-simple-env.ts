#!/usr/bin/env tsx

/**
 * Test simple pour vérifier le chargement des variables d'environnement
 * Ce script contourne le système de validation @t3-oss/env-nextjs
 * pour vérifier si les variables sont bien chargées depuis .env.local
 */

import { config } from "dotenv";

console.log("🧪 Test simple du chargement des variables d'environnement...\n");

// 1. Charger manuellement le fichier .env.local
console.log("1. Chargement du fichier .env.local...");
try {
  const result = config({ path: ".env.local" });
  console.log("✅ Fichier .env.local chargé avec succès");
  console.log(
    `   Variables trouvées: ${Object.keys(result.parsed || {}).length}`,
  );
} catch (error) {
  console.error("❌ Erreur lors du chargement de .env.local:", error);
}

// 2. Vérifier les variables directement depuis process.env
console.log("\n2. Vérification des variables dans process.env...");

const varsToCheck = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_STARTER_MONTHLY_PRICE_ID",
  "STRIPE_STARTER_YEARLY_PRICE_ID",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_YEARLY_PRICE_ID",
  "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
  "STRIPE_PREMIUM_YEARLY_PRICE_ID",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "N8N_WEBHOOK_BASE_URL",
  "N8N_WEBHOOK_SECRET",
];

let allVarsPresent = true;
varsToCheck.forEach((varName) => {
  const value = process.env[varName];
  if (value && value.trim() !== "") {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: [VIDE OU INDÉFINI]`);
    allVarsPresent = false;
  }
});

// 3. Vérifier spécifiquement les variables du starter plan
console.log("\n3. Vérification spécifique des variables du starter plan...");

const starterMonthly = process.env.STRIPE_STARTER_MONTHLY_PRICE_ID;
const starterYearly = process.env.STRIPE_STARTER_YEARLY_PRICE_ID;

if (starterMonthly && starterMonthly.trim() !== "") {
  console.log(`✅ STRIPE_STARTER_MONTHLY_PRICE_ID: ${starterMonthly}`);
} else {
  console.log("❌ STRIPE_STARTER_MONTHLY_PRICE_ID: [VIDE OU INDÉFINI]");
  allVarsPresent = false;
}

if (starterYearly && starterYearly.trim() !== "") {
  console.log(`✅ STRIPE_STARTER_YEARLY_PRICE_ID: ${starterYearly}`);
} else {
  console.log("❌ STRIPE_STARTER_YEARLY_PRICE_ID: [VIDE OU INDÉFINI]");
  allVarsPresent = false;
}

// 4. Test de cohérence
console.log("\n4. Test de cohérence des variables...");

const plans = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  },
};

console.log("Configuration des plans:");
Object.entries(plans).forEach(([planName, planConfig]) => {
  console.log(
    `   - ${planName.charAt(0).toUpperCase() + planName.slice(1)}: ${planConfig.monthly} (mensuel), ${planConfig.yearly} (annuel)`,
  );
});

// Vérifier qu'aucun ID n'est identique
const allIds = Object.values(plans)
  .flatMap((plan) => Object.values(plan))
  .filter(Boolean);
const uniqueIds = new Set(allIds);

if (allIds.length !== uniqueIds.size) {
  console.warn(
    "⚠️ Attention: Certains IDs de prix sont identiques entre les plans",
  );
} else {
  console.log("✅ Tous les IDs de prix sont uniques");
}

// 5. Conclusion
console.log("\n📋 Résumé:");

if (allVarsPresent) {
  console.log(
    "✅ Toutes les variables d'environnement sont présentes et définies",
  );
  console.log("✅ Les variables du starter plan sont correctement configurées");
  console.log("🎉 Le test simple est réussi !");

  console.log("\n🔍 Prochaine étape:");
  console.log(
    "   Le problème semble venir du système de validation @t3-oss/env-nextjs",
  );
  console.log(
    "   Les variables sont bien chargées depuis .env.local mais la validation échoue",
  );
} else {
  console.log(
    "❌ Certaines variables d'environnement sont manquantes ou vides",
  );
  console.log(
    "🔍 Vérifiez que le fichier .env.local contient bien toutes les variables requises",
  );
  console.log(
    "📝 Le fichier .env.local doit être dans le répertoire racine du projet",
  );
}

console.log("\n🚀 Test simple terminé.");
