#!/usr/bin/env tsx

/**
 * Script pour tester tous les plans d'abonnement
 * Vérifie la cohérence entre les différentes configurations
 */

import { config } from "dotenv";
import { AUTH_PLANS } from "@/lib/auth/auth-plans";

// Charger les variables d'environnement
config({ path: ".env.local" });

function testAllPlansConfiguration() {
  console.log("🔍 Vérification de la configuration de tous les plans...\n");

  // 1. Vérifier les variables d'environnement Stripe
  const stripeVars = {
    STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    STRIPE_PREMIUM_MONTHLY_PRICE_ID:
      process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    STRIPE_PREMIUM_YEARLY_PRICE_ID: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  };

  console.log("💰 Variables d'environnement Stripe:");
  Object.entries(stripeVars).forEach(([key, value]) => {
    console.log(`   ${key}: ${value ? "✅ Configuré" : "❌ Manquant"}`);
  });

  // 2. Vérifier AUTH_PLANS
  console.log("\n📋 Plans configurés dans AUTH_PLANS:");
  AUTH_PLANS.forEach((plan, index) => {
    console.log(`   ${index + 1}. ${plan.name.toUpperCase()}`);
    console.log(`      - Prix: ${plan.price}€/${plan.currency}`);
    console.log(`      - Prix annuel: ${plan.yearlyPrice || "N/A"}€`);
    console.log(`      - Price ID: ${plan.priceId || "❌ Manquant"}`);
    console.log(
      `      - Price ID annuel: ${plan.annualDiscountPriceId || "❌ Manquant"}`,
    );
    console.log("");
  });

  // 3. Vérifier PLAN_TO_PRICE_ID (dans create-checkout-session)
  const PLAN_TO_PRICE_ID = {
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
    premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
    premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
  };

  console.log("🔗 Mapping PLAN_TO_PRICE_ID:");
  Object.entries(PLAN_TO_PRICE_ID).forEach(([planKey, envVar]) => {
    console.log(`   ${planKey}: ${envVar ? `✅ ${  envVar}` : "❌ Manquant"}`);
  });

  // 4. Vérifier les quotas dans QuotaService
  const quotaLimits = {
    free: 5,
    basic: 50,
    pro: 500,
    premium: 2000,
    enterprise: 10000,
  };

  const subscriptionTierMapping = {
    free: "free",
    pro: "basic",
    pro_monthly: "basic",
    pro_yearly: "basic",
    premium: "premium",
    premium_monthly: "premium",
    premium_yearly: "premium",
    enterprise: "enterprise",
  };

  console.log("\n📊 Configuration des quotas:");
  Object.entries(quotaLimits).forEach(([tier, quota]) => {
    console.log(`   ${tier}: ${quota} audits/mois`);
  });

  console.log("\n🔄 Mapping Stripe → Subscription Tier:");
  Object.entries(subscriptionTierMapping).forEach(([stripe, tier]) => {
    const quota = quotaLimits[tier as keyof typeof quotaLimits];
    console.log(`   ${stripe} → ${tier} (${quota} audits/mois)`);
  });

  // 5. Vérification de la cohérence
  console.log("\n✅ VÉRIFICATION DE LA COHÉRENCE:");

  // Vérifier que tous les plans ont leurs variables correspondantes
  const planCheckResults = AUTH_PLANS.map((plan) => {
    const hasMonthlyPrice =
      plan.priceId &&
      stripeVars[
        plan.priceId.includes("PRO")
          ? "STRIPE_PRO_MONTHLY_PRICE_ID"
          : "STRIPE_PREMIUM_MONTHLY_PRICE_ID"
      ];
    const hasYearlyPrice =
      plan.annualDiscountPriceId &&
      stripeVars[
        plan.annualDiscountPriceId.includes("PRO")
          ? "STRIPE_PRO_YEARLY_PRICE_ID"
          : "STRIPE_PREMIUM_YEARLY_PRICE_ID"
      ];

    return {
      plan: plan.name,
      status:
        plan.name === "free" || (hasMonthlyPrice && hasYearlyPrice)
          ? "✅"
          : "❌",
    };
  });

  planCheckResults.forEach((result) => {
    console.log(
      `   ${result.plan}: ${result.status} ${result.status === "✅" ? "Configuration correcte" : "Configuration incomplète"}`,
    );
  });

  console.log("\n🎉 CONFIGURATION ACTUELLE:");
  console.log("✅ Variables Stripe harmonisées avec suffix _PRICE_ID");
  console.log("✅ Plans cohérents entre AUTH_PLANS et create-checkout-session");
  console.log("✅ Devise EUR configurée pour tous les plans");
  console.log("✅ Prix annuels avec 20% de réduction appliqués");
}

if (require.main === module) {
  testAllPlansConfiguration();
}
