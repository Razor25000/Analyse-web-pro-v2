import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteUser() {
  const email = "redjice@gmail.com";

  console.log(`🔍 Recherche de l'utilisateur: ${email}...`);

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
      console.log(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      console.log(`✅ L'email est libre, vous pouvez créer un nouveau compte !`);
      process.exit(0);
    }

    console.log(`\n✅ Utilisateur trouvé:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Nom: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Créé le: ${user.createdAt}`);
    console.log(`\n📊 Relations:`);
    console.log(`   - Comptes OAuth: ${user.account.length}`);
    console.log(`   - Sessions: ${user.session.length}`);
    console.log(`   - Organisations (membre): ${user.member.length}`);
    console.log(`   - Logs d'audit: ${user.audit_logs.length}`);
    console.log(`   - Invitations: ${user.invitation.length}`);
    console.log(`   - Feedbacks: ${user.Feedback.length}`);
    console.log(`   - Sync Supabase: ${user.supabase_syncs ? "Oui" : "Non"}`);

    console.log(`\n🗑️  Suppression en cours...`);

    // Supprimer l'utilisateur (cascade delete s'occupe des relations)
    await prisma.user.delete({
      where: { email },
    });

    console.log(`\n✅ Utilisateur ${email} supprimé avec succès!`);
    console.log(`✅ Vous pouvez maintenant recréer un compte avec cet email.`);
  } catch (error) {
    console.error(`\n❌ Erreur lors de la suppression:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
