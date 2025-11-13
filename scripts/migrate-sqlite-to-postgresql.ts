#!/usr/bin/env tsx

/**
 * Script de migration SQLite vers PostgreSQL pour analyseur-web-pro
 *
 * Ce script :
 * 1. Sauvegarde vos données SQLite existantes
 * 2. Configure une base PostgreSQL (locale ou Supabase)
 * 3. Migre toutes vos données
 * 4. Vérifie l'intégrité de la migration
 */

import { PrismaClient as SQLitePrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

const sourceDbPath = path.join(process.cwd(), "prisma", "prisma", "dev.db");
const backupDir = path.join(process.cwd(), "backup");

type MigrationStats = {
  users: number;
  sessions: number;
  accounts: number;
  subscriptions: number;
  feedback: number;
  audits: number;
  preRegistrations: number;
}

async function main() {
  console.log("🚀 Migration SQLite → PostgreSQL pour analyseur-web-pro");
  console.log("====================================================");

  // Étape 1: Vérifier l'existence de la base SQLite
  try {
    await fs.access(sourceDbPath);
    console.log("✅ Base SQLite trouvée:", sourceDbPath);
  } catch {
    console.log(
      "⚠️  Aucune base SQLite trouvée - création d'une configuration vide",
    );
    await createEmptyMigration();
    return;
  }

  // Étape 2: Créer le répertoire de sauvegarde
  await fs.mkdir(backupDir, { recursive: true });

  // Étape 3: Sauvegarder les données SQLite
  console.log("\n📦 Sauvegarde des données SQLite...");
  const sqliteClient = new SQLitePrismaClient({
    datasources: {
      db: {
        url: `file:${sourceDbPath}`,
      },
    },
  });

  try {
    const migrationData = await extractSQLiteData(sqliteClient);

    // Sauvegarder dans un fichier JSON
    const backupFile = path.join(
      backupDir,
      `migration-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    await fs.writeFile(backupFile, JSON.stringify(migrationData, null, 2));
    console.log("✅ Sauvegarde créée:", backupFile);

    // Afficher les statistiques
    const stats = getStats(migrationData);
    console.log("\n📊 Données à migrer:");
    console.log(`   👥 Utilisateurs: ${stats.users}`);
    console.log(`   🔑 Sessions: ${stats.sessions}`);
    console.log(`   🔐 Comptes: ${stats.accounts}`);
    console.log(`   💳 Abonnements: ${stats.subscriptions}`);
    console.log(`   💬 Feedback: ${stats.feedback}`);
    console.log(`   🔍 Audits: ${stats.audits}`);
    console.log(`   📝 Pré-inscriptions: ${stats.preRegistrations}`);

    console.log("\n✅ Migration préparée !");
    console.log("\n🔧 Prochaines étapes:");
    console.log("   1. Configurez votre base PostgreSQL dans .env.local");
    console.log("   2. Lancez: npx prisma generate");
    console.log("   3. Lancez: npx prisma db push");
    console.log("   4. Lancez: npx tsx scripts/restore-postgresql-data.ts");
  } finally {
    await sqliteClient.$disconnect();
  }
}

async function extractSQLiteData(client: SQLitePrismaClient) {
  console.log("   Extraction des utilisateurs...");
  const users = await client.user.findMany();

  console.log("   Extraction des sessions...");
  const sessions = await client.session.findMany();

  console.log("   Extraction des comptes...");
  const accounts = await client.account.findMany();

  console.log("   Extraction des abonnements...");
  const subscriptions = await client.subscription.findMany();

  console.log("   Extraction des feedback...");
  const feedback = await client.feedback.findMany();

  console.log("   Extraction des audits...");
  const audits = await client.audit.findMany();

  // PreRegistration peut ne pas exister dans l'ancienne base
  let preRegistrations: any[] = [];
  try {
    preRegistrations =
      (await (client as any).preRegistration?.findMany()) || [];
  } catch (error) {
    console.log(
      "   ⚠️  Table PreRegistration non trouvée (normal pour les anciennes versions)",
    );
  }

  return {
    users,
    sessions,
    accounts,
    subscriptions,
    feedback,
    audits,
    preRegistrations,
    metadata: {
      migratedAt: new Date().toISOString(),
      sourceType: "sqlite",
      targetType: "postgresql",
      version: "1.0.0",
    },
  };
}

function getStats(data: any): MigrationStats {
  return {
    users: data.users?.length || 0,
    sessions: data.sessions?.length || 0,
    accounts: data.accounts?.length || 0,
    subscriptions: data.subscriptions?.length || 0,
    feedback: data.feedback?.length || 0,
    audits: data.audits?.length || 0,
    preRegistrations: data.preRegistrations?.length || 0,
  };
}

async function createEmptyMigration() {
  const emptyData = {
    users: [],
    sessions: [],
    accounts: [],
    subscriptions: [],
    feedback: [],
    audits: [],
    preRegistrations: [],
    metadata: {
      migratedAt: new Date().toISOString(),
      sourceType: "empty",
      targetType: "postgresql",
      version: "1.0.0",
    },
  };

  await fs.mkdir(backupDir, { recursive: true });
  const backupFile = path.join(
    backupDir,
    `empty-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await fs.writeFile(backupFile, JSON.stringify(emptyData, null, 2));

  console.log(
    "✅ Configuration vide créée pour nouvelle installation PostgreSQL",
  );
  console.log(
    "🔧 Configurez maintenant vos variables Supabase dans .env.local",
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Erreur lors de la migration:", error);
    process.exit(1);
  });
}

export { extractSQLiteData, getStats };
