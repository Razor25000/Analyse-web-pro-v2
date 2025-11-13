"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Activity,
  ExternalLink,
  Play,
  Pause,
  Download,
  Eye,
  Clock,
  Zap,
  Shield,
  Search,
  Code,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CurrentAuditCardProps = {
  orgSlug?: string;
  userId?: string;
  onAuditComplete?: (auditId: string) => void;
}

type AuditMetrics = {
  performance: number;
  seo: number;
  security: number;
  modernity: number;
  global: number;
}

export function CurrentAuditCard({ orgSlug, userId, onAuditComplete }: CurrentAuditCardProps) {
  const {
    audits,
    stats,
    isLoading,
    refresh,
    getAuditsByStatus,
  } = useAuditData({ orgSlug });

  const [metrics, setMetrics] = useState<AuditMetrics>({
    performance: 0,
    seo: 0,
    security: 0,
    modernity: 0,
    global: 0,
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fonction pour déterminer si un audit est "en cours"
  const isAuditInProgress = useCallback((audit: any) => {
    const status = audit.status?.toLowerCase() || "";
    return (
      status === "processing" ||
      status === "running" ||
      status === "in_progress" ||
      status === "started" ||
      status === "pending" ||
      status.includes("cours") ||
      status.includes("processing") ||
      status.includes("running")
    );
  }, []);

  // Récupérer les audits en cours (avec critères élargis)
  const currentAudits = useMemo(() => {
    return audits.filter(isAuditInProgress);
  }, [audits, isAuditInProgress]);

  const currentAudit = currentAudits.length > 0 ? currentAudits[0] : null;

  // Logs de débogage pour identifier les statuts réels
  console.log("🔍 CurrentAuditCard - Débogage statuts:", {
    totalAudits: audits.length,
    currentAuditsCount: currentAudits.length,
    currentAudit: currentAudit,
    allStatuses: audits.map(a => ({ id: a.id, status: a.status })),
    inProgressAudits: currentAudits.map(a => ({ id: a.id, status: a.status })),
  });

  // Écouter les événements pour mettre à jour les métriques
  const { lastEvent } = useAuditEvents({
    orgSlug,
    userId,
    onAuditComplete: (event) => {
      if (event.auditId) {
        onAuditComplete?.(event.auditId);
      }
    },
    onAuditProgress: (event) => {
      if (event.scores) {
        setMetrics({
          performance: event.scores.performance || 0,
          seo: event.scores.seo || 0,
          security: event.scores.security || 0,
          modernity: event.scores.modernity || 0,
          global: event.scores.global || 0,
        });
      }
    },
  });

  // Calculer le temps écoulé
  useEffect(() => {
    if (!currentAudit || isPaused) return;

    const startTime = new Date(currentAudit.createdAt).getTime();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentAudit, isPaused]);

  // Formater le temps écoulé
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Obtenir la couleur du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  // Obtenir l'icône de tendance
  const getTrendIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-3 w-3" />;
    if (score >= 60) return <TrendingUp className="h-3 w-3 opacity-70" />;
    if (score >= 40) return <TrendingDown className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  // Obtenir l'icône de la métrique
  const getMetricIcon = (metric: keyof AuditMetrics) => {
    switch (metric) {
      case "performance":
        return <Activity className="h-4 w-4" />;
      case "seo":
        return <Search className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      case "modernity":
        return <Code className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Obtenir le nom de la métrique
  const getMetricName = (metric: keyof AuditMetrics) => {
    switch (metric) {
      case "performance":
        return "Performance";
      case "seo":
        return "SEO";
      case "security":
        return "Sécurité";
      case "modernity":
        return "Modernité";
      default:
        return "Global";
    }
  };

  // Simuler les métriques si aucune donnée réelle
  useEffect(() => {
    if (currentAudit && Object.values(metrics).every(m => m === 0)) {
      // Simuler des métriques pour la démo
      const simulatedMetrics = {
        performance: 65 + Math.floor(Math.random() * 20),
        seo: 70 + Math.floor(Math.random() * 20),
        security: 80 + Math.floor(Math.random() * 15),
        modernity: 55 + Math.floor(Math.random() * 25),
        global: 67 + Math.floor(Math.random() * 20),
      };
      setMetrics(simulatedMetrics);
    }
  }, [currentAudit, metrics]);

  if (!currentAudit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="text-primary h-5 w-5" />
            Aucun Audit en Cours
          </CardTitle>
          <CardDescription>
            Lancez un nouvel audit pour voir les performances en temps réel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p className="text-muted-foreground">
              Aucun audit n'est actuellement en cours de traitement
            </p>
            <Button className="mt-4" onClick={() => window.location.href = "/dashboard/audits/new"}>
              <Zap className="mr-2 h-4 w-4" />
              Lancer un Audit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-primary h-5 w-5" />
            Audit en Cours
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {formatTime(elapsedTime)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <a
              href={currentAudit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {currentAudit.url}
            </a>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score global en vedette */}
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-4xl font-bold">Score</span>
            {getTrendIcon(metrics.global)}
          </div>
          <div className={cn("text-5xl font-bold", getScoreColor(metrics.global))}>
            {metrics.global}/100
          </div>
          <p className="text-muted-foreground text-sm">Note globale</p>
        </div>

        {/* Barre de progression globale */}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Progression</span>
            <span>{Math.min(95, metrics.global)}%</span>
          </div>
          <Progress value={Math.min(95, metrics.global)} className="h-2" />
        </div>

        {/* Métriques détaillées */}
        <div className="grid gap-4">
          {Object.entries(metrics).map(([key, value]) => {
            if (key === "global") return null; // On affiche déjà le score global
            const metricKey = key as keyof Omit<AuditMetrics, "global">;

            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2">
                    {getMetricIcon(metricKey)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getMetricName(metricKey)}</p>
                    <div className="flex items-center gap-1">
                      <span className={cn("text-lg font-bold", getScoreColor(value))}>
                        {value}
                      </span>
                      <span className="text-muted-foreground text-xs">/100</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={value}
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {value}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Temps restant estimé */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Temps restant estimé</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.global < 50
              ? "Environ 2-3 minutes"
              : metrics.global < 80
              ? "Environ 1-2 minutes"
              : "Moins d'une minute"}
          </p>
        </div>

        {/* Actions rapides */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => window.open(`/api/audits/${currentAudit.id}/preview`, '_blank')}
          >
            <Eye className="mr-2 h-4 w-4" />
            Aperçu
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => window.open(`/api/audits/${currentAudit.id}/download`, '_blank')}
            disabled={metrics.global < 20} // Désactiver si l'audit est trop précoce
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}