import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { finalizePreRegistration } from "@/lib/auth/pre-registration-finalize";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const preRegistrationId = searchParams.get("preRegistrationId");
    const success = searchParams.get("success");

    if (!preRegistrationId) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/signin?error=missing_pre_registration_id`,
      );
    }

    // Récupérer la pré-inscription
    const preRegistration = await prisma.preRegistration.findUnique({
      where: { id: preRegistrationId },
    });

    if (!preRegistration) {
      console.error("Pré-inscription introuvable:", preRegistrationId);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/signin?error=pre_registration_not_found`,
      );
    }

    // Vérifier si la pré-inscription est déjà complétée
    if (preRegistration.status === "completed") {
      console.log("Pré-inscription déjà complétée:", preRegistrationId);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/signin?accountAlreadyExists=true&email=${encodeURIComponent(preRegistration.email)}`,
      );
    }

    // Récupérer l'utilisateur créé
    const user = await prisma.user.findUnique({
      where: { email: preRegistration.email },
    });

    if (!user) {
      console.error(
        "Utilisateur introuvable pour la pré-inscription:",
        preRegistration.email,
      );
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/signin?error=user_not_found`,
      );
    }

    // Si l'utilisateur est venu du paiement (success=true), il a déjà été traité par le webhook
    if (success === "true" && preRegistration.selectedPlan !== "free") {
      console.log("Utilisateur payant déjà traité par le webhook:", user.email);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/signin?accountCreated=true&plan=${preRegistration.selectedPlan}`,
      );
    }

    // Finaliser l'inscription en créant une session BetterAuth
    console.log(
      "🔐 Finalisation de l'inscription gratuite avec session BetterAuth...",
    );
    const finalizationResult = await finalizeRegistration(user.id, user.email);

    // Marquer la pré-inscription comme complétée
    await prisma.preRegistration.update({
      where: { id: preRegistration.id },
      data: { status: "completed" },
    });

    if (finalizationResult.success) {
      console.log(
        "✅ Session BetterAuth créée avec succès pour l'utilisateur gratuit:",
        {
          id: user.id,
          email: user.email,
          plan: user.subscriptionTier,
        },
      );

      // Rediriger vers le dashboard avec message de succès
      return NextResponse.redirect(
        `${request.nextUrl.origin}/dashboard?accountCreated=true&plan=${preRegistration.selectedPlan}`,
      );
    } else {
      console.error(
        "⚠️ Échec de création de session BetterAuth pour l'utilisateur gratuit:",
        finalizationResult.error,
      );

      // Fallback: rediriger vers la page de connexion avec message d'instructions
      if (finalizationResult.redirectUrl) {
        return NextResponse.redirect(finalizationResult.redirectUrl);
      }

      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/signin?accountCreated=true&plan=${preRegistration.selectedPlan}&session_created=false`,
      );
    }
  } catch (error) {
    console.error(
      "Erreur lors de la finalisation de l'inscription gratuite:",
      error,
    );
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/signin?error=finalization_failed`,
    );
  }
}

const FinalizeSchema = z.object({
  preRegistrationId: z.string().min(1, "ID de pré-inscription requis"),
});

// Endpoint pour la finalisation des comptes gratuits
export async function POST(request: NextRequest) {
  try {
    // Rate limiting pour éviter les abus
    await rateLimit({
      key: "finalize-free-signup",
      limit: 10,
      window: 60 * 15,
    });

    const body = await request.json();
    const { preRegistrationId } = FinalizeSchema.parse(body);

    console.log(
      `🔄 Demande de finalisation pour compte gratuit: ${preRegistrationId}`,
    );

    // Sécurité : Vérifier que la pré-inscription existe et est bien pour un plan gratuit
    const preReg = await prisma.preRegistration.findUnique({
      where: { id: preRegistrationId },
      select: {
        id: true,
        email: true,
        selectedPlan: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!preReg) {
      return NextResponse.json(
        { error: "Pré-inscription introuvable" },
        { status: 404 },
      );
    }

    if (preReg.status !== "pending") {
      return NextResponse.json(
        { error: "Cette pré-inscription n'est plus en attente" },
        { status: 400 },
      );
    }

    if (preReg.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Cette pré-inscription a expiré" },
        { status: 400 },
      );
    }

    if (preReg.selectedPlan !== "free") {
      return NextResponse.json(
        {
          error:
            "Cette finalisation n'est disponible que pour les comptes gratuits",
        },
        { status: 403 },
      );
    }

    // Finaliser la pré-inscription (sans données Stripe puisque c'est gratuit)
    const newUser = await finalizePreRegistration(preRegistrationId);

    console.log(
      `✅ Compte gratuit finalisé avec succès: ${newUser.email} (ID: ${newUser.id})`,
    );

    return NextResponse.json({
      success: true,
      userId: newUser.id,
      email: newUser.email,
      message: "Compte créé avec succès",
    });
  } catch (error) {
    console.error(
      "❌ Erreur lors de la finalisation du compte gratuit:",
      error,
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      // Erreurs métier spécifiques
      if (
        error.message.includes("introuvable") ||
        error.message.includes("expirée")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur lors de la finalisation" },
      { status: 500 },
    );
  }
}
