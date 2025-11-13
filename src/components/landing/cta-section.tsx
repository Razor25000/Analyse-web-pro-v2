"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Users, TrendingUp, Award } from "lucide-react";
import Link from "next/link";

const benefits = [
  {
    icon: Zap,
    title: "Analyses instantanées",
    description: "Rapports en 3 minutes chrono",
  },
  {
    icon: Users,
    title: "150+ professionnels",
    description: "Nous font déjà confiance",
  },
  {
    icon: TrendingUp,
    title: "ROI moyen +220%",
    description: "Retour sur investissement prouvé",
  },
  {
    icon: Award,
    title: "98% de satisfaction",
    description: "Taux de satisfaction client",
  },
];

export function CTASection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="from-primary/10 via-primary/5 to-accent/10 absolute inset-0 rounded-3xl bg-gradient-to-br" />
          <div className="bg-dot-pattern absolute inset-0 rounded-3xl opacity-10" />

          <div className="relative px-8 py-16 text-center">
            {/* Header */}
            <div className="mb-12">
              <Badge
                variant="outline"
                className="bg-primary/10 border-primary/20 mb-6 px-4 py-2"
              >
                <Zap className="mr-2 h-4 w-4" />
                Commencez maintenant
              </Badge>

              <h2 className="mb-6 text-3xl leading-tight font-bold lg:text-5xl">
                Prêt à transformer votre
                <br />
                <span className="text-primary">activité web ?</span>
              </h2>

              <p className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed">
                Rejoignez nos 150+ professionnels qui génèrent en moyenne 220% de ROI
                grâce à nos audits. Commencez maintenant avec 3 audits gratuits,
                aucun engagement requis.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="mb-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                      <IconComponent className="text-primary h-6 w-6" />
                    </div>
                    <h3 className="mb-1 text-sm font-semibold">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="mb-8 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <Button
                asChild
                size="lg"
                className="h-14 px-8 text-lg shadow-lg transition-all hover:shadow-xl"
              >
                <Link href="/auth/pre-signup">
                  <Zap className="mr-2 h-5 w-5" />
                  Démarrer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-background/80 h-14 px-8 text-lg border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                <Link href="/pricing">
                  Voir tous les plans
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="text-muted-foreground flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>✓ 3 audits gratuits</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>✓ Aucune CB requise</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span>✓ Rapports PDF pro</span>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="bg-primary/10 absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl" />
          <div className="bg-accent/10 absolute -bottom-20 -left-20 h-40 w-40 rounded-full blur-3xl" />
        </div>
      </div>
    </section>
  );
}
