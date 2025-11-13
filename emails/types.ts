export type AuditStartedEmailProps = {
  url: string;
  auditId: string;
  estimatedTime: string;
  dashboardUrl: string;
  userName?: string;
};

export type AuditCompletedEmailProps = {
  url: string;
  auditId: string;
  globalScore: number;
  scores: {
    performance: number;
    seo: number;
    security: number;
    modern: number;
  };
  reportUrl: string;
  dashboardUrl: string;
  userName?: string;
  completedAt: string;
};

export type QuotaWarningEmailProps = {
  userName?: string;
  usedQuota: number;
  totalQuota: number;
  remainingQuota: number;
  planName: string;
  upgradeUrl: string;
  dashboardUrl: string;
  warningType: "80_percent" | "90_percent" | "quota_exceeded";
};
