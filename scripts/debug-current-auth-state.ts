import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugAuthState() {
  console.log("\n=== DEBUG: État actuel de l'authentification ===\n");

  try {
    // Check users
    const users = await prisma.user.findMany({
      include: {
        sessions: true,
        quota: true,
        subscriptions: true,
      },
    });

    console.log(`Utilisateurs trouvés: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. Utilisateur:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nom: ${user.name}`);
      console.log(`   Sessions actives: ${user.sessions.length}`);
      console.log(
        `   Quota: ${user.quota ? `${user.quota.auditsUsed}/${user.quota.auditsLimit}` : "Aucun"}`,
      );
      console.log(`   Abonnements: ${user.subscriptions.length}`);
      console.log(`   Créé: ${user.createdAt}`);
    });

    // Check sessions
    const activeSessions = await prisma.session.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`\nSessions actives: ${activeSessions.length}`);
    activeSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. Session:`);
      console.log(`   Token: ${session.token.substring(0, 20)}...`);
      console.log(`   Utilisateur: ${session.user.email}`);
      console.log(`   Expire: ${session.expiresAt}`);
      console.log(`   IP: ${session.ipAddress || "N/A"}`);
    });
  } catch (error) {
    console.error("Erreur lors du debug:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuthState();
