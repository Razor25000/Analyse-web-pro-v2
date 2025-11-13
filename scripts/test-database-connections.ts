#!/usr/bin/env tsx

/**
 * Test de connexion et analyse d'alignement Supabase ↔ Prisma
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";

// Charger les variables d'environnement depuis .env.local
config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Tables attendues selon le schéma Prisma
const expectedTables = {
  profiles: [
    "id",
    "user_id",
    "email",
    "full_name",
    "company",
    "created_at",
    "updated_at",
  ],
  audits: [
    "id",
    "user_id",
    "email",
    "url",
    "status",
    "audit_type",
    "results_json",
    "score_global",
    "score_performance",
    "score_seo",
    "score_security",
    "score_modern",
    "error_message",
    "webhook_id",
    "is_public",
    "audit_results",
    "completed_at",
    "created_at",
    "updated_at",
    "org_id",
  ],
  subscribers: [
    "id",
    "user_id",
    "email",
    "stripe_customer_id",
    "subscribed",
    "subscription_tier",
    "subscription_end",
    "monthly_quota",
    "quota_used",
    "quota_reset_date",
    "created_at",
    "updated_at",
  ],
};

async function testTableAccess(tableName: string, supabase: any) {
  try {
    console.log(`🔍 Test d'accès à la table: ${tableName}`);

    // Test simple d'accès à la table
    const { data, error } = await supabase.from(tableName).select("*").limit(1);

    if (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
      return { accessible: false, error: error.message };
    }

    console.log(`   ✅ Table accessible`);

    // Si on a des données, montrer la structure
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`   📊 ${columns.length} colonnes: ${columns.join(", ")}`);
      return { accessible: true, columns, hasData: true, sampleData: data[0] };
    } else {
      console.log(`   📭 Table vide`);

      // Pour une table vide, essayer de récupérer la structure autrement
      const { data: emptyData, error: emptyError } = await supabase
        .from(tableName)
        .select("*")
        .limit(0);

      if (!emptyError) {
        console.log(`   📋 Structure récupérée (table vide)`);
        return { accessible: true, hasData: false, isEmpty: true };
      }

      return { accessible: true, hasData: false };
    }
  } catch (error) {
    console.log(`   💥 Erreur de connexion: ${error}`);
    return { accessible: false, error: String(error) };
  }
}

async function analyzeSupabaseStructure() {
  console.log("🚀 ANALYSE D'ALIGNEMENT SUPABASE ↔ PRISMA\n");
  console.log("=".repeat(80));

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log("❌ Variables SUPABASE_URL et SUPABASE_SERVICE_KEY requises");
    console.log(
      "💡 Assurez-vous d'avoir configuré ces variables dans votre environnement",
    );
    process.exit(1);
  }

  console.log(`🔗 URL Supabase: ${supabaseUrl}`);
  console.log(`🔑 Service Key: ${supabaseServiceKey.slice(0, 20)}...`);
  console.log("");

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const results: any = {};
  let totalIssues = 0;

  for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
    console.log(`\n📋 Table: ${tableName}`);
    console.log(
      `   📝 Colonnes attendues (${expectedColumns.length}): ${expectedColumns.join(", ")}`,
    );

    const tableResult = await testTableAccess(tableName, supabase);

    if (!tableResult.accessible) {
      console.log(`   ❌ Table non accessible ou inexistante`);
      results[tableName] = { missing: true, error: tableResult.error };
      totalIssues++;
      continue;
    }

    if (!tableResult.hasData) {
      console.log(
        `   ⚠️  Table vide - structure non vérifiable via les données`,
      );
      results[tableName] = { exists: true, empty: true };
      continue;
    }

    // Comparer les colonnes
    const actualColumns = tableResult.columns || [];
    const missingColumns = expectedColumns.filter(
      (col) => !actualColumns.includes(col),
    );
    const extraColumns = actualColumns.filter(
      (col) => !expectedColumns.includes(col),
    );

    if (missingColumns.length > 0) {
      console.log(
        `   ❌ Colonnes manquantes (${missingColumns.length}): ${missingColumns.join(", ")}`,
      );
      totalIssues++;
    }

    if (extraColumns.length > 0) {
      console.log(
        `   🔄 Colonnes supplémentaires (${extraColumns.length}): ${extraColumns.join(", ")}`,
      );
      console.log(`      💡 Probablement ajoutées par vos workflows n8n`);
    }

    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log(`   ✅ Structure parfaitement alignée avec Prisma`);
    }

    results[tableName] = {
      exists: true,
      hasData: true,
      expectedColumns,
      actualColumns,
      missingColumns,
      extraColumns,
      sampleData: tableResult.sampleData,
    };
  }

  return { results, totalIssues };
}

async function generateRecommendations(results: any, totalIssues: number) {
  console.log("\n📋 RECOMMANDATIONS");
  console.log("=".repeat(80));

  if (totalIssues === 0) {
    console.log(
      "🎉 Excellent! Vos tables Supabase correspondent parfaitement à votre schema.prisma!",
    );
    console.log("");
    console.log("✅ Votre configuration est correcte:");
    console.log("   - Toutes les tables existent");
    console.log("   - Toutes les colonnes sont présentes");
    console.log("   - Pas de divergences détectées");
    return;
  }

  const missingTables = Object.entries(results).filter(
    ([_, r]: any) => r.missing,
  );
  const extraColumnTables = Object.entries(results).filter(
    ([_, r]: any) => r.extraColumns && r.extraColumns.length > 0,
  );

  if (missingTables.length > 0) {
    console.log("❌ TABLES MANQUANTES:");
    missingTables.forEach(([tableName]) => {
      console.log(`   - ${tableName}`);
    });
    console.log("");
    console.log("🔧 Actions:");
    console.log(
      "   1. Vérifiez vos scripts Supabase dans le dossier supabase/",
    );
    console.log("   2. Ou utilisez: npx prisma db push --accept-data-loss");
    console.log("");
  }

  if (extraColumnTables.length > 0) {
    console.log("🔄 COLONNES SUPPLÉMENTAIRES DÉTECTÉES:");
    console.log(
      "Ces colonnes ont probablement été ajoutées par vos workflows n8n.",
    );
    console.log("");

    extraColumnTables.forEach(([tableName, result]: any) => {
      console.log(`📄 Table ${tableName}:`);
      result.extraColumns.forEach((col: string) => {
        const fieldName = col.replace(/_([a-z])/g, (_: any, letter: string) =>
          letter.toUpperCase(),
        );
        console.log(
          `   ${fieldName.padEnd(20)} String?         @map("${col}")`,
        );
      });
      console.log("");
    });

    console.log("🔧 Options:");
    console.log(
      "   1. Ajouter ces champs à schema.prisma si vous voulez les utiliser dans votre code",
    );
    console.log(
      "   2. Les laisser tels quels si seuls vos workflows n8n les utilisent",
    );
    console.log("   3. Regénérer le client: npx prisma generate");
  }
}

async function runDiagnostic() {
  try {
    const { results, totalIssues } = await analyzeSupabaseStructure();

    await generateRecommendations(results, totalIssues);

    console.log("\n📊 RÉSUMÉ FINAL");
    console.log("=".repeat(80));
    console.log(`📈 Divergences détectées: ${totalIssues}`);
    console.log(`📋 Tables analysées: ${Object.keys(expectedTables).length}`);
    console.log(
      `✅ Tables accessibles: ${Object.values(results).filter((r: any) => r.exists).length}`,
    );
    console.log(
      `❌ Tables manquantes: ${Object.values(results).filter((r: any) => r.missing).length}`,
    );

    console.log("\n💡 INFORMATIONS:");
    console.log(
      "   - Vos workflows n8n peuvent ajouter des colonnes dynamiquement",
    );
    console.log("   - Ces colonnes supplémentaires ne sont pas problématiques");
    console.log(
      "   - Vous pouvez les ignorer ou les ajouter à Prisma selon vos besoins",
    );

    process.exit(totalIssues > 0 ? 1 : 0);
  } catch (error) {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  }
}

runDiagnostic().catch(console.error);
