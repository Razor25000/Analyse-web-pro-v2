/**
 * Système de Synchronisation Optimisée Prisma → Supabase
 * Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Sync unidirectionnelle Prisma → Supabase pour workflows n8n
 *
 * 🔄 FLUX:
 * 1. Audit créé dans Prisma (source de vérité)
 * 2. Webhook automatique sync vers Supabase
 * 3. Workflows n8n utilisent données Supabase
 * 4. Résultats n8n mis à jour dans Supabase
 * 5. Résultats sync back vers Prisma si nécessaire
 */

import { supabaseAdmin } from "../supabase";
import { prisma } from "../prisma";

export type AuditSyncPayload = {
  auditId: string;
  userId: string;
  email: string;
  url: string;
  auditType: "manual" | "bulk" | "discovery";
  orgId?: string;
};

export type SyncResult = {
  success: boolean;
  supabaseId?: string;
  error?: string;
  operation: "create" | "update" | "skip";
};

export class AuditSyncService {
  private static readonly VERSION = "2.0.0";

  /**
   * Synchronise un audit Prisma vers Supabase pour les workflows n8n
   */
  static async syncAuditToSupabase(
    payload: AuditSyncPayload,
  ): Promise<SyncResult> {
    console.log(
      `🔄 [AuditSync v${this.VERSION}] Sync audit: ${payload.auditId}`,
    );

    try {
      // Vérifier que Supabase est disponible
      if (!supabaseAdmin) {
        console.warn("⚠️ Supabase indisponible - sync ignoré");
        return {
          success: false,
          error: "Supabase unavailable",
          operation: "skip",
        };
      }

      // 1. Récupérer l'audit complet depuis Prisma
      const auditData = await this.getAuditFromPrisma(payload.auditId);
      if (!auditData) {
        return {
          success: false,
          error: "Audit not found in Prisma",
          operation: "skip",
        };
      }

      // 2. Convertir au format Supabase
      const supabaseAudit = this.convertToSupabaseFormat(auditData, payload);

      // 3. Vérifier si l'audit existe déjà dans Supabase
      const existingAudit = await this.getSupabaseAudit(payload.auditId);

      if (existingAudit) {
        // Mise à jour
        return await this.updateSupabaseAudit(existingAudit.id, supabaseAudit);
      } else {
        // Création
        return await this.createSupabaseAudit(supabaseAudit);
      }
    } catch (error) {
      console.error("❌ Erreur sync audit:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operation: "skip",
      };
    }
  }

  /**
   * Sync résultats n8n back vers Prisma (optionnel)
   */
  static async syncResultsBackToPrisma(auditId: string): Promise<boolean> {
    console.log(`🔄 Sync résultats n8n → Prisma: ${auditId}`);

    try {
      // Récupérer résultats depuis Supabase
      const { data: supabaseAudit, error } = await supabaseAdmin!
        .from("audits")
        .select("*")
        .eq("prisma_id", auditId)
        .single();

      if (error || !supabaseAudit) {
        console.warn(`⚠️ Audit non trouvé dans Supabase: ${auditId}`);
        return false;
      }

      // Mettre à jour Prisma avec les résultats
      await prisma.audit.update({
        where: { id: auditId },
        data: {
          status: this.mapSupabaseStatusToPrisma(supabaseAudit.status),
          scoreGlobal: supabaseAudit.score_global,
          scorePerformance: supabaseAudit.score_performance,
          scoreSeo: supabaseAudit.score_seo,
          scoreSecurity: supabaseAudit.score_security,
          scoreModern: supabaseAudit.score_modern,
          resultsJson: supabaseAudit.results_json,
          auditResults: supabaseAudit.audit_results,
          errorMessage: supabaseAudit.error_message,
          completedAt: supabaseAudit.completed_at
            ? new Date(supabaseAudit.completed_at)
            : null,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Résultats sync back vers Prisma: ${auditId}`);
      return true;
    } catch (error) {
      console.error("❌ Erreur sync back vers Prisma:", error);
      return false;
    }
  }

  // Méthodes privées utilitaires
  private static async getAuditFromPrisma(auditId: string) {
    return await prisma.audit.findUnique({
      where: { id: auditId },
    });
  }

  private static async getSupabaseAudit(prismaId: string) {
    const { data, error } = await supabaseAdmin!
      .from("audits")
      .select("*")
      .eq("prisma_id", prismaId)
      .single();

    return error ? null : data;
  }

  private static convertToSupabaseFormat(
    auditData: any,
    payload: AuditSyncPayload,
  ) {
    return {
      id: this.convertToUUID(auditData.id), // UUID requis pour Supabase
      prisma_id: auditData.id, // Lien vers Prisma
      user_id: payload.userId, // Garder comme TEXT selon structure Supabase
      url: auditData.url,
      audit_type: auditData.auditType,
      status: auditData.status,
      score_global: auditData.scoreGlobal,
      score_performance: auditData.scorePerformance,
      score_seo: auditData.scoreSeo,
      score_security: auditData.scoreSecurity,
      score_modern: auditData.scoreModern,
      audit_results: auditData.auditResults,
      createdAt: auditData.createdAt.toISOString(), // Structure réelle confirmée
      completedAt: auditData.completedAt?.toISOString(), // Structure réelle
      completed_at: auditData.completedAt?.toISOString(), // Support double format
      org_id: payload.orgId,
      delivery_method: "dashboard", // Valeur par défaut pour workflows n8n
      email_client: payload.email, // Pas de audits.email dans Supabase
      platform_detected: null, // Champ workflow n8n
      html_report: null, // Sera rempli par les workflows
      runId: null, // Sera défini par n8n
    };
  }

  private static async createSupabaseAudit(
    auditData: any,
  ): Promise<SyncResult> {
    const { data, error } = await supabaseAdmin!
      .from("audits")
      .insert(auditData)
      .select()
      .single();

    if (error) {
      throw new Error(`Création Supabase échouée: ${error.message}`);
    }

    return {
      success: true,
      supabaseId: data.id,
      operation: "create",
    };
  }

  private static async updateSupabaseAudit(
    supabaseId: string,
    auditData: any,
  ): Promise<SyncResult> {
    const { error } = await supabaseAdmin!
      .from("audits")
      .update(auditData)
      .eq("id", supabaseId);

    if (error) {
      throw new Error(`Mise à jour Supabase échouée: ${error.message}`);
    }

    return {
      success: true,
      supabaseId,
      operation: "update",
    };
  }

  private static convertToUUID(id: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return id;

    // Génération UUID déterministe
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(id).digest("hex");
    return [
      hash.substr(0, 8),
      hash.substr(8, 4),
      `4${hash.substr(13, 3)}`,
      ((parseInt(hash.substr(16, 1), 16) & 0x3) | 0x8).toString(16) +
        hash.substr(17, 3),
      hash.substr(20, 12),
    ].join("-");
  }

  private static mapSupabaseStatusToPrisma(supabaseStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: "pending",
      processing: "processing",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
    };
    return statusMap[supabaseStatus] || "pending";
  }

  /**
   * Nettoyage des audits orphelins dans Supabase
   */
  static async cleanupOrphanedAudits(): Promise<{
    deleted: number;
    errors: number;
  }> {
    console.log("🧹 Nettoyage audits orphelins Supabase...");

    let deleted = 0;
    const errors = 0;

    try {
      // Récupérer tous les audits Supabase
      const { data: supabaseAudits, error } = await supabaseAdmin!
        .from("audits")
        .select("id, prisma_id");

      if (error) throw error;

      for (const audit of supabaseAudits || []) {
        if (audit.prisma_id) {
          // Vérifier si l'audit existe encore dans Prisma
          const prismaAudit = await prisma.audit.findUnique({
            where: { id: audit.prisma_id },
          });

          if (!prismaAudit) {
            // Supprimer l'audit orphelin
            await supabaseAdmin!.from("audits").delete().eq("id", audit.id);
            deleted++;
          }
        }
      }

      console.log(
        `✅ Nettoyage terminé: ${deleted} audits orphelins supprimés`,
      );
      return { deleted, errors };
    } catch (error) {
      console.error("❌ Erreur nettoyage orphelins:", error);
      return { deleted, errors: errors + 1 };
    }
  }

  /**
   * Statistiques de synchronisation
   */
  static async getSyncStats(): Promise<{
    prismaCount: number;
    supabaseCount: number;
    syncedCount: number;
    orphanedCount: number;
  }> {
    try {
      const [prismaCount, supabaseResult] = await Promise.all([
        prisma.audit.count(),
        supabaseAdmin!
          .from("audits")
          .select("id, prisma_id", { count: "exact" }),
      ]);

      const supabaseCount = supabaseResult.count || 0;
      const supabaseAudits = supabaseResult.data || [];

      const syncedCount = supabaseAudits.filter((a) => a.prisma_id).length;
      const orphanedCount = supabaseAudits.filter((a) => !a.prisma_id).length;

      return {
        prismaCount,
        supabaseCount,
        syncedCount,
        orphanedCount,
      };
    } catch (error) {
      console.error("❌ Erreur stats sync:", error);
      return {
        prismaCount: 0,
        supabaseCount: 0,
        syncedCount: 0,
        orphanedCount: 0,
      };
    }
  }
}

// Instance pour utilisation simple
export const auditSync = AuditSyncService;
