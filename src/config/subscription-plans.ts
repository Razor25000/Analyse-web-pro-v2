/**
 * Configuration des Plans d'Abonnement - Système par Utilisateur
 * Remplacement du système d'organisation par un modèle utilisateur simple
 */

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Gratuit",
    description: "Parfait pour découvrir le service",
    price: 0,
    yearlyPrice: 0,
    currency: "EUR",
    interval: "month",

    // Limites du plan
    auditsPerMonth: 3,
    features: ["audits_simple", "dashboard_basique", "support_email"],

    // UI/UX
    badge: null,
    popular: false,

    // Stripe (pas de produit pour gratuit)
    stripePriceId: null,
    stripeYearlyPriceId: null,
  },

  starter_monthly: {
    id: "starter_monthly",
    name: "Starter",
    description: "Idéal pour les freelances et petites équipes",
    price: 29,
    yearlyPrice: null,
    currency: "EUR",
    interval: "month",

    // Limites du plan
    auditsPerMonth: 20,
    features: [
      "audits_simple",
      "dashboard_avance",
      "historique_complet",
      "support_prioritaire",
      "rapports_detailles",
    ],

    // UI/UX
    badge: null,
    popular: true, // Plan le plus populaire

    // Stripe (à configurer)
    stripePriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripeYearlyPriceId: null,
  },

  starter_yearly: {
    id: "starter_yearly",
    name: "Starter Annuel",
    description: "Économisez 20% avec le paiement annuel",
    price: 278, // 29 * 12 * 0.8 = 278€ (au lieu de 348€)
    yearlyPrice: 278,
    currency: "EUR",
    interval: "year",

    // Limites du plan
    auditsPerMonth: 20,
    features: [
      "audits_simple",
      "dashboard_avance",
      "historique_complet",
      "support_prioritaire",
      "rapports_detailles",
    ],

    // UI/UX
    badge: "ÉCONOMISEZ 20%",
    popular: false,

    // Stripe (à configurer)
    stripePriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    stripeYearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },

  pro_monthly: {
    id: "pro_monthly",
    name: "Pro",
    description: "Pour les professionnels actifs",
    price: 79,
    yearlyPrice: null,
    currency: "EUR",
    interval: "month",

    // Limites du plan
    auditsPerMonth: 80,
    features: [
      "audits_simple",
      "dashboard_avance",
      "historique_complet",
      "support_prioritaire",
      "rapports_detailles",
      "exports_personnalises",
    ],

    // UI/UX
    badge: null,
    popular: false,

    // Stripe (à configurer)
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripeYearlyPriceId: null,
  },

  pro_yearly: {
    id: "pro_yearly",
    name: "Pro Annuel",
    description: "Économisez 20% avec le paiement annuel",
    price: 759, // 79 * 12 * 0.8 = 759€ (au lieu de 948€)
    yearlyPrice: 759,
    currency: "EUR",
    interval: "year",

    // Limites du plan
    auditsPerMonth: 80,
    features: [
      "audits_simple",
      "dashboard_avance",
      "historique_complet",
      "support_prioritaire",
      "rapports_detailles",
      "exports_personnalises",
    ],

    // UI/UX
    badge: "ÉCONOMISEZ 20%",
    popular: false,

    // Stripe (à configurer)
    stripePriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    stripeYearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },

  premium_monthly: {
    id: "premium_monthly",
    name: "Premium",
    description: "Solution complète pour les agences",
    price: 149,
    yearlyPrice: null,
    currency: "EUR",
    interval: "month",

    // Limites du plan
    auditsPerMonth: 250,
    features: [
      "audits_simple",
      "audits_batch", // ⭐ EXCLUSIF Premium
      "dashboard_avance",
      "historique_complet",
      "support_prioritaire",
      "rapports_detailles",
      "api_access",
      "exports_personnalises",
      "formation_incluse",
      "onboarding_personnalise",
    ],

    // UI/UX
    badge: "COMPLET",
    popular: false,

    // Stripe (à configurer)
    stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    stripeYearlyPriceId: null,
  },

  premium_yearly: {
    id: "premium_yearly",
    name: "Premium Annuel",
    description: "Solution complète avec 20% de remise",
    price: 1430, // 149 * 12 * 0.8 = 1430€ (au lieu de 1788€)
    yearlyPrice: 1430,
    currency: "EUR",
    interval: "year",

    // Limites du plan
    auditsPerMonth: 250,
    features: [
      "audits_simple",
      "audits_batch", // ⭐ EXCLUSIF Premium
      "dashboard_avance",
      "historique_complet",
      "support_prioritaire",
      "rapports_detailles",
      "api_access",
      "exports_personnalises",
      "formation_incluse",
      "onboarding_personnalise",
    ],

    // UI/UX
    badge: "MEILLEURE OFFRE",
    popular: false,

    // Stripe (à configurer)
    stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    stripeYearlyPriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  },
} as const;

// Types pour TypeScript
export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[SubscriptionPlanId];

// Helpers utiles
export const getAllPlans = () => Object.values(SUBSCRIPTION_PLANS);

export const getPlanById = (planId: string): SubscriptionPlan | null => {
  return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] ?? null;
};

export const getMonthlyPlans = () =>
  getAllPlans().filter((plan) => plan.interval === "month");

export const getYearlyPlans = () =>
  getAllPlans().filter((plan) => plan.interval === "year");

export const getPlanFeatures = (planId: string): string[] => {
  const plan = getPlanById(planId);
  return plan?.features ? [...plan.features] : [];
};

export const hasFeature = (planId: string, feature: string): boolean => {
  return getPlanFeatures(planId).includes(feature);
};

export const canAccessBatchAudits = (planId: string): boolean => {
  return hasFeature(planId, "audits_batch");
};

export const getAuditsQuota = (planId: string): number => {
  const plan = getPlanById(planId);
  return plan?.auditsPerMonth ?? 5; // Défaut : plan gratuit
};

// Fonction pour calculer les économies annuelles
export const getYearlySavings = (monthlyPlanId: string): number => {
  const monthlyPlan = getPlanById(monthlyPlanId);
  const yearlyPlanId = monthlyPlanId.replace("_monthly", "_yearly");
  const yearlyPlan = getPlanById(yearlyPlanId);

  if (!monthlyPlan || !yearlyPlan) return 0;

  const monthlyTotal = monthlyPlan.price * 12;
  const yearlyTotal = yearlyPlan.price;

  return monthlyTotal - yearlyTotal;
};
