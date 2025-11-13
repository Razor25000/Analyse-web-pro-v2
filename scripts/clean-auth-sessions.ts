import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanAuthSessions() {
  console.log("🧹 Nettoyage des sessions et données de test...\n");

  try {
    // Delete all sessions
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`✅ ${deletedSessions.count} sessions supprimées`);

    // Delete all test users and their related data
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ ${deletedUsers.count} utilisateurs supprimés`);

    console.log("\n✨ Base de données nettoyée avec succès !");
    console.log("Vous pouvez maintenant tester un nouveau signup proprement.");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAuthSessions();
