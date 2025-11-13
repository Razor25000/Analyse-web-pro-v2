"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap } from "lucide-react";
import type { QuotaInfo } from "@/hooks/use-quota-check";

type QuotaWarningProps = {
  quotaInfo: QuotaInfo;
  onUpgradeClick?: () => void;
};

export function QuotaWarning({ quotaInfo, onUpgradeClick }: QuotaWarningProps) {
  const { used, limit, remaining, percentage, planName, resetDate } = quotaInfo;

  const isWarning = percentage >= 75;
  const isCritical = percentage >= 90;
  const isExceeded = remaining <= 0;

  if (percentage < 75) {
    return null; // N'affiche rien si moins de 75% utilisé
  }

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "Date de renouvellement à confirmer";
      }
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
      }).format(dateObj);
    } catch (error) {
      console.error("Erreur formatage date:", error);
      return "Date de renouvellement à confirmer";
    }
  };

  return (
    <Alert
      className={`mb-4 ${isCritical || isExceeded ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}`}
    >
      <AlertTriangle
        className={`h-4 w-4 ${isCritical || isExceeded ? "text-red-600" : "text-orange-600"}`}
      />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {isExceeded ? (
                  <span className="text-red-800">Quota épuisé !</span>
                ) : (
                  <span
                    className={isCritical ? "text-red-800" : "text-orange-800"}
                  >
                    Attention au quota
                  </span>
                )}
              </p>
              <p className="text-muted-foreground text-sm">
                {used} / {limit} audits utilisés ce mois-ci • Plan {planName}
              </p>
            </div>
            <Badge variant={isExceeded ? "destructive" : "outline"}>
              {remaining} restants
            </Badge>
          </div>

          <Progress value={Math.min(percentage, 100)} className="h-2" />

          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>Quota renouvelé le {formatDate(resetDate)}</span>
            {quotaInfo.planId === "free" && onUpgradeClick && (
              <Button
                size="sm"
                onClick={onUpgradeClick}
                className="h-7 px-3 text-xs"
              >
                <Zap className="mr-1 h-3 w-3" />
                Passer Pro
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
