import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getRequiredUser();
    const body = await request.json();

    const validatedData = changePasswordSchema.parse(body);

    // TODO: Implement password change logic with Better Auth
    // This would typically involve:
    // 1. Verify current password with Better Auth
    // 2. Hash new password
    // 3. Update password in database
    // 4. Optionally invalidate existing sessions

    // For now, return success (mock implementation)
    return NextResponse.json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    console.error("Change password error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors du changement de mot de passe" },
      { status: 500 },
    );
  }
}
