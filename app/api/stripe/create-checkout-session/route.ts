import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { AUTH_PLANS } from "@/lib/auth/auth-plans";

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
    const plan = searchParams.get("plan");
    const preRegistrationId = searchParams.get("preRegistrationId");
    const userId = searchParams.get("userId"); // Support ancien système

    if (!plan) {
      return NextResponse.json({ error: "Plan requis" }, { status: 400 });
    }

    // Support de l'ancien système : rediriger vers pre-signup si ni preRegistrationId ni userId
    if (!preRegistrationId && !userId) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/pre-signup?plan=${plan}`,
      );
    }

    // Support de l'ancien système : si userId fourni, rediriger vers pre-signup
    if (userId && !preRegistrationId) {
      console.warn("⚠️ Ancien flux détecté avec userId:", userId);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/pre-signup?plan=${plan}&migration=true`,
      );
    }

    // Récupérer la pré-inscription
    const preRegistration = await prisma.preRegistration.findUnique({
      where: { id: preRegistrationId },
    });

    if (!preRegistration) {
      return NextResponse.json(
        { error: "Pré-inscription introuvable" },
        { status: 404 },
      );
    }

    if (preRegistration.status !== "pending") {
      return NextResponse.json(
        { error: "Pré-inscription expirée ou déjà traitée" },
        { status: 400 },
      );
    }

    // Vérifier que la pré-inscription n'est pas expirée
    if (preRegistration.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Pré-inscription expirée" },
        { status: 400 },
      );
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

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer_email: preRegistration.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${request.nextUrl.origin}/api/auth/create-account-from-pre-registration?preRegistrationId=${preRegistrationId}&success=true`,
      cancel_url: `${request.nextUrl.origin}/auth/pre-signup?plan=${plan}&cancelled=true`,
      metadata: {
        preRegistrationId: preRegistration.id,
        plan: plan,
        name: preRegistration.name,
        email: preRegistration.email,
      },
      subscription_data: {
        metadata: {
          preRegistrationId: preRegistration.id,
          plan: plan,
          name: preRegistration.name,
          email: preRegistration.email,
        },
      },
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
    console.error("Erreur création session Stripe:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
