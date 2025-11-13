/**
 * Script pour créer les produits et prix Stripe
 * À exécuter une seule fois pour configurer Stripe
 */

// Charger les variables d'environnement depuis .env.local
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { stripe } from "@/lib/stripe";
import { SUBSCRIPTION_PLANS } from "@/config/subscription-plans";

export async function createStripeProducts() {
  console.log("🚀 Création des produits Stripe avec les nouveaux prix...");

  // Produit Starter
  const starterProduct = await stripe.products.create({
    name: "Analyseur Web Pro - Plan Starter",
    description: "Idéal pour les freelances et petites équipes qui démarrent",
    metadata: {
      plan_type: "starter",
    },
  });

  console.log("✅ Produit Starter créé:", starterProduct.id);

  // Prix Starter Mensuel
  const starterMonthlyPrice = await stripe.prices.create({
    product: starterProduct.id,
    currency: "eur",
    unit_amount: 2900, // 29€ en centimes
    recurring: {
      interval: "month",
    },
    metadata: {
      plan_id: "starter_monthly",
    },
  });

  console.log("✅ Prix Starter Mensuel créé:", starterMonthlyPrice.id);

  // Prix Starter Annuel (avec réduction 20%)
  const starterYearlyPrice = await stripe.prices.create({
    product: starterProduct.id,
    currency: "eur",
    unit_amount: 27800, // 278€ en centimes (économie de 70€)
    recurring: {
      interval: "year",
    },
    metadata: {
      plan_id: "starter_yearly",
    },
  });

  console.log("✅ Prix Starter Annuel créé:", starterYearlyPrice.id);

  // Produit Pro
  const proProduct = await stripe.products.create({
    name: "Analyseur Web Pro - Plan Professionnel",
    description:
      "Parfait pour les professionnels du web qui analysent régulièrement des sites",
    metadata: {
      plan_type: "pro",
    },
  });

  console.log("✅ Produit Pro créé:", proProduct.id);

  // Prix Pro Mensuel
  const proMonthlyPrice = await stripe.prices.create({
    product: proProduct.id,
    currency: "eur",
    unit_amount: 7900, // 79€ en centimes (CORRIGÉ)
    recurring: {
      interval: "month",
    },
    metadata: {
      plan_id: "pro_monthly",
    },
  });

  console.log("✅ Prix Pro Mensuel créé:", proMonthlyPrice.id);

  // Prix Pro Annuel (avec réduction 20%)
  const proYearlyPrice = await stripe.prices.create({
    product: proProduct.id,
    currency: "eur",
    unit_amount: 75900, // 759€ en centimes (CORRIGÉ - économie de 189€)
    recurring: {
      interval: "year",
    },
    metadata: {
      plan_id: "pro_yearly",
    },
  });

  console.log("✅ Prix Pro Annuel créé:", proYearlyPrice.id);

  // Produit Premium
  const premiumProduct = await stripe.products.create({
    name: "Analyseur Web Pro - Plan Premium",
    description:
      "Solution complète avec audits en lot et fonctionnalités avancées",
    metadata: {
      plan_type: "premium",
    },
  });

  console.log("✅ Produit Premium créé:", premiumProduct.id);

  // Prix Premium Mensuel
  const premiumMonthlyPrice = await stripe.prices.create({
    product: premiumProduct.id,
    currency: "eur",
    unit_amount: 14900, // 149€ en centimes (CORRIGÉ)
    recurring: {
      interval: "month",
    },
    metadata: {
      plan_id: "premium_monthly",
    },
  });

  console.log("✅ Prix Premium Mensuel créé:", premiumMonthlyPrice.id);

  // Prix Premium Annuel (avec réduction 20%)
  const premiumYearlyPrice = await stripe.prices.create({
    product: premiumProduct.id,
    currency: "eur",
    unit_amount: 143000, // 1430€ en centimes (CORRIGÉ - économie de 358€)
    recurring: {
      interval: "year",
    },
    metadata: {
      plan_id: "premium_yearly",
    },
  });

  console.log("✅ Prix Premium Annuel créé:", premiumYearlyPrice.id);

  // Résumé des IDs à ajouter dans .env
  console.log("\n📋 Variables d'environnement à ajouter dans .env:");
  console.log(`STRIPE_STARTER_MONTHLY_PRICE_ID=${starterMonthlyPrice.id}`);
  console.log(`STRIPE_STARTER_YEARLY_PRICE_ID=${starterYearlyPrice.id}`);
  console.log(`STRIPE_PRO_MONTHLY_PRICE_ID=${proMonthlyPrice.id}`);
  console.log(`STRIPE_PRO_YEARLY_PRICE_ID=${proYearlyPrice.id}`);
  console.log(`STRIPE_PREMIUM_MONTHLY_PRICE_ID=${premiumMonthlyPrice.id}`);
  console.log(`STRIPE_PREMIUM_YEARLY_PRICE_ID=${premiumYearlyPrice.id}`);

  console.log("\n💰 Nouveaux prix configurés:");
  console.log("• Starter: 29€/mois - 278€/an (23€/mois équivalent)");
  console.log("• Pro: 79€/mois - 759€/an (63€/mois équivalent)");
  console.log("• Premium: 149€/mois - 1430€/an (119€/mois équivalent)");
  console.log("• Réduction annuelle: 20% sur tous les plans payants");

  return {
    starterProduct,
    starterMonthlyPrice,
    starterYearlyPrice,
    proProduct,
    proMonthlyPrice,
    proYearlyPrice,
    premiumProduct,
    premiumMonthlyPrice,
    premiumYearlyPrice,
  };
}

// Fonction pour lister les produits existants
export async function listStripeProducts() {
  const products = await stripe.products.list({
    expand: ["data.default_price"],
  });
  const prices = await stripe.prices.list({ expand: ["data.product"] });

  console.log("\n📦 Produits Stripe existants:");
  products.data.forEach((product) => {
    console.log(`- ${product.name} (${product.id})`);
  });

  console.log("\n💰 Prix Stripe existants:");
  prices.data.forEach((price) => {
    console.log(
      `- ${price.unit_amount! / 100}€/${price.recurring?.interval} (${price.id})`,
    );
  });

  return { products: products.data, prices: prices.data };
}

// Script principal (si exécuté directement)
if (require.main === module) {
  createStripeProducts()
    .then(() => {
      console.log("🎉 Configuration Stripe terminée !");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erreur:", error);
      process.exit(1);
    });
}
