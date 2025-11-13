"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Importer le type depuis audit-events pour éviter la duplication
import type { AuditEvent } from "@/lib/audit-events";

export type { AuditEvent };

export type UseAuditEventsOptions = {
  orgSlug?: string; // Optionnel pour B2B
  userId?: string; // Optionnel pour B2C
  enabled?: boolean;
  onAuditComplete?: (event: AuditEvent) => void;
  onAuditProgress?: (event: AuditEvent) => void;
  onError?: (error: Error) => void;
};

export function useAuditEvents({
  orgSlug,
  userId,
  enabled = true,
  onAuditComplete,
  onAuditProgress,
  onError,
}: UseAuditEventsOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AuditEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const MAX_RETRIES = 5;
  const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Progressive retry delays

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!enabled) {
      return;
    }

    // Éviter les connexions multiples
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    cleanup();

    try {
      // Priorité au userId (B2C), sinon orgSlug (B2B) pour compatibilité
      const endpoint = userId
        ? "/api/audits/events" // Route B2C
        : orgSlug
        ? `/api/orgs/${orgSlug}/audits/events` // Route B2B pour compatibilité
        : "/api/audits/events"; // Route par défaut B2C

      console.log("🔌 Tentative de connexion SSE vers:", endpoint, {
        userId,
        orgSlug,
      });

      const eventSource = new EventSource(endpoint);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("🔌 SSE Connexion établie pour", {
          identifier: userId || orgSlug || "B2C",
          endpoint,
        });
        setIsConnected(true);
        setConnectionError(null);
        retryCountRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: AuditEvent = JSON.parse(event.data);
          setLastEvent(data);

          // Déclencher les callbacks appropriés
          switch (data.type) {
            case "audit_completed":
              onAuditComplete?.(data);
              break;
            case "audit_progress":
              onAuditProgress?.(data);
              break;
            case "connected":
              console.log("✅ SSE événement de connexion reçu");
              break;
            case "heartbeat":
              // Heartbeat silencieux
              break;
            default:
              console.log("📡 SSE événement reçu:", data);
          }
        } catch (parseError) {
          console.error("Erreur parsing SSE event:", parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ SSE Erreur de connexion:", error);
        setIsConnected(false);

        const errorMsg = `Connexion SSE échouée (tentative ${retryCountRef.current + 1}/${MAX_RETRIES})`;
        setConnectionError(errorMsg);
        onError?.(new Error(errorMsg));

        // Retry avec backoff exponentiel
        if (retryCountRef.current < MAX_RETRIES) {
          const delay =
            RETRY_DELAYS[retryCountRef.current] ||
            RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.log(`🔄 Reconnexion SSE dans ${delay}ms...`);

          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            connect();
          }, delay);
        } else {
          console.error("🚫 SSE Max retries atteint, abandon de la connexion");
          setConnectionError("Connexion temps réel indisponible");
        }
      };
    } catch (error) {
      console.error("Erreur création EventSource:", error);
      setConnectionError("Impossible de créer la connexion SSE");
      onError?.(
        error instanceof Error ? error : new Error("SSE connection failed"),
      );
    }
  }, [orgSlug, userId, enabled, onAuditComplete, onAuditProgress, onError, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    retryCountRef.current = MAX_RETRIES; // Empêcher les reconnexions automatiques
  }, [cleanup]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  // Établir la connexion au montage
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return cleanup;
  }, [connect, cleanup, enabled, orgSlug, userId]);

  // Nettoyage au démontage
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected,
    lastEvent,
    connectionError,
    reconnect,
    disconnect,
  };
}
