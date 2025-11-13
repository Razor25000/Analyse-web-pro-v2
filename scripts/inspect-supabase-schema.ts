#!/usr/bin/env tsx

/**
 * Inspection du schéma Supabase pour comprendre la structure réelle des tables
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

console.log("🔍 INSPECTION DU SCHÉMA SUPABASE");
console.log("=".repeat(40));

config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function inspectTablesStructure() {
  console.log("\n📋 Structure des tables Supabase...");

  try {
    // Lister toutes les tables
    const { data: tables, error } = await supabase.rpc("get_tables_info");

    if (error) {
      // Fallback: essayer de récupérer des métadonnées différemment
      console.log(
        "⚠️ RPC get_tables_info non disponible, utilisation d'approche alternative",
      );

      // Tester l'existence et la structure de la table audits
      const { data: auditsData, error: auditsError } = await supabase
        .from("audits")
        .select("*")
        .limit(1);

      if (auditsError) {
        console.log(`❌ Erreur table audits: ${auditsError.message}`);

        // Essayer d'autres noms possibles
        const alternativeNames = ["audit", "user_audits", "website_audits"];

        for (const tableName of alternativeNames) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select("*")
              .limit(1);

            if (!error) {
              console.log(`✅ Table trouvée: ${tableName}`);
              console.log(
                `   Colonnes détectées:`,
                Object.keys(data?.[0] || {}),
              );
            }
          } catch (e) {
            // Ignorer les erreurs de tables inexistantes
          }
        }
      } else {
        console.log(`✅ Table 'audits' trouvée`);
        if (auditsData && auditsData.length > 0) {
          const columns = Object.keys(auditsData[0]);
          console.log(`   Colonnes disponibles (${columns.length}):`, columns);

          // Analyser les types de données
          const sample = auditsData[0];
          console.log("\n📊 Échantillon de données:");
          for (const [key, value] of Object.entries(sample)) {
            const type = typeof value;
            const preview =
              typeof value === "string" && value.length > 50
                ? `${value.substring(0, 50)  }...`
                : value;
            console.log(`   ${key}: ${type} = ${preview}`);
          }
        } else {
          console.log("   ⚠️ Table vide, impossible de détecter les colonnes");
        }
      }
    } else {
      console.log("✅ Métadonnées des tables récupérées:", tables);
    }
  } catch (error) {
    console.log(`❌ Erreur d'inspection: ${error.message}`);
  }
}

async function checkUsersTables() {
  console.log("\n👥 Vérification des tables utilisateurs...");

  const userTableNames = ["users", "profiles", "auth_users", "user_profiles"];

  for (const tableName of userTableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(1);

      if (!error) {
        console.log(`✅ Table trouvée: ${tableName}`);
        if (data && data.length > 0) {
          console.log(`   Colonnes:`, Object.keys(data[0]));
        }
      }
    } catch (e) {
      // Ignorer
    }
  }
}

async function testDirectQueries() {
  console.log("\n🔧 Test de requêtes directes...");

  // Test 1: Requête simple sur audits
  try {
    const { count, error } = await supabase
      .from("audits")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`❌ Erreur comptage audits: ${error.message}`);
    } else {
      console.log(`✅ Table audits: ${count} entrées`);
    }
  } catch (e) {
    console.log(`❌ Erreur test audits: ${e.message}`);
  }

  // Test 2: Insertion basique pour voir l'erreur exacte
  try {
    const { data, error } = await supabase
      .from("audits")
      .insert({
        url: "https://test-schema.example.com",
        status: "pending",
      })
      .select();

    if (error) {
      console.log(`❌ Erreur insertion test: ${error.message}`);
      console.log(`   Code erreur: ${error.code}`);
      console.log(`   Détails: ${error.details}`);
    } else {
      console.log(`✅ Insertion test réussie:`, data);
    }
  } catch (e) {
    console.log(`❌ Erreur insertion: ${e.message}`);
  }
}

async function analyzePrismaSupabaseMismatch() {
  console.log("\n🔀 Analyse des différences Prisma ↔ Supabase...");

  // Colonnes attendues par Prisma
  const prismaAuditColumns = [
    "id",
    "userId",
    "email",
    "url",
    "status",
    "auditType",
    "resultsJson",
    "scoreGlobal",
    "scorePerformance",
    "scoreSeo",
    "scoreSecurity",
    "scoreModern",
    "errorMessage",
    "webhookId",
    "isPublic",
    "auditResults",
    "completedAt",
    "createdAt",
    "updatedAt",
    "orgId",
    "runId",
    "htmlReport",
    "platformDetected",
    "deliveryMethod",
    "emailClient",
  ];

  console.log(`📝 Colonnes Prisma attendues (${prismaAuditColumns.length}):`);
  console.log(prismaAuditColumns.join(", "));

  // Tenter de récupérer la structure réelle de Supabase
  try {
    const { data: sampleData, error } = await supabase
      .from("audits")
      .select("*")
      .limit(1);

    if (!error && sampleData && sampleData.length > 0) {
      const supabaseColumns = Object.keys(sampleData[0]);
      console.log(
        `\n📊 Colonnes Supabase réelles (${supabaseColumns.length}):`,
      );
      console.log(supabaseColumns.join(", "));

      // Trouver les différences
      const missingInSupabase = prismaAuditColumns.filter(
        (col) => !supabaseColumns.includes(col),
      );
      const extraInSupabase = supabaseColumns.filter(
        (col) => !prismaAuditColumns.includes(col),
      );

      if (missingInSupabase.length > 0) {
        console.log(`\n❌ Manquantes dans Supabase:`, missingInSupabase);
      }

      if (extraInSupabase.length > 0) {
        console.log(`\n➕ Supplémentaires dans Supabase:`, extraInSupabase);
      }

      if (missingInSupabase.length === 0 && extraInSupabase.length === 0) {
        console.log(`\n✅ Schémas parfaitement alignés !`);
      }
    }
  } catch (e) {
    console.log(`❌ Impossible d'analyser les différences: ${e.message}`);
  }
}

async function main() {
  try {
    await inspectTablesStructure();
    await checkUsersTables();
    await testDirectQueries();
    await analyzePrismaSupabaseMismatch();

    console.log(`\n${  "=".repeat(40)}`);
    console.log("✅ INSPECTION TERMINÉE");
  } catch (error) {
    console.error("💥 Erreur d'inspection:", error);
  }
}

if (require.main === module) {
  main();
}
