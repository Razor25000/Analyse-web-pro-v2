import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { AUTH_PLANS } from "@/lib/auth/auth-plans";
import { z } from "zod";
import { fromZodError } from "@/lib/zod-route";

// Schema pour valider les paramètres de la requête
const createCheckoutSchema = z.object({
  plan: z.enum(["starter_monthly", "starter_yearly", "pro_monthly", "pro_yearly", "premium_monthly", "premium_yearly"]),
  userId: z.string().optional(),
});

const PLAN_TO_PRICE_ID = {
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
  starter_yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
  premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    // Valider les paramètres
    const { plan, userId } = createCheckoutSchema.parse(rawParams);

    if (!plan) {
      return NextResponse.json({ error: "Plan requis" }, { status: 400 });
    }

    // Si userId fourni, on l'utilise, sinon on tente de récupérer l'utilisateur connecté
    let targetUserId = userId;
    if (!targetUserId) {
      // Tenter de récupérer l'utilisateur depuis l'API d'auth
      try {
        const authResponse = await fetch(`${request.nextUrl.origin}/api/auth/status`);
        if (authResponse.ok) {
          const authData = await authResponse.json();
          targetUserId = authData.user?.id;
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "Utilisateur non connecté" }, { status: 401 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
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

    // Vérifier que le plan existe
    const priceId = PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID];
    if (!priceId) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // Trouver les détails du plan
    const planDetails = AUTH_PLANS.find(
      (p) => p.priceId === priceId || p.annualDiscountPriceId === priceId,
    );

    if (!planDetails) {
      return NextResponse.json(
        { error: "Détails du plan introuvables" },
        { status: 400 },
      );
    }

    // Créer ou récupérer le client Stripe
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      // Créer un client Stripe pour cet utilisateur
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
          source: "billing_page_upgrade",
        },
      });

      stripeCustomerId = customer.id;

      // Sauvegarder le StripeCustomerId dans la base de données
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${request.nextUrl.origin}/api/stripe/update-user-subscription?userId=${user.id}&plan=${plan}&success=true`,
      cancel_url: `${request.nextUrl.origin}/dashboard/billing?cancelled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
        userEmail: user.email,
        source: "billing_page_upgrade",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
          userEmail: user.email,
          source: "billing_page_upgrade",
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Erreur création session Stripe" },
        { status: 500 },
      );
    }

    // Rediriger vers Stripe
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Erreur création session Stripe pour utilisateur existant:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: fromZodError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}