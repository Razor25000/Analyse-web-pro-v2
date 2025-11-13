import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { QuotaService } from "@/lib/quota/quota-service";
import { nanoid } from "nanoid";

const CreateAccountFromPreRegistrationSchema = z.object({
  preRegistrationId: z.string(),
  success: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validatedData = CreateAccountFromPreRegistrationSchema.parse({
      preRegistrationId: searchParams.get("preRegistrationId"),
      success: searchParams.get("success") || "true",
    });

    if (validatedData.success !== "true") {
      // Rediriger vers la page de pré-inscription avec message d'annulation
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/pre-signup?cancelled=true`,
      );
    }

    // Récupérer la pré-inscription
    const preRegistration = await prisma.preRegistration.findUnique({
      where: { id: validatedData.preRegistrationId },
    });

    if (!preRegistration) {
      console.error(
        "Pré-inscription introuvable:",
        validatedData.preRegistrationId,
      );
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/pre-signup?error=pre_registration_not_found`,
      );
    }

    if (preRegistration.status !== "pending") {
      console.error("Pré-inscription déjà traitée:", preRegistration.status);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/pre-signup?error=pre_registration_already_processed`,
      );
    }

    // Vérifier que la pré-inscription n'est pas expirée
    if (preRegistration.expiresAt < new Date()) {
      console.error("Pré-inscription expirée:", preRegistration.id);
      await prisma.preRegistration.update({
        where: { id: preRegistration.id },
        data: { status: "expired" },
      });
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/pre-signup?error=pre_registration_expired`,
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: preRegistration.email },
    });

    if (existingUser) {
      console.error("Utilisateur existe déjà:", preRegistration.email);
      await prisma.preRegistration.update({
        where: { id: preRegistration.id },
        data: { status: "cancelled" },
      });
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/signin?error=user_already_exists`,
      );
    }

    // Créer le compte avec Better Auth (gestion automatique du hachage)
    console.log("📝 Création du compte avec Better Auth...");
    console.log("🔐 Password from pre-registration:", {
      hasPassword: !!preRegistration.password,
      passwordLength: preRegistration.password?.length,
      email: preRegistration.email,
    });

    try {
      // Utiliser Better Auth pour créer le compte avec le mot de passe en clair
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: preRegistration.email,
          password: preRegistration.password, // Better Auth gère le hachage
          name: preRegistration.name,
          image: null,
          callbackURL: null,
        },
        headers: await headers(),
      });

      console.log("📊 SignUp result:", {
        hasUser: !!signUpResult?.user,
        hasSession: !!signUpResult?.session,
        userId: signUpResult?.user?.id,
        email: signUpResult?.user?.email,
      });

      if (!signUpResult?.user) {
        throw new Error("Échec de création du compte avec Better Auth");
      }

      console.log("✅ Utilisateur créé avec Better Auth:", {
        id: signUpResult.user.id,
        email: signUpResult.user.email,
      });

      // Mettre à jour le tier de subscription pour l'utilisateur créé
      await prisma.user.update({
        where: { id: signUpResult.user.id },
        data: {
          subscriptionTier: preRegistration.selectedPlan,
        },
      });

      console.log(
        "✅ Subscription tier mis à jour:",
        preRegistration.selectedPlan,
      );
    } catch (error) {
      console.error("❌ Erreur création de compte:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }

    // Récupérer l'utilisateur créé pour avoir l'ID
    const createdUser = await prisma.user.findUnique({
      where: { email: preRegistration.email },
    });

    if (!createdUser) {
      throw new Error("Utilisateur introuvable après création");
    }

    // Pour les plans payants, récupérer les informations Stripe et créer l'abonnement
    if (preRegistration.selectedPlan !== "free") {
      const successParam = new URL(request.url).searchParams.get("success");
      if (successParam === "true") {
        // Récupérer les informations de session Stripe si disponibles
        // Dans un contexte réel, ces infos viendraient des paramètres de la session
        // Pour l'instant, créer un abonnement basique pour que l'API fonctionne
        try {
          await prisma.subscription.create({
            data: {
              id: `sub_${Date.now()}_${createdUser.id.slice(-8)}`, // ID temporaire
              plan: preRegistration.selectedPlan,
              referenceId: `temp_${Date.now()}`,
              stripeCustomerId: createdUser.stripeCustomerId,
              status: "active",
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
              cancelAtPeriodEnd: false,
              seats: 1,
              userId: createdUser.id,
            },
          });
          console.log(
            "✅ Abonnement créé pour plan payant:",
            preRegistration.selectedPlan,
          );
        } catch (error) {
          console.error("❌ Erreur création abonnement:", error);
          // Ne pas bloquer la création de compte si l'abonnement échoue
        }
      }
    }

    // Configurer les quotas selon le plan sélectionné
    await QuotaService.updateQuotaForSubscription(
      createdUser.id,
      preRegistration.selectedPlan,
    );

    // NOTE: Supabase profiles synchronization removed in v2.0 architecture
    // Les données utilisateurs sont gérées uniquement dans Prisma (source de vérité)
    // Seuls les audits sont synchronisés pour les workflows n8n

    // Marquer la pré-inscription comme complétée
    await prisma.preRegistration.update({
      where: { id: preRegistration.id },
      data: { status: "completed" },
    });

    // Better Auth a créé automatiquement la session, rediriger vers le dashboard
    return NextResponse.redirect(
      `${request.nextUrl.origin}/dashboard?accountCreated=true&plan=${preRegistration.selectedPlan}`,
    );
  } catch (error) {
    console.error("Erreur création de compte depuis pré-inscription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/pre-signup?error=invalid_parameters`,
      );
    }

    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/pre-signup?error=account_creation_failed`,
    );
  }
}

// Endpoint pour le webhook Stripe qui gère la création de compte après paiement
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = (await headers()).get("stripe-signature")!;

    let event: any;

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

    console.log("📥 Webhook création de compte reçu:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const preRegistrationId = session.metadata?.preRegistrationId;
      const plan = session.metadata?.plan;

      if (!preRegistrationId || !plan) {
        console.error("Métadonnées manquantes dans la session checkout");
        return NextResponse.json(
          { error: "Missing metadata" },
          { status: 400 },
        );
      }

      // Récupérer la pré-inscription
      const preRegistration = await prisma.preRegistration.findUnique({
        where: { id: preRegistrationId },
      });

      if (!preRegistration) {
        console.error("Pré-inscription introuvable:", preRegistrationId);
        return NextResponse.json(
          { error: "Pre-registration not found" },
          { status: 404 },
        );
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: preRegistration.email },
      });

      if (existingUser) {
        console.error("Utilisateur existe déjà:", preRegistration.email);
        await prisma.preRegistration.update({
          where: { id: preRegistration.id },
          data: { status: "cancelled" },
        });
        return NextResponse.json(
          { error: "User already exists" },
          { status: 400 },
        );
      }

      // Créer le compte avec Better Auth (webhook)
      console.log("📝 Création du compte avec Better Auth (webhook)...");
      console.log("🔐 Password from pre-registration (webhook):", {
        hasPassword: !!preRegistration.password,
        passwordLength: preRegistration.password?.length,
        email: preRegistration.email,
      });

      try {
        // Utiliser Better Auth pour créer le compte avec le mot de passe en clair
        const signUpResult = await auth.api.signUpEmail({
          body: {
            email: preRegistration.email,
            password: preRegistration.password, // Better Auth gère le hachage
            name: preRegistration.name,
            image: null,
            callbackURL: null,
          },
          headers: await headers(),
        });

        console.log("📊 SignUp result (webhook):", {
          hasUser: !!signUpResult?.user,
          hasSession: !!signUpResult?.session,
          userId: signUpResult?.user?.id,
          email: signUpResult?.user?.email,
        });

        if (!signUpResult?.user) {
          throw new Error(
            "Échec de création du compte avec Better Auth (webhook)",
          );
        }

        console.log("✅ Utilisateur créé avec Better Auth (webhook):", {
          id: signUpResult.user.id,
          email: signUpResult.user.email,
        });

        // Mettre à jour les informations Stripe et le tier
        await prisma.user.update({
          where: { id: signUpResult.user.id },
          data: {
            subscriptionTier: plan,
            stripeCustomerId: session.customer as string,
          },
        });

        console.log("✅ Informations Stripe mises à jour:", {
          customerId: session.customer,
          tier: plan,
        });
      } catch (error) {
        console.error("❌ Erreur création de compte (webhook):", error);
        throw error;
      }

      // Récupérer l'utilisateur créé pour avoir l'ID
      const createdUser = await prisma.user.findUnique({
        where: { email: preRegistration.email },
      });

      if (!createdUser) {
        throw new Error("Utilisateur introuvable après création");
      }

      // Récupérer les détails de l'abonnement
      const subscription = (await stripe.subscriptions.retrieve(
        session.subscription as string,
      )) as any;

      // Créer l'abonnement
      await prisma.subscription.create({
        data: {
          id: session.subscription as string,
          plan: plan,
          referenceId: subscription.id,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          periodStart: new Date(subscription.current_period_start * 1000),
          periodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          seats: 1,
          userId: createdUser.id,
        },
      });

      // Mettre à jour les quotas
      await QuotaService.updateQuotaForSubscription(createdUser.id, plan);

      console.log(
        "✅ Compte créé avec succès via Better Auth - session automatiquement créée",
      );

      // NOTE: Supabase profiles synchronization removed in v2.0 architecture
      // Les données utilisateurs sont gérées uniquement dans Prisma (source de vérité)
      // Seuls les audits sont synchronisés pour les workflows n8n

      // Marquer la pré-inscription comme complétée
      await prisma.preRegistration.update({
        where: { id: preRegistration.id },
        data: { status: "completed" },
      });

      console.log(
        `✅ Compte créé pour ${preRegistration.email} avec plan ${plan}`,
      );

      // Mettre à jour la session Stripe avec l'ID utilisateur pour le tracking
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...session.metadata,
          userId: createdUser.id,
        },
      });

      return NextResponse.json({ success: true, userId: createdUser.id });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur webhook création de compte:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
