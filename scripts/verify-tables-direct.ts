#!/usr/bin/env tsx

/**
 * Vérification directe des tables dans Supabase
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🔍 Vérification directe des tables Supabase");
  console.log("==========================================");

  try {
    // Test direct avec SQL pour lister toutes les tables
    console.log("\n📋 Liste des tables existantes:");

    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `,
    });

    if (error) {
      console.log("   ⚠️ Utilisation de méthode alternative...");
      await listTablesAlternative();
    } else {
      data.forEach((row: any) => {
        console.log(`   📄 ${row.table_name}`);
      });

      // Test d'accès direct aux tables
      console.log("\n🔍 Test d'accès direct aux tables:");
      await testDirectAccess([
        "profiles",
        "subscribers",
        "users",
        "audits",
        "user_quota",
      ]);
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

async function listTablesAlternative() {
  const expectedTables = [
    "profiles",
    "subscribers",
    "users",
    "audits",
    "user_quota",
    "pre_registrations",
  ];

  for (const tableName of expectedTables) {
    try {
      const { error } = await supabase.from(tableName).select("*").limit(0);
      if (!error) {
        console.log(`   📄 ${tableName} ✅`);
      } else {
        console.log(`   📄 ${tableName} ❌ - ${error.message}`);
      }
    } catch (err) {
      console.log(`   📄 ${tableName} ❌ - ${err.message}`);
    }
  }
}

async function testDirectAccess(tables: string[]) {
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(1);

      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName}: Accessible`);
      }
    } catch (err) {
      console.log(`   💥 ${tableName}: ${err.message}`);
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
}
