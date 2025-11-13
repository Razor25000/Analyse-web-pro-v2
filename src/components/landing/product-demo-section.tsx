"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  FileText,
  Globe,
  Zap,
  Play,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Mail,
  Shield,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Eye,
  Download,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
];

const stats = [
  { label: "Sites testés", value: "100+", icon: "📊" },
  { label: "Testeurs bêta", value: "25", icon: "😊" },
  { label: "Feedback positifs", value: "95%", icon: "⭐" },
  { label: "Gain de temps", value: "-80%", icon: "⏰" },
];

export function ProductDemoSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = [
    {
      title: "1. Analysez",
      description: "Entrez n'importe quelle URL et lancez l'audit instantané",
      icon: Globe,
      color: "bg-blue-500",
      visual: (
        <div className="relative">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Globe className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="bg-gray-100 h-3 rounded-full w-32"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-gray-100 h-2 rounded w-full"></div>
              <div className="bg-blue-100 h-2 rounded w-3/4"></div>
            </div>
          </div>
          {/* Animation de chargement */}
          <div className="absolute inset-0 bg-blue-500/10 rounded-lg animate-pulse"></div>
        </div>
      ),
    },
    {
      title: "2. Découvrez",
      description: "Obtenez un score global et identifiez les problèmes critiques",
      icon: Activity,
      color: "bg-green-500",
      visual: (
        <div className="relative">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-lg">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">78</div>
                <div className="text-xs text-gray-600">Performance</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">65</div>
                <div className="text-xs text-gray-600">SEO</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">82</div>
                <div className="text-xs text-gray-600">Sécurité</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">71</div>
                <div className="text-xs text-gray-600">Modernité</div>
              </div>
            </div>
            <div className="bg-gray-100 h-2 rounded"></div>
          </div>
        </div>
      ),
    },
    {
      title: "3. Agissez",
      description: "Suivez nos recommandations et téléchargez des rapports PDF professionnels",
      icon: Download,
      color: "bg-purple-500",
      visual: (
        <div className="relative">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">Rapport WebPerfekt.pdf</span>
              </div>
              <Button size="sm" className="h-6 px-2 text-xs">
                Télécharger
              </Button>
            </div>
            <div className="space-y-1">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-2">
                <p className="text-xs font-medium text-purple-700">✓ Priorité 1 : Optimiser les images</p>
              </div>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-2">
                <p className="text-xs font-medium text-purple-700">✓ Priorité 2 : Améliorer le SEO</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Découvrez la puissance de
            <span className="text-primary"> WebPerfekt</span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
            Une plateforme complète qui transforme l'audit web en un processus
            simple, rapide et actionnable.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center bg-background/80 rounded-xl border p-4 shadow-sm"
              >
                <div className="mb-2 text-2xl">{stat.icon}</div>
                <div className="text-primary text-xl font-bold">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Demo Steps */}
        <div className="mb-16">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={index}
                  className="flex-1 text-center cursor-pointer group"
                  onClick={() => setActiveStep(index)}
                >
                  <div
                    className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      activeStep === index
                        ? `${step.color} text-white shadow-lg scale-110`
                        : 'bg-muted text-muted-foreground group-hover:scale-105'
                    }`}
                  >
                    <IconComponent className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {step.description}
                  </p>
                  {/* Visual Demo */}
                  <div className="mt-6 transition-all duration-300">
                    <div
                      className={`transition-all duration-300 ${
                        activeStep === index
                          ? 'scale-105 shadow-xl'
                          : 'scale-95 opacity-50'
                      }`}
                    >
                      {step.visual}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  activeStep === index
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Features Grid - Amélioré */}
        <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground text-base">
                    {feature.description}
                  </p>
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

        {/* Enhanced CTA */}
        <div className="text-center">
          <div className="from-primary/10 to-accent/10 rounded-2xl border bg-gradient-to-r p-8">
            <h3 className="mb-4 text-2xl font-bold">
              Prêt à optimiser vos sites web ?
            </h3>
            <p className="text-muted-foreground mx-auto mb-6 max-w-2xl">
              Commencez dès maintenant avec 3 audits gratuits. Aucune carte
              bancaire requise, aucun engagement.
            </p>
            <Button
              asChild
              size="lg"
              className="h-12 px-8 bg-primary hover:bg-primary/90 transition-all hover:scale-105"
            >
              <Link href="/auth/pre-signup">
                <Zap className="mr-2 h-5 w-5" />
                Démarrer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-muted-foreground text-sm mt-3">
              ✓ 3 audits gratuits • ✓ Sans engagement • ✓ Résultats instantanés • ✓ Rapports PDF pro
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}