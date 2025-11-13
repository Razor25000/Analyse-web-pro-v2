import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";
import { fromZodError } from "@/lib/zod-route";

const updateSubscriptionSchema = z.object({
  userId: z.string(),
  plan: z.string(),
  success: z.string().optional(),
  cancelled: z.string().optional(),
  session_id: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    // Valider les paramètres
    const { userId, plan, success, cancelled, session_id } = updateSubscriptionSchema.parse(rawParams);

    if (!userId || !plan) {
      return NextResponse.json({ error: "Paramètres requis manquants" }, { status: 400 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: "Utilisateur sans client Stripe" }, { status: 400 });
    }

    let subscription = null;
    let updatedPlan = user.subscriptionTier;

    // Si le paiement a réussi, récupérer la session Stripe
    if (success && session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.subscription) {
          subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          // Mettre à jour l'abonnement dans la base de données
          if (subscription.status === "active" || subscription.status === "trialing") {
            updatedPlan = plan;

            await prisma.user.update({
              where: { id: userId },
              data: { subscriptionTier: updatedPlan },
            });

            // Créer ou mettre à jour l'enregistrement d'abonnement
            await prisma.subscription.upsert({
              where: { referenceId: subscription.id },
              create: {
                referenceId: subscription.id,
                plan: updatedPlan,
                stripeCustomerId: user.stripeCustomerId,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                periodStart: new Date(subscription.current_period_start * 1000),
                periodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                userId: userId,
              },
              update: {
                plan: updatedPlan,
                status: subscription.status,
                periodStart: new Date(subscription.current_period_start * 1000),
                periodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
            });
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de la session Stripe:", error);
      }
    }

    // Rediriger selon le résultat
    if (success) {
      return NextResponse.redirect(`${request.nextUrl.origin}/dashboard/billing?upgrade_success=true&plan=${updatedPlan}`);
    } else if (cancelled) {
      return NextResponse.redirect(`${request.nextUrl.origin}/dashboard/billing?upgrade_cancelled=true`);
    } else {
      return NextResponse.redirect(`${request.nextUrl.origin}/dashboard/billing`);
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'abonnement:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: fromZodError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}