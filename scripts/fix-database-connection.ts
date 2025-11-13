#!/usr/bin/env tsx

/**
 * Script pour corriger la connexion base de données
 */

import { PrismaClient } from "@prisma/client";

async function testDatabaseConnection() {
  console.log("🔍 Test de connexion à la base de données...\n");

  const currentDbUrl = process.env.DATABASE_URL;
  console.log("📊 URL actuelle:", `${currentDbUrl?.substring(0, 50)}...`);

  try {
    const prisma = new PrismaClient();

    // Test de connexion simple
    console.log("🔄 Test de connexion...");
    await prisma.$connect();
    console.log("✅ Connexion réussie !");

    // Test d'une requête simple
    console.log("🔄 Test d'une requête...");
    const userCount = await prisma.user.count();
    console.log(`✅ Nombre d'utilisateurs: ${userCount}`);

    await prisma.$disconnect();

    return { success: true, userCount };
  } catch (error: any) {
    console.error("❌ Erreur de connexion:", error.message);

    if (error.message.includes("Authentication failed")) {
      console.log("\n🔧 SOLUTION SUGGÉRÉE:");
      console.log("1. Les credentials PostgreSQL ont probablement expiré");
      console.log("2. Vérifiez votre projet Supabase");
      console.log("3. Ou utilisez SQLite pour le développement local");
    }

    return { success: false, error: error.message };
  }
}

async function createSQLiteConfig() {
  console.log(
    "\n🔄 Création d'une configuration SQLite pour le développement...",
  );

  const sqliteConfig = `
# Configuration SQLite pour développement local
DATABASE_URL="file:./dev.db"
DATABASE_URL_UNPOOLED="file:./dev.db"
`;

  console.log("📝 Configuration SQLite suggérée:");
  console.log(sqliteConfig);

  console.log("💡 Pour utiliser SQLite:");
  console.log("1. Remplacez DATABASE_URL dans .env.local");
  console.log("2. Exécutez: npx prisma db push");
  console.log("3. Exécutez: npx prisma generate");
}

async function main() {
  console.log("🔧 DIAGNOSTIC ET CORRECTION BASE DE DONNÉES\n");
  console.log("=".repeat(50));

  const result = await testDatabaseConnection();

  if (!result.success) {
    await createSQLiteConfig();

    console.log("\n📋 ACTIONS RECOMMANDÉES:");
    console.log("1. Utiliser SQLite en local pour continuer le développement");
    console.log("2. Ou corriger les credentials Supabase/PostgreSQL");
    console.log("3. Puis relancer le serveur de développement");
  } else {
    console.log("\n🎉 Base de données opérationnelle !");
    console.log(`📊 ${result.userCount} utilisateur(s) en base`);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Erreur:", error);
      process.exit(1);
    });
}
