import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { ModernSupabaseBridge } from "@/lib/supabase/bridge-new";
import { n8nClient } from "@/lib/n8n/client";
import { nanoid } from "nanoid";
import { auditEventStore, createAuditStartedEvent } from "@/lib/audit-events";
import { EmailNotifications } from "@/lib/email";
import { logger } from "@/lib/logger";

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

    // 3. Vérifier les quotas via Prisma (nouvelle approche)
    const quotaCheck = await ModernSupabaseBridge.canCreateAudit(
      validatedData.email,
    );

    if (!quotaCheck.canCreate) {
      return NextResponse.json(
        {
          error: "Quota mensuel dépassé",
          quota: quotaCheck.monthlyQuota,
          used: quotaCheck.quotaUsed,
          subscription_tier: quotaCheck.subscriptionTier,
        },
        { status: 429 },
      );
    }

    // 4. Générer un correlation ID pour le suivi
    const correlationId = nanoid();

    // 5. Créer l'audit en base Supabase (garde Supabase pour les audits)
    const audit = await ModernSupabaseBridge.createAudit({
      user_id: user.id,
      email: validatedData.email,
      url: validatedData.url,
      audit_type: "manual",
      webhook_id: correlationId,
      status: "pending",
    });

    // 6. Incrémenter le quota utilisé via Prisma (atomique)
    await ModernSupabaseBridge.incrementQuotaUsed(validatedData.email, 1);

    // 7. Vérifier les seuils de quota pour les notifications (non-bloquant)
    const newQuotaUsed = quotaCheck.quotaUsed + 1;
    EmailNotifications.checkAndNotifyQuotaThresholds(
      user.id,
      newQuotaUsed,
      quotaCheck.monthlyQuota,
      quotaCheck.subscriptionTier,
      validatedData.email,
       
      user.name ?? undefined,
    ).catch((error) => {
      logger.error("Échec vérification seuils quota:", error);
    });

    // 8. Déclencher le workflow n8n réel
    const n8nResponse = await n8nClient.triggerSingleAudit({
      url: validatedData.url,
      email: validatedData.email,
      userId: user.id,
      correlationId,
    });

    logger.debug("Audit single déclenché (approche modernisée):", {
      auditId: audit?.id,
      correlationId,
      n8nSuccess: n8nResponse.success,
    });

    // 9. Publier un événement SSE "audit démarré"
    const startedEvent = createAuditStartedEvent(
      audit?.id ?? "",
      correlationId,
      validatedData.url,
      user.id,
    );
    auditEventStore.publish(user.id, startedEvent);

    logger.debug("Événement 'audit_started' publié:", {
      auditId: audit?.id,
      subscribersCount: auditEventStore.getSubscriberCount(user.id),
    });

    // 10. Envoyer notification email de démarrage (non-bloquant)
    if (audit?.id) {
      EmailNotifications.notifyAuditStarted({
        auditId: audit.id,
        url: validatedData.url,
        userEmail: validatedData.email,
         
        userName: user.name ?? undefined,
        estimatedTime: "2-3 minutes",
      }).catch((error) => {
        logger.error("Échec notification email audit démarré:", error);
      });
    }

    // 11. Réponse de succès
    return NextResponse.json({
      success: true,
      message: "Audit démarré avec succès (approche modernisée)",
      auditId: audit?.id,
      correlationId,
      estimatedTime: "2-3 minutes",
      n8nTriggered: n8nResponse.success,
      quota: {
        used: quotaCheck.quotaUsed + 1,
        total: quotaCheck.monthlyQuota,
        remaining: quotaCheck.monthlyQuota - quotaCheck.quotaUsed - 1,
      },
      subscription: {
        tier: quotaCheck.subscriptionTier,
        subscribed: quotaCheck.subscriptionTier !== "free",
      },
    });
  } catch (error) {
    logger.error("Erreur API single audit (modernisée):", error);

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
