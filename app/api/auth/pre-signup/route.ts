import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

const PreSignUpSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom doit contenir au moins 2 caractères",
  }),
  email: z.string().email({
    message: "Veuillez entrer une adresse email valide",
  }),
  password: z.string().min(8, {
    message: "Le mot de passe doit contenir au moins 8 caractères",
  }),
  selectedPlan: z.string().default("free"),
});

type PreSignUpInput = z.infer<typeof PreSignUpSchema>;

const createPreRegistrationResponse = {
  preRegistrationId: z.string(),
  message: z.string(),
};

export async function POST(request: Request) {
  try {
    // Rate limiting
    await rateLimit({ key: "pre-signup", limit: 5, window: 60 * 15 });

    const body = await request.json();
    const validatedData = PreSignUpSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return Response.json(
        {
          error: "Un compte avec cette adresse email existe déjà",
        },
        { status: 400 },
      );
    }

    // Check if there's already a pre-registration for this email
    const existingPreRegistration = await prisma.preRegistration.findUnique({
      where: { email: validatedData.email },
    });

    if (existingPreRegistration) {
      // Si pré-inscription complétée, l'utilisateur devrait se connecter
      if (existingPreRegistration.status === "completed") {
        return Response.json(
          {
            error:
              "Un compte avec cette adresse email existe déjà. Veuillez vous connecter.",
            redirect: "/auth/signin",
          },
          { status: 400 },
        );
      }

      // Si pré-inscription en attente et pas expirée, renvoyer l'existante
      if (
        existingPreRegistration.status === "pending" &&
        existingPreRegistration.expiresAt > new Date()
      ) {
        // Si même plan, renvoyer l'existante
        if (
          existingPreRegistration.selectedPlan === validatedData.selectedPlan
        ) {
          return Response.json({
            preRegistrationId: existingPreRegistration.id,
            message: "Pré-inscription existante trouvée",
          });
        } else {
          // Plan différent, mettre à jour l'existante
          const updatedPreRegistration = await prisma.preRegistration.update({
            where: { id: existingPreRegistration.id },
            data: {
              selectedPlan: validatedData.selectedPlan,
              name: validatedData.name,
              password: validatedData.password, // Store plaintext password temporarily
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Reset expiration
            },
          });
          return Response.json({
            preRegistrationId: updatedPreRegistration.id,
            message: "Pré-inscription mise à jour",
          });
        }
      } else {
        // Pré-inscription expirée ou annulée, supprimer l'ancienne et en créer une nouvelle
        await prisma.preRegistration.delete({
          where: { id: existingPreRegistration.id },
        });
      }
    }

    // Store password temporarily (Better Auth will handle hashing during account creation)
    // Create pre-registration
    const preRegistrationId = nanoid(16);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const preRegistration = await prisma.preRegistration.create({
      data: {
        id: preRegistrationId,
        name: validatedData.name,
        email: validatedData.email,
        password: validatedData.password, // Store plaintext temporarily
        selectedPlan: validatedData.selectedPlan,
        status: "pending",
        expiresAt,
      },
    });

    return Response.json({
      preRegistrationId: preRegistration.id,
      message: "Pré-inscription créée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la pré-inscription:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Prisma.PrismaKnownRequestError) {
      if (error.code === "P2002") {
        return Response.json(
          {
            error: "Une pré-inscription avec cette adresse email existe déjà",
          },
          { status: 400 },
        );
      }
    }

    return Response.json(
      {
        error: "Une erreur est survenue lors de la pré-inscription",
      },
      { status: 500 },
    );
  }
}
