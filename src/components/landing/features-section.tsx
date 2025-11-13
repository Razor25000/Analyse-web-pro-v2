"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FileText,
  Layers,
  Clock,
  Mail,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: BarChart3,
    title: "Analyses Complètes",
    description: "4 domaines d'expertise analysés en profondeur",
    details: [
      "Performance et vitesse de chargement",
      "SEO et référencement naturel",
      "Sécurité et protection des données",
      "Modernité et standards web",
    ],
    badge: null,
  },
  {
    icon: FileText,
    title: "Rapports Détaillés",
    description: "Documentation complète avec recommandations expertes",
    details: [
      "Diagnostic précis des problèmes",
      "Solutions concrètes étape par étape",
      "Priorités d'optimisation",
      "Métriques avant/après",
    ],
    badge: null,
  },
  {
    icon: Clock,
    title: "Analyses Rapides",
    description: "Résultats en 2-3 minutes maximum",
    details: [
      "Traitement automatisé",
      "Algorithmes optimisés",
      "Infrastructure scalable",
      "Aucune attente nécessaire",
    ],
    badge: null,
  },
  {
    icon: Layers,
    title: "Audits en Lot",
    description: "Analysez plusieurs sites d'un coup",
    details: [
      "Upload de fichiers CSV",
      "Traitement par batch",
      "Rapports groupés",
      "Idéal pour les agences",
    ],
    badge: "Premium",
  },
  {
    icon: Mail,
    title: "Notifications Email",
    description: "Recevez vos rapports directement par email",
    details: [
      "Livraison instantanée",
      "Format PDF professionnel",
      "Résumé exécutif inclus",
      "Archivage automatique",
    ],
    badge: null,
  },
  {
    icon: CheckCircle2,
    title: "Suivi des Améliorations",
    description: "Historique complet de vos optimisations",
    details: [
      "Évolution des scores",
      "Comparaisons temporelles",
      "Tableaux de bord visuels",
      "Métriques de progression",
    ],
    badge: "Pro",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Tout ce dont vous avez besoin pour
            <span className="text-primary"> optimiser vos sites web</span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
            Une suite complète d'outils d'analyse web professionnels, conçue
            pour vous faire gagner du temps et améliorer vos résultats.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card
                key={index}
                className="bg-background/80 relative border-0 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {feature.badge && (
                  <div className="absolute -top-3 -right-3">
                    <Badge
                      variant="default"
                      className="bg-primary/90 text-primary-foreground px-2 py-1"
                    >
                      {feature.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                    <IconComponent className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li
                        key={i}
                        className="flex items-start space-x-2 text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-muted-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="from-primary/10 to-accent/10 rounded-2xl border bg-gradient-to-r p-8">
            <h3 className="mb-4 text-2xl font-bold">
              Prêt à optimiser votre site web ?
            </h3>
            <p className="text-muted-foreground mx-auto mb-6 max-w-2xl">
              Commencez dès maintenant avec 5 audits gratuits. Aucune carte
              bancaire requise, aucun engagement.
            </p>
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="/auth/pre-signup">
                <Zap className="mr-2 h-5 w-5" />
                Démarrer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
