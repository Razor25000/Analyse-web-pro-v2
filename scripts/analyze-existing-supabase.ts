#!/usr/bin/env tsx

/**
 * Analyse de la base Supabase existante
 *
 * Ce script :
 * 1. Se connecte à votre Supabase existante
 * 2. Analyse les tables et colonnes présentes
 * 3. Compare avec le schéma Prisma actuel
 * 4. Génère un plan de synchronisation
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";

// Charger les variables d'environnement depuis .env.local
config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variables SUPABASE_URL et SUPABASE_SERVICE_KEY requises");
  console.log("💡 Configurez ces variables dans votre .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

type TableInfo = {
  tableName: string;
  columns: ColumnInfo[];
  rowCount: number;
}

type ColumnInfo = {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
}

async function main() {
  console.log("🔍 Analyse de votre base Supabase existante");
  console.log("==========================================");

  try {
    // Étape 1: Lister toutes les tables
    console.log("\n📊 Découverte des tables...");
    const tables = await discoverTables();

    if (tables.length === 0) {
      console.log("⚠️  Aucune table trouvée dans Supabase");
      console.log(
        "💡 Votre base est peut-être vide, utilisez la migration complète",
      );
      return;
    }

    console.log(`✅ ${tables.length} tables trouvées:`);
    tables.forEach((table) => {
      console.log(
        `   📋 ${table.tableName} (${table.rowCount} enregistrements)`,
      );
    });

    // Étape 2: Analyser chaque table importante
    console.log("\n🔍 Analyse détaillée des tables...");
    const analysis = await analyzeTables(tables);

    // Étape 3: Comparer avec le schéma Prisma attendu
    console.log("\n⚖️  Comparaison avec le schéma Prisma...");
    const synchronizationPlan = generateSynchronizationPlan(analysis);

    // Étape 4: Afficher le plan de synchronisation
    console.log("\n📋 Plan de Synchronisation");
    console.log("========================");
    displaySynchronizationPlan(synchronizationPlan);
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse:", error);
    if (error.message?.includes("Invalid API key")) {
      console.log("💡 Vérifiez vos clés Supabase dans .env.local");
    }
    process.exit(1);
  }
}

async function discoverTables(): Promise<TableInfo[]> {
  // Requête pour obtenir toutes les tables du schéma public
  const { data: tablesData, error } = await supabase.rpc("exec_sql", {
    sql_query: `
      SELECT
        table_name,
        (
          SELECT COUNT(*)
          FROM information_schema.tables t2
          WHERE t2.table_name = tables.table_name
          AND t2.table_schema = 'public'
        ) as exists_check
      FROM information_schema.tables tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `,
  });

  if (error) {
    // Fallback si exec_sql n'est pas disponible
    console.log("   📝 Utilisation de la méthode alternative...");
    return await discoverTablesAlternative();
  }

  const tables: TableInfo[] = [];

  for (const row of tablesData || []) {
    const tableName = row.table_name;

    // Obtenir le nombre de lignes
    let rowCount = 0;
    try {
      const { count } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });
      rowCount = count || 0;
    } catch {
      // Table peut ne pas être accessible
      rowCount = 0;
    }

    // Obtenir les colonnes
    const columns = await getTableColumns(tableName);

    tables.push({
      tableName,
      columns,
      rowCount,
    });
  }

  return tables;
}

async function discoverTablesAlternative(): Promise<TableInfo[]> {
  // Tables communes que nous attendons
  const expectedTables = [
    "users",
    "audits",
    "user_quota",
    "profiles",
    "subscribers",
  ];
  const tables: TableInfo[] = [];

  for (const tableName of expectedTables) {
    try {
      const { count } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (count !== null) {
        const columns = await getTableColumns(tableName);
        tables.push({
          tableName,
          columns,
          rowCount: count,
        });
      }
    } catch {
      // Table n'existe pas
      continue;
    }
  }

  return tables;
}

async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          CASE
            WHEN column_name IN (
              SELECT column_name
              FROM information_schema.key_column_usage
              WHERE table_name = '${tableName}'
              AND constraint_name LIKE '%_pkey'
            ) THEN true
            ELSE false
          END as is_primary_key
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `,
    });

    if (error) throw error;

    return (data || []).map((row) => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === "YES",
      columnDefault: row.column_default,
      isPrimaryKey: row.is_primary_key,
    }));
  } catch {
    // Fallback - retourner une structure basique
    return [
      {
        columnName: "id",
        dataType: "text",
        isNullable: false,
        columnDefault: null,
        isPrimaryKey: true,
      },
    ];
  }
}

async function analyzeTables(tables: TableInfo[]) {
  const analysis = {
    existingTables: tables,
    usersTable: tables.find(
      (t) => t.tableName === "users" || t.tableName === "user",
    ),
    auditsTable: tables.find((t) => t.tableName === "audits"),
    userQuotaTable: tables.find((t) => t.tableName === "user_quota"),
    profilesTable: tables.find((t) => t.tableName === "profiles"),
    subscribersTable: tables.find((t) => t.tableName === "subscribers"),
  };

  console.log("\n📊 Tables importantes détectées:");
  console.log(
    `   👥 Users: ${analysis.usersTable ? "✅ Trouvée" : "❌ Manquante"}`,
  );
  console.log(
    `   🔍 Audits: ${analysis.auditsTable ? "✅ Trouvée" : "❌ Manquante"}`,
  );
  console.log(
    `   📈 User Quota: ${analysis.userQuotaTable ? "✅ Trouvée" : "❌ Manquante"}`,
  );
  console.log(
    `   👤 Profiles: ${analysis.profilesTable ? "✅ Trouvée" : "❌ Manquante"}`,
  );
  console.log(
    `   📊 Subscribers: ${analysis.subscribersTable ? "✅ Trouvée" : "❌ Manquante"}`,
  );

  return analysis;
}

function generateSynchronizationPlan(analysis: any) {
  const plan = {
    strategy: "SYNC_WITH_EXISTING",
    actions: [] as string[],
    prismaChanges: [] as string[],
    supabaseChanges: [] as string[],
    warnings: [] as string[],
  };

  // Analyser les tables existantes vs attendues
  if (analysis.auditsTable) {
    plan.actions.push(
      "✅ Table audits existe - Prisma peut s'y connecter directement",
    );

    // Vérifier les colonnes critiques
    const auditColumns = analysis.auditsTable.columns.map((c) => c.columnName);
    const requiredColumns = [
      "id",
      "user_id",
      "email",
      "url",
      "status",
      "webhook_id",
    ];

    for (const col of requiredColumns) {
      if (!auditColumns.includes(col)) {
        plan.supabaseChanges.push(
          `🔧 Ajouter colonne manquante: audits.${col}`,
        );
      }
    }
  } else {
    plan.supabaseChanges.push("🔧 Créer table audits pour workflows n8n");
  }

  if (analysis.userQuotaTable) {
    plan.actions.push("✅ Table user_quota existe - Quotas gérés via Supabase");
  } else {
    plan.supabaseChanges.push("🔧 Créer table user_quota pour gestion quotas");
  }

  if (analysis.usersTable) {
    plan.warnings.push(
      "⚠️  Table users existe - Éviter conflits avec Prisma.user",
    );
    plan.actions.push("🔄 Utiliser Prisma comme source de vérité pour users");
  }

  if (analysis.profilesTable) {
    plan.warnings.push(
      "⚠️  Table profiles existe - Peut être redondante avec users",
    );
    plan.actions.push(
      "🔄 Évaluer si profiles est nécessaire ou peut être supprimée",
    );
  }

  if (analysis.subscribersTable) {
    plan.warnings.push(
      "⚠️  Table subscribers existe - Redondante avec Prisma.subscription",
    );
    plan.actions.push("🔄 Migrer données vers Prisma et supprimer subscribers");
  }

  // Configuration DATABASE_URL
  plan.prismaChanges.push(
    "🔧 Configurer DATABASE_URL vers Supabase PostgreSQL",
  );
  plan.prismaChanges.push("🔧 Lancer npx prisma db push pour synchroniser");

  return plan;
}

function displaySynchronizationPlan(plan: any) {
  console.log(`\n🎯 Stratégie recommandée: ${plan.strategy}`);

  if (plan.actions.length > 0) {
    console.log("\n📋 Actions identifiées:");
    plan.actions.forEach((action) => console.log(`   ${action}`));
  }

  if (plan.prismaChanges.length > 0) {
    console.log("\n🔧 Modifications Prisma nécessaires:");
    plan.prismaChanges.forEach((change) => console.log(`   ${change}`));
  }

  if (plan.supabaseChanges.length > 0) {
    console.log("\n🔧 Modifications Supabase nécessaires:");
    plan.supabaseChanges.forEach((change) => console.log(`   ${change}`));
  }

  if (plan.warnings.length > 0) {
    console.log("\n⚠️  Avertissements:");
    plan.warnings.forEach((warning) => console.log(`   ${warning}`));
  }

  console.log("\n🔧 Prochaines étapes recommandées:");
  console.log(
    "   1. Configurez DATABASE_URL vers votre Supabase dans .env.local",
  );
  console.log(
    "   2. Lancez: npx tsx scripts/sync-prisma-to-existing-supabase.ts",
  );
  console.log("   3. Testez: npx tsx scripts/test-migration-complete.ts");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Erreur lors de l'analyse:", error);
    process.exit(1);
  });
}
