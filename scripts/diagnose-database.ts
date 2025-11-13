#!/usr/bin/env tsx

/**
 * Script de diagnostic pour identifier les problèmes de configuration de base de données
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

console.log("🔍 Diagnostic de la configuration de base de données\n");

// Charger les variables d'environnement de .env.local
console.log("📋 Chargement de .env.local...");
config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;

console.log("🔧 Configuration trouvée:");
console.log(`   DATABASE_URL: ${databaseUrl ? "Configuré" : "Non configuré"}`);
console.log(`   SUPABASE_URL: ${supabaseUrl || "Non configuré"}`);

if (databaseUrl) {
  // Extraire les informations de l'URL
  try {
    const url = new URL(databaseUrl);
    console.log(`   🌐 Host: ${url.hostname}`);
    console.log(`   👤 User: ${url.username}`);
    console.log(`   📊 Database: ${url.pathname.slice(1)}`);
    console.log(
      `   🔒 SSL: ${url.searchParams.get("sslmode") || "non spécifié"}`,
    );
  } catch (error) {
    console.log(`   ❌ URL invalide: ${error.message}`);
  }
}

console.log("\n🧪 Test de connexion...");

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Connexion réussie !");

    // Test de comptage des sessions
    const sessionCount = await prisma.session.count();
    console.log(`📊 Sessions trouvées: ${sessionCount}`);
  } catch (error) {
    console.log("❌ Échec de la connexion");
    console.log(`   Erreur: ${error.message}`);

    if (error.message.includes("Authentication failed")) {
      console.log("\n💡 Problème d'authentification détecté:");
      console.log("   • Les identifiants Supabase sont incorrects");
      console.log("   • Le projet Supabase est peut-être en pause");
      console.log("   • Le mot de passe a peut-être été modifié");
    } else if (error.message.includes("ENOTFOUND")) {
      console.log("\n💡 Problème de réseau détecté:");
      console.log("   • Le serveur Supabase est inaccessible");
      console.log("   • Vérifiez votre connexion internet");
    }

    console.log("\n🔧 Solutions suggérées:");
    console.log("   1. Vérifiez le tableau de bord Supabase");
    console.log("   2. Régénérez le mot de passe de la base");
    console.log("   3. Vérifiez que le projet n'est pas suspendu");
    console.log("   4. Utilisez SQLite en local si nécessaire");
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
