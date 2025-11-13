"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Calendar,
  Package,
  File,
  Folder,
} from "lucide-react";

// Types for browser-side export jobs (matching server-side but without Node.js dependencies)
type ExportStatus = {
  phase: "preparing" | "processing" | "packaging" | "completed" | "error";
  progress: number;
  message: string;
  currentFile?: string;
  processedAudits?: number;
  totalAudits?: number;
  error?: string;
};

type ExportJob = {
  id: string;
  userId: string;
  config: {
    format: "json" | "html" | "csv";
    filters?: {
      status?: string[];
      dateRange?: {
        from?: string;
        to?: string;
      };
      auditType?: string[];
      minScore?: number;
    };
  };
  status: ExportStatus;
  totalAudits: number;
  processedAudits: number;
  startTime: Date;
  endTime?: Date;
  downloadUrl?: string;
};

type ExportStatusPhase = ExportStatus["phase"];

// Fonction pour déterminer la couleur du statut
const getStatusColor = (phase: ExportStatusPhase) => {
  switch (phase) {
    case "preparing":
      return "bg-blue-100 text-blue-800";
    case "processing":
      return "bg-orange-100 text-orange-800";
    case "packaging":
      return "bg-purple-100 text-purple-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "error":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Fonction pour obtenir l'icône du statut
const getStatusIcon = (phase: ExportStatusPhase) => {
  switch (phase) {
    case "preparing":
      return <Clock className="h-4 w-4 animate-pulse" />;
    case "processing":
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    case "packaging":
      return <Package className="h-4 w-4 animate-pulse" />;
    case "completed":
      return <CheckCircle className="h-4 w-4" />;
    case "error":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

// Fonction pour formater la durée
const formatDuration = (startTime: Date, endTime?: Date): string => {
  const duration = endTime ? endTime.getTime() - startTime.getTime() : Date.now() - startTime.getTime();
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}min`;
  } else if (minutes > 0) {
    return `${minutes}min ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

// Fonction pour formater la taille des fichiers
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Composant de chargement
function ExportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="bg-muted mb-2 h-8 w-48 rounded"></div>
          <div className="bg-muted h-4 w-64 rounded"></div>
        </div>
        <div className="bg-muted h-9 w-32 rounded"></div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-muted h-8 w-8 rounded"></div>
                <div className="space-y-2 flex-1">
                  <div className="bg-muted h-4 w-32 rounded"></div>
                  <div className="bg-muted h-3 w-24 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ExportsPage() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les jobs d'export au montage
  useEffect(() => {
    const loadJobs = () => {
      try {
        // Récupérer les jobs via l'API seulement
        fetch('/api/audits/export/jobs')
          .then((response) => {
            if (response.ok) {
              return response.json();
            } else {
              // Si l'API n'existe pas, retourner un tableau vide
              return { jobs: [] };
            }
          })
          .then((data) => {
            setJobs(data.jobs || []);
          })
          .catch((error) => {
            console.error('Error loading export jobs:', error);
            // En cas d'erreur, retourner un tableau vide
            setJobs([]);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch (error) {
        console.error('Error loading exports:', error);
        setJobs([]);
        setIsLoading(false);
      }
    };

    loadJobs();

    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(loadJobs, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fonction pour télécharger un export
  const handleDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/audits/export/download/${jobId}`);

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      // Créer un lien de téléchargement
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading export:', error);
    }
  };

  // Fonction pour supprimer un export
  const handleDelete = async (jobId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet export ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/audits/export/delete/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setJobs(jobs.filter(job => job.id !== jobId));
      } else {
        console.error('Failed to delete export:', response.status);
      }
    } catch (error) {
      console.error('Error deleting export:', error);
    }
  };

  // Fonction pour nettoyer les anciens exports
  const handleCleanup = async () => {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les anciens exports terminés ?')) {
      return;
    }

    try {
      // Appeler l'API de nettoyage
      const response = await fetch('/api/audits/export/cleanup', {
        method: 'POST',
      });

      if (response.ok) {
        // Rafraîchir la liste des jobs
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        console.error('Failed to cleanup exports:', response.status);
      }
    } catch (error) {
      console.error('Error cleaning up exports:', error);
    }
  };

  if (isLoading) {
    return <ExportsSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exports</h1>
          <p className="text-muted-foreground">
            Gérez vos exports d'audits et téléchargez les résultats
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCleanup}
            variant="outline"
            size="sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Nettoyer
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-sm text-muted-foreground">Exports totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {jobs.filter(job => job.status.phase === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {jobs.reduce((acc, job) => {
                    if (job.status.phase === 'completed' && job.totalAudits > 0) {
                      const size = job.totalAudits * 2048; // Estimation 2KB par audit
                      return acc + size;
                    }
                    return acc;
                  }, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Espace utilisé</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des exports */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucun export</h3>
              <p className="text-muted-foreground mb-6">
                Lancez votre premier export depuis le dashboard pour voir vos résultats ici
              </p>
              <Button asChild>
                <a href="/dashboard/audits">
                  <Download className="mr-2 h-4 w-4" />
                  Nouvel Export
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${getStatusColor(job.status.phase)}`}>
                      {getStatusIcon(job.status.phase)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Export #{job.id.split('_').pop()}
                      </CardTitle>
                      <CardDescription>
                        Format: {job.config.format?.toUpperCase()} • {job.totalAudits} audits
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(job.status.phase)} text-xs`}>
                      {job.status.phase}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(job.startTime, job.endTime)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Barre de progression */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progression</span>
                      <span>{job.status.progress || 0}%</span>
                    </div>
                    <Progress value={job.status.progress || 0} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {job.status.message}
                    </p>
                  </div>

                  {/* Statistiques */}
                  {job.totalAudits > 0 && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">{job.totalAudits}</p>
                        <p className="text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="font-medium">{job.processedAudits}</p>
                        <p className="text-muted-foreground">Traité</p>
                      </div>
                      <div>
                        <p className="font-medium">
                          {job.processedAudits} fichiers
                        </p>
                        <p className="text-muted-foreground">Générés</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {job.status.phase === 'completed' && job.downloadUrl && (
                      <Button
                        onClick={() => handleDownload(job.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </Button>
                    )}
                    {(job.status.phase === 'error' ||
                      (job.status.phase === 'completed' && job.endTime &&
                       Date.now() - job.endTime.getTime() > 10 * 60 * 1000)) && (
                      <Button
                        onClick={() => handleDelete(job.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </Button>
                    )}
                    {job.status.phase === 'processing' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                      >
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        En cours...
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}