// Script pour tester la connexion à la base de données
import { config } from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@/generated/prisma";

async function testDatabaseConnection() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Test de connexion à la base de données...");
    console.log(
      "DATABASE_URL:",
      `${process.env.DATABASE_URL?.substring(0, 20)}...`,
    );

    // Test de connexion
    await prisma.$connect();
    console.log("✅ Connexion réussie !");

    // Vérifier les tables existantes
    const userCount = await prisma.user.count();
    console.log(`📊 Nombre d'utilisateurs : ${userCount}`);

    try {
      const quotaCount = await prisma.userQuota.count();
      console.log(`📊 Nombre de quotas : ${quotaCount}`);
    } catch (error) {
      console.log(
        "⚠️ Table UserQuota pas encore créée (normal si migration récente)",
      );
    }

    // Informations sur la base
    const result =
      await prisma.$queryRaw`SELECT version(), current_database(), current_user`;
    console.log("📋 Infos base de données:", result);
  } catch (error) {
    console.error("❌ Erreur de connexion:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testDatabaseConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
