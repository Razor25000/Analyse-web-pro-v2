import { emailService } from "./email-service";
import type {
  AuditStartedEmailProps,
  AuditCompletedEmailProps,
  QuotaWarningEmailProps,
} from "../../../emails/types";

export type AuditNotificationData = {
  auditId: string;
  url: string;
  userEmail: string;
  userName?: string;
  estimatedTime?: string;
};

export type AuditCompletedNotificationData = {
  globalScore: number;
  scores: {
    performance: number;
    seo: number;
    security: number;
    modern: number;
  };
  reportUrl: string;
  dashboardUrl: string;
  completedAt: string;
} & AuditNotificationData;

export type QuotaNotificationData = {
  userEmail: string;
  userName?: string;
  usedQuota: number;
  totalQuota: number;
  remainingQuota: number;
  planName: string;
  upgradeUrl: string;
  dashboardUrl: string;
  warningType: "80_percent" | "90_percent" | "quota_exceeded";
};

export class EmailNotifications {
  static async notifyAuditStarted(
    data: AuditNotificationData,
  ): Promise<boolean> {
    try {
      const emailProps: AuditStartedEmailProps = {
        url: data.url,
        auditId: data.auditId,
        estimatedTime: data.estimatedTime || "3-5 minutes",
        dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard`,
        userName: data.userName,
      };

      const result = await emailService.sendAuditStartedEmail(emailProps);

      if (!result.success) {
        console.error("Échec envoi notification audit démarré:", result.error);
        return false;
      }

      console.log(
        "✅ Notification audit démarré envoyée avec succès:",
        result.messageId,
      );
      return true;
    } catch (error) {
      console.error("Erreur notification audit démarré:", error);
      return false;
    }
  }

  static async notifyAuditCompleted(
    data: AuditCompletedNotificationData,
  ): Promise<boolean> {
    try {
      const emailProps: AuditCompletedEmailProps = {
        url: data.url,
        auditId: data.auditId,
        globalScore: data.globalScore,
        scores: data.scores,
        reportUrl: data.reportUrl,
        dashboardUrl: data.dashboardUrl,
        userName: data.userName,
        completedAt: data.completedAt,
      };

      const result = await emailService.sendAuditCompletedEmail(emailProps);

      if (!result.success) {
        console.error("Échec envoi notification audit terminé:", result.error);
        return false;
      }

      console.log(
        "✅ Notification audit terminé envoyée avec succès:",
        result.messageId,
      );
      return true;
    } catch (error) {
      console.error("Erreur notification audit terminé:", error);
      return false;
    }
  }

  static async notifyQuotaWarning(
    data: QuotaNotificationData,
  ): Promise<boolean> {
    try {
      const emailProps: QuotaWarningEmailProps = {
        userName: data.userName,
        usedQuota: data.usedQuota,
        totalQuota: data.totalQuota,
        remainingQuota: data.remainingQuota,
        planName: data.planName,
        upgradeUrl: data.upgradeUrl,
        dashboardUrl: data.dashboardUrl,
        warningType: data.warningType,
      };

      const result = await emailService.sendQuotaWarningEmail(emailProps);

      if (!result.success) {
        console.error("Échec envoi notification quota:", result.error);
        return false;
      }

      console.log(
        "✅ Notification quota envoyée avec succès:",
        result.messageId,
      );
      return true;
    } catch (error) {
      console.error("Erreur notification quota:", error);
      return false;
    }
  }

  static async checkAndNotifyQuotaThresholds(
    userId: string,
    usedQuota: number,
    totalQuota: number,
    planName: string,
    userEmail: string,
    userName?: string,
  ): Promise<void> {
    const percentageUsed = (usedQuota / totalQuota) * 100;
    const remainingQuota = totalQuota - usedQuota;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const upgradeUrl = `${baseUrl}/dashboard/billing`;
    const dashboardUrl = `${baseUrl}/dashboard`;

    // Quota épuisé (100%)
    if (usedQuota >= totalQuota) {
      await this.notifyQuotaWarning({
        userEmail,
        userName,
        usedQuota,
        totalQuota,
        remainingQuota,
        planName,
        upgradeUrl,
        dashboardUrl,
        warningType: "quota_exceeded",
      });
    }
    // 90% du quota utilisé
    else if (percentageUsed >= 90) {
      await this.notifyQuotaWarning({
        userEmail,
        userName,
        usedQuota,
        totalQuota,
        remainingQuota,
        planName,
        upgradeUrl,
        dashboardUrl,
        warningType: "90_percent",
      });
    }
    // 80% du quota utilisé
    else if (percentageUsed >= 80) {
      await this.notifyQuotaWarning({
        userEmail,
        userName,
        usedQuota,
        totalQuota,
        remainingQuota,
        planName,
        upgradeUrl,
        dashboardUrl,
        warningType: "80_percent",
      });
    }
  }
}
