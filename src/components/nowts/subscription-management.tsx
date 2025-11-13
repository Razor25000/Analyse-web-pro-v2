"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Calendar,
  Crown,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type SubscriptionData = {
  subscription: {
    id: string;
    plan: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    isActive: boolean;
    isPastDue: boolean;
    isCanceled: boolean;
    willCancelAtPeriodEnd: boolean;
    periodEndFormatted: string;
    daysUntilPeriodEnd: number;
  } | null;
  plan: string;
  isActive: boolean;
};

const planNames: Record<string, string> = {
  free: "Gratuit",
  basic: "Pro",
  premium: "Premium",
  enterprise: "Enterprise",
  pro_monthly: "Pro Mensuel",
  pro_yearly: "Pro Annuel",
  premium_monthly: "Premium Mensuel",
  premium_yearly: "Premium Annuel",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  trialing: "bg-blue-100 text-blue-800",
  past_due: "bg-orange-100 text-orange-800",
  canceled: "bg-red-100 text-red-800",
  unpaid: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  active: "Actif",
  trialing: "Période d'essai",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  unpaid: "Impayé",
};

export function SubscriptionManagement() {
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/user/subscription");
      const data = await response.json();

      if (data.success) {
        setSubscriptionData(data);
      } else {
        toast.error("Erreur lors du chargement de l'abonnement");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
      console.error("Erreur fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCancelSubscription = async (immediate = false) => {
    setCanceling(true);

    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ immediate }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await fetchSubscription(); // Recharger les données
      } else {
        toast.error(data.error || "Erreur lors de l'annulation");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
      console.error("Erreur annulation:", error);
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { subscription, plan, isActive } = subscriptionData || {};

  return (
    <div className="space-y-6">
      {/* Statut actuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isActive ? (
                  <Crown className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                Plan actuel : {planNames[plan || "free"]}
              </CardTitle>
              <CardDescription>
                Gérez votre abonnement et vos préférences de facturation
              </CardDescription>
            </div>
            <Badge className={statusColors[subscription?.status || "free"]}>
              {statusLabels[subscription?.status || "free"] || "Gratuit"}
            </Badge>
          </div>
        </CardHeader>

        {subscription && (
          <CardContent className="space-y-4">
            {/* Informations de période */}
            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Période actuelle jusqu'au {subscription.periodEndFormatted}
                </span>
              </div>
              {subscription.daysUntilPeriodEnd > 0 && (
                <Badge variant="outline">
                  {subscription.daysUntilPeriodEnd} jour
                  {subscription.daysUntilPeriodEnd > 1 ? "s" : ""} restant
                  {subscription.daysUntilPeriodEnd > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {/* Alertes importantes */}
            {subscription.willCancelAtPeriodEnd && (
              <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">
                    Abonnement programmé pour annulation
                  </p>
                  <p className="text-sm text-orange-700">
                    Votre abonnement sera annulé le{" "}
                    {subscription.periodEndFormatted}. Vous garderez l'accès
                    jusqu'à cette date.
                  </p>
                </div>
              </div>
            )}

            {subscription.isPastDue && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <X className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Paiement en retard</p>
                  <p className="text-sm text-red-700">
                    Votre dernier paiement a échoué. Mettez à jour votre moyen
                    de paiement pour maintenir l'accès.
                  </p>
                </div>
              </div>
            )}

            {subscription.isActive && !subscription.willCancelAtPeriodEnd && (
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Abonnement actif</p>
                  <p className="text-sm text-green-700">
                    Votre abonnement se renouvelle automatiquement le{" "}
                    {subscription.periodEndFormatted}.
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Actions disponibles */}
            <div className="flex gap-3">
              {subscription.isActive && !subscription.willCancelAtPeriodEnd && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={canceling}>
                      Annuler l'abonnement
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vous pouvez annuler votre abonnement de deux façons :
                        <br />
                        <br />
                        <strong>• Fin de période :</strong> Vous gardez l'accès
                        jusqu'au {subscription.periodEndFormatted}
                        <br />
                        <strong>• Immédiat :</strong> Vous perdez l'accès
                        immédiatement (non remboursé)
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Garder l'abonnement</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => handleCancelSubscription(false)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Annuler en fin de période
                      </AlertDialogAction>
                      <AlertDialogAction
                        onClick={async () => handleCancelSubscription(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Annuler immédiatement
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                variant="outline"
                onClick={fetchSubscription}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Actualiser
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Plan gratuit */}
      {!subscription && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Plan Gratuit</h3>
                <p className="text-muted-foreground">
                  Vous utilisez actuellement le plan gratuit avec 5 audits par
                  mois.
                </p>
              </div>
              <Button asChild>
                <a href="/pricing">Voir les plans payants</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
