import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/auth-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";
import Link from "next/link";

type SubscriptionGuardProps = {
  children: React.ReactNode;
  requiredPlan?: "free" | "pro" | "premium";
  fallbackComponent?: React.ReactNode;
};

/**
 * Composant de garde pour vérifier les abonnements utilisateur
 * Empêche l'accès aux fonctionnalités payantes pour les comptes non valides
 */
export async function SubscriptionGuard({
  children,
  requiredPlan = "free",
  fallbackComponent,
}: SubscriptionGuardProps) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Vérifier l'abonnement utilisateur
  const userWithSubscription = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      subscriptions: {
        where: { status: "active" },
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
  });

  if (!userWithSubscription) {
    redirect("/auth/signin");
  }

  const activeSubscription = userWithSubscription.subscriptions[0];
  const userPlan = activeSubscription?.plan || "free";
  const subscriptionStatus = activeSubscription?.status || "inactive";

  // Vérifier si l'utilisateur a un plan valide
  const planHierarchy = { free: 0, pro: 1, premium: 2 };
  const requiredLevel = planHierarchy[requiredPlan];
  const currentLevel =
    planHierarchy[userPlan as keyof typeof planHierarchy] || 0;

  // Si l'utilisateur n'a pas le bon niveau d'abonnement
  if (
    currentLevel < requiredLevel ||
    (requiredPlan !== "free" && subscriptionStatus !== "active")
  ) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    // Composant d'upgrade par défaut
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Abonnement requis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              Cette fonctionnalité nécessite un abonnement{" "}
              <strong className="text-primary capitalize">
                {requiredPlan}
              </strong>
              .
              {subscriptionStatus !== "active" && activeSubscription && (
                <span className="mt-2 block text-sm text-red-600">
                  Votre abonnement a expiré le{" "}
                  {new Date(activeSubscription.periodEnd).toLocaleDateString(
                    "fr-FR",
                  )}
                </span>
              )}
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">Votre plan actuel :</p>
              <div className="bg-muted inline-flex items-center rounded-full px-3 py-1 text-sm">
                <span className="capitalize">{userPlan}</span>
                {subscriptionStatus !== "active" && (
                  <span className="ml-2 text-red-600">(Expiré)</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/pricing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Voir les plans
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Link href="/dashboard">Retour au dashboard</Link>
              </Button>
            </div>

            {/* Informations de sécurité */}
            <div className="mt-8 rounded-lg bg-blue-50 p-4 text-sm">
              <p className="mb-1 font-medium text-blue-900">
                🛡️ Protection de sécurité activée
              </p>
              <p className="text-blue-700">
                Nous avons détecté une tentative d'accès non autorisé et avons
                sécurisé votre compte. Veuillez mettre à jour votre abonnement
                pour continuer.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // L'utilisateur a le bon niveau d'accès
  return <>{children}</>;
}
