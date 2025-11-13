"use client";

import { auth } from "@/lib/auth";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "@/config/subscription-plans";
import { useState, useEffect } from "react";

export type QuotaInfo = {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  planId: SubscriptionPlanId;
  planName: string;
  resetDate: Date;
  canExceed: boolean;
};

export type QuotaCheckResult = {
  quotaInfo: QuotaInfo | null;
  isLoading: boolean;
  error: string | null;
  canCreateAudit: boolean;
  shouldShowUpgradeModal: boolean;
  refresh: () => Promise<void>;
};

export function useQuotaCheck(): QuotaCheckResult {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/user/quota", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || "Erreur lors de la récupération du quota",
        );
      }

      // Convertir resetDate string en Date object
      const quotaData = data.quota;
      if (quotaData?.resetDate) {
        quotaData.resetDate = new Date(quotaData.resetDate);
      }

      setQuotaInfo(quotaData);
    } catch (err) {
      console.error("Erreur quota check:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotaInfo();
  }, []);

  const canCreateAudit = quotaInfo ? quotaInfo.remaining > 0 : false;
  const shouldShowUpgradeModal = quotaInfo
    ? (quotaInfo.remaining <= 0 && quotaInfo.planId === "free") ||
      (quotaInfo.remaining <= 3 && quotaInfo.percentage >= 85)
    : false;

  return {
    quotaInfo,
    isLoading,
    error,
    canCreateAudit,
    shouldShowUpgradeModal,
    refresh: fetchQuotaInfo,
  };
}
