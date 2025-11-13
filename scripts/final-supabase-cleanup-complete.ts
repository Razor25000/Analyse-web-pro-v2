#!/usr/bin/env tsx

/**
 * Nettoyage Complet et Final Supabase
 * Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Analyser et nettoyer Supabase intelligemment
 */

import { supabaseAdmin } from "@/lib/supabase";

console.log("🧹 Nettoyage Final Supabase v2.0");
console.log("=".repeat(40));

async function listCurrentTables(): Promise<string[]> {
  console.log("\n1️⃣ Analyse des tables actuelles...");

  try {
    // Utiliser la requête SQL directe via REST API
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql: `
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
              AND table_name NOT LIKE 'pg_%'
              AND table_name NOT LIKE 'sql_%'
            ORDER BY table_name;
          `,
        }),
      },
    );

    if (!response.ok) {
      console.log("📋 Utilisation de méthode alternative...");

      // Essayer de lister les tables connues une par une
      const knownTables = [
        "audits",
        "user",
        "user_quota",
        "feedback",
        "account",
        "batch_jobs",
        "payment_history",
        "reports",
        "session",
        "subscription",
        "user_preferences",
        "verification",
      ];

      const existingTables: string[] = [];

      for (const table of knownTables) {
        try {
          const { error } = await supabaseAdmin!
            .from(table)
            .select("*", { count: "exact", head: true });

          if (!error) {
            existingTables.push(table);
            console.log(`   ✅ ${table} - existe`);
          } else {
            console.log(`   ❌ ${table} - n'existe pas`);
          }
        } catch (e) {
          console.log(`   ❌ ${table} - erreur d'accès`);
        }
      }

      return existingTables;
    }

    const data = await response.json();
    const tables = data.map((row: any) => row.table_name);

    console.log("📊 Tables trouvées:");
    tables.forEach((table: string) => {
      console.log(`   📋 ${table}`);
    });

    return tables;
  } catch (error) {
    console.error("❌ Erreur listage tables:", error);
    return [];
  }
}

async function analyzeTableUsage(tables: string[]): Promise<{
  needed: string[];
  unused: string[];
}> {
  console.log("\n2️⃣ Analyse utilisation tables...");

  // Tables utilisées par les workflows n8n (basé sur notre analyse)
  const workflowTables = ["audits", "user", "user_quota"];

  const needed = tables.filter((table) => workflowTables.includes(table));
  const unused = tables.filter((table) => !workflowTables.includes(table));

  console.log("\n✅ TABLES NÉCESSAIRES (utilisées par workflows):");
  needed.forEach((table) => console.log(`   📋 ${table}`));

  console.log("\n❌ TABLES INUTILES (non utilisées):");
  unused.forEach((table) => console.log(`   🗑️ ${table}`));

  return { needed, unused };
}

async function getTableRecordCounts(
  tables: string[],
): Promise<Record<string, number>> {
  console.log("\n3️⃣ Comptage enregistrements...");

  const counts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabaseAdmin!
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`   ❌ ${table}: erreur (${error.message})`);
        counts[table] = -1;
      } else {
        console.log(`   📊 ${table}: ${count || 0} enregistrements`);
        counts[table] = count || 0;
      }
    } catch (error) {
      console.log(`   ❌ ${table}: exception`);
      counts[table] = -1;
    }
  }

  return counts;
}

async function checkTableStructure(tableName: string): Promise<boolean> {
  console.log(`\n🔍 Vérification structure ${tableName}...`);

  try {
    // Test simple d'accès à la table
    const { data, error } = await supabaseAdmin!
      .from(tableName)
      .select("*")
      .limit(1);

    if (error) {
      console.log(`   ❌ Erreur accès: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Table accessible (${data?.length || 0} sample)`);
    return true;
  } catch (error) {
    console.log(`   ❌ Exception: ${error}`);
    return false;
  }
}

async function recommendCleanupActions(
  unused: string[],
  counts: Record<string, number>,
) {
  console.log("\n4️⃣ Recommandations de nettoyage...");

  let totalRecordsToDelete = 0;
  const safeTables: string[] = [];
  const riskyTables: string[] = [];

  unused.forEach((table) => {
    const count = counts[table];

    if (count === 0) {
      safeTables.push(table);
      console.log(`   🟢 ${table}: SÛRE À SUPPRIMER (0 enregistrements)`);
    } else if (count > 0) {
      riskyTables.push(table);
      totalRecordsToDelete += count;
      console.log(`   🟡 ${table}: CONTIENT ${count} enregistrements`);
    } else {
      console.log(`   🔴 ${table}: INACCESSIBLE (erreur)`);
    }
  });

  console.log("\n📋 RÉSUMÉ NETTOYAGE:");
  console.log(`   🟢 Tables vides à supprimer: ${safeTables.length}`);
  console.log(`   🟡 Tables avec données: ${riskyTables.length}`);
  console.log(
    `   📊 Total enregistrements à supprimer: ${totalRecordsToDelete}`,
  );

  return { safeTables, riskyTables, totalRecordsToDelete };
}

async function generateCleanupSQL(safeTables: string[], riskyTables: string[]) {
  console.log("\n5️⃣ Génération script SQL...");

  const sql = [
    "-- ===================================================================",
    "-- Script de Nettoyage Supabase - Architecture Dual Database v2.0",
    "-- ===================================================================",
    "",
    "-- ÉTAPE 1: Tables vides (suppression sûre)",
    "-- =========================================",
  ];

  safeTables.forEach((table) => {
    sql.push(`DROP TABLE IF EXISTS public.${table} CASCADE; -- Vide`);
  });

  if (riskyTables.length > 0) {
    sql.push(
      "",
      "-- ÉTAPE 2: Tables avec données (ATTENTION)",
      "-- =========================================",
    );
    riskyTables.forEach((table) => {
      sql.push(
        `-- DROP TABLE IF EXISTS public.${table} CASCADE; -- CONTIENT DES DONNÉES`,
      );
    });
  }

  sql.push(
    "",
    "-- ÉTAPE 3: Vérification des tables restantes",
    "-- ============================================",
    "SELECT table_name FROM information_schema.tables",
    "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    "ORDER BY table_name;",
    "",
    "-- TABLES CONSERVÉES POUR WORKFLOWS N8N:",
    "-- ✅ audits (table principale)",
    "-- ✅ user (Formulaire Offre 1)",
    "-- ✅ user_quota (Formulaire Offre 1)",
  );

  const sqlContent = sql.join("\n");
  console.log("\n📄 Script généré:");
  console.log("=".repeat(50));
  console.log(sqlContent);
  console.log("=".repeat(50));

  return sqlContent;
}

async function main() {
  console.log("🎯 Analyse complète Supabase pour nettoyage");
  console.log("Architecture Dual Database v2.0\n");

  // Étape 1: Lister tables actuelles
  const tables = await listCurrentTables();

  if (tables.length === 0) {
    console.error("💥 Aucune table trouvée - impossible de continuer");
    return;
  }

  // Étape 2: Analyser utilisation
  const { needed, unused } = await analyzeTableUsage(tables);

  // Étape 3: Compter enregistrements
  const counts = await getTableRecordCounts(tables);

  // Étape 4: Vérifier structure tables nécessaires
  console.log("\n🔧 Vérification tables nécessaires...");
  for (const table of needed) {
    await checkTableStructure(table);
  }

  // Étape 5: Recommandations
  const { safeTables, riskyTables, totalRecordsToDelete } =
    await recommendCleanupActions(unused, counts);

  // Étape 6: Générer script
  const sqlScript = await generateCleanupSQL(safeTables, riskyTables);

  // Résumé final
  console.log(`\n${  "=".repeat(60)}`);
  console.log("🎯 RÉSUMÉ ANALYSE SUPABASE");
  console.log("=".repeat(60));

  console.log(`\n📊 STATISTIQUES:`);
  console.log(`   📋 Total tables: ${tables.length}`);
  console.log(
    `   ✅ Tables nécessaires: ${needed.length} (${needed.join(", ")})`,
  );
  console.log(`   ❌ Tables inutiles: ${unused.length}`);
  console.log(`   🟢 Suppression sûre: ${safeTables.length} tables`);
  console.log(`   🟡 Suppression risquée: ${riskyTables.length} tables`);
  console.log(`   📊 Enregistrements affectés: ${totalRecordsToDelete}`);

  console.log(`\n🎯 PROCHAINES ÉTAPES:`);
  console.log(`   1. Exécuter le script SQL généré ci-dessus`);
  console.log(`   2. Vérifier que les workflows n8n fonctionnent`);
  console.log(`   3. Appliquer les optimisations d'index`);

  if (riskyTables.length > 0) {
    console.log(`\n⚠️  ATTENTION:`);
    console.log(`   ${riskyTables.length} tables contiennent des données`);
    console.log(`   Vérifiez leur contenu avant suppression`);
  }

  console.log(`\n✅ ARCHITECTURE DUAL v2.0 PRÊTE`);
  console.log(`   Supabase optimisé pour workflows n8n`);
  console.log(`   Prisma reste la source de vérité`);
}

main().catch((error) => {
  console.error("💥 Erreur fatale analyse:", error);
  process.exit(1);
});
