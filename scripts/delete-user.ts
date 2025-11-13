import { prisma } from "../src/lib/prisma";

async function deleteUser() {
  const email = "redjice@gmail.com";

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
      }
    });

    if (!user) {
      console.log(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      return;
    }

    console.log(`✅ Utilisateur trouvé:`, {
      id: user.id,
      name: user.name,
      email: user.email,
      accounts: user.account.length,
      sessions: user.session.length,
      members: user.member.length,
      audit_logs: user.audit_logs.length,
      invitations: user.invitation.length,
      supabase_sync: !!user.supabase_syncs,
    });

    // Supprimer l'utilisateur (cascade delete s'occupe des relations)
    await prisma.user.delete({
      where: { email }
    });

    console.log(`✅ Utilisateur ${email} supprimé avec succès!`);
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
