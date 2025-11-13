/**
 * SupabaseBridge Production v3.0
 * Pont de synchronisation Prisma ↔ Supabase avec gestion UUID/CUID
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export class SupabaseBridge {
  private readonly supabase;
  private readonly prisma;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
    this.prisma = new PrismaClient();
  }

  /**
   * Génère un ID compatible UUID/CUID
   */
  private generateCompatibleId(): string {
    return randomUUID();
  }

  /**
   * Crée un audit avec synchronisation automatique
   */
  async createAudit(auditData: {
    userId: string;
    email: string;
    url: string;
    auditType?: string;
    orgId?: string;
  }) {
    try {
      // Générer un ID compatible
      const auditId = this.generateCompatibleId();

      // 1. Créer dans Prisma
      const prismaAudit = await this.prisma.audit.create({
        data: {
          id: auditId,
          userId: auditData.userId,
          email: auditData.email,
          url: auditData.url,
          status: "pending",
          auditType: auditData.auditType || "manual",
          orgId: auditData.orgId,
          webhookId: `audit-${Date.now()}`,
        },
      });

      // 2. Synchroniser vers Supabase
      await this.syncToSupabase(prismaAudit);

      return prismaAudit;
    } catch (error) {
      console.error("Erreur création audit:", error);
      throw error;
    }
  }

  /**
   * Synchronise un audit vers Supabase
   */
  async syncToSupabase(prismaAudit: any) {
    try {
      const supabaseData = {
        id: prismaAudit.id,
        user_id: prismaAudit.userId,
        audit_type: prismaAudit.auditType || "manual",
        url: prismaAudit.url,
        status: prismaAudit.status,
        runId: prismaAudit.webhookId,
        org_id: prismaAudit.orgId,
      };

      const { data, error } = await this.supabase
        .from("audits")
        .upsert(supabaseData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn("Erreur sync vers Supabase:", error.message);
      return null;
    }
  }

  /**
   * Récupère et synchronise les audits complétés
   */
  async syncCompletedAudits() {
    try {
      const { data: completedAudits, error } = await this.supabase
        .from("audits")
        .select("*")
        .eq("status", "completed");

      if (error) throw error;

      const results = [];
      for (const supabaseAudit of completedAudits || []) {
        try {
          const updatedAudit = await this.prisma.audit.update({
            where: { id: supabaseAudit.id },
            data: {
              status: supabaseAudit.status,
              scoreGlobal: supabaseAudit.score_global,
              scorePerformance: supabaseAudit.score_performance,
              scoreSeo: supabaseAudit.score_seo,
              scoreSecurity: supabaseAudit.score_security,
              scoreModern: supabaseAudit.score_modern,
              platformDetected: supabaseAudit.platform_detected,
              htmlReport: supabaseAudit.html_report,
              deliveryMethod: supabaseAudit.delivery_method,
              completedAt: supabaseAudit.completed_at
                ? new Date(supabaseAudit.completed_at)
                : null,
            },
          });

          results.push(updatedAudit);
        } catch (err) {
          console.warn(`Erreur sync audit ${supabaseAudit.id}:`, err.message);
        }
      }

      return results;
    } catch (error) {
      console.error("Erreur récupération audits complétés:", error);
      return [];
    }
  }

  /**
   * Démarre un audit pour n8n
   */
  async startAuditForN8N(url: string, userEmail: string, userId?: string) {
    return this.createAudit({
      userId: userId || "anonymous",
      email: userEmail,
      url: url,
      auditType: "discovery",
    });
  }

  /**
   * Trouve un audit par son webhookId (correlationId)
   */
  async getAuditByWebhookId(webhookId: string) {
    return await this.prisma.audit.findFirst({
      where: { webhookId },
    });
  }

  /**
   * Crée un audit avec un webhookId spécifique (pour le webhook handler)
   */
  async createAuditWithWebhookId(auditData: {
    userId: string;
    email: string;
    url: string;
    auditType?: string;
    webhookId: string;
    orgId?: string;
  }) {
    try {
      const auditId = this.generateCompatibleId();

      const prismaAudit = await this.prisma.audit.create({
        data: {
          id: auditId,
          userId: auditData.userId,
          email: auditData.email,
          url: auditData.url,
          status: "pending",
          auditType: auditData.auditType || "website_analysis",
          webhookId: auditData.webhookId,
          orgId: auditData.orgId,
        },
      });

      await this.syncToSupabase(prismaAudit);
      return prismaAudit;
    } catch (error) {
      console.error("Erreur création audit avec webhookId:", error);
      throw error;
    }
  }

  /**
   * Met à jour un audit avec les scores et données de complétion
   */
  async updateAuditWithScores(
    webhookId: string,
    updateData: {
      status: string;
      scoreGlobal?: number;
      scorePerformance?: number;
      scoreSeo?: number;
      scoreSecurity?: number;
      scoreModern?: number;
      platformDetected?: string;
      htmlReport?: string;
      completedAt?: Date;
    },
  ) {
    try {
      const updated = await this.prisma.audit.updateMany({
        where: { webhookId },
        data: updateData,
      });

      // Sync to Supabase
      const audit = await this.getAuditByWebhookId(webhookId);
      if (audit) {
        await this.syncToSupabase(audit);
      }

      return updated;
    } catch (error) {
      console.error("Erreur mise à jour audit:", error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Export par défaut
export default SupabaseBridge;
