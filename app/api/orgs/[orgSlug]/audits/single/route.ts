/* eslint-disable linebreak-style */
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { SupabaseBridge } from "@/lib/supabase/bridge";
import { nanoid } from "nanoid";

// Schéma de validation
const SingleAuditSchema = z.object({
  url: z.string().url("URL invalide"),
  email: z.string().email("Email invalide"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } },
) {
  try {
    // 1. Vérifier l'authentification
    const user = await getRequiredUser();
    
    // Note: Dans cette version simplifiée, on utilise directement l'email de l'utilisateur
    // TODO: Intégrer avec la gestion des organisations si nécessaire

    // 2. Valider les données
    const body = await request.json();
    const validatedData = SingleAuditSchema.parse(body);

    // 3. Vérifier les quotas et abonnement
    const subscription = await SupabaseBridge.getUserSubscription(validatedData.email);
    const quota = subscription?.monthly_quota ?? 10; // Quota par défaut pour les non-abonnés
    const quotaUsed = subscription?.quota_used ?? 0;
    
    if (quotaUsed >= quota) {
      return NextResponse.json({ 
        error: "Quota mensuel dépassé", 
        quota,
        used: quotaUsed,
        subscription_tier: subscription?.subscription_tier ?? "free"
      }, { status: 429 });
    }

    // 4. Générer un ID de webhook pour le suivi
    const webhookId = nanoid();

    // 5. Synchroniser l'utilisateur avec Supabase
    await SupabaseBridge.syncUserToSupabase(
      user.id, 
      user.email, 
      user.name ?? undefined
    );

    // 6. Créer l'audit en base
    const audit = await SupabaseBridge.createAudit({
      user_id: user.id,
      email: validatedData.email,
      url: validatedData.url,
      audit_type: "manual",
      webhook_id: webhookId,
      status: "pending",
    });

    // 7. Incrémenter le quota utilisé
    await SupabaseBridge.incrementQuotaUsed(validatedData.email, 1);

    // 8. Déclencher le workflow n8n (simulation pour l'instant)
    console.log("🚀 Déclenchement audit single:", {
      auditId: audit?.id,
      url: validatedData.url,
      email: validatedData.email,
      userId: user.id,
      webhookId,
      orgSlug: params.orgSlug,
    });

    // 9. Réponse de succès
    return NextResponse.json({
      success: true,
      message: "Audit démarré avec succès",
      auditId: audit?.id,
      webhookId,
      estimatedTime: "2-3 minutes",
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
