import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return Response.json(
      { error: "Email parameter required" },
      { status: 400 }
    );
  }

  try {
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        account: true,
        session: true,
        member: true,
        audit_logs: true,
        invitation: true,
        supabase_syncs: true,
        Feedback: true,
      },
    });

    if (!user) {
      return Response.json(
        { error: `Aucun utilisateur trouvé avec l'email: ${email}` },
        { status: 404 }
      );
    }

    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      relations: {
        accounts: user.account.length,
        sessions: user.session.length,
        members: user.member.length,
        audit_logs: user.audit_logs.length,
        invitations: user.invitation.length,
        feedback: user.Feedback.length,
        supabase_sync: !!user.supabase_syncs,
      },
    };

    console.log("👤 Utilisateur trouvé:", userInfo);

    // Supprimer l'utilisateur (cascade delete s'occupe des relations)
    await prisma.user.delete({
      where: { email },
    });

    console.log(`✅ Utilisateur ${email} supprimé avec succès!`);

    return Response.json({
      success: true,
      message: `Utilisateur ${email} supprimé avec succès`,
      user: userInfo,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression:", error);
    return Response.json(
      {
        error: "Erreur lors de la suppression",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
