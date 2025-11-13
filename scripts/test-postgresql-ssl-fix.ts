#!/usr/bin/env tsx

/**
 * Test PostgreSQL avec correction SSL
 * Résout le problème de certificat auto-signé Supabase
 */

import { config } from "dotenv";

console.log("🐘 TEST POSTGRESQL - CORRECTION SSL");
console.log("=".repeat(40));

config({ path: ".env.local" });

async function testPostgreSQLWithSSLFix() {
  console.log("\n1️⃣ Test connexion PostgreSQL avec SSL configuré...");

  try {
    const { Client } = require("pg");

    const postgresUrl =
      "postgresql://postgres.muzzgghqpspummcrwxfa:Hg0qMS7OjMC2b7OQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres";

    console.log("   🔍 Connexion à Supabase PostgreSQL avec SSL...");

    const client = new Client({
      connectionString: postgresUrl,
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
    });

    await client.connect();
    console.log("   ✅ Connexion PostgreSQL établie avec SSL");

    // Test simple
    const result = await client.query("SELECT 1 as test, NOW() as timestamp");
    console.log("   ✅ Query test réussie:", result.rows[0]);

    // Vérifier les tables existantes
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    console.log(
      "   📊 Tables existantes:",
      tablesResult.rows.map((r) => r.table_name),
    );

    await client.end();
    return {
      success: true,
      tablesCount: tablesResult.rows.length,
      tables: tablesResult.rows.map((r) => r.table_name),
    };
  } catch (error) {
    console.log(`   ❌ Erreur connexion: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createPrismaTablesInPostgreSQL() {
  console.log("\n2️⃣ Création des tables Prisma dans PostgreSQL...");

  try {
    const { Client } = require("pg");

    const postgresUrl =
      "postgresql://postgres.muzzgghqpspummcrwxfa:Hg0qMS7OjMC2b7OQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres";

    const client = new Client({
      connectionString: postgresUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();

    // Créer les tables selon le schéma Prisma
    console.log("   🔧 Création table 'user'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL,
        image TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "resendContactId" TEXT,
        "stripeCustomerId" TEXT,
        monthly_quota INTEGER DEFAULT 10,
        quota_used INTEGER DEFAULT 0,
        quota_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        company TEXT,
        subscription_tier TEXT DEFAULT 'free'
      )
    `);
    console.log("   ✅ Table 'user' créée");

    console.log("   🔧 Création table 'audits'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "audits" (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        email TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        audit_type TEXT DEFAULT 'manual',
        results_json JSONB,
        score_global INTEGER,
        score_performance INTEGER,
        score_seo INTEGER,
        score_security INTEGER,
        score_modern INTEGER,
        error_message TEXT,
        webhook_id TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        audit_results TEXT,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        org_id TEXT,
        "runId" TEXT,
        html_report TEXT,
        platform_detected TEXT,
        delivery_method TEXT,
        email_client TEXT,
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL
      )
    `);
    console.log("   ✅ Table 'audits' créée");

    // Créer les index
    console.log("   🔧 Création des index...");
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_audits_user_id ON "audits"(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_audits_webhook_id ON "audits"(webhook_id);',
      'CREATE INDEX IF NOT EXISTS idx_audits_status ON "audits"(status);',
      'CREATE INDEX IF NOT EXISTS idx_audits_created_at ON "audits"(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);',
    ];

    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
    console.log("   ✅ Index créés");

    await client.end();
    return { success: true };
  } catch (error) {
    console.log(`   ❌ Erreur création tables: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSupabaseAccessToPostgreSQLTables() {
  console.log("\n3️⃣ Test accès Supabase aux tables PostgreSQL...");

  try {
    const { createClient } = require("@supabase/supabase-js");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    console.log("   🔍 Test accès table 'user' via Supabase...");
    const { data: userData, error: userError } = await supabase
      .from("user")
      .select("id, email")
      .limit(1);

    if (userError) {
      console.log(`   ⚠️ Table 'user' via Supabase: ${userError.message}`);
    } else {
      console.log("   ✅ Supabase accède à la table 'user'");
      console.log(`   📊 Utilisateurs trouvés: ${userData?.length || 0}`);
    }

    console.log("   🔍 Test accès table 'audits' via Supabase...");
    const { data: auditData, error: auditError } = await supabase
      .from("audits")
      .select("id, email, url")
      .limit(1);

    if (auditError) {
      console.log(`   ⚠️ Table 'audits' via Supabase: ${auditError.message}`);
    } else {
      console.log("   ✅ Supabase accède à la table 'audits'");
      console.log(`   📊 Audits trouvés: ${auditData?.length || 0}`);
    }

    return { success: !userError && !auditError };
  } catch (error) {
    console.log(`   ❌ Erreur test Supabase: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSynchronizationBetweenPrismaAndSupabase() {
  console.log("\n4️⃣ Test de synchronisation Prisma ↔ Supabase PostgreSQL...");

  try {
    const { Client } = require("pg");
    const { createClient } = require("@supabase/supabase-js");

    const postgresUrl =
      "postgresql://postgres.muzzgghqpspummcrwxfa:Hg0qMS7OjMC2b7OQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres";

    // Client PostgreSQL direct
    const pgClient = new Client({
      connectionString: postgresUrl,
      ssl: { rejectUnauthorized: false },
    });

    // Client Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    await pgClient.connect();

    // Créer un utilisateur test via PostgreSQL direct
    const testUserId = `test-sync-${Date.now()}`;
    const testEmail = `sync-${testUserId}@test.com`;

    console.log("   🔧 Création utilisateur via PostgreSQL direct...");
    await pgClient.query(
      `
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
    `,
      [testUserId, "Test Sync User", testEmail, true],
    );
    console.log(`   ✅ Utilisateur créé: ${testEmail}`);

    // Vérifier via Supabase
    console.log("   🔍 Vérification via Supabase...");
    const { data: userData, error } = await supabase
      .from("user")
      .select("*")
      .eq("id", testUserId)
      .single();

    if (error) {
      console.log(
        `   ❌ Utilisateur non trouvé via Supabase: ${error.message}`,
      );
    } else {
      console.log(`   ✅ Utilisateur trouvé via Supabase: ${userData.name}`);
      console.log("   🎯 SYNCHRONISATION NATIVE CONFIRMÉE !");
    }

    // Nettoyer
    await pgClient.query('DELETE FROM "user" WHERE id = $1', [testUserId]);
    console.log("   🧹 Données de test nettoyées");

    await pgClient.end();
    return { success: !error, userData: userData || null };
  } catch (error) {
    console.log(`   ❌ Erreur test synchronisation: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function generateFinalReport(results: any[]) {
  console.log(`\n${  "=".repeat(40)}`);
  console.log("🎉 RAPPORT POSTGRESQL + SSL FIX");
  console.log("=".repeat(40));

  const allSuccess = results.every((r) => r.success);

  if (allSuccess) {
    console.log("\n🎊 CONFIGURATION POSTGRESQL RÉUSSIE !");

    console.log("\n✅ VOTRE DEMANDE RÉALISÉE :");
    console.log('   "PostgreSQL au lieu de SQLite pour compatibilité"');
    console.log('   "Synergie Prisma ↔ Supabase"');

    console.log("\n🎯 OBJECTIFS ATTEINTS :");
    console.log("   ✅ Connexion PostgreSQL Supabase réussie");
    console.log("   ✅ Tables Prisma créées dans PostgreSQL");
    console.log("   ✅ Supabase accède aux mêmes tables");
    console.log("   ✅ Synchronisation native testée");
    console.log("   ✅ Problème SSL résolu");

    console.log("\n🏗️ Architecture finale :");
    console.log("   • Prisma ↔ PostgreSQL Supabase (même base)");
    console.log("   • Supabase API ↔ Même PostgreSQL");
    console.log("   • N8N workflows ↔ Même PostgreSQL");
    console.log("   • Synchronisation automatique");

    console.log("\n🚀 PROCHAINES ÉTAPES :");
    console.log("   1. Mettre à jour .env.local avec PostgreSQL");
    console.log("   2. Migrer les données SQLite → PostgreSQL");
    console.log("   3. Tester avec `pnpm dev`");
  } else {
    console.log("\n⚠️ CONFIGURATION PARTIELLE");
    const failed = results.filter((r) => !r.success);
    console.log("\n❌ Échecs :");
    failed.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.error}`);
    });
  }

  return allSuccess;
}

async function main() {
  const results = [];

  try {
    console.log(
      "🎯 OBJECTIF : PostgreSQL + Correction SSL pour synergie Prisma ↔ Supabase\n",
    );

    // Test connexion PostgreSQL avec SSL
    const step1 = await testPostgreSQLWithSSLFix();
    results.push(step1);

    if (step1.success) {
      console.log(`\n📊 Tables existantes: ${step1.tables.join(", ")}`);

      // Créer les tables Prisma
      const step2 = await createPrismaTablesInPostgreSQL();
      results.push(step2);

      if (step2.success) {
        // Test accès Supabase
        const step3 = await testSupabaseAccessToPostgreSQLTables();
        results.push(step3);

        // Test synchronisation
        const step4 = await testSynchronizationBetweenPrismaAndSupabase();
        results.push(step4);
      }
    }

    await generateFinalReport(results);
  } catch (error) {
    console.error("\n💥 Erreur:", error.message);
  }
}

if (require.main === module) {
  main();
}
