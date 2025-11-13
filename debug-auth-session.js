#!/usr/bin/env node

// Script de débogage pour analyser l'état de Better Auth
const { PrismaClient } = require("@prisma/client");

console.log("🔍 Débogage de l'état de Better Auth...\n");

async function debugAuth() {
  const prisma = new PrismaClient();

  try {
    // 1. Vérifier la connexion à la base de données
    console.log("=== TEST 1: Connexion base de données ===");
    await prisma.$connect();
    console.log("✅ Connexion PostgreSQL réussie");

    // 2. Vérifier les tables Better Auth
    console.log("\n=== TEST 2: Tables Better Auth ===");
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Table 'user': ${userCount} utilisateurs`);
    } catch (error) {
      console.log(`❌ Table 'user': ${error.message}`);
    }

    try {
      const sessionCount = await prisma.session.count();
      console.log(`✅ Table 'session': ${sessionCount} sessions`);
    } catch (error) {
      console.log(`❌ Table 'session': ${error.message}`);
    }

    try {
      const accountCount = await prisma.account.count();
      console.log(`✅ Table 'account': ${accountCount} comptes`);
    } catch (error) {
      console.log(`❌ Table 'account': ${error.message}`);
    }

    // 3. Lister les utilisateurs existants
    console.log("\n=== TEST 3: Utilisateurs existants ===");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
      take: 5,
    });

    if (users.length > 0) {
      console.log("👥 Utilisateurs trouvés:");
      users.forEach((user, index) => {
        console.log(
          `   ${index + 1}. ${user.email} (${user.name || "Nom non défini"})`,
        );
        console.log(
          `      - Email vérifié: ${user.emailVerified ? "✅ Oui" : "❌ Non"}`,
        );
        console.log(`      - Créé le: ${user.createdAt}`);
      });
    } else {
      console.log("❌ Aucun utilisateur trouvé dans la base de données");
      console.log("   → Ceci explique pourquoi l'authentification échoue !");
    }

    // 4. Lister les sessions actives
    console.log("\n=== TEST 4: Sessions actives ===");
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        createdAt: true,
      },
      where: {
        expiresAt: {
          gt: new Date(), // Sessions non expirées
        },
      },
      take: 5,
    });

    if (sessions.length > 0) {
      console.log("🔐 Sessions actives trouvées:");
      sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. Session ${session.id}`);
        console.log(`      - User ID: ${session.userId}`);
        console.log(`      - Expire le: ${session.expiresAt}`);
      });
    } else {
      console.log("❌ Aucune session active trouvée");
      console.log("   → Normal si aucun utilisateur n'est connecté");
    }

    // 5. Vérifier le schéma des tables
    console.log("\n=== TEST 5: Structure des tables ===");
    try {
      const tableInfo = await prisma.$queryRaw`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('User', 'Session', 'Account', 'user', 'session', 'account')
        ORDER BY table_name, ordinal_position;
      `;

      if (tableInfo.length > 0) {
        console.log("📋 Structure des tables:");
        console.log(tableInfo);
      } else {
        console.log("❌ Aucune table Better Auth trouvée");
      }
    } catch (error) {
      console.log(`❌ Erreur structure: ${error.message}`);
    }
  } catch (error) {
    console.log(`❌ Erreur globale: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function testBetterAuthConfig() {
  console.log("\n=== TEST 6: Configuration Better Auth ===");

  try {
    // Simuler un appel Better Auth sans session
    console.log("🔄 Test de base de Better Auth...");

    // Vérifier les variables d'environnement critiques
    console.log("\n📋 Variables d'environnement:");
    console.log(
      `   - BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL || "❌ Manquant"}`,
    );
    console.log(
      `   - BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? "✅ Défini" : "❌ Manquant"}`,
    );
    console.log(
      `   - DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Défini (PostgreSQL)" : "❌ Manquant"}`,
    );
  } catch (error) {
    console.log(`❌ Erreur configuration: ${error.message}`);
  }
}

async function main() {
  await debugAuth();
  await testBetterAuthConfig();

  console.log("\n=== DIAGNOSTIC ===");
  console.log(
    "1. Si aucun utilisateur n'existe → Problème de création de compte",
  );
  console.log("2. Si les tables manquent → Problème de migration Prisma");
  console.log(
    "3. Si les sessions sont vides → Problème de connexion/authentification",
  );
  console.log("4. Si la config est incorrecte → Problème d'environnement");
  console.log("\n✅ Débogage terminé");
}

main().catch(console.error);
