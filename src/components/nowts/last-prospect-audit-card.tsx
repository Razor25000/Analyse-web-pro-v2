import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, Clock, CheckCircle } from "lucide-react";
import type { AuditData } from "@/hooks/use-audit-data";
import { cn } from "@/lib/utils";

type LastProspectAuditProps = {
  audits: AuditData[];
}

function getQualificationLevel(score: number | null): {
  level: string;
  color: string;
  bg: string;
  message: string;
} {
  if (!score) {
    return {
      level: "En cours",
      color: "text-blue-600",
      bg: "bg-blue-50",
      message: "Audit en cours d'analyse"
    };
  }

  if (score >= 80) {
    return {
      level: "Excellente",
      color: "text-green-600",
      bg: "bg-green-50",
      message: "Opportunité premium à saisir"
    };
  } else if (score >= 60) {
    return {
      level: "Bonne",
      color: "text-blue-600",
      bg: "bg-blue-50",
      message: "Prospect qualifié, potentiel intéressant"
    };
  } else if (score >= 40) {
    return {
      level: "Moyenne",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      message: "Opportunité d'amélioration à proposer"
    };
  } else {
    return {
      level: "Faible",
      color: "text-red-600",
      bg: "bg-red-50",
      message: "Besoin important d'optimisation"
    };
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
}

function getScoreIcon(score: number | null): React.ReactNode {
  if (!score) return <Clock className="h-4 w-4 text-gray-500" />;
  if (score >= 80) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (score >= 60) return <CheckCircle className="h-4 w-4 text-blue-500" />;
  return <CheckCircle className="h-4 w-4 text-gray-500" />;
}

export function LastProspectAuditCard({ audits }: LastProspectAuditProps) {
  // Trouver l'audit le plus récent et complété
  const latestCompletedAudit = audits
    .filter(audit => audit.status === 'completed' && audit.score !== null)
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())[0];

  // Si pas d'audit complété, prendre le plus récent en cours
  const latestAudit = latestCompletedAudit || audits
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!latestAudit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="text-primary h-5 w-5" />
            Dernier Audit Rapide
          </CardTitle>
          <CardDescription>
            Aucun audit réalisé pour le moment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Commencez votre premier audit pour qualifier vos prospects</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const qualification = getQualificationLevel(latestAudit.score);
  const isCompleted = latestAudit.status === 'completed' && latestAudit.score !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="text-primary h-5 w-5" />
          Dernier Audit Rapide
          {getScoreIcon(latestAudit.score)}
        </CardTitle>
        <CardDescription>
          Dernier prospect audité pour votre qualification commerciale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL du prospect */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">URL du Prospect</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate bg-gray-50 px-3 py-2 rounded-md text-sm font-mono">
              {latestAudit.url}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(latestAudit.url, '_blank')}
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Score principal */}
        {isCompleted && (
          <div className="text-center py-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Score Global</div>
            <div className="text-4xl font-bold mb-1">
              <span className={cn(
                latestAudit.score! >= 80 ? "text-green-600" :
                latestAudit.score! >= 60 ? "text-blue-600" :
                latestAudit.score! >= 40 ? "text-yellow-600" : "text-red-600"
              )}>
                {latestAudit.score}%
              </span>
            </div>
            <Badge className={cn(qualification.bg, qualification.color)}>
              {qualification.level}
            </Badge>
          </div>
        )}

        {/* Message de qualification */}
        <div className={cn(
          "p-3 rounded-lg border",
          qualification.bg
        )}>
          <div className="flex items-start gap-2">
            <TrendingUp className={cn("h-4 w-4 mt-0.5 shrink-0", qualification.color)} />
            <div>
              <div className={cn("text-sm font-medium", qualification.color)}>
                {qualification.level}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {qualification.message}
              </div>
            </div>
          </div>
        </div>

        {/* Métadonnées */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-600">Statut</div>
            <div className="font-medium">
              {isCompleted ? "Complété" : "En cours"}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Date</div>
            <div className="font-medium">
              {formatDate(isCompleted ? latestAudit.completedAt : latestAudit.createdAt)}
            </div>
          </div>
        </div>

        {/* Scores par catégorie */}
        {isCompleted && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Scores par Catégorie</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                <span className="text-xs text-gray-600">Performance</span>
                <span className="text-xs font-medium">
                  {latestAudit.auditData?.scorePerformance || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                <span className="text-xs text-gray-600">SEO</span>
                <span className="text-xs font-medium">
                  {latestAudit.auditData?.scoreSeo || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                <span className="text-xs text-gray-600">Sécurité</span>
                <span className="text-xs font-medium">
                  {latestAudit.auditData?.scoreSecurity || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                <span className="text-xs text-gray-600">Modernité</span>
                <span className="text-xs font-medium">
                  {latestAudit.auditData?.scoreModern || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}