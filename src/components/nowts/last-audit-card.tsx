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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  ExternalLink,
  Clock,
  Zap,
  Shield,
  Search,
  Code,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LastAuditCardProps = {
  orgSlug?: string;
  userId?: string;
}

type AuditMetrics = {
  performance: number;
  seo: number;
  security: number;
  modernity: number;
  global: number;
}

export function LastAuditCard({ orgSlug, userId }: LastAuditCardProps) {
  const {
    audits,
    stats,
    isLoading,
    refresh,
    getAuditsByStatus,
  } = useAuditData({ orgSlug });

  // Initialiser les métriques avec des valeurs par défaut
  const [metrics, setMetrics] = useState<AuditMetrics>({
    performance: 0,
    seo: 0,
    security: 0,
    modernity: 0,
    global: 0,
  });

  const [elapsedTime, setElapsedTime] = useState(0);

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

  // Récupérer tous les audits et prendre le dernier (en cours ou terminé)
  const lastAudit = useMemo(() => {
    if (audits.length === 0) return null;

    // Trier par date de création du plus récent au plus ancien
    const sortedAudits = [...audits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return sortedAudits[0];
  }, [audits]);

  // Mettre à jour les métriques quand le dernier audit change
  useEffect(() => {
    if (lastAudit) {
      if (lastAudit.scores) {
        setMetrics({
          performance: lastAudit.scores.performance || 0,
          seo: lastAudit.scores.seo || 0,
          security: lastAudit.scores.security || 0,
          modernity: lastAudit.scores.modernity || 0,
          global: lastAudit.scores.global || lastAudit.score || 0,
        });
      } else {
        // Si pas de scores détaillés, utiliser le score global
        setMetrics({
          performance: 0,
          seo: 0,
          security: 0,
          modernity: 0,
          global: lastAudit.score || 0,
        });
      }
    }
  }, [lastAudit]);

  // Écouter les événements pour mettre à jour les métriques
  const { lastEvent } = useAuditEvents({
    orgSlug,
    userId,
    onAuditProgress: (event) => {
      if (event.scores && lastAudit && event.auditId === lastAudit.id) {
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

  // Calculer le temps écoulé si l'audit est en cours
  useEffect(() => {
    if (!lastAudit || !isAuditInProgress(lastAudit)) return;

    const startTime = new Date(lastAudit.createdAt).getTime();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastAudit, isAuditInProgress]);

  // Formater la date
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

  // Obtenir la couleur du statut
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

  // Obtenir l'icône du statut
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
      return <Clock className="h-4 w-4 animate-pulse" />;
    }
    if (
      lowerStatus.includes("failed") ||
      lowerStatus.includes("error") ||
      lowerStatus.includes("erreur")
    ) {
      return <TrendingDown className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  // Si pas d'audit, afficher un message
  if (!lastAudit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="text-primary h-5 w-5" />
            Aucun Audit
          </CardTitle>
          <CardDescription>
            Lancez votre premier audit pour voir les résultats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Globe className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p className="text-muted-foreground">
              Aucun audit n'a été lancé pour le moment
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Utiliser le score de l'audit s'il existe, sinon les métriques temps réel
  const displayScore = lastAudit.score !== null ? lastAudit.score : metrics.global;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-primary h-5 w-5" />
            Dernier Audit
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-xs ${getStatusColor(lastAudit.status)}`}
            >
              {getStatusIcon(lastAudit.status)}
              <span className="ml-1">{lastAudit.status}</span>
            </Badge>
            {isAuditInProgress(lastAudit) && (
              <Badge variant="secondary" className="text-xs">
                {formatTime(elapsedTime)}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <a
              href={lastAudit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {lastAudit.url}
            </a>
            <span className="text-muted-foreground">•</span>
            <span>{formatDate(lastAudit.createdAt)}</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score global en vedette */}
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-4xl font-bold">Score</span>
            {getTrendIcon(displayScore)}
          </div>
          <div className={cn("text-5xl font-bold", getScoreColor(displayScore))}>
            {displayScore}/100
          </div>
          <p className="text-muted-foreground text-sm">Note globale</p>
        </div>

        {/* Barre de progression globale */}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Progression</span>
            <span>{Math.min(95, displayScore)}%</span>
          </div>
          <Progress value={Math.min(95, displayScore)} className="h-2" />
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
      </CardContent>
    </Card>
  );
}