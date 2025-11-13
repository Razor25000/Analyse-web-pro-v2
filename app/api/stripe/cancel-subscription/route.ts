import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const prisma = new PrismaClient();

const cancelSchema = z.object({
  immediate: z.boolean().default(false), // true = annulation immédiate, false = fin de période
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { immediate } = cancelSchema.parse(body);

    // Trouver l'abonnement actif de l'utilisateur
    const userSubscription = await prisma.subscription.findFirst({
      where: {
        stripeCustomerId: session.user.stripeCustomerId,
        status: { in: ["active", "trialing"] },
      },
    });

    if (!userSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { success: false, error: "Aucun abonnement actif trouvé" },
        { status: 404 },
      );
    }

    let canceledSubscription;

    if (immediate) {
      // Annulation immédiate - l'utilisateur perd l'accès tout de suite
      canceledSubscription = await stripe.subscriptions.cancel(
        userSubscription.stripeSubscriptionId,
      );

      // Remettre immédiatement au plan gratuit
      // (le webhook se chargera de la mise à jour en base)
    } else {
      // Annulation en fin de période - l'utilisateur garde l'accès jusqu'à la fin
      canceledSubscription = await stripe.subscriptions.update(
        userSubscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

      // Mettre à jour en base pour indiquer l'annulation programmée
      await prisma.subscription.update({
        where: { id: userSubscription.id },
        data: {
          cancelAtPeriodEnd: true,
          // Le statut reste 'active' jusqu'à la fin de période
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: immediate
        ? "Abonnement annulé immédiatement"
        : "Abonnement programmé pour annulation en fin de période",
      subscription: {
        id: canceledSubscription.id,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: (canceledSubscription as any).current_period_end
          ? new Date((canceledSubscription as any).current_period_end * 1000)
          : null,
        status: canceledSubscription.status,
      },
    });
  } catch (error) {
    console.error("Erreur annulation abonnement:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 },
    );
  }
}
