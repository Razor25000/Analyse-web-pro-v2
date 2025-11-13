import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { SupabaseBridge } from "@/lib/supabase/bridge";

export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const user = await getRequiredUser();

    // 2. Récupérer les audits de l'utilisateur
    const audits = await SupabaseBridge.getUserAudits(user.id);

    // 3. Récupérer le statut du quota
    const quotaStatus = await SupabaseBridge.getQuotaStatus(user.email);

    // 4. Calculer les statistiques
    const stats = {
      total: audits.length,
      completed: audits.filter(
        (a) =>
          a.status?.toLowerCase().includes("completed") ||
          a.status?.toLowerCase().includes("succeeded") ||
          a.status?.toLowerCase().includes("terminé"),
      ).length,
      processing: audits.filter(
        (a) =>
          a.status?.toLowerCase().includes("processing") ||
          a.status?.toLowerCase().includes("running") ||
          a.status?.toLowerCase().includes("cours"),
      ).length,
      failed: audits.filter(
        (a) =>
          a.status?.toLowerCase().includes("failed") ||
          a.status?.toLowerCase().includes("error") ||
          a.status?.toLowerCase().includes("erreur"),
      ).length,
      pending: audits.filter(
        (a) =>
          a.status?.toLowerCase().includes("pending") ||
          a.status?.toLowerCase().includes("waiting") ||
          a.status?.toLowerCase().includes("attente"),
      ).length,
    };

    // 5. Formater les audits pour la réponse
    const formattedAudits = audits.map((audit) => ({
      id: audit.id?.toString() ?? "",
      url: audit.url ?? "",
      email: audit.email ?? "",
      status: audit.status ?? "pending",
      score: audit.score ?? null,
      createdAt: audit.created_at ?? new Date().toISOString(),
      completedAt: audit.completed_at ?? null,
      auditType: audit.audit_type ?? "single",
      batchId: audit.batch_id ?? null,
    }));

    // 6. Réponse structurée
    const response = {
      success: true,
      audits: formattedAudits,
      stats,
      quota: {
        used: quotaStatus?.quota_used ?? 0,
        total: quotaStatus?.monthly_quota ?? 10,
        remaining: Math.max(
          0,
          (quotaStatus?.monthly_quota ?? 10) - (quotaStatus?.quota_used ?? 0),
        ),
        subscription_tier: quotaStatus?.subscription_tier ?? "free",
      },
      organization: null, // Plus d'organisation en B2C
      meta: {
        timestamp: new Date().toISOString(),
        total_audits: audits.length,
        user_id: user.id,
      },
    };

    console.log("✅ Status API B2C:", {
      userId: user.id,
      auditCount: audits.length,
      quotaUsed: quotaStatus?.quota_used ?? 0,
      quotaTotal: quotaStatus?.monthly_quota ?? 10,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Erreur API status B2C:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du statut",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
