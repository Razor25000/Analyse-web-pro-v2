"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Zap, ArrowLeft, Crown, CheckCircle } from "lucide-react";
import Link from "next/link";

type PlanGuardProps = {
  requiredPlan?: "pro" | "premium" | "enterprise";
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
};

type UserPlan = "free" | "pro" | "premium" | "enterprise";

const PLAN_HIERARCHY: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  premium: 2,
  enterprise: 3,
};

const PLAN_INFO = {
  pro: {
    name: "Professionnel",
    price: "49€/mois",
    yearlyPrice: "470€/an (39€/mois)",
    stripeUrl: "/dashboard/billing",
    features: [
      "500 audits par mois",
      "Toutes les analyses incluses",
      "Historique complet",
      "Rapports avancés",
      "Suivi de l'évolution",
      "Support prioritaire",
      "Tableaux de bord",
      "Exports personnalisés",
    ],
  },
  premium: {
    name: "Premium",
    price: "100€/mois",
    yearlyPrice: "960€/an (80€/mois)",
    stripeUrl: "/dashboard/billing",
    features: [
      "2000 audits par mois",
      "Audits en lot (CSV)",
      "Traitement par batch",
      "API d'intégration",
      "Rapports personnalisables",
      "Support dédié",
      "Formation incluse",
      "Onboarding personnalisé",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "Sur mesure",
    yearlyPrice: "Contact commercial",
    stripeUrl: "/contact",
    features: [
      "Audits illimités",
      "Infrastructure dédiée",
      "Intégrations personnalisées",
      "Support 24/7",
      "SLA garanti",
    ],
  },
};

export function PlanGuard({
  requiredPlan = "pro",
  children,
  fallbackTitle = "Fonctionnalité Premium",
  fallbackDescription = "Cette fonctionnalité est réservée aux utilisateurs avec un abonnement payant.",
}: PlanGuardProps) {
  const router = useRouter();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkUserPlan() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/user/quota", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Impossible de vérifier votre plan");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(
            data.error || "Erreur lors de la vérification du plan",
          );
        }

        // Extraire le plan depuis l'API quota (planId)
        const plan = data.quota?.planId || "free";
        setUserPlan(plan as UserPlan);
      } catch (err) {
        console.error("Erreur vérification plan:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        // En cas d'erreur, on considère l'utilisateur comme gratuit par sécurité
        setUserPlan("free");
      } finally {
        setIsLoading(false);
      }
    }

    checkUserPlan();
  }, []);

  // Chargement
  if (isLoading) {
    return (
      <div className="from-background via-background to-muted/20 flex min-h-screen items-center justify-center bg-gradient-to-br">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
              <p className="text-muted-foreground">
                Vérification de votre plan...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="from-background via-background to-muted/20 flex min-h-screen items-center justify-center bg-gradient-to-br">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier l'accès
  const userPlanLevel = PLAN_HIERARCHY[userPlan || "free"];
  const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan];
  const hasAccess = userPlanLevel >= requiredPlanLevel;

  // Si l'utilisateur a accès, afficher le contenu
  if (hasAccess) {
    return <>{children}</>;
  }

  // Sinon, rediriger directement vers la page de billing
  router.replace("/dashboard/billing");
  return (
    <div className="from-background via-background to-muted/20 flex min-h-screen items-center justify-center bg-gradient-to-br">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="space-y-4 text-center">
            <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
            <p className="text-muted-foreground">
              Redirection vers les plans...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
