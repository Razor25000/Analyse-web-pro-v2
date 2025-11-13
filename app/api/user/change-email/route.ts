import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { z } from "zod";

const changeEmailSchema = z
  .object({
    newEmail: z.string().email(),
    confirmEmail: z.string().email(),
    password: z.string().min(1),
  })
  .refine((data) => data.newEmail === data.confirmEmail, {
    message: "Les adresses email ne correspondent pas",
  });

export async function POST(request: NextRequest) {
  try {
    const user = await getRequiredUser();
    const body = await request.json();

    const validatedData = changeEmailSchema.parse(body);

    // TODO: Implement email change logic with Better Auth
    // This would typically involve:
    // 1. Verify current password
    // 2. Send verification email to new address
    // 3. Update email after verification

    // For now, return success (mock implementation)
    return NextResponse.json({
      success: true,
      message: "Email de vérification envoyé",
    });
  } catch (error) {
    console.error("Change email error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors du changement d'email" },
      { status: 500 },
    );
  }
}
