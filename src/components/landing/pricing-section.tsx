"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Zap, Crown } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const plans = {
  monthly: [
    {
      id: "free",
      name: "Gratuit",
      price: 0,
      description: "Parfait pour découvrir le service",
      features: [
        "3 audits par mois",
        "Analyses de performance",
        "Analyses SEO",
        "Analyses de sécurité",
        "Analyses de modernité",
        "Rapports PDF",
        "Support par email",
      ],
      limitations: ["Pas d'historique", "Pas d'audits en lot"],
      cta: "Commencer gratuitement",
      href: "/auth/pre-signup",
      popular: false,
      badge: null,
    },
    {
      id: "starter_monthly",
      name: "Starter",
      price: 29,
      description: "Idéal pour les freelances et petites équipes",
      features: [
        "20 audits par mois",
        "Toutes les analyses incluses",
        "Historique des audits",
        "Rapports détaillés",
        "Suivi de l'évolution",
        "Support prioritaire",
        "Tableaux de bord",
      ],
      limitations: ["Pas d'audits en lot"],
      cta: "Commencer maintenant",
      href: "/auth/pre-signup?plan=starter_monthly",
      popular: true,
      badge: "Plus populaire",
    },
    {
      id: "pro_monthly",
      name: "Pro",
      price: 79,
      description: "Pour les professionnels actifs",
      features: [
        "80 audits par mois",
        "Toutes les analyses incluses",
        "Historique complet",
        "Rapports avancés",
        "Suivi de l'évolution",
        "Support prioritaire",
        "Tableaux de bord",
        "Exports personnalisés",
      ],
      limitations: ["Pas d'audits en lot"],
      cta: "Démarrer maintenant",
      href: "/auth/pre-signup?plan=pro_monthly",
      popular: false,
      badge: null,
    },
    {
      id: "premium_monthly",
      name: "Premium",
      price: 149,
      description: "Solution complète pour les agences",
      features: [
        "250 audits par mois",
        "Audits en lot (CSV)",
        "Traitement par batch",
        "API d'intégration",
        "Rapports personnalisables",
        "Support dédié",
        "Formation incluse",
        "Onboarding personnalisé",
      ],
      limitations: [],
      cta: "Démarrer maintenant",
      href: "/auth/pre-signup?plan=premium_monthly",
      popular: false,
      badge: "Complet",
    },
  ],
  yearly: [
    {
      id: "free",
      name: "Gratuit",
      price: 0,
      yearlyPrice: 0,
      description: "Parfait pour découvrir le service",
      features: [
        "3 audits par mois",
        "Analyses de performance",
        "Analyses SEO",
        "Analyses de sécurité",
        "Analyses de modernité",
        "Rapports PDF",
        "Support par email",
      ],
      limitations: ["Pas d'historique", "Pas d'audits en lot"],
      cta: "Commencer gratuitement",
      href: "/auth/pre-signup",
      popular: false,
      badge: null,
      savings: 0,
    },
    {
      id: "starter_yearly",
      name: "Starter",
      price: 278,
      yearlyPrice: 278,
      monthlyEquivalent: 23,
      description: "Prix mensuel avec facturation annuelle",
      features: [
        "20 audits par mois",
        "Toutes les analyses incluses",
        "Historique des audits",
        "Rapports détaillés",
        "Suivi de l'évolution",
        "Support prioritaire",
        "Tableaux de bord",
      ],
      limitations: ["Pas d'audits en lot"],
      cta: "Économiser 20%",
      href: "/auth/pre-signup?plan=starter_yearly",
      popular: true,
      badge: "Économisez 70€",
      savings: 70,
    },
    {
      id: "pro_yearly",
      name: "Pro",
      price: 759,
      yearlyPrice: 759,
      monthlyEquivalent: 63,
      description: "Prix mensuel avec facturation annuelle",
      features: [
        "80 audits par mois",
        "Toutes les analyses incluses",
        "Historique complet",
        "Rapports avancés",
        "Suivi de l'évolution",
        "Support prioritaire",
        "Tableaux de bord",
        "Exports personnalisés",
      ],
      limitations: ["Pas d'audits en lot"],
      cta: "Économiser 20%",
      href: "/auth/pre-signup?plan=pro_yearly",
      popular: false,
      badge: "Économisez 189€",
      savings: 189,
    },
    {
      id: "premium_yearly",
      name: "Premium",
      price: 1430,
      yearlyPrice: 1430,
      monthlyEquivalent: 119,
      description: "Solution complète avec facturation annuelle",
      features: [
        "250 audits par mois",
        "Audits en lot (CSV)",
        "Traitement par batch",
        "API d'intégration",
        "Rapports personnalisables",
        "Support dédié",
        "Formation incluse",
        "Onboarding personnalisé",
      ],
      limitations: [],
      cta: "Économiser 20%",
      href: "/auth/pre-signup?plan=premium_yearly",
      popular: false,
      badge: "Économisez 358€",
      savings: 358,
    },
  ],
};

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const currentPlans = isYearly ? plans.yearly : plans.monthly;

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/auth/status");
        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(!!data.user);
          setUserId(data.user?.id || null);
        }
      } catch (error) {
        setIsLoggedIn(false);
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <section id="pricing" data-testid="pricing-section" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2
            data-testid="pricing-title"
            className="mb-4 text-3xl font-bold lg:text-4xl"
          >
            Choisissez le plan qui vous convient
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl">
            Commencez gratuitement, puis évoluez selon vos besoins. Annulation
            possible à tout moment.
          </p>

          {/* Toggle Annual/Monthly */}
          <div className="flex items-center justify-center space-x-4">
            <span
              className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}
            >
              Mensuel
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-primary"
            />
            <div className="flex items-center space-x-2">
              <span
                className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}
              >
                Annuel
              </span>
              <Badge
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700"
              >
                -20%
              </Badge>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="mb-12 grid gap-8 lg:grid-cols-4">
          {currentPlans.map((plan, index) => (
            <Card
              key={plan.id}
              data-testid={`plan-${plan.id}`}
              className={`relative ${
                plan.popular
                  ? "border-primary ring-primary/20 scale-105 shadow-xl ring-2"
                  : "border-border shadow-lg hover:shadow-xl"
              } transition-all duration-300`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    <Crown className="mr-1 h-3 w-3" />
                    {plan.badge}
                  </Badge>
                </div>
              )}

              {/* Other Badges */}
              {plan.badge && !plan.popular && (
                <div className="absolute -top-3 -right-3">
                  <Badge variant="secondary" className="px-2 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-2xl font-bold">
                  {plan.name}
                </CardTitle>
                <div className="space-y-2">
                  {isYearly && plan.monthlyEquivalent ? (
                    // Mode annuel : afficher le prix mensuel comme principal
                    <div className="flex items-baseline justify-center space-x-1">
                      <span className="text-4xl font-bold">
                        {plan.monthlyEquivalent}€
                      </span>
                      <span className="text-muted-foreground">
                        /mois
                      </span>
                    </div>
                  ) : (
                    // Mode mensuel ou plan gratuit : affichage normal
                    <div className="flex items-baseline justify-center space-x-1">
                      <span className="text-4xl font-bold">
                        {plan.price === 0 ? "Gratuit" : `${plan.price}€`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">
                          /{isYearly ? "an" : "mois"}
                        </span>
                      )}
                    </div>
                  )}

                  {isYearly && plan.yearlyPrice && plan.monthlyEquivalent && (
                    <p className="text-muted-foreground text-sm">
                      Facturé annuellement : {plan.yearlyPrice}€
                    </p>
                  )}

                  {!isYearly && plan.price > 0 && (
                    <p className="text-muted-foreground text-sm">
                      {plan.price}€/{isYearly ? "an" : "mois"}
                    </p>
                  )}

                  {plan.savings && plan.savings > 0 && (
                    <p className="text-sm font-medium text-green-600">
                      Économisez {plan.savings}€ par an
                    </p>
                  )}
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-muted-foreground mb-2 text-xs">
                      Limitations :
                    </p>
                    <div className="space-y-2">
                      {plan.limitations.map((limitation, i) => (
                        <div key={i} className="flex items-start space-x-3">
                          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
                            <div className="bg-muted-foreground h-1 w-1 rounded-full" />
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {limitation}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <Button
                  data-testid={`plan-${plan.id}-cta`}
                  className={`h-12 w-full ${plan.popular ? "shadow-lg" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  onClick={async () => {
                    if (plan.price === 0) {
                      // Plan gratuit - rediriger vers signup
                      window.location.href = plan.href;
                    } else if (isLoggedIn && userId) {
                      // Utilisateur connecté avec plan payant - rediriger vers Stripe
                      window.location.href = `/api/stripe/create-checkout-session?plan=${plan.id}&userId=${userId}`;
                    } else {
                      // Utilisateur non connecté avec plan payant - rediriger vers pré-signup
                      window.location.href = plan.href;
                    }
                  }}
                >
                  {plan.price === 0 ? null : <Zap className="mr-2 h-4 w-4" />}
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Signals */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            ✓ Sans engagement • ✓ Annulation à tout moment • ✓ Support inclus
          </p>
          <p className="text-muted-foreground text-xs">
            Tous les prix sont TTC. Facturation sécurisée par Stripe.
          </p>
        </div>
      </div>
    </section>
  );
}
