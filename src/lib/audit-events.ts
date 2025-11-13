// Types pour les événements d'audit (éviter la circularité)
export type AuditEvent = {
  type:
    | "audit_started"
    | "audit_progress"
    | "audit_completed"
    | "audit_failed"
    | "heartbeat"
    | "connected";
  auditId?: string;
  correlationId?: string;
  url?: string;
  status?: string;
  progress?: number;
  scores?: {
    performance?: number;
    seo?: number;
    security?: number;
    modern?: number;
    global?: number;
  };
  message?: string;
  timestamp: string;
  orgSlug?: string;
};

// Simple in-memory event store pour les SSE
// En production, utiliser Redis pub/sub ou une solution plus robuste
class AuditEventStore {
  private readonly subscribers = new Map<
    string,
    Set<(event: AuditEvent) => void>
  >();

  // S'abonner par userId (B2C) ou orgSlug (B2B)
  subscribe(identifier: string, callback: (event: AuditEvent) => void) {
    if (!this.subscribers.has(identifier)) {
      this.subscribers.set(identifier, new Set());
    }
    this.subscribers.get(identifier)!.add(callback);

    // Retourner une fonction de désabonnement
    return () => {
      const subs = this.subscribers.get(identifier);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(identifier);
        }
      }
    };
  }

  // Publier par userId (B2C) ou orgSlug (B2B)
  publish(identifier: string, event: AuditEvent) {
    const subscribers = this.subscribers.get(identifier);
    if (subscribers && subscribers.size > 0) {
      console.log(
        `📡 Broadcasting event to ${subscribers.size} subscribers for: ${identifier}`,
        {
          type: event.type,
          auditId: event.auditId,
          correlationId: event.correlationId,
        },
      );

      subscribers.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error("Erreur callback subscriber:", error);
        }
      });
    } else {
      console.log(
        `📭 No subscribers for: ${identifier}, event not broadcasted:`,
        event.type,
      );
    }
  }

  getSubscriberCount(identifier: string): number {
    return this.subscribers.get(identifier)?.size || 0;
  }

  getAllSubscribersCount(): number {
    let total = 0;
    this.subscribers.forEach((subs) => {
      total += subs.size;
    });
    return total;
  }
}

// Instance globale (singleton)
export const auditEventStore = new AuditEventStore();

// Helpers pour créer des événements standard
export function createAuditStartedEvent(
  auditId: string,
  correlationId: string,
  url: string,
  orgSlug: string,
): AuditEvent {
  return {
    type: "audit_started",
    auditId,
    correlationId,
    url,
    status: "processing",
    message: "Audit démarré",
    timestamp: new Date().toISOString(),
    orgSlug,
  };
}

export function createAuditProgressEvent(
  auditId: string,
  correlationId: string,
  progress: number,
  orgSlug: string,
  message?: string,
): AuditEvent {
  return {
    type: "audit_progress",
    auditId,
    correlationId,
    progress,
    message: message || `Progression: ${progress}%`,
    timestamp: new Date().toISOString(),
    orgSlug,
  };
}

export function createAuditCompletedEvent(
  auditId: string,
  correlationId: string,
  url: string,
  orgSlug: string,
  scores?: {
    performance?: number;
    seo?: number;
    security?: number;
    modern?: number;
    global?: number;
  },
): AuditEvent {
  return {
    type: "audit_completed",
    auditId,
    correlationId,
    url,
    status: "completed",
    scores,
    message: "Audit terminé avec succès",
    timestamp: new Date().toISOString(),
    orgSlug,
  };
}

export function createAuditFailedEvent(
  auditId: string,
  correlationId: string,
  url: string,
  orgSlug: string,
  error: string,
): AuditEvent {
  return {
    type: "audit_failed",
    auditId,
    correlationId,
    url,
    status: "failed",
    message: error,
    timestamp: new Date().toISOString(),
    orgSlug,
  };
}
