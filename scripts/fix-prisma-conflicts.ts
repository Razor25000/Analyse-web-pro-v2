#!/usr/bin/env tsx

/**
 * Correction des conflits Prisma - Nettoyage et test PostgreSQL
 */

import fs from "fs";
import path from "path";

console.log("🧹 CORRECTION DES CONFLITS PRISMA");
console.log("=".repeat(40));

async function cleanupPrismaDirectory() {
  console.log("\n1️⃣ Nettoyage du dossier prisma...");

  try {
    const prismaDir = path.join(process.cwd(), "prisma");
    const files = fs.readdirSync(prismaDir);

    // Déplacer les fichiers de backup vers un dossier dédié
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
      console.log("   📁 Dossier backups créé");
    }

    let movedFiles = 0;
    for (const file of files) {
      if (file.includes("backup") && file.endsWith(".prisma")) {
        const oldPath = path.join(prismaDir, file);
        const newPath = path.join(backupDir, file);
        fs.renameSync(oldPath, newPath);
        console.log(`   ✅ Déplacé: ${file} → backups/`);
        movedFiles++;
      }
    }

    // Garder seulement schema.prisma dans le dossier prisma
    const remainingFiles = fs
      .readdirSync(prismaDir)
      .filter((f) => f.endsWith(".prisma"));
    console.log(
      `   📊 Fichiers .prisma restants: ${remainingFiles.join(", ")}`,
    );

    return { success: true, movedFiles };
  } catch (error) {
    console.log(`   ❌ Erreur nettoyage: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPrismaGeneration() {
  console.log("\n2️⃣ Test de génération Prisma...");

  try {
    const { execSync } = require("child_process");

    console.log("   🔧 Génération du client Prisma PostgreSQL...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("   ✅ Client Prisma généré avec succès");

    return { success: true };
  } catch (error) {
    console.log(`   ❌ Erreur génération: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPostgreSQLConnection() {
  console.log("\n3️⃣ Test de connexion PostgreSQL...");

  try {
    // Import dynamique après génération
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    console.log("   🔍 Connexion à PostgreSQL...");
    await prisma.$connect();
    console.log("   ✅ Connexion PostgreSQL établie");

    // Test simple
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as timestamp`;
    console.log("   ✅ Query test réussie:", result[0]);

    await prisma.$disconnect();
    return { success: true };
  } catch (error) {
    console.log(`   ❌ Erreur connexion: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function pushDatabaseSchema() {
  console.log("\n4️⃣ Création des tables PostgreSQL...");

  try {
    const { execSync } = require("child_process");

    console.log("   🔧 Push du schéma vers PostgreSQL...");
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    console.log("   ✅ Tables PostgreSQL créées avec succès");

    return { success: true };
  } catch (error) {
    console.log(`   ❌ Erreur push schéma: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function generateReport(results: any[]) {
  console.log(`\n${  "=".repeat(40)}`);
  console.log("📋 RAPPORT DE CORRECTION");
  console.log("=".repeat(40));

  const allSuccess = results.every((r) => r.success);

  if (allSuccess) {
    console.log("\n🎉 CORRECTION RÉUSSIE !");
    console.log("\n✅ PostgreSQL configuré et fonctionnel");
    console.log("   • Conflits Prisma résolus");
    console.log("   • Client Prisma PostgreSQL généré");
    console.log("   • Connexion PostgreSQL validée");
    console.log("   • Tables PostgreSQL créées");

    console.log("\n🎯 VOTRE DEMANDE RÉALISÉE :");
    console.log('   "PostgreSQL au lieu de SQLite"');
    console.log("   ✅ OBJECTIF ATTEINT !");

    console.log("\n🚀 PROCHAINE ÉTAPE :");
    console.log("   Migration des données SQLite → PostgreSQL");
  } else {
    console.log("\n⚠️ CORRECTION PARTIELLE");
    const failed = results.filter((r) => !r.success);
    console.log("\n❌ Échecs :");
    failed.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.error}`);
    });
  }

  return allSuccess;
}

async function main() {
  const results = [];

  try {
    // Nettoyage
    const step1 = await cleanupPrismaDirectory();
    results.push(step1);

    // Génération Prisma
    const step2 = await testPrismaGeneration();
    results.push(step2);

    if (step2.success) {
      // Test connexion
      const step3 = await testPostgreSQLConnection();
      results.push(step3);

      if (step3.success) {
        // Push schéma
        const step4 = await pushDatabaseSchema();
        results.push(step4);
      }
    }

    await generateReport(results);
  } catch (error) {
    console.error("\n💥 Erreur:", error.message);
  }
}

if (require.main === module) {
  main();
}
