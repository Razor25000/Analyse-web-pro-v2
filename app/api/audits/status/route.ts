import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { prisma } from "@/lib/prisma";
import { QuotaService } from "@/lib/quota/quota-service";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 API Audits Status appelée - Version avec vraies données");

    // 1. Vérifier l'authentification
    const user = await getRequiredUser();
    console.log("👤 Utilisateur authentifié:", user.email);

    // 2. Récupérer les audits de l'utilisateur depuis la base
    const userAudits = await prisma.audit.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        url: true,
        email: true,
        status: true,
        scoreGlobal: true,
        scorePerformance: true,
        scoreSeo: true,
        scoreSecurity: true,
        scoreModern: true,
        createdAt: true,
        completedAt: true,
        auditType: true,
        orgId: true, // Utilisé à la place de batchId pour compatibilité
        htmlReport: true,
      },
    });

    // 3. Calculer les statistiques depuis les audits réels
    const stats = {
      total: userAudits.length,
      completed: userAudits.filter((a) => a.status === "completed").length,
      processing: userAudits.filter((a) => a.status === "processing").length,
      failed: userAudits.filter((a) => a.status === "failed").length,
      pending: userAudits.filter((a) => a.status === "pending").length,
    };

    // 4. Récupérer les vraies informations de quota
    const quotaInfo = await QuotaService.getUserQuota(user.id);

    const quota = quotaInfo
      ? {
          used: quotaInfo.used,
          total: quotaInfo.limit,
          remaining: quotaInfo.remaining,
          subscription_tier: quotaInfo.planId,
        }
      : {
          used: 0,
          total: 5,
          remaining: 5,
          subscription_tier: "free",
        };

    // 5. Formatter les audits pour l'API
    const formattedAudits = userAudits.map((audit) => ({
      id: audit.id,
      url: audit.url,
      email: audit.email,
      status: audit.status,
      score: audit.scoreGlobal, // Utiliser scoreGlobal à la place de score
      scores: {
        performance: audit.scorePerformance,
        seo: audit.scoreSeo,
        security: audit.scoreSecurity,
        modernity: audit.scoreModern,
        global: audit.scoreGlobal,
      },
      createdAt: audit.createdAt.toISOString(),
      completedAt: audit.completedAt?.toISOString() || null,
      auditType: audit.auditType,
      batchId: audit.orgId, // Utiliser orgId à la la place de batchId pour compatibilité
      htmlReport: audit.htmlReport,
    }));

    const response = {
      success: true,
      audits: formattedAudits,
      stats,
      quota,
      organization: null, // Maintenu pour compatibilité
      meta: {
        timestamp: new Date().toISOString(),
        total_audits: userAudits.length,
        user_id: user.id,
      },
    };

    console.log("✅ API Status - Données retournées:", {
      auditsCount: formattedAudits.length,
      quota: quota,
      stats: stats,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Erreur API audits/status:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des audits",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
