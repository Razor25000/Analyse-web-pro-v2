/**
 * Script pour créer les produits et prix Stripe
 * À exécuter une seule fois pour configurer Stripe
 */

// Charger les variables d'environnement depuis .env.local
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

// Initialiser Stripe directement sans passer par env.ts
import Stripe from "stripe";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Configuration des plans (copie depuis config/subscription-plans.ts)
const SUBSCRIPTION_PLANS = {
  pro_monthly: {
    id: "pro_monthly",
    name: "Professionnel",
    description: "Idéal pour les professionnels actifs",
    price: 49,
    interval: "month" as const,
    features: [
      "500 audits par mois",
      "Toutes les analyses incluses",
      "Historique complet",
      "Rapports avancés",
      "Support prioritaire",
    ],
    auditsLimit: 500,
    popular: true,
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "Professionnel",
    description: "Économisez 20% avec le paiement annuel",
    price: 470,
    interval: "year" as const,
    features: [
      "500 audits par mois",
      "Toutes les analyses incluses",
      "Historique complet",
      "Rapports avancés",
      "Support prioritaire",
    ],
    auditsLimit: 500,
    popular: false,
  },
  premium_monthly: {
    id: "premium_monthly",
    name: "Premium",
    description: "Solution complète pour les agences",
    price: 100,
    interval: "month" as const,
    features: [
      "500 audits par mois",
      "Audits en lot (CSV)",
      "API d'intégration",
      "Rapports personnalisables",
      "Support dédié",
    ],
    auditsLimit: 500,
    popular: false,
  },
  premium_yearly: {
    id: "premium_yearly",
    name: "Premium",
    description: "Offre complète avec 20% de remise",
    price: 960,
    interval: "year" as const,
    features: [
      "500 audits par mois",
      "Audits en lot (CSV)",
      "API d'intégration",
      "Rapports personnalisables",
      "Support dédié",
    ],
    auditsLimit: 500,
    popular: false,
  },
} as const;

export async function createStripeProducts() {
  console.log("🚀 Création des produits Stripe...");
  console.log(
    "STRIPE_SECRET_KEY:",
    `${process.env.STRIPE_SECRET_KEY?.substring(0, 12)}...`,
  );

  try {
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
    const proPriceMonthly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: SUBSCRIPTION_PLANS.pro_monthly.price * 100, // en centimes
      currency: "eur",
      recurring: {
        interval: "month",
      },
      metadata: {
        plan_id: "pro_monthly",
      },
    });

    console.log("✅ Prix Pro Mensuel créé:", proPriceMonthly.id);

    // Prix Pro Annuel
    const proPriceYearly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: SUBSCRIPTION_PLANS.pro_yearly.price * 100, // en centimes
      currency: "eur",
      recurring: {
        interval: "year",
      },
      metadata: {
        plan_id: "pro_yearly",
      },
    });

    console.log("✅ Prix Pro Annuel créé:", proPriceYearly.id);

    // Produit Premium
    const premiumProduct = await stripe.products.create({
      name: "Analyseur Web Pro - Plan Premium",
      description: "Solution complète pour les agences et consultants",
      metadata: {
        plan_type: "premium",
      },
    });

    console.log("✅ Produit Premium créé:", premiumProduct.id);

    // Prix Premium Mensuel
    const premiumPriceMonthly = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: SUBSCRIPTION_PLANS.premium_monthly.price * 100, // en centimes
      currency: "eur",
      recurring: {
        interval: "month",
      },
      metadata: {
        plan_id: "premium_monthly",
      },
    });

    console.log("✅ Prix Premium Mensuel créé:", premiumPriceMonthly.id);

    // Prix Premium Annuel
    const premiumPriceYearly = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: SUBSCRIPTION_PLANS.premium_yearly.price * 100, // en centimes
      currency: "eur",
      recurring: {
        interval: "year",
      },
      metadata: {
        plan_id: "premium_yearly",
      },
    });

    console.log("✅ Prix Premium Annuel créé:", premiumPriceYearly.id);

    // Affichage des variables d'environnement à ajouter
    console.log(
      "\n🎯 Variables d'environnement à ajouter dans votre .env.local :",
    );
    console.log("");
    console.log("# Stripe Price IDs (générés automatiquement)");
    console.log(`STRIPE_PRO_MONTHLY_PRICE_ID="${proPriceMonthly.id}"`);
    console.log(`STRIPE_PRO_YEARLY_PRICE_ID="${proPriceYearly.id}"`);
    console.log(`STRIPE_PREMIUM_MONTHLY_PRICE_ID="${premiumPriceMonthly.id}"`);
    console.log(`STRIPE_PREMIUM_YEARLY_PRICE_ID="${premiumPriceYearly.id}"`);
    console.log("");

    console.log("🎉 Configuration Stripe terminée avec succès !");

    return {
      proProduct: proProduct.id,
      proPriceMonthly: proPriceMonthly.id,
      proPriceYearly: proPriceYearly.id,
      premiumProduct: premiumProduct.id,
      premiumPriceMonthly: premiumPriceMonthly.id,
      premiumPriceYearly: premiumPriceYearly.id,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la création des produits Stripe:", error);
    throw error;
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  createStripeProducts()
    .then(() => {
      console.log("✅ Script terminé avec succès !");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erreur fatale:", error);
      process.exit(1);
    });
}
