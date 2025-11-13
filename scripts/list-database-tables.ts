// Script pour lister toutes les tables de la base de données
import { config } from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@/generated/prisma";

async function listDatabaseTables() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Analyse des tables dans la base de données...\n");

    // Lister toutes les tables
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log("📋 Tables présentes dans la base :");
    console.log("=====================================");

    for (const table of tables) {
      console.log(`📄 ${table.table_name}`);

      // Compter les enregistrements dans chaque table
      try {
        const count = await prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count FROM "${table.table_name}";
        `;
        console.log(`   └─ ${count[0].count.toString()} enregistrements`);
      } catch (error) {
        console.log(`   └─ ❌ Erreur lors du comptage`);
      }

      // Lister les colonnes principales
      try {
        const columns = await prisma.$queryRaw<
          { column_name: string; data_type: string }[]
        >`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${table.table_name}
          ORDER BY ordinal_position;
        `;

        console.log(
          `   └─ Colonnes : ${columns.map((col) => `${col.column_name}(${col.data_type})`).join(", ")}`,
        );
      } catch (error) {
        console.log(`   └─ ❌ Erreur lors de la lecture des colonnes`);
      }

      console.log("");
    }

    console.log(`\n✅ Total : ${tables.length} tables trouvées`);
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  listDatabaseTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
