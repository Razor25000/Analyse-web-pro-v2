import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getPlanById } from "@/config/subscription-plans";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({
  planId: z.string(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
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
    const { planId, successUrl, cancelUrl } = checkoutSchema.parse(body);

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan introuvable" },
        { status: 404 },
      );
    }

    if (!plan.stripePriceId) {
      return NextResponse.json(
        { success: false, error: "Prix Stripe non configuré pour ce plan" },
        { status: 400 },
      );
    }

    // Récupérer ou créer le customer Stripe
    let customerId = session.user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;

      // Mettre à jour l'utilisateur avec l'ID customer
      // TODO: Ajouter cette logique avec Prisma
      console.log("Customer Stripe créé:", customerId);
    }

    const baseUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_APP_URL || "https://votre-domaine.com";

    // Créer la session de checkout Stripe
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url:
        successUrl || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/cancel`,
      metadata: {
        userId: session.user.id,
        planId: planId,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          planId: planId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Erreur création checkout Stripe:", error);

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
