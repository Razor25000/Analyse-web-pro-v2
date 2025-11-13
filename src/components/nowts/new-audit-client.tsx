"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Loader2,
  Globe,
  Mail,
  CheckCircle,
  Zap,
  Search,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { useQuotaCheck } from "@/hooks/use-quota-check";
import { QuotaWarning } from "@/components/nowts/quota-warning";
import { UpgradeModal } from "@/components/nowts/upgrade-modal";

// Schéma de validation
const auditSchema = z.object({
  url: z.string().url("Veuillez entrer une URL valide"),
  email: z.string().email("Veuillez entrer un email valide"),
});

// Configuration des types d'audit avec couleurs et icônes
const auditTypes = [
  {
    id: "performance",
    title: "Performance",
    icon: Zap,
    color: "hsl(214, 100%, 59%)", // Blue
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Vitesse de chargement, optimisations techniques",
    details: [
      "Temps de chargement initial",
      "Core Web Vitals (LCP, FID, CLS)",
      "Optimisation des images et ressources",
      "Mise en cache et compression",
      "Performance mobile et desktop",
    ],
  },
  {
    id: "seo",
    title: "SEO",
    icon: Search,
    color: "hsl(142, 76%, 47%)", // Green
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Balises, structure, référencement naturel",
    details: [
      "Balises meta et titre optimisées",
      "Structure des URLs et redirections",
      "Schema markup et données structurées",
      "Liens internes et architecture",
      "Indexabilité et robots.txt",
    ],
  },
  {
    id: "security",
    title: "Sécurité",
    icon: Shield,
    color: "hsl(25, 95%, 53%)", // Orange
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "HTTPS, en-têtes de sécurité",
    details: [
      "Certificat SSL/TLS valide",
      "En-têtes de sécurité HTTP",
      "Protection CSRF et XSS",
      "Politique de sécurité du contenu",
      "Vulnérabilités connues",
    ],
  },
  {
    id: "modern",
    title: "Modernité",
    icon: Sparkles,
    color: "hsl(271, 76%, 53%)", // Purple
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "Technologies utilisées, responsive design",
    details: [
      "Technologies web modernes",
      "Design responsive et mobile-first",
      "Accessibilité et standards WCAG",
      "Progressive Web App (PWA)",
      "Compatibilité navigateurs",
    ],
  },
];

type NewAuditClientProps = {
  orgSlug?: string; // Optionnel pour compatibilité B2C
};

export function NewAuditClient({ orgSlug }: NewAuditClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [formData, setFormData] = useState({
    url: "",
    email: "",
  });

  // Hook de gestion des quotas
  const {
    quotaInfo,
    isLoading: quotaLoading,
    canCreateAudit,
    shouldShowUpgradeModal,
    refresh: refreshQuota,
  } = useQuotaCheck();

  const validateUrl = (url: string) => {
    if (!url) {
      setUrlValidation("idle");
      return;
    }

    try {
      new URL(url);
      setUrlValidation("valid");
    } catch {
      setUrlValidation("invalid");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier le quota avant de continuer
    if (!canCreateAudit) {
      setShowUpgradeModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation côté client
      const validatedData = auditSchema.parse(formData);

      // Appel à l'API
      const endpoint = orgSlug
        ? `/api/orgs/${orgSlug}/audits/single` // Ancienne route pour compatibilité
        : "/api/audits/single"; // Nouvelle route B2C

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Gérer spécifiquement l'erreur de quota dépassé
        if (result.error === "quota_exceeded") {
          console.log("🚫 Quota dépassé, redirection vers billing");
          setError(
            "Quota d'audits gratuits atteint ! Redirection vers les plans...",
          );
          setTimeout(() => {
            router.push("/dashboard/billing");
          }, 2000);
          return;
        }
        throw new Error(result.error || "Erreur lors du démarrage de l'audit");
      }

      setSuccess(`Audit démarré avec succès ! ID: ${result.correlationId}`);

      // Rafraîchir les quotas après un audit réussi
      refreshQuota();

      // Rediriger vers la page des audits après 2 secondes
      setTimeout(() => {
        const redirectUrl = orgSlug
          ? `/orgs/${orgSlug}/audits`
          : "/dashboard/audits";
        router.push(redirectUrl);
      }, 2000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Une erreur inattendue s'est produite");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Validation en temps réel pour l'URL
      if (field === "url") {
        validateUrl(value);
      }

      // Réinitialiser les messages
      setError(null);
      setSuccess(null);
    };

  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 lg:py-16">
        <div className="from-primary/5 to-accent/5 absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="dot-pattern absolute inset-0 opacity-30" />

        <div className="relative mx-auto max-w-6xl px-4">
          {/* Navigation */}
          <div className="mb-8 flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="smooth-transition hover:scale-105"
            >
              <Link
                href={orgSlug ? `/orgs/${orgSlug}/audits` : "/dashboard/audits"}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Hero Content */}
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <h1 className="gradient-text mb-4 text-4xl font-bold lg:text-5xl">
              Analysez Votre Site Web en Minutes
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl leading-relaxed">
              Obtenez des insights actionnables sur les performances, le SEO, la
              sécurité et les standards web modernes
            </p>

            {/* Process Steps */}
            <div className="text-muted-foreground flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <span className="text-xs font-medium">1</span>
                </div>
                <span>Analyse</span>
              </div>
              <div className="bg-border h-px w-12"></div>
              <div className="flex items-center space-x-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <span className="text-xs font-medium">2</span>
                </div>
                <span>Traitement</span>
              </div>
              <div className="bg-border h-px w-12"></div>
              <div className="flex items-center space-x-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <span className="text-xs font-medium">3</span>
                </div>
                <span>Rapport</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form Section */}
          <div className="space-y-6 lg:col-span-2">
            {/* Avertissement de quota */}
            {quotaInfo && shouldShowUpgradeModal && (
              <QuotaWarning
                quotaInfo={quotaInfo}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}

            <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Informations du Site</CardTitle>
                <CardDescription className="text-base">
                  Entrez l'URL du site à analyser et votre email pour accéder au
                  rapport
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* URL Input */}
                  <div className="space-y-3">
                    <Label htmlFor="url" className="text-base font-medium">
                      URL du Site
                    </Label>
                    <div className="relative">
                      <Globe
                        className={`smooth-transition absolute top-4 left-4 h-5 w-5 ${
                          urlValidation === "valid"
                            ? "text-green-500"
                            : urlValidation === "invalid"
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }`}
                      />
                      {urlValidation === "valid" && (
                        <CheckCircle className="absolute top-4 right-4 h-5 w-5 text-green-500" />
                      )}
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://exemple.com"
                        value={formData.url}
                        onChange={handleInputChange("url")}
                        className={`smooth-transition h-14 pr-12 pl-12 text-base ${
                          urlValidation === "valid"
                            ? "success-glow border-green-500"
                            : urlValidation === "invalid"
                              ? "border-red-500"
                              : "focus:input-focus-glow"
                        }`}
                        required
                      />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      L'URL complète du site web à analyser (ex:
                      https://monsite.com)
                    </p>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-base font-medium">
                      Email de Contact
                    </Label>
                    <div className="relative">
                      <Mail className="text-muted-foreground absolute top-4 left-4 h-5 w-5" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        className="smooth-transition focus:input-focus-glow h-14 pl-12 text-base"
                        required
                      />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Le rapport d'audit sera accessible dans votre dashboard
                    </p>
                  </div>

                  {/* Error and Success Messages */}
                  {error && (
                    <Alert variant="destructive" className="smooth-transition">
                      <AlertDescription className="text-base">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="smooth-transition border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-base text-green-800">
                        {success}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="submit"
                      disabled={
                        isLoading ||
                        urlValidation === "invalid" ||
                        !canCreateAudit
                      }
                      className="smooth-transition h-12 flex-1 text-base hover:scale-105"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Démarrage en cours...
                        </>
                      ) : !canCreateAudit ? (
                        "Quota épuisé - Passer Pro"
                      ) : (
                        "Démarrer l'Audit"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="smooth-transition h-12 px-8 hover:scale-105"
                    >
                      <Link
                        href={
                          orgSlug
                            ? `/orgs/${orgSlug}/audits`
                            : "/dashboard/audits"
                        }
                      >
                        Annuler
                      </Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats - Quota Info */}
            <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
              <CardContent className="pt-6">
                {quotaLoading ? (
                  <div className="animate-pulse space-y-2 text-center">
                    <div className="bg-muted mx-auto h-8 w-16 rounded"></div>
                    <div className="bg-muted mx-auto h-4 w-24 rounded"></div>
                  </div>
                ) : quotaInfo ? (
                  <div className="space-y-2 text-center">
                    <div className="text-primary text-3xl font-bold">
                      {quotaInfo.remaining}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Audits restants ce mois
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Plan {quotaInfo.planName}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <div className="text-primary text-3xl font-bold">
                      2-3 min
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Temps d'analyse moyen
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Types */}
            <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">
                  Que va analyser cet audit ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {auditTypes.map((audit) => {
                  const IconComponent = audit.icon;
                  const isExpanded = expandedAudit === audit.id;

                  return (
                    <div key={audit.id} className="card-hover">
                      <div
                        className={`smooth-transition cursor-pointer rounded-lg border p-4 ${audit.bgColor} ${audit.borderColor}`}
                        onClick={() =>
                          setExpandedAudit(isExpanded ? null : audit.id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${audit.color}20` }}
                            >
                              <IconComponent
                                className="h-4 w-4"
                                style={{ color: audit.color }}
                              />
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {audit.title}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {audit.description}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <ChevronDown className="text-muted-foreground h-4 w-4" />
                          )}
                        </div>

                        {isExpanded && (
                          <div className="border-border/50 mt-3 border-t pt-3">
                            <ul className="text-muted-foreground space-y-1 text-xs">
                              {audit.details.map((detail, index) => (
                                <li
                                  key={index}
                                  className="flex items-start space-x-2"
                                >
                                  <div
                                    className="mt-2 h-1 w-1 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: audit.color }}
                                  ></div>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Process Info */}
            <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="space-y-2 text-center">
                  <div className="text-sm font-medium">Processus sécurisé</div>
                  <div className="text-muted-foreground text-xs">
                    Vos données sont traitées de manière confidentielle et ne
                    sont pas stockées
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal d'upgrade */}
      {quotaInfo && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlanId={quotaInfo.planId}
          trigger={!canCreateAudit ? "quota_exceeded" : "quota_warning"}
        />
      )}
    </div>
  );
}
