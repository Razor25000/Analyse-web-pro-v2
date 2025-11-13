import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/auth-user";
import { PricingSection } from "@/components/landing/pricing-section";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PricingPage() {
  const user = await getUser();

  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
      {/* Header avec navigation */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/audits">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour au dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à l'accueil
                  </Link>
                </Button>
              )}
            </div>

            {!user && (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost">
                  <Link href="/auth/signin">Connexion</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">S'inscrire</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section pricing */}
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold">Choisissez votre plan</h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Sélectionnez le plan qui correspond le mieux à vos besoins d'audit
            web
          </p>
        </div>

        <PricingSection />
      </div>
    </div>
  );
}
