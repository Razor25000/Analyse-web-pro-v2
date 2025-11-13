#!/usr/bin/env tsx

/**
 * Script pour tester l'endpoint Stripe avec tous les plans
 */

import { config } from "dotenv";

// Charger les variables d'environnement
config({ path: ".env.local" });

async function testStripeEndpoints() {
  console.log("🔍 Test des endpoints Stripe pour tous les plans...\n");

  const plansToTest = [
    "pro_monthly",
    "pro_yearly",
    "premium_monthly",
    "premium_yearly",
  ];

  const PLAN_TO_PRICE_ID = {
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  };

  console.log("💰 Configuration des Price IDs Stripe:");
  Object.entries(PLAN_TO_PRICE_ID).forEach(([plan, priceId]) => {
    console.log(`   ${plan}: ${priceId ? `✅ ${priceId}` : "❌ Manquant"}`);
  });

  console.log("\n🔗 URLs de test (nécessitent une session utilisateur):");
  plansToTest.forEach((plan) => {
    const priceId = PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID];
    const status = priceId ? "✅" : "❌";
    const testUrl = `http://localhost:3000/api/stripe/create-checkout-session?plan=${plan}&userId=test`;
    console.log(`   ${status} ${plan}: ${testUrl}`);
  });

  console.log("\n📋 Liens depuis la section pricing:");
  const pricingLinks = [
    {
      plan: "pro_monthly",
      link: "/auth/signup?plan=pro_monthly",
      description: "Plan Pro Mensuel (49€)",
    },
    {
      plan: "pro_yearly",
      link: "/auth/signup?plan=pro_yearly",
      description: "Plan Pro Annuel (470€)",
    },
    {
      plan: "premium_monthly",
      link: "/auth/signup?plan=premium_monthly",
      description: "Plan Premium Mensuel (100€)",
    },
    {
      plan: "premium_yearly",
      link: "/auth/signup?plan=premium_yearly",
      description: "Plan Premium Annuel (960€)",
    },
  ];

  pricingLinks.forEach(({ plan, link, description }) => {
    const priceId = PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID];
    const status = priceId ? "✅" : "❌";
    console.log(`   ${status} ${description}: ${link}`);
  });

  console.log("\n🎉 RÉSUMÉ:");
  const validPlans = plansToTest.filter(
    (plan) => PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID],
  );
  const invalidPlans = plansToTest.filter(
    (plan) => !PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID],
  );

  console.log(
    `✅ Plans configurés: ${validPlans.length}/${plansToTest.length}`,
  );
  if (validPlans.length > 0) {
    console.log(`   - ${validPlans.join(", ")}`);
  }

  if (invalidPlans.length > 0) {
    console.log(`❌ Plans manquants: ${invalidPlans.length}`);
    console.log(`   - ${invalidPlans.join(", ")}`);
  }

  if (validPlans.length === plansToTest.length) {
    console.log("\n🎉 Tous les plans sont correctement configurés ! ✅");
  } else {
    console.log("\n⚠️  Certains plans nécessitent une configuration Stripe.");
  }
}

if (require.main === module) {
  testStripeEndpoints();
}
