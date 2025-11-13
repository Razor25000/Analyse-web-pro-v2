"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Play,
  CheckCircle,
  Zap,
  Shield,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Globe,
  Loader2,
  Eye,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export function HeroSection() {
  const [isHovered, setIsHovered] = useState(false);
  const [url, setUrl] = useState("");

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden py-20 lg:py-32"
    >
      <div className="from-primary/5 to-accent/5 absolute inset-0 bg-gradient-to-br via-transparent" />
      <div className="bg-dot-pattern absolute inset-0 opacity-20" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-8">
            <Badge
              data-testid="hero-badge"
              variant="outline"
              className="bg-primary/10 border-primary/20 px-3 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm"
            >
              <Sparkles className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">
                🚀 Lancement : 3 audits gratuits pour tous
              </span>
              <span className="sm:hidden">
                🚀 3 audits gratuits
              </span>
            </Badge>
          </div>

          {/* Titre principal */}
          <h1
            data-testid="hero-title"
            className="mb-6 text-4xl leading-tight font-bold text-[#007291] lg:text-6xl"
          >
            Vos audits web vous prennent des heures ?
            <br />
            <span className="text-[hsl(151,55%,41%)]">Divisez ce temps par 100</span>
          </h1>

          {/* Sous-titre */}
          <p className="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl leading-relaxed lg:text-2xl">
            Entrez l'URL de votre site et recevez un <strong>audit complet</strong> en moins de 3 minutes.
            <br />
            <span className="text-[#007291] font-semibold">Performance, SEO, sécurité, accessibilité et modernité</span> analysés automatiquement.
          </p>

          {/* Section de réassurance */}
          <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 text-sm">
              <div className="bg-[#007291]/10 rounded-full p-2">
                <Zap className="h-4 w-4 text-[#007291]" />
              </div>
              <div>
                <p className="font-semibold">Analyse complète</p>
                <p className="text-muted-foreground text-xs">5 catégories évaluées</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="bg-[#007291]/10 rounded-full p-2">
                <Shield className="h-4 w-4 text-[#007291]" />
              </div>
              <div>
                <p className="font-semibold">100% gratuit</p>
                <p className="text-muted-foreground text-xs">Pas de CB requise</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="bg-[#007291]/10 rounded-full p-2">
                <Search className="h-4 w-4 text-[#007291]" />
              </div>
              <div>
                <p className="font-semibold">Rapport PDF</p>
                <p className="text-muted-foreground text-xs">Téléchargeable</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="bg-[#007291]/10 rounded-full p-2">
                <CheckCircle className="h-4 w-4 text-[#007291]" />
              </div>
              <div>
                <p className="font-semibold">Garantie qualité</p>
                <p className="text-muted-foreground text-xs">Standards web respectés</p>
              </div>
            </div>
          </div>

          {/* Preuve sociale "Ils nous font déjà confiance" */}
          <div className="mb-12 bg-gradient-to-r from-[#007291]/5 to-[#007291]/10 rounded-2xl p-6 max-w-4xl mx-auto border border-[#007291]/20">
            <div className="text-center">
              <h3 className="text-xl font-bold text-[#007291] mb-3">
                Ils nous font déjà confiance
              </h3>
              <div className="flex flex-wrap justify-center items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-[#007291]" />
                  <span>25+ entreprises testées</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-[#007291]" />
                  <span>1000+ audits réalisés</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-[#007291]" />
                  <span>95% de satisfaction</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-[#007291]" />
                  <span>Support réactif</span>
                </div>
              </div>
            </div>
          </div>

          {/* URL Input and CTA */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <div className="relative flex-1 w-full">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://votre-site-web.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-14 pl-12 text-lg border-2 border-[#007291]/20 focus:border-[#007291] focus:ring-[#007291]/20"
                />
              </div>
              <Button
                data-testid="hero-cta-analyze"
                asChild
                size="lg"
                className="h-14 px-8 text-lg bg-[#007291] hover:bg-[#005a73] shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:opacity-70"
              >
                <Link href={url.trim() ? `/auth/pre-signup?url=${encodeURIComponent(url)}` : "/auth/pre-signup"}>
                  <Zap className="mr-2 h-5 w-5" />
                  Analyser mon site
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Plan gratuit mention */}
            <p className="text-muted-foreground text-sm mt-3 text-center">
              ✓ 3 audits gratuits • ✓ Aucune CB requise • ✓ Rapports PDF pro • ✓ Résultats instantanés
            </p>
          </div>

          {/* Visuel produit - Screenshot réel du Dashboard */}
          <div className="mb-12 max-w-6xl mx-auto">
            <div className="relative bg-gradient-to-br from-[#007291]/5 to-transparent rounded-2xl p-8 border border-[#007291]/20">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Eye className="h-6 w-6 text-[#007291]" />
                  <h3 className="text-2xl font-bold text-[#007291]">
                    Découvrez l'interface WebPerfekt
                  </h3>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
                  Un tableau de bord clair et intuitif qui vous donne accès à tous vos audits
                  d'un seul coup d'œil.
                </p>
              </div>

              {/* Screenshot du dashboard */}
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-[#007291]/20">
                <Image
                  src="/images/screenshot du dashboard webperfekt.avif"
                  alt="Dashboard WebPerfekt - Interface d'audit complète avec métriques de performance, SEO, sécurité et modernité"
                  width={1920}
                  height={1080}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Garantie */}
          <p className="text-muted-foreground text-sm">
            <strong>🎁 3 audits gratuits</strong> • Sans engagement •
            Résultats instantanés • Aucune CB requise • Rapports PDF pro
          </p>
        </div>

        {/* Problème/Solution narrative */}
        <div className="mx-auto mt-20 mb-20 max-w-5xl">
          <div className="bg-card rounded-2xl border p-8 text-center shadow-lg">
            <h3 className="text-2xl font-bold mb-6">
              Vous perdez des clients sans le savoir ?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center transform transition-transform hover:scale-105">
                <div className="text-3xl font-bold text-red-500 mb-2">53%</div>
                <p className="text-sm text-muted-foreground">
                  abandonnent si le chargement {" >"} 3s
                </p>
              </div>
              <div className="text-center transform transition-transform hover:scale-105">
                <div className="text-3xl font-bold text-orange-500 mb-2">-47%</div>
                <p className="text-sm text-muted-foreground">
                  de trafic sans un bon SEO
                </p>
              </div>
              <div className="text-center transform transition-transform hover:scale-105">
                <div className="text-3xl font-bold text-red-500 mb-2">70%</div>
                <p className="text-sm text-muted-foreground">
                  des visiteurs ne reviennent jamais
                </p>
              </div>
            </div>
            <div className="bg-[#007291]/5 rounded-xl p-6 border border-[#007291]/20">
              <p className="text-lg font-medium text-[#007291] mb-2">
                🔍 Notre diagnostic vous révèle ces problèmes invisibles
              </p>
              <p className="text-muted-foreground">
                Et vous donne les solutions exactes pour les corriger
              </p>
            </div>
          </div>
        </div>

        {/* Types d'audits - Visual Grid */}
        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              icon: Zap,
              label: "Performance",
              color: "text-[#007291]",
              bg: "bg-[#007291]/10",
              description: "Vitesse de chargement",
            },
            {
              icon: Search,
              label: "SEO",
              color: "text-[#007291]",
              bg: "bg-[#007291]/10",
              description: "Référencement naturel",
            },
            {
              icon: Shield,
              label: "Sécurité",
              color: "text-[#007291]",
              bg: "bg-[#007291]/10",
              description: "Protection & HTTPS",
            },
            {
              icon: Sparkles,
              label: "Modernité",
              color: "text-[#007291]",
              bg: "bg-[#007291]/10",
              description: "Technologies récentes",
            },
          ].map((audit, index) => {
            const IconComponent = audit.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-xl border-2 border-[#007291]/20 p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-[#007291]/40"
              >
                <div
                  className={`h-12 w-12 rounded-full ${audit.bg} mx-auto mb-3 flex items-center justify-center`}
                >
                  <IconComponent className={`h-6 w-6 ${audit.color}`} />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-[#007291]">{audit.label}</h3>
                <p className="text-muted-foreground text-sm">
                  {audit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Background decoration */}
      <div className="bg-primary/5 absolute -top-40 -right-40 h-80 w-80 rounded-full blur-3xl" />
      <div className="bg-accent/5 absolute -bottom-40 -left-40 h-80 w-80 rounded-full blur-3xl" />
    </section>
  );
}
