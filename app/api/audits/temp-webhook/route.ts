/**
 * API temporaire pour recevoir les données du workflow n8n
 * En attendant la résolution du problème Supabase
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("🎯 Données reçues du workflow n8n:", {
      timestamp: new Date().toISOString(),
      data: body,
    });

    // Pour le moment, on log juste les données
    // Plus tard, on les sauvera en base quand Supabase sera fixé

    return NextResponse.json({
      success: true,
      message: "Données reçues et loggées",
      timestamp: new Date().toISOString(),
      receivedData: body,
    });
  } catch (error) {
    console.error("❌ Erreur webhook:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du traitement",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
