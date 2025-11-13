import { Resend } from "resend";
import { env } from "@/lib/env";
import {
  AuditStartedEmail,
  type AuditStartedEmailProps,
} from "../../../emails/audit-started.email";
import {
  AuditCompletedEmail,
  type AuditCompletedEmailProps,
} from "../../../emails/audit-completed.email";
import {
  QuotaWarningEmail,
  type QuotaWarningEmailProps,
} from "../../../emails/quota-warning.email";

export class EmailService {
  private readonly resend: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async sendAuditStartedEmail(
    props: AuditStartedEmailProps,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log("📧 Envoi email audit démarré:", {
        auditId: props.auditId,
        url: props.url,
        userName: props.userName,
      });

      const { data, error } = await this.resend.emails.send({
        from: env.EMAIL_FROM,
        to: props.userName ? [props.userName] : [],
        subject: `🚀 Audit en cours pour ${props.url}`,
        react: AuditStartedEmail(props),
      });

      if (error) {
        console.error("❌ Erreur envoi email audit démarré:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ Email audit démarré envoyé:", data);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("❌ Exception envoi email audit démarré:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendAuditCompletedEmail(
    props: AuditCompletedEmailProps,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log("📧 Envoi email audit terminé:", {
        auditId: props.auditId,
        url: props.url,
        globalScore: props.globalScore,
        userName: props.userName,
      });

      const { data, error } = await this.resend.emails.send({
        from: env.EMAIL_FROM,
        to: props.userName ? [props.userName] : [],
        subject: `🎉 Audit terminé pour ${props.url} - Score: ${props.globalScore}/100`,
        react: AuditCompletedEmail(props),
      });

      if (error) {
        console.error("❌ Erreur envoi email audit terminé:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ Email audit terminé envoyé:", data);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("❌ Exception envoi email audit terminé:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendQuotaWarningEmail(
    props: QuotaWarningEmailProps,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const warningTitles = {
        "80_percent": "⚠️ 80% de quota atteint",
        "90_percent": "🚨 90% de quota atteint",
        quota_exceeded: "🛑 Quota épuisé",
      };

      console.log("📧 Envoi email alerte quota:", {
        warningType: props.warningType,
        usedQuota: props.usedQuota,
        totalQuota: props.totalQuota,
        planName: props.planName,
        userName: props.userName,
      });

      const { data, error } = await this.resend.emails.send({
        from: env.EMAIL_FROM,
        to: props.userName ? [props.userName] : [],
        subject: `${warningTitles[props.warningType]} - Plan ${props.planName}`,
        react: QuotaWarningEmail(props),
      });

      if (error) {
        console.error("❌ Erreur envoi email alerte quota:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ Email alerte quota envoyé:", data);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("❌ Exception envoi email alerte quota:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendTestEmail(
    to: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: env.EMAIL_FROM,
        to: [to],
        subject: "Test Email Service - Analyseur Web Pro",
        html: "<h1>Email service fonctionne correctement</h1><p>Ce message confirme que le service email est opérationnel.</p>",
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const emailService = new EmailService();
