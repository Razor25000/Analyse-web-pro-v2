/**
 * API endpoint pour le cron job de réinitialisation des quotas
 * À appeler périodiquement (ex: quotidiennement via un service cron externe)
 */

import { runQuotaResetJob } from "@/lib/cron/quota-reset";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Vérification optionnelle d'une clé secrète pour sécuriser le cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 },
      );
    }

    const result = await runQuotaResetJob();

    return NextResponse.json({
      success: true,
      resetCount: result.resetCount,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur cron reset quotas:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Pour les services qui utilisent GET (comme Vercel Cron)
export async function GET(request: Request) {
  return POST(request);
}
