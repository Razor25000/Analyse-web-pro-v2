#!/usr/bin/env tsx

/**
 * Test différents formats de connexion PostgreSQL Supabase
 */

import { config } from "dotenv";

console.log("🔐 TEST CREDENTIALS POSTGRESQL SUPABASE");
console.log("=".repeat(45));

config({ path: ".env.local" });

async function testConnectionString(connectionString: string, label: string) {
  console.log(`\n🔍 Test: ${label}`);
  console.log(`   📋 URL: ${connectionString.replace(/:[^:]+@/, ":****@")}`);

  try {
    const { Client } = require("pg");

    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();
    console.log("   ✅ Connexion réussie");

    const result = await client.query(
      "SELECT 1 as test, current_database() as db",
    );
    console.log("   ✅ Test query:", result.rows[0]);

    await client.end();
    return { success: true, connectionString };
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSupabaseCredentials() {
  console.log("\n📋 INFORMATIONS SUPABASE CONFIGURÉES:");
  console.log(`   URL: ${process.env.SUPABASE_URL}`);
  console.log(
    `   Service Key: ${process.env.SUPABASE_SERVICE_KEY?.substring(0, 20)}...`,
  );

  // Extraire les informations de l'URL Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    console.log("   ❌ SUPABASE_URL non trouvé");
    return [];
  }

  const projectId = supabaseUrl
    .replace("https://", "")
    .replace(".supabase.co", "");
  console.log(`   Project ID: ${projectId}`);

  // Test différents formats de connexion PostgreSQL
  const connectionStrings = [
    // Format 1: Pooler avec différents utilisateurs
    `postgresql://postgres.${projectId}:Hg0qMS7OjMC2b7OQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres`,

    // Format 2: Direct database connection
    `postgresql://postgres:Hg0qMS7OjMC2b7OQ@db.${projectId}.supabase.co:5432/postgres`,

    // Format 3: Avec différent mot de passe
    `postgresql://postgres.${projectId}:CNDEdJ9xEz6oTVm0@aws-1-eu-west-3.pooler.supabase.com:5432/postgres`,

    // Format 4: Avec utilisateur postgres
    `postgresql://postgres:CNDEdJ9xEz6oTVm0@db.${projectId}.supabase.co:5432/postgres`,

    // Format 5: Service role token (peut parfois marcher)
    `postgresql://service_role:${process.env.SUPABASE_SERVICE_KEY}@db.${projectId}.supabase.co:5432/postgres`,
  ];

  const results = [];

  for (let i = 0; i < connectionStrings.length; i++) {
    const result = await testConnectionString(
      connectionStrings[i],
      `Format ${i + 1}`,
    );
    results.push(result);

    if (result.success) {
      console.log("\n🎉 CONNEXION TROUVÉE !");
      break;
    }
  }

  return results;
}

async function testSupabaseAPIStillWorks() {
  console.log("\n🔍 Vérification que l'API Supabase fonctionne toujours...");

  try {
    const { createClient } = require("@supabase/supabase-js");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Test simple
    const { data, error } = await supabase.from("audits").select("id").limit(1);

    if (
      error &&
      !error.message.includes("relation") &&
      !error.message.includes("does not exist")
    ) {
      console.log(`   ❌ API Supabase: ${error.message}`);
      return false;
    } else {
      console.log("   ✅ API Supabase fonctionnelle");
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Erreur API: ${error.message}`);
    return false;
  }
}

async function generateCredentialsReport(results: any[]) {
  console.log(`\n${  "=".repeat(45)}`);
  console.log("📋 RAPPORT DES CREDENTIALS");
  console.log("=".repeat(45));

  const successfulConnection = results.find((r) => r.success);

  if (successfulConnection) {
    console.log("\n🎉 CONNEXION POSTGRESQL TROUVÉE !");
    console.log(`   📋 String qui fonctionne:`);
    console.log(
      `   ${successfulConnection.connectionString.replace(/:[^:]+@/, ":****@")}`,
    );

    console.log("\n🚀 PROCHAINES ÉTAPES :");
    console.log("   1. Mettre à jour .env.local avec cette URL");
    console.log("   2. Configurer Prisma avec PostgreSQL");
    console.log("   3. Créer les tables");
  } else {
    console.log("\n❌ AUCUNE CONNEXION POSTGRESQL TROUVÉE");
    console.log("\n🔍 SOLUTIONS POSSIBLES :");
    console.log("   1. Vérifier les credentials dans Supabase Dashboard");
    console.log("   2. Régénérer le mot de passe de la base");
    console.log("   3. Utiliser une approche API-only avec Supabase");
    console.log("   4. Créer une nouvelle instance Supabase");

    console.log("\n⚡ ALTERNATIVE :");
    console.log("   Continuer avec SQLite + Bridge Supabase optimisé");
  }

  return successfulConnection;
}

async function main() {
  try {
    // Test API Supabase d'abord
    const apiWorks = await testSupabaseAPIStillWorks();

    if (!apiWorks) {
      console.log("\n❌ L'API Supabase ne fonctionne plus. Vérifiez les clés.");
      return;
    }

    // Test des différents formats de connexion
    const results = await testSupabaseCredentials();

    // Générer le rapport
    await generateCredentialsReport(results);
  } catch (error) {
    console.error("\n💥 Erreur:", error.message);
  }
}

if (require.main === module) {
  main();
}
