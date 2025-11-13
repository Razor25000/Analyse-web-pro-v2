/**
 * Script pour supprimer les contraintes qui bloquent Prisma sur Supabase
 */

import dotenv from "dotenv";
import { join } from "path";

// Charger les variables d'environnement manuellement
dotenv.config({ path: join(process.cwd(), ".env.local") });
dotenv.config({ path: join(process.cwd(), ".env") });

async function fixSupabaseConstraints() {
  console.log("🔧 Suppression des contraintes problématiques");
  console.log("==============================================");

  console.log("\n📋 Informations de connexion:");
  const dbUrl = process.env.DATABASE_URL;
  console.log("- DATABASE_URL:", dbUrl ? "✅ Définie" : "❌ Manquante");

  console.log("\n🔌 Connexion à Supabase et suppression des contraintes:");

  try {
    // Import direct du client généré
    const { PrismaClient, Prisma } = await import("@/generated/prisma");
    const prisma = new PrismaClient({
      log: ["query", "info", "warn", "error"],
    });

    console.log("🔗 Tentative de connexion...");
    await prisma.$connect();
    console.log("✅ Connexion Prisma réussie");

    // Suppression directe des contraintes problématiques connues
    console.log("\n🗑️ Suppression des contraintes vers auth:");

    const problematicConstraints = [
      { table: "audits", constraint: "audits_user_id_fkey" },
      { table: "profiles", constraint: "profiles_user_id_fkey" },
      { table: "usage_logs", constraint: "usage_logs_user_id_fkey" },
      { table: "subscribers", constraint: "subscribers_user_id_fkey" },
    ];

    for (const { table, constraint } of problematicConstraints) {
      try {
        await prisma.$executeRaw`
          ${Prisma.raw(`ALTER TABLE public."${table}"`)} 
          DROP CONSTRAINT IF EXISTS ${Prisma.raw(`"${constraint}"`)};
        `;
        console.log(`✅ Contrainte ${constraint} supprimée de ${table}`);
      } catch (error) {
        console.log(
          `⚠️ Contrainte ${constraint} déjà supprimée ou inexistante:`,
          (error as Error).message,
        );
      }
    }

    // Recherche et suppression d'autres contraintes problématiques
    console.log("\n📋 Recherche des autres contraintes vers le schéma auth:");

    try {
      const constraints = await prisma.$queryRaw`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = 'auth'
          AND tc.table_schema = 'public';
      `;

      console.log("Contraintes trouvées:", constraints);

      // Suppression des contraintes trouvées
      if (Array.isArray(constraints) && constraints.length > 0) {
        console.log("\n🗑️ Suppression des contraintes vers auth:");
        for (const constraint of constraints as any[]) {
          try {
            await prisma.$executeRaw`
              ALTER TABLE ${Prisma.raw(`public."${constraint.table_name}"`)}
              DROP CONSTRAINT IF EXISTS ${Prisma.raw(`"${constraint.constraint_name}"`)}
            `;
            console.log(
              `✅ Contrainte ${constraint.constraint_name} supprimée`,
            );
          } catch (error) {
            console.log(
              `⚠️ Erreur suppression ${constraint.constraint_name}:`,
              (error as Error).message,
            );
          }
        }
      } else {
        console.log("✅ Aucune contrainte vers auth trouvée");
      }
    } catch (error) {
      console.log("⚠️ Erreur recherche contraintes:", (error as Error).message);
    }

    await prisma.$disconnect();
    console.log("🔌 Déconnexion Prisma");
  } catch (error) {
    console.error("❌ Erreur:", error);
  }

  console.log(
    "\n✅ Nettoyage terminé - Vous pouvez maintenant exécuter `npx prisma db push`",
  );
}

// Exécution si appelé directement
if (require.main === module) {
  fixSupabaseConstraints().catch(console.error);
}

export { fixSupabaseConstraints };
