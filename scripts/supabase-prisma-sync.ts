import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

type SupabaseTable = {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
  }[];
};

async function analyzeSupabaseStructure() {
  console.log("🔍 Analyse de la structure Supabase...\n");

  // D'abord, analysons la structure définie dans tables.sql
  const expectedTables: SupabaseTable[] = [
    {
      name: "profiles",
      columns: [
        {
          name: "id",
          type: "UUID",
          nullable: false,
          default: "uuid_generate_v4()",
        },
        { name: "user_id", type: "UUID", nullable: false },
        { name: "email", type: "VARCHAR(255)", nullable: false },
        { name: "full_name", type: "VARCHAR(255)", nullable: true },
        { name: "company", type: "VARCHAR(255)", nullable: true },
        {
          name: "created_at",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: false,
          default: "NOW()",
        },
        {
          name: "updated_at",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: false,
          default: "NOW()",
        },
      ],
    },
    {
      name: "audits",
      columns: [
        {
          name: "id",
          type: "UUID",
          nullable: false,
          default: "uuid_generate_v4()",
        },
        { name: "user_id", type: "UUID", nullable: true },
        { name: "email", type: "VARCHAR(255)", nullable: false },
        { name: "url", type: "TEXT", nullable: false },
        {
          name: "status",
          type: "VARCHAR(20)",
          nullable: false,
          default: "pending",
        },
        {
          name: "audit_type",
          type: "VARCHAR(20)",
          nullable: false,
          default: "manual",
        },
        { name: "results_json", type: "JSONB", nullable: true },
        { name: "score_global", type: "INTEGER", nullable: true },
        { name: "score_performance", type: "INTEGER", nullable: true },
        { name: "score_seo", type: "INTEGER", nullable: true },
        { name: "score_security", type: "INTEGER", nullable: true },
        { name: "score_modern", type: "INTEGER", nullable: true },
        { name: "error_message", type: "TEXT", nullable: true },
        { name: "webhook_id", type: "VARCHAR(255)", nullable: true },
        {
          name: "is_public",
          type: "BOOLEAN",
          nullable: false,
          default: "false",
        },
        { name: "audit_results", type: "TEXT", nullable: true },
        {
          name: "completed_at",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: true,
        },
        {
          name: "created_at",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: false,
          default: "NOW()",
        },
        {
          name: "updated_at",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: false,
          default: "NOW()",
        },
        { name: "org_id", type: "VARCHAR(255)", nullable: true },
      ],
    },
    {
      name: "subscribers",
      columns: [
        {
          name: "id",
          type: "UUID",
          nullable: false,
          default: "uuid_generate_v4()",
        },
        { name: "user_id", type: "UUID", nullable: true },
        { name: "email", type: "VARCHAR(255)", nullable: false },
        { name: "stripe_customer_id", type: "VARCHAR(255)", nullable: true },
        {
          name: "subscribed",
          type: "BOOLEAN",
          nullable: false,
          default: "false",
        },
        {
          name: "subscription_tier",
          type: "subscription_tier",
          nullable: false,
          default: "free",
        },
        {
          name: "subscription_end",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: true,
        },
        {
          name: "monthly_quota",
          type: "INTEGER",
          nullable: false,
          default: "10",
        },
        { name: "quota_used", type: "INTEGER", nullable: false, default: "0" },
        {
          name: "quota_reset_date",
          type: "DATE",
          nullable: false,
          default: "DATE_TRUNC(month, NOW() + INTERVAL 1 month)",
        },
        {
          name: "created_at",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: false,
          default: "NOW()",
        },
        {
          name: "updated_at",
          type: "TIMESTAMP WITH TIME ZONE",
          nullable: false,
          default: "NOW()",
        },
      ],
    },
  ];

  return expectedTables;
}

function generatePrismaModels(tables: SupabaseTable[]): string {
  console.log("🔧 Génération des modèles Prisma...\n");

  const typeMapping: Record<string, string> = {
    UUID: "String",
    "VARCHAR(255)": "String",
    TEXT: "String",
    INTEGER: "Int",
    BOOLEAN: "Boolean",
    "TIMESTAMP WITH TIME ZONE": "DateTime",
    DATE: "DateTime",
    JSONB: "Json",
    subscription_tier: "SubscriptionTier",
  };

  let schema = "";

  // Ajouter l'enum subscription_tier
  schema += `enum SubscriptionTier {
  free
  basic
  premium
  enterprise
}\n\n`;

  tables.forEach((table) => {
    const modelName =
      table.name.charAt(0).toUpperCase() +
      table.name.slice(1).replace(/_(.)/g, (_, letter) => letter.toUpperCase());

    schema += `model ${modelName} {\n`;

    table.columns.forEach((col) => {
      const fieldName =
        col.name === "user_id" && table.name !== "profiles"
          ? "userId"
          : col.name.replace(/_(.)/g, (_, letter) => letter.toUpperCase());

      let fieldType = typeMapping[col.type] || "String";

      if (col.nullable && col.name !== "id") {
        fieldType += "?";
      }

      let attributes = "";

      if (col.name === "id") {
        attributes = ' @id @default(dbgenerated("uuid_generate_v4()"))';
      } else if (col.name === "created_at") {
        attributes = " @default(now())";
      } else if (col.name === "updated_at") {
        attributes = " @updatedAt";
      } else if (col.default && col.default !== "NOW()") {
        if (col.type === "BOOLEAN") {
          attributes = ` @default(${col.default})`;
        } else if (col.type === "INTEGER") {
          attributes = ` @default(${col.default})`;
        } else if (col.type === "subscription_tier") {
          attributes = ` @default(${col.default.toUpperCase()})`;
        }
      }

      if (col.name !== fieldName) {
        attributes += ` @map("${col.name}")`;
      }

      schema += `  ${fieldName.padEnd(18)} ${fieldType.padEnd(16)} ${attributes}\n`;
    });

    // Ajouter les relations si nécessaires
    if (table.name === "profiles") {
      schema += "\n  // Relations\n";
      schema += "  audits      Audit[]\n";
      schema += "  subscriber  Subscriber?\n";
    } else if (table.name === "audits") {
      schema += "\n  // Relations\n";
      schema +=
        "  profile     Profile? @relation(fields: [userId], references: [userId])\n";
    } else if (table.name === "subscribers") {
      schema += "\n  // Relations\n";
      schema +=
        "  profile     Profile? @relation(fields: [userId], references: [userId])\n";
    }

    schema += `\n  @@map("${table.name}")\n`;
    schema += "}\n\n";
  });

  return schema;
}

async function comparePrismaSchema() {
  console.log("📋 Analyse du schéma Prisma existant...\n");

  // Tables actuelles dans Prisma (basé sur le fichier lu)
  const currentPrismaModels = [
    "User",
    "Session",
    "Account",
    "Verification",
    "Subscription",
    "Feedback",
    "UserQuota",
    "AuditUsageLog",
  ];

  const supabaseModels = ["Profile", "Audit", "Subscriber"];

  console.log("📊 Comparaison:");
  console.log("Modèles Prisma existants:", currentPrismaModels.join(", "));
  console.log("Modèles Supabase attendus:", supabaseModels.join(", "));

  const missingModels = supabaseModels.filter(
    (model) => !currentPrismaModels.includes(model),
  );

  console.log("\n❌ Modèles manquants dans Prisma:", missingModels.join(", "));

  return { currentPrismaModels, supabaseModels, missingModels };
}

async function generateMigrationScript(tables: SupabaseTable[]) {
  console.log("🔄 Génération du script de migration...\n");

  const script = `-- Migration script to sync Prisma with Supabase structure
-- Generated on ${new Date().toISOString()}

-- First, create the Supabase tables if they don't exist
-- (This should have been done by running supabase/tables.sql)

-- Add missing Prisma models to support Supabase integration

-- Note: The following models should be added to schema.prisma:
/*
${generatePrismaModels(tables)}
*/

-- After adding models to schema.prisma, run:
-- npx prisma db push --accept-data-loss
-- npx prisma generate`;

  return script;
}

async function main() {
  console.log("🚀 Synchronisation Supabase ↔ Prisma\n");
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Analyser la structure Supabase attendue
    const supabaseTables = await analyzeSupabaseStructure();
    console.log(`✅ ${supabaseTables.length} tables Supabase analysées\n`);

    // Comparer avec Prisma
    const comparison = await comparePrismaSchema();

    // Générer les modèles Prisma
    console.log("📝 Modèles Prisma pour intégration Supabase:");
    console.log("=".repeat(60));
    const prismaModels = generatePrismaModels(supabaseTables);
    console.log(prismaModels);

    // Générer le script de migration
    const migrationScript = await generateMigrationScript(supabaseTables);
    console.log("🔄 Script de migration:");
    console.log("=".repeat(60));
    console.log(migrationScript);

    console.log("\n✅ Analyse terminée!");
    console.log("\n🔧 Étapes suivantes:");
    console.log(
      "1. Vérifiez que les tables Supabase existent (exécutez supabase/tables.sql)",
    );
    console.log("2. Ajoutez les modèles générés à votre schema.prisma");
    console.log("3. Exécutez: npx prisma db push --accept-data-loss");
    console.log("4. Exécutez: npx prisma generate");
    console.log("5. Testez la connexion avec les nouveaux modèles\n");
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { analyzeSupabaseStructure, generatePrismaModels };
