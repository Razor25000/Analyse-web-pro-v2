import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { prisma } from "@/lib/prisma";
import { QuotaService } from "@/lib/quota/quota-service";
import { n8nClient } from "@/lib/n8n/client";
import { logger } from "@/lib/logger";
import { SupabaseBridge } from "@/lib/supabase/bridge";

// Schéma de validation
const SingleAuditSchema = z.object({
  url: z.string().url("URL invalide"),
  email: z.string().email("Email invalide"),
});

const normalizeUrl = (rawUrl: string): string | null => {
  if (!rawUrl) {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    url.hash = "";

    // Normaliser l'URL en supprimant le slash de fin par défaut
    const normalized = url.toString().replace(/\/$/, "");
    return normalized;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 API Audits Single appelée - Version avec vraies données");

    // 1. Vérifier l'authentification
    const user = await getRequiredUser();
    console.log("👤 Utilisateur authentifié:", user.email);

    // 2. Valider les données
    const body = await request.json();
    const validatedData = SingleAuditSchema.parse(body);
    console.log("✅ Données validées:", validatedData);

    // 3. Vérifier le quota AVANT de déclencher n8n
    const quotaInfo = await QuotaService.getUserQuota(user.id);
    console.log("📊 Quota info récupéré:", quotaInfo);

    if (!quotaInfo) {
      console.error("❌ Impossible de récupérer les informations de quota");
      return NextResponse.json(
        { error: "Erreur lors de la vérification du quota" },
        { status: 500 },
      );
    }

    if (quotaInfo.remaining <= 0) {
      console.warn("⚠️ Quota dépassé:", quotaInfo);
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: "Quota d'audits dépassé",
          used: quotaInfo.used,
          limit: quotaInfo.limit,
          upgradeRequired: quotaInfo.planId === "free",
          redirectTo: "/pricing",
        },
        { status: 403 },
      );
    }

    // 4. Normaliser l'URL pour éviter les doublons
    const normalizedUrl = normalizeUrl(validatedData.url);
    if (!normalizedUrl) {
      console.error("❌ URL invalide après normalisation:", validatedData.url);
      return NextResponse.json(
        { error: "URL invalide après normalisation" },
        { status: 400 },
      );
    }

    // 5. Générer un correlation ID pour le suivi
    const correlationId = nanoid();
    console.log("🔗 Correlation ID généré:", correlationId);

    // 6. Décrémenter le quota de manière atomique AVANT de déclencher n8n
    let quotaUpdated = false;
    try {
      const quotaUpdate = await prisma.user.update({
        where: {
          id: user.id,
          quotaUsed: {
            lte: quotaInfo.limit - 1,
          },
        },
        data: {
          quotaUsed: {
            increment: 1,
          },
          updatedAt: new Date(),
        },
      });

      if (quotaUpdate) {
        quotaUpdated = true;
        console.log("📊 Quota décrémenté avec succès:", {
          userId: user.id,
          previousUsed: quotaInfo.used,
          newUsed: quotaInfo.used + 1,
          limit: quotaInfo.limit,
        });
      } else {
        console.error("❌ Erreur lors de la décrémentation du quota - quota insuffisant");
        return NextResponse.json(
          {
            error: "quota_exceeded",
            message: "Quota d'audits dépassé",
            used: quotaInfo.used,
            limit: quotaInfo.limit,
            upgradeRequired: quotaInfo.planId === "free",
            redirectTo: "/pricing",
          },
          { status: 403 },
        );
      }
    } catch (quotaError) {
      console.error("❌ Erreur lors de la mise à jour du quota:", quotaError);
      return NextResponse.json(
        {
          error: "Erreur lors de la mise à jour du quota",
          details: quotaError instanceof Error ? quotaError.message : "Erreur inconnue",
        },
        { status: 500 },
      );
    }

    // 7. Déclencher le workflow n8n (qui créera l'audit via webhook)
    let n8nTriggered = false;
    let webhookUsed: string | undefined;

    try {
      const n8nResult = await n8nClient.triggerSingleAudit({
        url: normalizedUrl,
        email: validatedData.email,
        userId: user.id,
        correlationId,
        planId: quotaInfo.planId,
        orgSlug: undefined, // Pas d'organisation dans cette version
      });

      n8nTriggered = true;
      webhookUsed = n8nResult.webhookUsed;

      console.log("✅ Workflow n8n déclenché:", {
        webhookUsed,
        planId: quotaInfo.planId,
        correlationId,
      });
    } catch (n8nError) {
      console.error("❌ Erreur n8n:", n8nError);
      // Si n8n échoue mais le quota a été décrémenté, on ne rollback pas le quota
      // car l'audit sera marqué comme échoué dans n8n
      if (logger) {
        logger.error("n8n trigger failed", {
          correlationId,
          planId: quotaInfo.planId,
          error:
            n8nError instanceof Error ? n8nError.message : String(n8nError),
        });
      }
      return NextResponse.json(
        {
          error: "Erreur lors du déclenchement de l'audit",
          details:
            n8nError instanceof Error ? n8nError.message : "Erreur inconnue",
          quotaUpdated, // Informer le client que le quota a été décrémenté
        },
        { status: 500 },
      );
    }

    // 8. Récupérer le quota mis à jour pour la réponse
    const updatedQuotaInfo = await QuotaService.getUserQuota(user.id);

    // 9. Retourner la réponse avec le correlationId pour le suivi
    const response = {
      success: true,
      message: "Audit démarré avec succès",
      correlationId,
      estimatedTime: "2-3 minutes",
      n8nTriggered,
      planId: quotaInfo.planId,
      webhookUsed,
      quotaUpdated, // Informer si le quota a bien été décrémenté
      webhookType:
        quotaInfo.planId === "free" || quotaInfo.planId === "basic"
          ? "formulaire-offre-gratuite"
          : "batch-upload",
      quota: updatedQuotaInfo
        ? {
            used: updatedQuotaInfo.used,
            total: updatedQuotaInfo.limit,
            remaining: updatedQuotaInfo.remaining,
          }
        : {
            used: quotaInfo.used,
            total: quotaInfo.limit,
            remaining: quotaInfo.remaining,
          },
      subscription: {
        tier: quotaInfo.planId,
        subscribed: quotaInfo.planId !== "free",
      },
    };

    console.log("✅ Réponse générée:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Erreur API single audit:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la création de l'audit",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
