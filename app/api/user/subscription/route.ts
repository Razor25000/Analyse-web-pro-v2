import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
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

    // Récupérer l'abonnement depuis la base de données
    const userSubscription = session.user.stripeCustomerId
      ? await prisma.subscription.findFirst({
          where: {
            stripeCustomerId: session.user.stripeCustomerId,
          },
          orderBy: { periodStart: "desc" }, // Le plus récent en premier
        })
      : null;

    if (!userSubscription) {
      return NextResponse.json({
        success: true,
        subscription: null,
        plan: "free",
        isActive: false,
      });
    }

    // Récupérer les détails depuis Stripe pour avoir les infos les plus fraîches
    let stripeSubscription = null;
    if (userSubscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          userSubscription.stripeSubscriptionId,
        );
      } catch (error) {
        console.error("Erreur récupération abonnement Stripe:", error);
      }
    }

    const isActive = ["active", "trialing"].includes(
      userSubscription?.status ?? "",
    );
    const isPastDue = userSubscription?.status === "past_due";
    const isCanceled = userSubscription?.status === "canceled";

    return NextResponse.json({
      success: true,
      subscription: {
        id: userSubscription.id,
        plan: userSubscription.plan,
        status: userSubscription.status,
        currentPeriodStart: userSubscription.periodStart,
        currentPeriodEnd: userSubscription.periodEnd,
        cancelAtPeriodEnd: userSubscription.cancelAtPeriodEnd,

        // Infos enrichies depuis Stripe
        stripeSubscriptionId: userSubscription.stripeSubscriptionId,
        stripeCustomerId: userSubscription.stripeCustomerId,

        // États calculés
        isActive,
        isPastDue,
        isCanceled,
        willCancelAtPeriodEnd: userSubscription.cancelAtPeriodEnd,

        // Dates formatées
        periodEndFormatted:
          userSubscription.periodEnd?.toLocaleDateString("fr-FR") ?? null,
        daysUntilPeriodEnd: userSubscription.periodEnd
          ? Math.ceil(
              (userSubscription.periodEnd.getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      },
      plan: userSubscription.plan,
      isActive,
    });
  } catch (error) {
    console.error("Erreur récupération abonnement:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 },
    );
  }
}
