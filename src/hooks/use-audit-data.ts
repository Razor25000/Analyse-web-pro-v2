"use client";

import { useState, useEffect, useCallback } from "react";

// Types pour les données d'audit (synchronisés avec l'API)
export type AuditData = {
  id: string;
  url: string;
  email: string;
  status: string;
  score: number | null;
  scores?: {
    performance: number;
    seo: number;
    security: number;
    modernity: number;
    global: number;
  };
  createdAt: string;
  completedAt: string | null;
  auditType: string;
  batchId: string | null;
  htmlReport: string | null;
};

export type AuditStats = {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  pending: number;
};

export type QuotaInfo = {
  used: number;
  total: number;
  remaining: number;
  subscription_tier: string;
};

export type AuditApiResponse = {
  success: boolean;
  audits: AuditData[];
  stats: AuditStats;
  quota: QuotaInfo;
  organization: {
    id: string;
    slug: string;
    name: string;
  };
  meta: {
    timestamp: string;
    total_audits: number;
    user_id: string;
  };
};

export type UseAuditDataOptions = {
  orgSlug?: string; // Optionnel maintenant pour la compatibilité B2C
  refreshInterval?: number;
  enabled?: boolean;
};

export function useAuditData({
  orgSlug,
  refreshInterval = 30000, // 30 secondes par défaut
  enabled = true,
}: UseAuditDataOptions = {}) {
  const [data, setData] = useState<AuditApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchAudits = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = orgSlug
        ? `/api/orgs/${orgSlug}/audits/status` // Ancienne route pour compatibilité
        : "/api/audits/status"; // Nouvelle route B2C

      console.log(`🔄 Récupération des audits via: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies pour l'auth
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const apiData: AuditApiResponse = await response.json();

      if (!apiData.success) {
        throw new Error("API returned success: false");
      }

      setData(apiData);
      setLastFetch(new Date());

      console.log(`✅ Audits récupérés:`, {
        total: apiData.audits.length,
        orgSlug: apiData.organization?.slug || "B2C",
        stats: apiData.stats,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      console.error(
        "❌ Erreur lors de la récupération des audits:",
        errorMessage,
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [orgSlug, enabled]);

  // Fetch initial
  useEffect(() => {
    if (enabled) {
      fetchAudits();
    }
  }, [fetchAudits, enabled]);

  // Refresh automatique
  useEffect(() => {
    if (!enabled || !refreshInterval || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(fetchAudits, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAudits, refreshInterval, enabled]);

  // Refresh manuel
  const refresh = useCallback(async () => {
    return fetchAudits();
  }, [fetchAudits]);

  // Helpers pour les données
  const getAuditsByStatus = useCallback(
    (status: string) => {
      if (!data?.audits) return [];
      return data.audits.filter((audit) => audit.status === status);
    },
    [data?.audits],
  );

  const getRecentAudits = useCallback(
    (limit = 10) => {
      if (!data?.audits) return [];
      return data.audits
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, limit);
    },
    [data?.audits],
  );

  const getAuditsByType = useCallback(
    (type: string) => {
      if (!data?.audits) return [];
      return data.audits.filter((audit) => audit.auditType === type);
    },
    [data?.audits],
  );

  return {
    data,
    audits: data?.audits || [],
    stats: data?.stats || {
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      pending: 0,
    },
    quota: data?.quota || {
      used: 0,
      total: 0,
      remaining: 0,
      subscription_tier: "free",
    },
    organization: data?.organization || null,
    isLoading,
    error,
    lastFetch,
    refresh,
    getAuditsByStatus,
    getRecentAudits,
    getAuditsByType,
  };
}
