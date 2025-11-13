import type { NextRequest } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { auditEventStore } from "@/lib/audit-events";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const user = await getRequiredUser();
    const userId = user.id;

    console.log("🔌 SSE connexion demandée pour l'utilisateur:", userId);

    // SSE connexion demandée pour l'utilisateur

    // 2. Créer le stream SSE
    const stream = new ReadableStream({
      start(controller) {
        // Envoyer l'événement de connexion
        const connectionEvent = `data: ${JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
          userId: userId,
        })}\n\n`;

        controller.enqueue(new TextEncoder().encode(connectionEvent));
        console.log("✅ SSE connexion établie pour l'utilisateur:", userId);

        // S'abonner aux événements de l'utilisateur par userId (mode B2C)
        const unsubscribe = auditEventStore.subscribe(userId, (event) => {
          try {
            const eventData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(new TextEncoder().encode(eventData));
            console.log("📡 SSE événement envoyé à l'utilisateur:", userId, event.type);
          } catch (error) {
            console.error("❌ Erreur envoi événement SSE:", error);
            logger.debug("Erreur envoi événement SSE", error);
          }
        });

        // Heartbeat toutes les 30 secondes pour maintenir la connexion
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({
              type: "heartbeat",
              timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(heartbeat));
          } catch (error) {
            console.error("❌ Erreur heartbeat SSE:", error);
            logger.debug("Erreur heartbeat SSE", error);
            clearInterval(heartbeatInterval);
            unsubscribe();
            controller.close();
          }
        }, 30000);

        // Nettoyage quand la connexion se ferme
        request.signal.addEventListener("abort", () => {
          console.log("🔌 SSE connexion fermée pour l'utilisateur:", userId);
          clearInterval(heartbeatInterval);
          unsubscribe();
          controller.close();
        });
      },
    });

    // 3. Retourner la réponse SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    // Erreur SSE events
    logger.error("Erreur SSE events", error);

    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
