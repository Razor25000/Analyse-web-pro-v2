import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Configuration de base
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

type TableColumn = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};

type TableInfo = {
  table_name: string;
  columns: TableColumn[];
};

async function analyzeSupabaseTables() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("🔍 Analyse des tables Supabase...\n");

  try {
    // Requête pour obtenir toutes les tables et colonnes
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE 'pg_%'
        AND t.table_name NOT LIKE 'sql_%'
        ORDER BY t.table_name, c.ordinal_position;
      `,
    });

    if (error) {
      console.error("❌ Erreur lors de l'analyse Supabase:", error);
      return;
    }

    // Organiser les données par table
    const tables: Record<string, TableInfo> = {};

    if (data) {
      data.forEach((row: any) => {
        if (!tables[row.table_name]) {
          tables[row.table_name] = {
            table_name: row.table_name,
            columns: [],
          };
        }

        if (row.column_name) {
          tables[row.table_name].columns.push({
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
            column_default: row.column_default,
          });
        }
      });
    }

    console.log("📋 Tables trouvées dans Supabase:");
    Object.keys(tables).forEach((tableName) => {
      console.log(`\n📄 Table: ${tableName}`);
      tables[tableName].columns.forEach((col) => {
        const nullable = col.is_nullable === "YES" ? "?" : "";
        const defaultVal = col.column_default
          ? ` (default: ${col.column_default})`
          : "";
        console.log(
          `  - ${col.column_name}: ${col.data_type}${nullable}${defaultVal}`,
        );
      });
    });

    return tables;
  } catch (error) {
    console.error("❌ Erreur lors de la connexion à Supabase:", error);
  }
}

async function analyzePrismaSchema() {
  console.log("\n🔍 Analyse du schéma Prisma actuel...\n");

  const prisma = new PrismaClient();

  try {
    // Tester la connexion
    await prisma.$connect();
    console.log("✅ Connexion Prisma réussie");

    // Analyser les tables existantes via raw query
    const tables = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log("📋 Tables trouvées dans Prisma:");
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`);
    });

    return tables.map((t) => t.table_name);
  } catch (error) {
    console.error("❌ Erreur Prisma:", error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

async function compareSchemas() {
  console.log("\n🔄 Comparaison des schémas Supabase vs Prisma\n");

  const supabaseTables = await analyzeSupabaseTables();
  const prismaTables = await analyzePrismaSchema();

  if (!supabaseTables) {
    console.log("❌ Impossible d'analyser les tables Supabase");
    return;
  }

  const supabaseTableNames = Object.keys(supabaseTables);

  console.log("📊 Rapport de comparaison:");
  console.log(`  - Tables Supabase: ${supabaseTableNames.length}`);
  console.log(`  - Tables Prisma: ${prismaTables.length}`);

  // Tables manquantes dans Prisma
  const missingInPrisma = supabaseTableNames.filter(
    (name) => !prismaTables.includes(name),
  );
  if (missingInPrisma.length > 0) {
    console.log("\n❌ Tables manquantes dans Prisma:");
    missingInPrisma.forEach((table) => {
      console.log(`  - ${table}`);
    });
  }

  // Tables manquantes dans Supabase
  const missingInSupabase = prismaTables.filter(
    (name) => !supabaseTableNames.includes(name),
  );
  if (missingInSupabase.length > 0) {
    console.log("\n⚠️  Tables manquantes dans Supabase:");
    missingInSupabase.forEach((table) => {
      console.log(`  - ${table}`);
    });
  }

  // Tables communes
  const commonTables = supabaseTableNames.filter((name) =>
    prismaTables.includes(name),
  );
  if (commonTables.length > 0) {
    console.log("\n✅ Tables communes:");
    commonTables.forEach((table) => {
      console.log(`  - ${table}`);
    });
  }

  return {
    supabaseTables,
    prismaTables,
    missingInPrisma,
    missingInSupabase,
    commonTables,
  };
}

async function generatePrismaModels(supabaseTables: Record<string, TableInfo>) {
  console.log("\n🔧 Génération des modèles Prisma manquants...\n");

  const models: string[] = [];

  Object.values(supabaseTables).forEach((table) => {
    if (["profiles", "audits", "subscribers"].includes(table.table_name)) {
      const modelName =
        table.table_name.charAt(0).toUpperCase() +
        table.table_name
          .slice(1)
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

      let model = `model ${modelName} {\n`;

      table.columns.forEach((col) => {
        const fieldName = col.column_name.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        let fieldType = mapPostgresToPrisma(col.data_type);

        if (
          col.is_nullable === "YES" &&
          !col.column_name.includes("_at") &&
          col.column_name !== "id"
        ) {
          fieldType += "?";
        }

        let attributes = "";

        if (col.column_name === "id") {
          attributes = ' @id @default(dbgenerated("uuid_generate_v4()"))';
        } else if (col.column_name === "created_at") {
          attributes = ' @default(now()) @map("created_at")';
        } else if (col.column_name === "updated_at") {
          attributes = ' @updatedAt @map("updated_at")';
        } else if (col.column_name.includes("_id")) {
          attributes = ` @map("${col.column_name}")`;
        } else if (col.column_name !== fieldName) {
          attributes = ` @map("${col.column_name}")`;
        }

        model += `  ${fieldName.padEnd(20)} ${fieldType.padEnd(15)} ${attributes}\n`;
      });

      model += `\n  @@map("${table.table_name}")\n}\n\n`;
      models.push(model);
    }
  });

  return models.join("");
}

function mapPostgresToPrisma(postgresType: string): string {
  const typeMap: Record<string, string> = {
    uuid: "String",
    "character varying": "String",
    varchar: "String",
    text: "String",
    integer: "Int",
    bigint: "BigInt",
    boolean: "Boolean",
    "timestamp with time zone": "DateTime",
    "timestamp without time zone": "DateTime",
    date: "DateTime",
    jsonb: "Json",
    json: "Json",
    decimal: "Decimal",
    numeric: "Decimal",
    "double precision": "Float",
  };

  return typeMap[postgresType] || "String";
}

async function main() {
  console.log("🚀 Analyse d'alignement Supabase ↔ Prisma\n");

  const comparison = await compareSchemas();

  if (comparison?.supabaseTables) {
    const prismaModels = await generatePrismaModels(comparison.supabaseTables);

    console.log("\n📝 Modèles Prisma suggérés:");
    console.log("=".repeat(80));
    console.log(prismaModels);
    console.log("=".repeat(80));

    console.log("\n✅ Analyse terminée!");
    console.log("\nPour appliquer ces changements:");
    console.log("1. Ajoutez les modèles manquants au schema.prisma");
    console.log("2. Lancez: npx prisma db push");
    console.log("3. Générez le client: npx prisma generate");
  }
}

if (require.main === module) {
  main().catch(console.error);
}
