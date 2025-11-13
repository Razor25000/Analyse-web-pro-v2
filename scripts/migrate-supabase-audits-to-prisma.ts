#!/usr/bin/env tsx

/**
 * Migration des audits Supabase vers Prisma
 * Étape critique de la simplification de l'architecture
 * Usage: pnpm tsx scripts/migrate-supabase-audits-to-prisma.ts
 */

import { config } from "dotenv";
import { prisma } from "../src/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// Charger les variables d'environnement
config({ path: ".env.local" });

type SupabaseAudit = {
  id: string;
  user_id: string;
  email: string;
  url: string;
  audit_type: string;
  status: string;
  webhook_id?: string;
  is_public: boolean;
  score_global?: number;
  score_performance?: number;
  score_seo?: number;
  score_security?: number;
  score_modern?: number;
  results_json?: any;
  audit_results?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  org_id?: string;
};

type MigrationStats = {
  supabaseCount: number;
  prismaBeforeCount: number;
  prismaAfterCount: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  duplicatesFound: number;
  errors: string[];
};

async function checkPrerequisites(): Promise<boolean> {
  console.log("🔍 Vérification des prérequis...");

  // Vérifier Prisma
  try {
    await prisma.$connect();
    console.log("   ✅ Prisma connecté");
  } catch (error) {
    console.error("   ❌ Erreur connexion Prisma:", error);
    return false;
  }

  // Vérifier Supabase
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log("   ⚠️  Configuration Supabase manquante - Skip migration");
    return false;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    const { count, error } = await supabase
      .from("audits")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.log("   ⚠️  Table audits Supabase introuvable - Skip migration");
      return false;
    }

    console.log(`   ✅ Supabase connecté (${count || 0} audits)`);
    return true;
  } catch (error) {
    console.error("   ❌ Erreur connexion Supabase:", error);
    return false;
  }
}

async function createBackup(): Promise<boolean> {
  console.log("💾 Création du backup...");

  try {
    // Backup Prisma
    const fs = await import("fs");
    const path = await import("path");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = "./backups";

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Copier la base SQLite
    const sourceDb = "./prisma/dev.db";
    const backupDb = path.join(backupDir, `dev.db.backup-${timestamp}`);

    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, backupDb);
      console.log(`   ✅ Backup Prisma créé: ${backupDb}`);
    }

    // Backup audits Supabase en JSON
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: supabaseAudits, error } = await supabase
      .from("audits")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && supabaseAudits) {
      const backupJson = path.join(
        backupDir,
        `supabase-audits-${timestamp}.json`,
      );
      fs.writeFileSync(backupJson, JSON.stringify(supabaseAudits, null, 2));
      console.log(
        `   ✅ Backup Supabase créé: ${backupJson} (${supabaseAudits.length} audits)`,
      );
    }

    return true;
  } catch (error) {
    console.error("   ❌ Erreur création backup:", error);
    return false;
  }
}

async function getSupabaseAudits(): Promise<SupabaseAudit[]> {
  console.log("📥 Récupération des audits Supabase...");

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data: audits, error } = await supabase
    .from("audits")
    .select("*")
    .order("created_at", { ascending: true }); // Plus ancien en premier pour préserver l'ordre

  if (error) {
    console.error("   ❌ Erreur récupération audits:", error);
    return [];
  }

  console.log(`   ✅ ${audits?.length || 0} audits récupérés`);
  return audits || [];
}

function convertSupabaseAuditToPrisma(supabaseAudit: SupabaseAudit): any {
  return {
    // Ne pas spécifier l'ID - laisser Prisma générer un nanoid
    userId: supabaseAudit.user_id, // Garder l'ID utilisateur original
    email: supabaseAudit.email,
    url: supabaseAudit.url,
    status: supabaseAudit.status,
    auditType: supabaseAudit.audit_type || "manual",
    resultsJson: supabaseAudit.results_json,
    scoreGlobal: supabaseAudit.score_global,
    scorePerformance: supabaseAudit.score_performance,
    scoreSeo: supabaseAudit.score_seo,
    scoreSecurity: supabaseAudit.score_security,
    scoreModern: supabaseAudit.score_modern,
    errorMessage: supabaseAudit.error_message,
    webhookId: supabaseAudit.webhook_id,
    isPublic: supabaseAudit.is_public || false,
    auditResults: supabaseAudit.audit_results,
    completedAt: supabaseAudit.completed_at
      ? new Date(supabaseAudit.completed_at)
      : null,
    createdAt: new Date(supabaseAudit.created_at),
    updatedAt: new Date(supabaseAudit.updated_at),
    orgId: supabaseAudit.org_id,
    // Metadata de migration
    runId: `migrated_${Date.now()}`, // Marquer comme migré
  };
}

async function checkForDuplicates(
  supabaseAudits: SupabaseAudit[],
): Promise<number> {
  console.log("🔍 Vérification des doublons...");

  let duplicateCount = 0;

  for (const audit of supabaseAudits) {
    // Chercher par URL + email + date (tolérance de 5 minutes)
    const createdAt = new Date(audit.created_at);
    const startTime = new Date(createdAt.getTime() - 5 * 60 * 1000); // -5 min
    const endTime = new Date(createdAt.getTime() + 5 * 60 * 1000); // +5 min

    const existingAudit = await prisma.audit.findFirst({
      where: {
        url: audit.url,
        email: audit.email,
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
      },
    });

    if (existingAudit) {
      duplicateCount++;
      console.log(`   ⚠️  Doublon détecté: ${audit.url} (${audit.email})`);
    }
  }

  console.log(
    `   📊 ${duplicateCount} doublons détectés sur ${supabaseAudits.length} audits`,
  );
  return duplicateCount;
}

async function migrateAudits(
  supabaseAudits: SupabaseAudit[],
): Promise<MigrationStats> {
  console.log("🔄 Migration des audits en cours...");

  const stats: MigrationStats = {
    supabaseCount: supabaseAudits.length,
    prismaBeforeCount: await prisma.audit.count(),
    prismaAfterCount: 0,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    duplicatesFound: 0,
    errors: [],
  };

  console.log(`   📊 État initial: ${stats.prismaBeforeCount} audits Prisma`);

  // Traiter par batch de 10 pour éviter la surcharge
  const batchSize = 10;
  const totalBatches = Math.ceil(supabaseAudits.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const batch = supabaseAudits.slice(i * batchSize, (i + 1) * batchSize);
    console.log(
      `   🔄 Batch ${i + 1}/${totalBatches} (${batch.length} audits)`,
    );

    for (const supabaseAudit of batch) {
      try {
        // Vérifier si existe déjà (doublon)
        const createdAt = new Date(supabaseAudit.created_at);
        const startTime = new Date(createdAt.getTime() - 5 * 60 * 1000);
        const endTime = new Date(createdAt.getTime() + 5 * 60 * 1000);

        const existingAudit = await prisma.audit.findFirst({
          where: {
            url: supabaseAudit.url,
            email: supabaseAudit.email,
            createdAt: {
              gte: startTime,
              lte: endTime,
            },
          },
        });

        if (existingAudit) {
          stats.skippedCount++;
          stats.duplicatesFound++;
          console.log(`      ⏭️  Skip doublon: ${supabaseAudit.url}`);
          continue;
        }

        // Convertir et créer
        const prismaAudit = convertSupabaseAuditToPrisma(supabaseAudit);

        await prisma.audit.create({
          data: prismaAudit,
        });

        stats.migratedCount++;
        console.log(
          `      ✅ Migré: ${supabaseAudit.url} (${supabaseAudit.status})`,
        );
      } catch (error) {
        stats.errorCount++;
        const errorMsg = `Erreur migration ${supabaseAudit.url}: ${error}`;
        stats.errors.push(errorMsg);
        console.error(`      ❌ ${errorMsg}`);
      }
    }

    // Pause courte entre les batches
    if (i < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  stats.prismaAfterCount = await prisma.audit.count();

  console.log("\n📊 RÉSULTATS DE LA MIGRATION:");
  console.log(`   • Audits Supabase:     ${stats.supabaseCount}`);
  console.log(`   • Prisma avant:        ${stats.prismaBeforeCount}`);
  console.log(`   • Prisma après:        ${stats.prismaAfterCount}`);
  console.log(`   • Migrés avec succès:  ${stats.migratedCount}`);
  console.log(`   • Doublons ignorés:    ${stats.skippedCount}`);
  console.log(`   • Erreurs:             ${stats.errorCount}`);

  return stats;
}

async function verifyMigration(stats: MigrationStats): Promise<boolean> {
  console.log("✅ Vérification de l'intégrité...");

  const actualCount = await prisma.audit.count();
  const expectedCount = stats.prismaBeforeCount + stats.migratedCount;

  if (actualCount !== expectedCount) {
    console.error(
      `   ❌ Erreur intégrité: attendu ${expectedCount}, trouvé ${actualCount}`,
    );
    return false;
  }

  // Vérifier quelques audits migrés récents
  const recentMigrated = await prisma.audit.findMany({
    where: {
      runId: { startsWith: "migrated_" },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  console.log(`   ✅ Intégrité vérifiée: ${actualCount} audits total`);
  console.log(`   ✅ ${recentMigrated.length} audits migrés récents trouvés`);

  return true;
}

async function generateMigrationReport(stats: MigrationStats): Promise<void> {
  console.log("📄 Génération du rapport de migration...");

  const report = {
    timestamp: new Date().toISOString(),
    migration: "Supabase audits → Prisma",
    stats,
    success: stats.errorCount === 0,
    dataIntegrity:
      stats.prismaAfterCount === stats.prismaBeforeCount + stats.migratedCount,
    recommendations: [
      stats.errorCount > 0
        ? "⚠️ Vérifier les erreurs de migration"
        : "✅ Migration sans erreur",
      stats.duplicatesFound > 0
        ? `⚠️ ${stats.duplicatesFound} doublons ignorés`
        : "✅ Pas de doublon détecté",
      stats.migratedCount > 0
        ? "🎯 Supabase peut être nettoyé"
        : "⚠️ Aucune migration effectuée",
    ],
  };

  const fs = await import("fs");
  fs.writeFileSync("./migration-report.json", JSON.stringify(report, null, 2));

  console.log("   ✅ Rapport sauvegardé: migration-report.json");
}

async function main() {
  try {
    console.log("🚀 MIGRATION SUPABASE AUDITS → PRISMA");
    console.log(`🕐 ${  new Date().toLocaleString("fr-FR")}`);
    console.log("=".repeat(60));

    // 1. Vérification des prérequis
    const canProceed = await checkPrerequisites();
    if (!canProceed) {
      console.log("❌ Prérequis non remplis - Arrêt de la migration");
      return;
    }

    // 2. Backup de sécurité
    const backupSuccess = await createBackup();
    if (!backupSuccess) {
      console.log("❌ Échec création backup - Arrêt de la migration");
      return;
    }

    // 3. Récupération des audits Supabase
    const supabaseAudits = await getSupabaseAudits();
    if (supabaseAudits.length === 0) {
      console.log("ℹ️  Aucun audit à migrer - Migration terminée");
      return;
    }

    // 4. Vérification des doublons
    const duplicateCount = await checkForDuplicates(supabaseAudits);

    // 5. Migration effective
    const stats = await migrateAudits(supabaseAudits);

    // 6. Vérification de l'intégrité
    const integrityOK = await verifyMigration(stats);

    // 7. Rapport final
    await generateMigrationReport(stats);

    // Résumé final
    console.log(`\n${  "=".repeat(60)}`);
    console.log("🎯 MIGRATION TERMINÉE");
    console.log("=".repeat(60));

    if (stats.migratedCount > 0) {
      console.log(`✅ ${stats.migratedCount} audits migrés avec succès`);
    }
    if (stats.skippedCount > 0) {
      console.log(`⏭️  ${stats.skippedCount} doublons ignorés`);
    }
    if (stats.errorCount > 0) {
      console.log(
        `❌ ${stats.errorCount} erreurs (voir migration-report.json)`,
      );
    }

    console.log(`\n🎯 ÉTAPES SUIVANTES:`);
    console.log(`1. Vérifier les tests: pnpm test:e2e:complete`);
    console.log(
      `2. Nettoyer le code Supabase: scripts/cleanup-obsolete-files.ts`,
    );
    console.log(
      `3. Supprimer les tables Supabase: scripts/cleanup-supabase-tables.ts`,
    );
  } catch (error) {
    console.error("❌ Erreur durant la migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
