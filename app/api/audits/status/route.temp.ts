import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Version simplifiée temporaire de l'API status
 * Pour permettre le test initial sans configuration Supabase
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔄 API Status appelée (version temporaire)");

    // Réponse mock temporaire pour permettre les tests
    const response = {
      success: true,
      audits: [], // Pas d'audits pour commencer
      stats: {
        total: 0,
        completed: 0,
        processing: 0,
        failed: 0,
        pending: 0,
      },
      quota: {
        used: 0,
        total: 5, // Plan gratuit = 5 audits
        remaining: 5,
        subscription_tier: "free",
      },
      organization: null,
      meta: {
        timestamp: new Date().toISOString(),
        total_audits: 0,
        user_id: "temp-user-id",
      },
    };

    console.log("✅ Réponse temporaire envoyée:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Erreur API status temporaire:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur temporaire",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
