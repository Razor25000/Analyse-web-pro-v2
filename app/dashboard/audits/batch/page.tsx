"use client";

import { useState, useCallback } from "react";
import { PlanGuard } from "@/components/nowts/plan-guard";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  DollarSign,
  Zap,
  Search,
  Shield,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

// Interfaces TypeScript
type CsvPreviewItem = {
  url: string;
  email: string;
  isValidUrl: boolean;
};

type FileUploadState = {
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string | null;
};

type TemplateOption = {
  id: string;
  name: string;
  description: string;
  headers: string[];
  example: string;
};

// Configuration des templates
const templateOptions: TemplateOption[] = [
  {
    id: "basic",
    name: "Modèle Basique",
    description: "URL et email seulement",
    headers: ["url", "email"],
    example: "example.com,contact@example.com\ntest-site.fr,admin@test-site.fr",
  },
  {
    id: "detailed",
    name: "Modèle Détaillé",
    description: "Avec nom et secteur d'activité",
    headers: ["url", "email", "company_name", "industry"],
    example:
      "example.com,contact@example.com,Example Corp,Technology\ntest-site.fr,admin@test-site.fr,Test SARL,Retail",
  },
  {
    id: "ecommerce",
    name: "Modèle E-commerce",
    description: "Spécialisé pour les boutiques en ligne",
    headers: ["url", "email", "store_name", "platform", "monthly_visitors"],
    example:
      "boutique.com,hello@boutique.com,Ma Boutique,Shopify,5000\nstore.fr,contact@store.fr,Mon Store,WooCommerce,2000",
  },
];

// Configuration des types d'audit (réutilisé de la page single)
const auditTypes = [
  {
    id: "performance",
    title: "Performance",
    icon: Zap,
    color: "hsl(214, 100%, 59%)",
    description: "Vitesse et optimisations",
  },
  {
    id: "seo",
    title: "SEO",
    icon: Search,
    color: "hsl(142, 76%, 47%)",
    description: "Référencement naturel",
  },
  {
    id: "security",
    title: "Sécurité",
    icon: Shield,
    color: "hsl(25, 95%, 53%)",
    description: "HTTPS et sécurité",
  },
  {
    id: "modern",
    title: "Modernité",
    icon: Sparkles,
    color: "hsl(271, 76%, 53%)",
    description: "Technologies modernes",
  },
];

export default function BatchAuditPage() {
  const router = useRouter();

  // États principaux
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("basic");

  // États du formulaire
  const [formData, setFormData] = useState({
    batchName: "",
    csvData: "",
  });

  // États de l'upload et preview
  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
  });

  const [previewData, setPreviewData] = useState<CsvPreviewItem[] | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Validation d'URL
  const isValidUrl = useCallback((url: string): boolean => {
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Gestion du drag & drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, []);

  // Traitement du fichier
  const processFile = useCallback(
    (file: File) => {
      // Validation du fichier
      if (!file.type.includes("csv") && !file.name.endsWith(".csv")) {
        setFileUpload((prev) => ({
          ...prev,
          error: "Veuillez sélectionner un fichier CSV",
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB max
        setFileUpload((prev) => ({
          ...prev,
          error: "Le fichier est trop volumineux (max 5MB)",
        }));
        return;
      }

      setFileUpload({
        file,
        uploading: true,
        progress: 0,
        error: null,
      });

      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFileUpload((prev) => ({ ...prev, progress }));
        }
      };

      reader.onload = (event) => {
        const csvContent = event.target?.result as string;
        setFormData((prev) => ({ ...prev, csvData: csvContent }));

        try {
          const lines = csvContent.trim().split("\n");
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().toLowerCase());

          if (!headers.includes("url")) {
            setError('Le fichier CSV doit contenir une colonne "url"');
            setFileUpload((prev) => ({
              ...prev,
              uploading: false,
              error: 'Colonne "url" manquante',
            }));
            return;
          }

          const urlIndex = headers.indexOf("url");
          const emailIndex = headers.indexOf("email");

          const preview = lines
            .slice(1)
            .map((line) => {
              const values = line.split(",").map((v) => v.trim());
              const url = values[urlIndex] || "";
              const email =
                values[emailIndex] ||
                `contact@${url.replace(/^https?:\/\//, "").split("/")[0]}`;

              return {
                url,
                email,
                isValidUrl: isValidUrl(url),
              };
            })
            .filter((item) => item.url);

          if (preview.length > 50) {
            setError("Maximum 50 sites autorisés par batch");
            setFileUpload((prev) => ({
              ...prev,
              uploading: false,
              error: "Trop de sites (max 50)",
            }));
            return;
          }

          setPreviewData(preview);
          setError(null);
          setFileUpload((prev) => ({
            ...prev,
            uploading: false,
            progress: 100,
          }));
        } catch (err) {
          setError("Erreur lors de la lecture du fichier CSV");
          setFileUpload((prev) => ({
            ...prev,
            uploading: false,
            error: "Erreur de parsing",
          }));
        }
      };

      reader.readAsText(file);
    },
    [isValidUrl],
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.csvData) {
        throw new Error("Veuillez sélectionner un fichier CSV");
      }

      const response = await fetch("/api/audits/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors du démarrage du batch");
      }

      // Construire un message détaillé avec les statistiques de doublons
      let successMessage = `Batch démarré avec succès ! ${result.createdAuditIds.length} nouveaux audits créés sur ${result.totalProspects} sites.`;

      if (result.databaseDuplicateRows > 0) {
        successMessage += ` ${result.databaseDuplicateRows} URL(s) déjà analysées ignorées.`;
      }

      if (result.duplicateRows > 0) {
        successMessage += ` ${result.duplicateRows} doublon(s) dans le CSV ignorés.`;
      }

      if (result.invalidRows > 0) {
        successMessage += ` ${result.invalidRows} URL(s) invalide(s) ignorées.`;
      }

      setSuccess(successMessage);

      setTimeout(() => {
        router.push("/dashboard/audits");
      }, 3000);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Une erreur inattendue s'est produite");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = (templateId: string) => {
    const template = templateOptions.find((t) => t.id === templateId);
    if (!template) return;

    const csvContent = `${template.headers.join(",")}\n${template.example}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-batch-audit-${templateId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculs des statistiques
  const stats = previewData
    ? {
        total: previewData.length,
        valid: previewData.filter((item) => item.isValidUrl).length,
        invalid: previewData.filter((item) => !item.isValidUrl).length,
        estimatedTime: Math.ceil(previewData.length * 2.5), // 2.5 min par site
        estimatedCost: previewData.length * 0.5, // 0.50€ par audit
      }
    : null;

  return (
    <PlanGuard
      requiredPlan="premium"
      fallbackTitle="Audits Batch - Fonctionnalité Premium"
      fallbackDescription="Les audits batch permettent d'analyser plusieurs sites simultanément. Cette fonctionnalité est réservée aux utilisateurs Premium (100€/mois)."
    >
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
                <Link href="/dashboard/audits">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Hero Content */}
            <div className="mx-auto mb-12 max-w-4xl text-center">
              <h1 className="gradient-text mb-4 text-4xl font-bold lg:text-5xl">
                Analysez Plusieurs Sites Simultanément
              </h1>
              <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl leading-relaxed">
                Uploadez un fichier CSV et obtenez des rapports d'audit complets
                pour tous vos sites en quelques minutes
              </p>

              {/* Process Steps */}
              <div className="text-muted-foreground flex items-center justify-center space-x-8 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <span>Upload CSV</span>
                </div>
                <div className="bg-border h-px w-12"></div>
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                    <Loader2 className="h-4 w-4" />
                  </div>
                  <span>Traitement</span>
                </div>
                <div className="bg-border h-px w-12"></div>
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span>Rapports</span>
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
              {/* Upload Card */}
              <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">
                    Upload de Fichier CSV
                  </CardTitle>
                  <CardDescription className="text-base">
                    Glissez-déposez votre fichier ou cliquez pour sélectionner
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nom du batch */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="batchName"
                        className="text-base font-medium"
                      >
                        Nom du Batch
                      </Label>
                      <Input
                        id="batchName"
                        placeholder="Analyse Q4 2024 - Sites clients"
                        value={formData.batchName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            batchName: e.target.value,
                          }))
                        }
                        className="h-12 text-base"
                      />
                      <p className="text-muted-foreground text-sm">
                        Nom optionnel pour identifier ce batch d'audits
                      </p>
                    </div>

                    {/* Upload Zone */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Fichier CSV
                      </Label>

                      <div
                        className={`upload-zone cursor-pointer rounded-lg p-8 text-center ${
                          dragActive ? "drag-active" : ""
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() =>
                          document.getElementById("csvFile")?.click()
                        }
                      >
                        <input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          required={!formData.csvData}
                        />

                        {fileUpload.uploading ? (
                          <div className="space-y-3">
                            <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
                            <div className="text-sm font-medium">
                              Upload en cours...
                            </div>
                            <Progress
                              value={fileUpload.progress}
                              className="mx-auto w-full max-w-xs"
                            />
                          </div>
                        ) : fileUpload.file ? (
                          <div className="space-y-3">
                            <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                            <div className="text-sm font-medium">
                              {fileUpload.file.name}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {(fileUpload.file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Upload
                              className="text-muted-foreground mx-auto h-8 w-8"
                              style={{
                                animation: dragActive
                                  ? "upload-bounce 0.5s ease-in-out infinite"
                                  : "none",
                              }}
                            />
                            <div className="text-sm font-medium">
                              Glissez votre fichier CSV ici ou cliquez pour
                              sélectionner
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Maximum 5MB • Format CSV uniquement
                            </div>
                          </div>
                        )}
                      </div>

                      {fileUpload.error !== null && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {fileUpload.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Messages */}
                    {error !== null && (
                      <Alert
                        variant="destructive"
                        className="smooth-transition"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-base">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {success !== null && (
                      <Alert className="smooth-transition border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-base text-green-800">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Boutons */}
                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="submit"
                        disabled={
                          isLoading ||
                          !formData.csvData ||
                          (stats ? stats.invalid > 0 : false)
                        }
                        className="smooth-transition h-12 flex-1 text-base hover:scale-105"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Démarrage en cours...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-5 w-5" />
                            Démarrer l'Analyse Batch
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="smooth-transition h-12 px-8 hover:scale-105"
                      >
                        <Link href="/dashboard/audits">Annuler</Link>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* CSV Preview */}
              {previewData !== null && (
                <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      Aperçu des Données
                    </CardTitle>
                    <CardDescription>
                      Vérification des {previewData.length} sites détectés
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Statistics */}
                    {stats !== null && (
                      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg bg-blue-50 p-3 text-center">
                          <Users className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                          <div className="text-lg font-bold text-blue-700">
                            {stats.total}
                          </div>
                          <div className="text-xs text-blue-600">
                            Sites Total
                          </div>
                        </div>
                        <div className="rounded-lg bg-green-50 p-3 text-center">
                          <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-600" />
                          <div className="text-lg font-bold text-green-700">
                            {stats.valid}
                          </div>
                          <div className="text-xs text-green-600">
                            URLs Valides
                          </div>
                        </div>
                        <div className="rounded-lg bg-orange-50 p-3 text-center">
                          <Clock className="mx-auto mb-1 h-5 w-5 text-orange-600" />
                          <div className="text-lg font-bold text-orange-700">
                            {stats.estimatedTime}min
                          </div>
                          <div className="text-xs text-orange-600">
                            Temps Estimé
                          </div>
                        </div>
                        <div className="rounded-lg bg-purple-50 p-3 text-center">
                          <DollarSign className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                          <div className="text-lg font-bold text-purple-700">
                            {stats.estimatedCost.toFixed(2)}€
                          </div>
                          <div className="text-xs text-purple-600">
                            Coût Estimé
                          </div>
                        </div>
                      </div>
                    )}

                    {stats !== null && stats.invalid > 0 && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          {stats.invalid} URL(s) invalide(s) détectée(s).
                          Veuillez corriger votre fichier avant de continuer.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Preview Table */}
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {previewData.slice(0, 5).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium">
                                {item.url}
                              </div>
                              {item.isValidUrl ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {item.email}
                            </div>
                          </div>
                          <Badge
                            variant={
                              item.isValidUrl ? "default" : "destructive"
                            }
                            className="text-xs"
                          >
                            {item.isValidUrl ? "Valide" : "Invalide"}
                          </Badge>
                        </div>
                      ))}

                      {previewData.length > 5 && (
                        <div className="text-muted-foreground py-2 text-center text-sm">
                          ... et {previewData.length - 5} autres sites
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Batch Insights */}
              <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Insights Batch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-center">
                    <div className="text-primary text-2xl font-bold">
                      Jusqu'à 50
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Sites par batch
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>2-3 min par site</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span>Rapports individuels</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4 text-purple-500" />
                      <span>Export CSV global</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Templates */}
              <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Modèles CSV</CardTitle>
                  <CardDescription>
                    Téléchargez un modèle adapté à vos besoins
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templateOptions.map((template) => (
                    <div key={template.id} className="card-hover">
                      <div
                        className={`template-card smooth-transition cursor-pointer rounded-lg border p-3 ${
                          selectedTemplate === template.id ? "selected" : ""
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {template.name}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadTemplate(template.id);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-muted-foreground mb-2 text-xs">
                          {template.description}
                        </div>
                        <div className="bg-muted rounded p-1 font-mono text-xs">
                          {template.headers.join(", ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Process Guide */}
              <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Guide du Processus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <span className="text-xs font-medium text-blue-700">
                        1
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Préparez votre CSV</div>
                      <div className="text-muted-foreground text-xs">
                        Colonnes url et email minimum
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <span className="text-xs font-medium text-green-700">
                        2
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Uploadez et vérifiez</div>
                      <div className="text-muted-foreground text-xs">
                        Validation automatique des URLs
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <span className="text-xs font-medium text-purple-700">
                        3
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Lancez l'analyse</div>
                      <div className="text-muted-foreground text-xs">
                        Traitement automatique de tous les sites
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Types */}
              <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Types d'Audit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {auditTypes.map((audit) => {
                    const IconComponent = audit.icon;
                    return (
                      <div
                        key={audit.id}
                        className="flex items-center space-x-3"
                      >
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
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PlanGuard>
  );
}
