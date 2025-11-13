"use client";

import { useState, useEffect } from "react";
import { useAuditEvents, type AuditEvent } from "@/hooks/use-audit-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, WifiOff, RefreshCw, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditStatusLiveProps = {
  orgSlug?: string; // Optionnel pour B2C
  className?: string;
  onAuditComplete?: (auditId: string, event: AuditEvent) => void;
  enabled?: boolean;
};

export function AuditStatusLive({
  orgSlug,
  className,
  onAuditComplete,
  enabled = true,
}: AuditStatusLiveProps) {
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [liveStats, setLiveStats] = useState({
    running: 0,
    completed: 0,
    failed: 0,
  });

  const { isConnected, lastEvent, connectionError, reconnect } = useAuditEvents(
    {
      orgSlug,
      enabled,
      onAuditComplete: (event) => {
        // Callback externe
        if (event.auditId) {
          onAuditComplete?.(event.auditId, event);
        }
      },
      onAuditProgress: (event) => {
        console.log("📈 Audit progress:", event);
      },
      onError: (error) => {
        console.error("❌ SSE Error:", error);
      },
    },
  );

  // Mettre à jour les événements récents
  useEffect(() => {
    if (
      lastEvent &&
      lastEvent.type !== "heartbeat" &&
      lastEvent.type !== "connected"
    ) {
      setRecentEvents((prev) => {
        const newEvents = [lastEvent, ...prev].slice(0, 10); // Garder les 10 derniers
        return newEvents;
      });

      // Mettre à jour les stats en temps réel
      if (lastEvent.type === "audit_started") {
        setLiveStats((prev) => ({ ...prev, running: prev.running + 1 }));
      } else if (lastEvent.type === "audit_completed") {
        setLiveStats((prev) => ({
          ...prev,
          running: Math.max(0, prev.running - 1),
          completed: prev.completed + 1,
        }));
      } else if (lastEvent.type === "audit_failed") {
        setLiveStats((prev) => ({
          ...prev,
          running: Math.max(0, prev.running - 1),
          failed: prev.failed + 1,
        }));
      }
    }
  }, [lastEvent]);

  if (!enabled) {
    return (
      <div className={cn("text-muted-foreground p-4 text-center", className)}>
        <Activity className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p>Mises à jour en temps réel désactivées</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Indicateur de connexion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm font-medium">
            {isConnected ? "En direct" : "Déconnecté"}
          </span>
          {isConnected && (
            <Badge variant="secondary" className="text-xs">
              Temps réel
            </Badge>
          )}
        </div>

        {connectionError && (
          <Button
            onClick={reconnect}
            size="sm"
            variant="outline"
            className="h-8 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Erreur de connexion */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">
            {connectionError}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats en temps réel */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-blue-50 p-2 text-center">
          <div className="text-lg font-bold text-blue-600">
            {liveStats.running}
          </div>
          <div className="text-xs text-blue-700">En cours</div>
        </div>
        <div className="rounded-lg border bg-green-50 p-2 text-center">
          <div className="text-lg font-bold text-green-600">
            {liveStats.completed}
          </div>
          <div className="text-xs text-green-700">Terminés</div>
        </div>
        <div className="rounded-lg border bg-red-50 p-2 text-center">
          <div className="text-lg font-bold text-red-600">
            {liveStats.failed}
          </div>
          <div className="text-xs text-red-700">Échoués</div>
        </div>
      </div>

      {/* Événements récents */}
      {recentEvents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Activité récente</h4>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {recentEvents.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className={cn(
                  "rounded border-l-2 p-2 text-xs",
                  event.type === "audit_started" &&
                    "border-blue-400 bg-blue-50",
                  event.type === "audit_completed" &&
                    "border-green-400 bg-green-50",
                  event.type === "audit_failed" && "border-red-400 bg-red-50",
                  event.type === "audit_progress" &&
                    "border-yellow-400 bg-yellow-50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {event.url || event.message}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "px-1 py-0 text-xs",
                      event.type === "audit_started" &&
                        "bg-blue-100 text-blue-800",
                      event.type === "audit_completed" &&
                        "bg-green-100 text-green-800",
                      event.type === "audit_failed" &&
                        "bg-red-100 text-red-800",
                      event.type === "audit_progress" &&
                        "bg-yellow-100 text-yellow-800",
                    )}
                  >
                    {event.type === "audit_started" && "🚀"}
                    {event.type === "audit_completed" && "✅"}
                    {event.type === "audit_failed" && "❌"}
                    {event.type === "audit_progress" && "📈"}
                  </Badge>
                </div>
                {event.scores?.global && (
                  <div className="text-muted-foreground mt-1 text-xs">
                    Score global: {event.scores.global}/100
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
