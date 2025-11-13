import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { SupabaseBridge } from "@/lib/supabase/bridge";
import { auditEventStore, createAuditCompletedEvent } from "@/lib/audit-events";
import { EmailNotifications } from "@/lib/email";
import { env } from "@/lib/env";

// Schéma de validation des données webhook n8n
const N8nWebhookSchema = z.object({
  correlation_id: z.string(),
  user_id: z.string(),
  email: z.string().email(),
  org_id: z.string().optional(),
  status: z.enum(["completed", "failed", "timeout"]),
  audit_data: z
    .object({
      url: z.string().url(),
      global_score: z.number().min(0).max(100),
      performance_score: z.number().min(0).max(100),
      seo_score: z.number().min(0).max(100),
      security_score: z.number().min(0).max(100),
      modern_score: z.number().min(0).max(100),
      report_url: z.string().url().optional(),
      completed_at: z.string(),
    })
    .optional(),
  error_message: z.string().optional(),
});

function verifySignature(payload: string, signature: string): boolean {
  if (!env.N8N_WEBHOOK_SECRET) {
    console.error("N8N_WEBHOOK_SECRET manquant");
    return false;
  }

  const expectedSignature = createHmac("sha256", env.N8N_WEBHOOK_SECRET)
    .update(payload, "utf8")
    .digest("hex");

  const providedSignature = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Lire le payload
    const payload = await request.text();
    const signature = request.headers.get("x-n8n-signature");

    if (!signature) {
      console.error("Signature manquante dans webhook n8n");
      return NextResponse.json(
        { error: "Signature manquante" },
        { status: 401 },
      );
    }

    // 2. Vérifier la signature HMAC
    if (!verifySignature(payload, signature)) {
      console.error("Signature invalide pour webhook n8n");
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 401 },
      );
    }

    // 3. Parser les données
    const data = JSON.parse(payload);
    const validatedData = N8nWebhookSchema.parse(data);

    console.log("🎣 Webhook n8n reçu:", {
      correlationId: validatedData.correlation_id,
      status: validatedData.status,
      hasAuditData: !!validatedData.audit_data,
    });

    // 4. Récupérer ou créer l'audit (pattern upsert)
    const bridge = new SupabaseBridge();
    let audit = await bridge.getAuditByWebhookId(validatedData.correlation_id);

    if (!audit) {
      console.log(
        "⚠️ Audit non trouvé, création depuis données webhook:",
        validatedData.correlation_id,
      );

      // Créer l'audit à partir des données webhook
      audit = await bridge.createAuditWithWebhookId({
        userId: validatedData.user_id,
        email: validatedData.email,
        url: validatedData.audit_data?.url || "",
        auditType: "website_analysis",
        webhookId: validatedData.correlation_id,
        orgId: validatedData.org_id,
      });

      console.log("✅ Audit créé depuis webhook:", audit.id);
    }

    // 5. Traitement selon le statut
    if (validatedData.status === "completed" && validatedData.audit_data) {
      // Audit réussi - mettre à jour avec les résultats
      const auditData = validatedData.audit_data;

      await bridge.updateAuditWithScores(validatedData.correlation_id, {
        status: "completed",
        scoreGlobal: auditData.global_score,
        scorePerformance: auditData.performance_score,
        scoreSeo: auditData.seo_score,
        scoreSecurity: auditData.security_score,
        scoreModern: auditData.modern_score,
        htmlReport: auditData.report_url,
        completedAt: new Date(auditData.completed_at),
      });

      // Publier un événement SSE "audit terminé"
      const completedEvent = createAuditCompletedEvent(
        audit.id,
        validatedData.correlation_id,
        auditData.url,
        audit.user_id,
        {
          global: auditData.global_score,
          performance: auditData.performance_score,
          seo: auditData.seo_score,
          security: auditData.security_score,
          modern: auditData.modern_score,
        },
      );
      auditEventStore.publish(audit.user_id, completedEvent);

      console.log("📡 Événement 'audit_completed' publié:", {
        auditId: audit.id,
        globalScore: auditData.global_score,
        subscribersCount: auditEventStore.getSubscriberCount(audit.user_id),
      });

      // Envoyer notification email de fin d'audit (non-bloquant)
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      EmailNotifications.notifyAuditCompleted({
        auditId: audit.id,
        url: auditData.url,
        userEmail: audit.email,
        userName: undefined, // On pourrait récupérer le nom via l'user_id si nécessaire
        globalScore: auditData.global_score,
        scores: {
          performance: auditData.performance_score,
          seo: auditData.seo_score,
          security: auditData.security_score,
          modern: auditData.modern_score,
        },
        reportUrl:
          auditData.report_url || `${baseUrl}/dashboard/audits/${audit.id}`,
        dashboardUrl: `${baseUrl}/dashboard`,
        completedAt: new Date(auditData.completed_at).toLocaleString("fr-FR"),
      }).catch((error) => {
        console.error("⚠️ Échec notification email audit terminé:", error);
      });

      console.log("✅ Audit terminé avec succès:", {
        auditId: audit.id,
        globalScore: auditData.global_score,
        url: auditData.url,
      });
    } else if (
      validatedData.status === "failed" ||
      validatedData.status === "timeout"
    ) {
      // Audit échoué
      await bridge.updateAuditWithScores(validatedData.correlation_id, {
        status: "failed",
        completedAt: new Date(),
      });

      // Publier un événement SSE d'échec
      const failedEvent = createAuditCompletedEvent(
        audit.id,
        validatedData.correlation_id,
        audit.url,
        audit.user_id,
        {
          performance: 0,
          seo: 0,
          security: 0,
          modern: 0,
          global: 0,
        },
      );
      auditEventStore.publish(audit.user_id, failedEvent);

      console.log("❌ Audit échoué:", {
        auditId: audit.id,
        status: validatedData.status,
        error: validatedData.error_message,
      });
    }

    // Cleanup: fermer la connexion Prisma
    await bridge.disconnect();

    return NextResponse.json({
      success: true,
      message: "Webhook traité avec succès",
      auditId: audit.id,
      status: validatedData.status,
    });
  } catch (error) {
    console.error("Erreur webhook n8n:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données webhook invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
