/**
 * Script pour nettoyer les anciennes tables inutiles
 */

import { config } from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@/generated/prisma";

async function cleanupOldTables() {
  const prisma = new PrismaClient();

  try {
    console.log("🧹 Nettoyage des anciennes tables...\n");

    // 1. Vérifier si audit_quotas existe et a des données
    try {
      const auditQuotasCount = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM audit_quotas;
      `;
      console.log(
        `📊 audit_quotas : ${auditQuotasCount[0].count.toString()} enregistrements`,
      );

      if (auditQuotasCount[0].count > 0n) {
        console.log("⚠️ La table audit_quotas contient des données");
        console.log(
          "💡 Migration recommandée vers user_quota avant suppression",
        );
      } else {
        console.log("✅ La table audit_quotas est vide, suppression sécurisée");
      }
    } catch (error) {
      console.log("❌ Erreur lors de la vérification de audit_quotas");
    }

    // 2. Vérifier les autres tables potentiellement inutiles
    const tablesToCheck = ["audit_logs", "supabase_syncs", "Feedback"];

    for (const tableName of tablesToCheck) {
      try {
        const count = await prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count FROM "${tableName}";
        `;
        console.log(
          `📊 ${tableName} : ${count[0].count.toString()} enregistrements`,
        );
      } catch (error) {
        console.log(`❌ Erreur lors de la vérification de ${tableName}`);
      }
    }

    console.log("\n🤔 Tables liées au système d'organisation :");
    console.log("- organization : Pour les équipes/agences (B2B)");
    console.log("- member : Appartenance aux organisations");
    console.log("- invitation : Invitations d'équipe");

    // Vérifier les données organisations
    try {
      const orgCount = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM organization;
      `;
      const memberCount = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM member;
      `;

      console.log(
        `📊 organization : ${orgCount[0].count.toString()} enregistrements`,
      );
      console.log(
        `📊 member : ${memberCount[0].count.toString()} enregistrements`,
      );

      if (orgCount[0].count > 0n) {
        console.log("\n📋 Organisations existantes :");
        const orgs = await prisma.$queryRaw<
          { name: string; slug: string; email: string }[]
        >`
          SELECT name, slug, email FROM organization;
        `;
        orgs.forEach((org) => {
          console.log(`   - ${org.name} (${org.slug}) - ${org.email}`);
        });
      }
    } catch (error) {
      console.log("❌ Erreur lors de la vérification des organisations");
    }

    console.log("\n💡 Recommandations :");
    console.log("1. Supprimer audit_quotas (remplacée par user_quota)");
    console.log("2. Simplifier en supprimant le système d'organisation");
    console.log("3. Migrer vers un parcours B2C direct");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanupOldTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
