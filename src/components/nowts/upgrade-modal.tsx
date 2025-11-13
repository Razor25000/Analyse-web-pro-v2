"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, X } from "lucide-react";
import { SUBSCRIPTION_PLANS, getAllPlans } from "@/config/subscription-plans";
import { useState } from "react";

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: string;
  trigger: "quota_exceeded" | "feature_restricted" | "quota_warning";
};

export function UpgradeModal({
  isOpen,
  onClose,
  currentPlanId,
  trigger,
}: UpgradeModalProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const currentPlan =
    SUBSCRIPTION_PLANS[currentPlanId as keyof typeof SUBSCRIPTION_PLANS];
  const recommendedPlans = getAllPlans().filter(
    (plan) =>
      plan.id !== "free" &&
      (isYearly ? plan.interval === "year" : plan.interval === "month"),
  );

  const getModalTitle = () => {
    switch (trigger) {
      case "quota_exceeded":
        return "Quota épuisé !";
      case "feature_restricted":
        return "Fonctionnalité Premium requise";
      case "quota_warning":
        return "Bientôt à court d'audits";
      default:
        return "Passez à un plan supérieur";
    }
  };

  const getModalDescription = () => {
    switch (trigger) {
      case "quota_exceeded":
        return "Vous avez utilisé tous vos audits pour ce mois. Passez à un plan supérieur pour continuer.";
      case "feature_restricted":
        return "Cette fonctionnalité est réservée aux utilisateurs Premium. Découvrez nos plans.";
      case "quota_warning":
        return "Il ne vous reste que quelques audits. Évitez les interruptions en passant Pro.";
      default:
        return "Débloquez plus d'audits et de fonctionnalités avancées.";
    }
  };

  const handleUpgrade = async (planId: string) => {
    setSelectedPlan(planId);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: window.location.href,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Erreur lors de la création du checkout",
        );
      }

      // Rediriger vers Stripe Checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("URL de checkout manquante");
      }
    } catch (error) {
      console.error("Erreur upgrade:", error);
      alert(
        error instanceof Error ? error.message : "Erreur lors de l'upgrade",
      );
      setSelectedPlan(null);
    }
  };

  const formatPrice = (price: number, interval: string) => {
    if (interval === "year") {
      return `${price}€/an`;
    }
    return `${price}€/mois`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {getModalTitle()}
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                {getModalDescription()}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Toggle Mensuel/Annuel */}
        <div className="my-6 flex items-center justify-center space-x-4">
          <Button
            variant={!isYearly ? "default" : "outline"}
            size="sm"
            onClick={() => setIsYearly(false)}
          >
            Mensuel
          </Button>
          <Button
            variant={isYearly ? "default" : "outline"}
            size="sm"
            onClick={() => setIsYearly(true)}
          >
            Annuel
            <Badge variant="secondary" className="ml-2">
              -20%
            </Badge>
          </Button>
        </div>

        {/* Plans disponibles */}
        <div className="grid gap-4 md:grid-cols-2">
          {recommendedPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative transition-all duration-200 hover:shadow-lg ${
                plan.popular ? "border-primary shadow-md" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Plus populaire
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="space-y-1">
                  <p className="text-3xl font-bold">
                    {formatPrice(plan.price, plan.interval)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {plan.auditsPerMonth} audits/mois
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-center text-sm">
                  {plan.description}
                </p>

                {/* Fonctionnalités principales */}
                <div className="space-y-2">
                  {plan.features.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {feature.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={async () => handleUpgrade(plan.id)}
                  disabled={selectedPlan === plan.id}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {selectedPlan === plan.id ? (
                    "Redirection..."
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Choisir {plan.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center">
          <p className="text-muted-foreground text-xs">
            Changez ou annulez votre abonnement à tout moment depuis vos
            paramètres
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
