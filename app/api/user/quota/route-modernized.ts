import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { ModernSupabaseBridge } from "@/lib/supabase/bridge-new";

export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const user = await getRequiredUser();

    // 2. Récupérer les informations de quota via Prisma
    const subscription = await ModernSupabaseBridge.getUserSubscription(
      user.email,
    );

    if (!subscription) {
      // Créer l'utilisateur s'il n'existe pas
      await ModernSupabaseBridge.createUserIfNotExists(user.email, {
        name: user.name,
        userId: user.id,
      });

      // Retourner les valeurs par défaut
      return NextResponse.json({
        quota: {
          used: 0,
          total: 10,
          remaining: 10,
        },
        subscription: {
          tier: "free",
          subscribed: false,
          subscriptionEnd: null,
        },
        quotaResetDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    }

    // 3. Calculer les statistiques de quota
    const quotaUsed = subscription.quota_used ?? 0;
    const monthlyQuota = subscription.monthly_quota ?? 10;

    return NextResponse.json({
      quota: {
        used: quotaUsed,
        total: monthlyQuota,
        remaining: Math.max(0, monthlyQuota - quotaUsed),
      },
      subscription: {
        tier: subscription.subscription_tier ?? "free",
        subscribed: subscription.subscribed ?? false,
        subscriptionEnd: subscription.subscription_end,
      },
      quotaResetDate: subscription.quota_reset_date,
    });
  } catch (error) {
    console.error("Erreur API quota:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const user = await getRequiredUser();

    // 2. Parser le body pour les actions
    const body = await request.json();
    const { action, increment = 1 } = body;

    if (action === "increment") {
      // 3. Incrémenter le quota utilisé
      const updatedUser = await ModernSupabaseBridge.incrementQuotaUsed(
        user.email,
        increment,
      );

      return NextResponse.json({
        success: true,
        message: `Quota incrémenté de ${increment}`,
        quota: {
          used: updatedUser.quotaUsed,
          total: updatedUser.monthlyQuota,
          remaining: updatedUser.monthlyQuota - updatedUser.quotaUsed,
        },
      });
    }

    return NextResponse.json(
      { error: "Action non supportée" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Erreur POST quota:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
