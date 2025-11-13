import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";
import { QuotaService } from "@/lib/quota/quota-service";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { finalizePreRegistration } from "@/lib/auth/pre-registration-finalize";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  console.log("📥 Webhook reçu:", event.type);

  try {
    switch (event.type) {
      // ✅ Paiement réussi - Activer l'abonnement
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      // 💰 Paiement d'abonnement réussi - Renouvellement
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      // ❌ Paiement échoué - Suspendre l'accès
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      // 🚫 Abonnement annulé - Révoquer l'accès
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      // 📝 Abonnement mis à jour - Changement de plan
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      default:
        console.log(`Webhook non traité: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// 🎉 Gérer la completion du checkout
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const preRegistrationId = session.metadata?.preRegistrationId;
  const userId = session.metadata?.userId;
  const planId = session.metadata?.plan;

  if (!planId) {
    console.error("Métadonnées manquantes dans la session checkout");
    return;
  }

  // Cas 1: Pré-inscription (nouveau workflow)
  if (preRegistrationId) {
    console.log(
      `✅ Paiement confirmé pour pré-inscription: ${preRegistrationId}, plan: ${planId}`,
    );

    try {
      // NOUVELLE LOGIQUE: Finaliser la pré-inscription avec les données Stripe
      await finalizePreRegistration(preRegistrationId, {
        customerId: session.customer as string,
        subscriptionId: session.subscription as string,
      });
      console.log(
        `🎉 Compte finalisé avec succès pour pré-inscription: ${preRegistrationId}`,
      );
    } catch (error) {
      console.error(
        "❌ Erreur lors de la finalisation de la pré-inscription payante:",
        error,
      );
      // TODO: Gérer l'erreur (ex: email à l'admin, retry logic)
    }
    return;
  }

  // Cas 2: Utilisateur existant (ancien workflow)
  if (!userId) {
    console.error("Métadonnées manquantes dans la session checkout");
    return;
  }

  console.log(`✅ Paiement confirmé pour userId: ${userId}, plan: ${planId}`);

  // Récupérer les détails de l'abonnement
  const subscription = (await stripe.subscriptions.retrieve(
    session.subscription as string,
  )) as Stripe.Subscription;

  // Créer ou mettre à jour l'abonnement en base
  await prisma.subscription.upsert({
    where: {
      id: session.subscription as string,
    },
    update: {
      plan: planId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      periodStart: new Date((subscription as any).current_period_start * 1000),
      periodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      userId: userId,
    },
    create: {
      id: session.subscription as string,
      plan: planId,
      referenceId: subscription.id,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      periodStart: new Date((subscription as any).current_period_start * 1000),
      periodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      seats: 1,
      userId: userId,
    },
  });

  // Mettre à jour le plan de l'utilisateur
  await QuotaService.updateQuotaForSubscription(userId, planId);

  // Mettre à jour le stripeCustomerId si nécessaire
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: session.customer as string },
  });

  console.log(`🚀 Utilisateur ${userId} mis à niveau vers le plan ${planId}`);
}

// 💰 Gérer le paiement réussi (renouvellement)
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if ((invoice as any).subscription) {
    const subscription = (await stripe.subscriptions.retrieve(
      (invoice as any).subscription as string,
    )) as Stripe.Subscription;

    // Mettre à jour la période d'abonnement
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        periodStart: new Date(
          (subscription as any).current_period_start * 1000,
        ),
        periodEnd: new Date((subscription as any).current_period_end * 1000),
      },
    });

    console.log(
      `💰 Renouvellement réussi pour l'abonnement ${subscription.id}`,
    );
  }
}

// ❌ Gérer l'échec de paiement
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription;
  if (subscriptionId) {
    // Marquer l'abonnement comme en échec
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId as string },
      data: { status: "past_due" },
    });

    console.log(`❌ Échec de paiement pour l'abonnement ${subscriptionId}`);

    // TODO: Envoyer email de relance ou suspendre temporairement l'accès
  }
}

// 🚫 Gérer l'annulation d'abonnement
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Révoquer l'accès premium
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "canceled" },
  });

  // Remettre l'utilisateur au plan gratuit
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (sub?.stripeCustomerId) {
    const customer = await stripe.customers.retrieve(sub.stripeCustomerId);

    if ("metadata" in customer && customer.metadata?.userId) {
      await QuotaService.updateQuotaForSubscription(
        customer.metadata.userId,
        "free",
      );
      console.log(
        `🚫 Utilisateur ${customer.metadata.userId} remis au plan gratuit`,
      );
    }
  }
}

// 📝 Gérer la mise à jour d'abonnement
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Mettre à jour les détails de l'abonnement
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      periodStart: new Date((subscription as any).current_period_start * 1000),
      periodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    },
  });

  console.log(`📝 Abonnement ${subscription.id} mis à jour`);
}
