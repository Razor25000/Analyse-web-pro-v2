import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { SupabaseBridge } from "@/lib/supabase/bridge";
import { n8nClient } from "@/lib/n8n/client";
import { nanoid } from "nanoid";
import { auditEventStore, createAuditStartedEvent } from "@/lib/audit-events";
import { EmailNotifications } from "@/lib/email";

// Schéma de validation
const SingleAuditSchema = z.object({
  url: z.string().url("URL invalide"),
  email: z.string().email("Email invalide"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const user = await getRequiredUser();

    // 2. Valider les données
    const body = await request.json();
    const validatedData = SingleAuditSchema.parse(body);

    // 3. Vérifier les quotas et abonnement
    const subscription = await SupabaseBridge.getUserSubscription(
      validatedData.email,
    );
    const quota = subscription?.monthly_quota ?? 10; // Quota par défaut pour les non-abonnés
    const quotaUsed = subscription?.quota_used ?? 0;

    if (quotaUsed >= quota) {
      return NextResponse.json(
        {
          error: "Quota mensuel dépassé",
          quota,
          used: quotaUsed,
          subscription_tier: subscription?.subscription_tier ?? "free",
        },
        { status: 429 },
      );
    }

    // 4. Générer un correlation ID pour le suivi
    const correlationId = nanoid();

    // 5. Synchroniser l'utilisateur avec Supabase (non-bloquant)
    try {
      const syncSuccess = await SupabaseBridge.syncUserToSupabase(
        user.id,
        user.email,
        user.name ?? undefined,
      );
      if (!syncSuccess) {
        console.warn(
          "⚠️ Synchronisation utilisateur échouée, mais l'audit continue",
        );
      }
    } catch (error) {
      console.warn("⚠️ Erreur sync utilisateur:", error);
      console.log("📋 L'audit continue sans synchronisation utilisateur");
    }

    // 6. Créer l'audit en base
    const audit = await SupabaseBridge.createAudit({
      user_id: user.id,
      email: validatedData.email,
      url: validatedData.url,
      audit_type: "manual",
      webhook_id: correlationId,
      status: "pending",
    });

    // 7. Incrémenter le quota utilisé et vérifier les seuils
    await SupabaseBridge.incrementQuotaUsed(validatedData.email, 1);

    // Vérifier les seuils de quota pour les notifications (non-bloquant)
    const newQuotaUsed = quotaUsed + 1;
    const planName = subscription?.subscription_tier ?? "free";
    EmailNotifications.checkAndNotifyQuotaThresholds(
      user.id,
      newQuotaUsed,
      quota,
      planName,
      validatedData.email,
      user.name ?? undefined,
    ).catch((error) => {
      console.error("⚠️ Échec vérification seuils quota:", error);
    });

    // 8. Déclencher le workflow n8n réel
    const n8nResponse = await n8nClient.triggerSingleAudit({
      url: validatedData.url,
      email: validatedData.email,
      userId: user.id,
      correlationId,
    });

    console.log("✅ Audit single déclenché:", {
      auditId: audit?.id,
      correlationId,
      n8nSuccess: n8nResponse.success,
    });

    // 9. Publier un événement SSE "audit démarré"
    if (audit?.id) {
      const startedEvent = createAuditStartedEvent(
        audit.id,
        correlationId,
        validatedData.url,
        user.id,
      );
      auditEventStore.publish(user.id, startedEvent);

      console.log("📡 Événement 'audit_started' publié:", {
        auditId: audit.id,
        subscribersCount: auditEventStore.getSubscriberCount(user.id),
      });
    }

    // 10. Envoyer notification email de démarrage (non-bloquant)
    if (audit?.id) {
      EmailNotifications.notifyAuditStarted({
        auditId: audit.id,
        url: validatedData.url,
        userEmail: validatedData.email,
        userName: user.name ?? undefined,
        estimatedTime: "2-3 minutes",
      }).catch((error) => {
        console.error("⚠️ Échec notification email audit démarré:", error);
      });
    }

    // 11. Réponse de succès
    return NextResponse.json({
      success: true,
      message: "Audit démarré avec succès",
      auditId: audit?.id,
      correlationId,
      estimatedTime: "2-3 minutes",
      n8nTriggered: n8nResponse.success,
      quota: {
        used: quotaUsed + 1,
        total: quota,
        remaining: quota - quotaUsed - 1,
      },
      subscription: {
        tier: subscription?.subscription_tier ?? "free",
        subscribed: subscription?.subscribed ?? false,
      },
    });
  } catch (error) {
    console.error("Erreur API single audit:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
