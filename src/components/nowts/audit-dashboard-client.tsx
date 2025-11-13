"use client";

import { useState } from "react";
import { useAuditData } from "@/hooks/use-audit-data";
import { useAuditEvents } from "@/hooks/use-audit-events";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LastAuditCard } from "@/components/nowts/last-audit-card";
import { ExportAuditModal } from "@/components/nowts/export-audit-modal";
import {
  FileText,
  BarChart3,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap,
  Clock,
  Globe,
  ArrowUpRight,
  Eye,
  Download,
} from "lucide-react";
import Link from "next/link";

type AuditDashboardClientProps = {
  orgSlug?: string; // Optionnel pour maintenir la compatibilité (B2B)
  userId?: string; // Optionnel pour mode B2C
};

export function AuditDashboardClient({
  orgSlug,
  userId,
}: AuditDashboardClientProps = {}) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [currentExportJob, setCurrentExportJob] = useState<{
    id: string;
    status: any;
    config: any;
  } | null>(null);

  const {
    audits,
    stats,
    quota,
    isLoading,
    error,
    lastFetch,
    refresh,
    getRecentAudits,
  } = useAuditData({ orgSlug });

  const recentAudits = getRecentAudits(8);

  // Handler for starting bulk export
  const handleBulkExport = async (config: any) => {
    try {
      console.log("🚀 Démarrage de l'export bulk avec la configuration:", config);

      // Start the export via SSE API
      const response = await fetch('/api/audits/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du démarrage de l\'export');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        const processSSEMessage = (event: any) => {
          const data = JSON.parse(event.data);

          console.log("📊 Progression d'export:", data);

          if (data.type === 'start') {
            setCurrentExportJob({
              id: data.jobId,
              status: { phase: 'preparing', progress: 0, message: 'Initialisation...' },
              config
            });
          } else if (data.type === 'progress') {
            setCurrentExportJob(prev => prev ? { ...prev, status: data.status } : null);
          } else if (data.type === 'complete') {
            console.log("✅ Export terminé avec succès");
            setIsExportModalOpen(false);
            // Ouvrir la page de téléchargement dans un nouvel onglet
            setTimeout(() => {
              window.open(`/dashboard/exports`, '_blank');
            }, 1000);
          } else if (data.type === 'error') {
            console.error("❌ Erreur lors de l'export:", data.status?.error);
          }
        };

        // Read SSE stream
        const readStream = async () => {
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Process all complete lines except the last one (which might be incomplete)
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line.startsWith('data: ')) {
                try {
                  const eventData = line.substring(6); // Remove 'data: ' prefix
                  processSSEMessage({ data: eventData });
                } catch (error) {
                  console.error("❌ Erreur de parsing SSE:", error);
                }
              }
            }

            // Keep the last incomplete line for the next iteration
            buffer = lines[lines.length - 1];
          }
        };

        readStream();
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error);
      setIsExportModalOpen(false);
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Fonction pour obtenir la couleur du status
  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (
      lowerStatus.includes("completed") ||
      lowerStatus.includes("succeeded") ||
      lowerStatus.includes("terminé")
    ) {
      return "bg-green-100 text-green-800";
    }
    if (
      lowerStatus.includes("processing") ||
      lowerStatus.includes("running") ||
      lowerStatus.includes("cours")
    ) {
      return "bg-blue-100 text-blue-800";
    }
    if (
      lowerStatus.includes("failed") ||
      lowerStatus.includes("error") ||
      lowerStatus.includes("erreur")
    ) {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  // Fonction pour télécharger un audit
  const handleDownloadAudit = async (auditId: string) => {
    try {
      console.log(`📥 Téléchargement de l'audit ${auditId}`);

      // Ouvrir l'URL de téléchargement dans un nouvel onglet
      window.open(`/api/audits/${auditId}/download`, '_blank');
    } catch (error) {
      console.error("❌ Erreur lors du téléchargement:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (
      lowerStatus.includes("completed") ||
      lowerStatus.includes("succeeded") ||
      lowerStatus.includes("terminé")
    ) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (
      lowerStatus.includes("processing") ||
      lowerStatus.includes("running") ||
      lowerStatus.includes("cours")
    ) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (
      lowerStatus.includes("failed") ||
      lowerStatus.includes("error") ||
      lowerStatus.includes("erreur")
    ) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Erreur de chargement
            </CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={refresh}
              variant="outline"
              className="border-red-300"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audits</h1>
          <p className="text-muted-foreground">
            Dashboard personnel • {stats.total} audits au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
          <Link href="/dashboard/audits/new">
            <Button>
              <Zap className="mr-2 h-4 w-4" />
              Nouvel Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Métriques principales - Vraies données */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {lastFetch
                  ? `Mis à jour ${formatDate(lastFetch.toISOString())}`
                  : "Chargement..."}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{stats.total}</h3>
              <p className="text-muted-foreground text-sm">Total Audits</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-green-50 p-3 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{stats.completed}</h3>
              <p className="text-muted-foreground text-sm">Terminés</p>
              <p className="text-xs text-green-600">
                {stats.total > 0
                  ? Math.round((stats.completed / stats.total) * 100)
                  : 0}
                % de réussite
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
                <RefreshCw className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{stats.processing}</h3>
              <p className="text-muted-foreground text-sm">En Traitement</p>
              <p className="text-xs text-orange-600">ETA: 3-5 min</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{quota.used}</h3>
              <p className="text-muted-foreground text-sm">Quota Utilisé</p>
              <div className="flex items-center gap-2 text-xs">
                <Progress
                  value={(quota.used / quota.total) * 100}
                  className="h-2 flex-1"
                />
                <span className="text-muted-foreground">
                  {quota.used}/{quota.total}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dernier audit */}
        <div className="lg:col-span-1">
          <LastAuditCard
            orgSlug={orgSlug}
            userId={userId}
          />
        </div>

        {/* Liste des audits récents - Vraies données */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="text-primary h-5 w-5" />
                Audits Récents
              </CardTitle>
              <CardDescription>
                Les {recentAudits.length} derniers audits de l'organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAudits.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Globe className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Aucun audit trouvé</p>
                  <p className="text-sm">
                    Lancez votre premier audit pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAudits.map((audit) => (
                    <div
                      key={audit.id}
                      className="hover:bg-accent/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(audit.status)}
                          <div>
                            <p className="text-sm font-medium">{audit.url}</p>
                            <p className="text-muted-foreground text-xs">
                              {audit.email} • {formatDate(audit.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {audit.score !== null && (
                          <Badge variant="outline" className="text-xs">
                            Score: {audit.score}/100
                          </Badge>
                        )}
                        <Badge
                          className={`text-xs ${getStatusColor(audit.status)}`}
                        >
                          {audit.status}
                        </Badge>
                        {audit.htmlReport && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={async () => handleDownloadAudit(audit.id)}
                            title="Télécharger le rapport"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {audits.length > 8 && (
                    <div className="pt-4 text-center">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/audits/all">
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Voir tous les audits ({audits.length})
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Lancez de nouveaux audits ou gérez vos données existantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/audits/new">
              <Button className="w-full justify-start" variant="outline">
                <Zap className="mr-2 h-4 w-4" />
                Audit Simple
              </Button>
            </Link>
            <Link href="/dashboard/audits/batch">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Audit Batch (CSV)
              </Button>
            </Link>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter les résultats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportAuditModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleBulkExport}
          currentJob={currentExportJob}
        />
      )}
    </div>
  );
}
