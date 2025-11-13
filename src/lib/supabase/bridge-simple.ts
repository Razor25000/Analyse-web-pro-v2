/**
 * SupabaseBridge Simplifié v2.0
 * Fonctionne avec le schéma Supabase existant
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

export class SimpleSupabaseBridge {
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
   * Synchronise un audit Prisma vers Supabase (champs minimaux)
   */
  async createAuditInSupabase(prismaAudit: any) {
    try {
      // Utiliser seulement les champs qui existent dans Supabase
      const supabaseData: any = {
        id: prismaAudit.id,
        user_id: prismaAudit.userId || null,
        url: prismaAudit.url,
        status: prismaAudit.status || "pending",
      };

      // Ajouter conditionnellement les champs optionnels
      if (prismaAudit.email) supabaseData.email = prismaAudit.email;
      if (prismaAudit.webhookId)
        supabaseData.webhook_id = prismaAudit.webhookId;
      if (prismaAudit.auditType)
        supabaseData.audit_type = prismaAudit.auditType;

      const { data, error } = await this.supabase
        .from("audits")
        .insert(supabaseData)
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
   * Met à jour les résultats d'audit dans Supabase
   */
  async updateAuditResults(auditId: string, results: any) {
    try {
      const updateData: any = {
        status: results.status || "completed",
      };

      // Ajouter conditionnellement les scores
      if (results.scoreGlobal) updateData.score_global = results.scoreGlobal;
      if (results.scorePerformance)
        updateData.score_performance = results.scorePerformance;
      if (results.scoreSeo) updateData.score_seo = results.scoreSeo;
      if (results.scoreSecurity)
        updateData.score_security = results.scoreSecurity;
      if (results.scoreModern) updateData.score_modern = results.scoreModern;
      if (results.platformDetected)
        updateData.platform_detected = results.platformDetected;
      if (results.htmlReport) updateData.html_report = results.htmlReport;

      const { data, error } = await this.supabase
        .from("audits")
        .update(updateData)
        .eq("id", auditId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn("Erreur mise à jour Supabase:", error.message);
      return null;
    }
  }

  /**
   * Récupère les audits complétés depuis Supabase
   */
  async getCompletedAudits() {
    try {
      const { data, error } = await this.supabase
        .from("audits")
        .select("*")
        .eq("status", "completed");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn("Erreur récupération Supabase:", error.message);
      return [];
    }
  }

  /**
   * Synchronise les résultats vers Prisma
   */
  async syncResultsToPrisma(supabaseAudit: any) {
    try {
      const updateData: any = {
        status: supabaseAudit.status,
      };

      // Mapper les champs disponibles
      if (supabaseAudit.score_global)
        updateData.scoreGlobal = supabaseAudit.score_global;
      if (supabaseAudit.score_performance)
        updateData.scorePerformance = supabaseAudit.score_performance;
      if (supabaseAudit.score_seo)
        updateData.scoreSeo = supabaseAudit.score_seo;
      if (supabaseAudit.score_security)
        updateData.scoreSecurity = supabaseAudit.score_security;
      if (supabaseAudit.score_modern)
        updateData.scoreModern = supabaseAudit.score_modern;
      if (supabaseAudit.platform_detected)
        updateData.platformDetected = supabaseAudit.platform_detected;
      if (supabaseAudit.html_report)
        updateData.htmlReport = supabaseAudit.html_report;
      if (supabaseAudit.completed_at)
        updateData.completedAt = new Date(supabaseAudit.completed_at);

      const audit = await this.prisma.audit.update({
        where: { id: supabaseAudit.id },
        data: updateData,
      });

      return audit;
    } catch (error) {
      console.warn(
        `Erreur sync vers Prisma ${supabaseAudit.id}:`,
        error.message,
      );
      return null;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Export pour compatibilité
export const SupabaseBridge = SimpleSupabaseBridge;
