/**
 * Test d'alignement Supabase ↔ Prisma
 * Vérifie la correspondance entre les tables et colonnes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Définition des tables attendues selon schema.prisma
const expectedTables = {
  // Tables d'authentification Better Auth
  user: [
    "id",
    "name",
    "email",
    "emailVerified",
    "image",
    "createdAt",
    "updatedAt",
    "resendContactId",
    "stripeCustomerId",
  ],
  session: [
    "id",
    "expiresAt",
    "token",
    "createdAt",
    "updatedAt",
    "ipAddress",
    "userAgent",
    "userId",
  ],
  account: [
    "id",
    "accountId",
    "providerId",
    "userId",
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
    "scope",
    "password",
    "createdAt",
    "updatedAt",
  ],
  verification: [
    "id",
    "identifier",
    "value",
    "expiresAt",
    "createdAt",
    "updatedAt",
  ],
  subscription: [
    "id",
    "plan",
    "referenceId",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "status",
    "periodStart",
    "periodEnd",
    "cancelAtPeriodEnd",
    "seats",
  ],
  feedback: [
    "id",
    "review",
    "message",
    "email",
    "userId",
    "createdAt",
    "updatedAt",
  ],
  user_quota: [
    "id",
    "userId",
    "planId",
    "auditsUsed",
    "auditsLimit",
    "currentPeriodStart",
    "currentPeriodEnd",
    "resetDay",
    "createdAt",
    "updatedAt",
  ],
  audit_usage_log: [
    "id",
    "userId",
    "auditType",
    "url",
    "status",
    "runId",
    "createdAt",
    "completedAt",
  ],

  // Tables Supabase
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

async function analyzeTableAlignment() {
  console.log("🔍 Analyse d'alignement Supabase ↔ Prisma...\n");
  console.log("=".repeat(80));

  try {
    await prisma.$connect();
    console.log("✅ Connexion Prisma établie\n");

    // Récupérer toutes les tables existantes
    const existingTables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const existingTableNames = existingTables.map((t) => t.table_name);
    console.log(
      "📋 Tables existantes dans la DB:",
      existingTableNames.join(", "),
    );
    console.log("");

    let totalIssues = 0;
    const results: any = {};

    // Analyser chaque table attendue
    for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
      console.log(`🔍 Analyse de la table: ${tableName}`);

      if (!existingTableNames.includes(tableName)) {
        console.log(`   ❌ Table manquante dans Supabase`);
        results[tableName] = { missing: true };
        totalIssues++;
        continue;
      }

      // Récupérer les colonnes existantes
      const existingColumns: any[] = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = ${tableName} AND table_schema = 'public'
        ORDER BY ordinal_position
      `;

      const existingColumnNames = existingColumns.map((c) => c.column_name);
      console.log(
        `   📊 Colonnes existantes: ${existingColumnNames.join(", ")}`,
      );

      // Convertir les noms Prisma en snake_case pour la comparaison
      const expectedSnakeCase = expectedColumns.map((col) =>
        col.replace(/([A-Z])/g, "_$1").toLowerCase(),
      );

      // Identifier les colonnes manquantes et supplémentaires
      const missingColumns = expectedSnakeCase.filter(
        (col) =>
          !existingColumnNames.includes(col) &&
          !existingColumnNames.includes(col.replace(/_/g, "")),
      );

      const extraColumns = existingColumnNames.filter((col) => {
        const camelCase = col.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        return (
          !expectedColumns.includes(col) && !expectedColumns.includes(camelCase)
        );
      });

      if (missingColumns.length > 0) {
        console.log(`   ❌ Colonnes manquantes: ${missingColumns.join(", ")}`);
        totalIssues++;
      }

      if (extraColumns.length > 0) {
        console.log(
          `   🔄 Colonnes supplémentaires: ${extraColumns.join(", ")}`,
        );
        totalIssues++;
      }

      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log(`   ✅ Parfaitement alignée`);
      }

      results[tableName] = {
        exists: true,
        expectedColumns,
        existingColumns: existingColumnNames,
        missingColumns,
        extraColumns,
        details: existingColumns,
      };

      console.log("");
    }

    // Vérifier les tables non attendues
    const unexpectedTables = existingTableNames.filter(
      (table) => !Object.keys(expectedTables).includes(table),
    );

    if (unexpectedTables.length > 0) {
      console.log("🔄 Tables non définies dans Prisma:");
      unexpectedTables.forEach((table) => {
        console.log(`   - ${table}`);
        totalIssues++;
      });
      console.log("");
    }

    // Rapport final
    console.log("📊 RAPPORT D'ALIGNEMENT");
    console.log("=".repeat(80));
    console.log(`📈 Total des divergences: ${totalIssues}`);
    console.log(`📋 Tables analysées: ${Object.keys(expectedTables).length}`);
    console.log(
      `✅ Tables existantes: ${Object.values(results).filter((r: any) => r.exists).length}`,
    );
    console.log(
      `❌ Tables manquantes: ${Object.values(results).filter((r: any) => r.missing).length}`,
    );

    if (totalIssues === 0) {
      console.log(
        "\n🎉 Parfait! Vos schémas Prisma et Supabase sont parfaitement alignés!",
      );
    } else {
      console.log("\n🔧 Actions recommandées:");
      console.log("1. Synchroniser: npx prisma db push --accept-data-loss");
      console.log(
        "2. Ou ajuster le schema.prisma selon les nouvelles colonnes",
      );
      console.log(
        "3. Vérifier les nouvelles colonnes ajoutées par vos workflows n8n",
      );
      console.log("4. Regénérer le client: npx prisma generate");
    }

    return { totalIssues, results };
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution de l'analyse
analyzeTableAlignment()
  .then(({ totalIssues }) => {
    process.exit(totalIssues > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
