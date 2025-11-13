#!/usr/bin/env tsx

/**
 * Nettoyage des fichiers et code obsolètes après migration
 * Supprime les références Supabase et simplifie l'architecture
 * Usage: pnpm tsx scripts/cleanup-obsolete-files.ts
 */

import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Charger les variables d'environnement
config({ path: ".env.local" });

type CleanupTask = {
  name: string;
  action: "delete" | "modify" | "backup";
  path: string;
  description: string;
  executed: boolean;
  error?: string;
};

type CleanupStats = {
  tasks: CleanupTask[];
  filesDeleted: number;
  filesModified: number;
  linesRemoved: number;
  errors: string[];
};

async function createBackupBeforeCleanup(): Promise<boolean> {
  console.log("💾 Création backup avant nettoyage...");

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = "./backups";

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Backup des fichiers critiques qui seront modifiés
    const criticalFiles = [
      "src/lib/supabase/bridge.ts",
      "src/lib/supabase/mock-data.ts",
      "src/lib/quota/quota-service.ts",
      "package.json",
    ];

    for (const file of criticalFiles) {
      if (fs.existsSync(file)) {
        const backupFile = path.join(
          backupDir,
          `${path.basename(file)}.backup-${timestamp}`,
        );
        fs.copyFileSync(file, backupFile);
        console.log(`   ✅ Backup: ${file} → ${backupFile}`);
      }
    }

    return true;
  } catch (error) {
    console.error("   ❌ Erreur backup:", error);
    return false;
  }
}

function defineCleanupTasks(): CleanupTask[] {
  return [
    // 1. Supprimer SupabaseBridge.ts - 629 lignes obsolètes
    {
      name: "Delete SupabaseBridge",
      action: "delete",
      path: "src/lib/supabase/bridge.ts",
      description: "Supprimer interface Supabase obsolète (629 lignes)",
      executed: false,
    },

    // 2. Supprimer mock-data.ts - données de test
    {
      name: "Delete Mock Data",
      action: "delete",
      path: "src/lib/supabase/mock-data.ts",
      description: "Supprimer données de test Supabase (145 lignes)",
      executed: false,
    },

    // 3. Supprimer bridge-new.ts si existe
    {
      name: "Delete Bridge New",
      action: "delete",
      path: "src/lib/supabase/bridge-new.ts",
      description: "Supprimer nouveau bridge si existant",
      executed: false,
    },

    // 4. Nettoyer quota-service.ts - supprimer références Supabase
    {
      name: "Clean Quota Service",
      action: "modify",
      path: "src/lib/quota/quota-service.ts",
      description: "Supprimer références Supabase du service quotas",
      executed: false,
    },

    // 5. Supprimer scripts Supabase obsolètes
    {
      name: "Delete Supabase Scripts",
      action: "delete",
      path: "scripts/setup-supabase-*.ts",
      description: "Supprimer scripts setup Supabase obsolètes",
      executed: false,
    },

    // 6. Supprimer fichiers SQL Supabase
    {
      name: "Delete SQL Files",
      action: "delete",
      path: "supabase-*.sql",
      description: "Supprimer fichiers SQL Supabase obsolètes",
      executed: false,
    },

    // 7. Nettoyer package.json - dépendances Supabase
    {
      name: "Clean Package.json",
      action: "modify",
      path: "package.json",
      description: "Supprimer dépendances Supabase non utilisées",
      executed: false,
    },

    // 8. Supprimer dossier supabase/ si vide
    {
      name: "Clean Supabase Dir",
      action: "delete",
      path: "supabase/",
      description: "Supprimer dossier supabase s'il est vide",
      executed: false,
    },
  ];
}

async function deleteFile(filePath: string): Promise<boolean> {
  try {
    if (filePath.includes("*")) {
      // Gestion des wildcards
      const dir = path.dirname(filePath);
      const pattern = path.basename(filePath);
      const regex = new RegExp(pattern.replace("*", ".*"));

      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        let deletedCount = 0;

        for (const file of files) {
          if (regex.test(file)) {
            const fullPath = path.join(dir, file);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              deletedCount++;
              console.log(`      - Supprimé: ${fullPath}`);
            }
          }
        }

        return deletedCount > 0;
      }
      return false;
    } else {
      // Fichier simple
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isDirectory()) {
          // Supprimer dossier s'il est vide
          const files = fs.readdirSync(filePath);
          if (files.length === 0) {
            fs.rmdirSync(filePath);
            return true;
          } else {
            console.log(
              `      ⚠️  Dossier non vide, non supprimé: ${filePath}`,
            );
            return false;
          }
        } else {
          fs.unlinkSync(filePath);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error(`      ❌ Erreur suppression ${filePath}:`, error);
    return false;
  }
}

async function cleanQuotaService(): Promise<{
  success: boolean;
  linesRemoved: number;
}> {
  const filePath = "src/lib/quota/quota-service.ts";

  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, linesRemoved: 0 };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const originalLines = content.split("\n").length;

    // Supprimer les imports Supabase et références
    const cleanedContent = content
      // Supprimer imports Supabase
      .replace(/import.*supabase.*from.*\n/gi, "")
      .replace(/import.*SupabaseBridge.*from.*\n/gi, "")
      // Supprimer commentaires sur legacy Supabase
      .replace(/\/\*\*[\s\S]*?LEGACY.*?Supabase[\s\S]*?\*\//gi, "")
      .replace(/\/\/ DEPRECATED.*Supabase.*/gi, "")
      // Supprimer méthodes legacy
      .replace(
        /private static async _legacySupabaseQuotaUpdate\(\)[\s\S]*?return null;\s*}/gi,
        "",
      )
      // Nettoyer commentaires obsolètes
      .replace(
        /\/\/ Les logs d'usage sont maintenant directement dans les audits\n/gi,
        "",
      )
      .replace(
        /\/\/ Cette méthode retourne un compteur basé sur les audits créés\n/gi,
        "",
      )
      // Supprimer lignes vides en trop
      .replace(/\n{3,}/g, "\n\n");

    fs.writeFileSync(filePath, cleanedContent);

    const newLines = cleanedContent.split("\n").length;
    const linesRemoved = originalLines - newLines;

    console.log(
      `      ✅ ${linesRemoved} lignes supprimées dans quota-service.ts`,
    );
    return { success: true, linesRemoved };
  } catch (error) {
    console.error(`      ❌ Erreur nettoyage quota-service.ts:`, error);
    return { success: false, linesRemoved: 0 };
  }
}

async function cleanPackageJson(): Promise<{
  success: boolean;
  removed: string[];
}> {
  const filePath = "package.json";

  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, removed: [] };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const packageJson = JSON.parse(content);

    const supabasePackages = ["@supabase/supabase-js"];

    const removed: string[] = [];

    // Supprimer des devDependencies seulement si pas utilisé ailleurs
    if (packageJson.devDependencies) {
      for (const pkg of supabasePackages) {
        if (packageJson.devDependencies[pkg]) {
          delete packageJson.devDependencies[pkg];
          removed.push(pkg);
        }
      }
    }

    // Ne pas toucher aux dependencies car @supabase/supabase-js pourrait être utilisé ailleurs

    // Supprimer scripts Supabase obsolètes
    if (packageJson.scripts) {
      const supabaseScripts = [
        "clean:supabase",
        // Garder clean:all car il peut être utilisé autrement
      ];

      for (const script of supabaseScripts) {
        if (packageJson.scripts[script]) {
          delete packageJson.scripts[script];
          removed.push(`script:${script}`);
        }
      }
    }

    fs.writeFileSync(filePath, `${JSON.stringify(packageJson, null, 2)  }\n`);

    console.log(`      ✅ Package.json nettoyé: ${removed.join(", ")}`);
    return { success: true, removed };
  } catch (error) {
    console.error(`      ❌ Erreur nettoyage package.json:`, error);
    return { success: false, removed: [] };
  }
}

async function executeCleanupTasks(
  tasks: CleanupTask[],
): Promise<CleanupStats> {
  console.log("🧹 Exécution des tâches de nettoyage...");

  const stats: CleanupStats = {
    tasks,
    filesDeleted: 0,
    filesModified: 0,
    linesRemoved: 0,
    errors: [],
  };

  for (const task of tasks) {
    console.log(`\n📋 ${task.name}: ${task.description}`);

    try {
      switch (task.action) {
        case "delete":
          const deleted = await deleteFile(task.path);
          if (deleted) {
            task.executed = true;
            stats.filesDeleted++;
            console.log(`   ✅ Supprimé: ${task.path}`);
          } else {
            console.log(
              `   ℹ️  Fichier inexistant ou non supprimé: ${task.path}`,
            );
          }
          break;

        case "modify":
          if (task.path === "src/lib/quota/quota-service.ts") {
            const quotaResult = await cleanQuotaService();
            if (quotaResult.success) {
              task.executed = true;
              stats.filesModified++;
              stats.linesRemoved += quotaResult.linesRemoved;
            } else {
              task.error = "Échec modification quota-service.ts";
            }
          } else if (task.path === "package.json") {
            const packageResult = await cleanPackageJson();
            if (packageResult.success) {
              task.executed = true;
              stats.filesModified++;
              console.log(
                `   ✅ Éléments supprimés: ${packageResult.removed.join(", ")}`,
              );
            } else {
              task.error = "Échec modification package.json";
            }
          }
          break;

        default:
          console.log(`   ⚠️  Action non supportée: ${task.action}`);
      }
    } catch (error) {
      const errorMsg = `Erreur tâche ${task.name}: ${error}`;
      task.error = errorMsg;
      stats.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  return stats;
}

function findSupabaseReferences(): string[] {
  console.log("🔍 Recherche des références Supabase restantes...");

  const references: string[] = [];

  const searchDirs = ["src/", "app/", "scripts/", "e2e/"];

  try {
    const searchPattern = /(supabase|SupabaseBridge|bridge\.ts)/gi;

    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const files = getAllTSFiles(dir);

        for (const file of files) {
          try {
            const content = fs.readFileSync(file, "utf-8");
            if (searchPattern.test(content)) {
              references.push(file);
            }
          } catch (error) {
            // Ignorer erreurs de lecture
          }
        }
      }
    }
  } catch (error) {
    console.error("   ❌ Erreur recherche références:", error);
  }

  return references;
}

function getAllTSFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!item.startsWith(".") && item !== "node_modules") {
          files.push(...getAllTSFiles(fullPath));
        }
      } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignorer erreurs de répertoire
  }

  return files;
}

function generateCleanupReport(stats: CleanupStats): void {
  console.log("\n📄 Génération rapport de nettoyage...");

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesDeleted: stats.filesDeleted,
      filesModified: stats.filesModified,
      linesRemoved: stats.linesRemoved,
      totalTasks: stats.tasks.length,
      executedTasks: stats.tasks.filter((t) => t.executed).length,
      errors: stats.errors.length,
    },
    tasks: stats.tasks.map((task) => ({
      name: task.name,
      action: task.action,
      path: task.path,
      executed: task.executed,
      error: task.error,
    })),
    remainingReferences: findSupabaseReferences(),
    nextSteps: [
      "Vérifier que l'application démarre: pnpm dev",
      "Exécuter les tests: pnpm test:e2e:complete",
      "Vérifier qu'aucune import cassé: pnpm ts",
      "Nettoyer les tables Supabase: scripts/cleanup-supabase-tables.ts",
    ],
  };

  fs.writeFileSync("./cleanup-report.json", JSON.stringify(report, null, 2));
  console.log("   ✅ Rapport sauvegardé: cleanup-report.json");

  // Afficher les références restantes
  if (report.remainingReferences.length > 0) {
    console.log(
      `\n⚠️  RÉFÉRENCES SUPABASE RESTANTES (${report.remainingReferences.length}):`,
    );
    report.remainingReferences.forEach((ref) => {
      console.log(`   • ${ref}`);
    });
  } else {
    console.log("\n✅ Aucune référence Supabase détectée dans le code");
  }
}

async function main() {
  try {
    console.log("🧹 NETTOYAGE FICHIERS ET CODE OBSOLÈTES");
    console.log(`🕐 ${  new Date().toLocaleString("fr-FR")}`);
    console.log("=".repeat(60));

    // 1. Backup de sécurité
    const backupSuccess = await createBackupBeforeCleanup();
    if (!backupSuccess) {
      console.log(
        "⚠️  Backup échoué, continuer quand même ? (Ctrl+C pour annuler)",
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // 2. Définir les tâches
    const tasks = defineCleanupTasks();

    // 3. Exécuter le nettoyage
    const stats = await executeCleanupTasks(tasks);

    // 4. Rapport final
    generateCleanupReport(stats);

    // Résumé
    console.log(`\n${  "=".repeat(60)}`);
    console.log("🎯 NETTOYAGE TERMINÉ");
    console.log("=".repeat(60));

    console.log(`✅ Fichiers supprimés:  ${stats.filesDeleted}`);
    console.log(`✅ Fichiers modifiés:   ${stats.filesModified}`);
    console.log(`✅ Lignes supprimées:   ${stats.linesRemoved}`);

    if (stats.errors.length > 0) {
      console.log(`❌ Erreurs:             ${stats.errors.length}`);
      console.log("   Voir cleanup-report.json pour détails");
    }

    console.log(`\n🎯 ÉTAPES SUIVANTES:`);
    console.log(`1. Vérifier compilation: pnpm ts`);
    console.log(`2. Tester l'application: pnpm dev`);
    console.log(`3. Exécuter tests E2E: pnpm test:e2e:complete`);
    console.log(
      `4. Nettoyer Supabase: pnpm tsx scripts/cleanup-supabase-tables.ts`,
    );
  } catch (error) {
    console.error("❌ Erreur durant le nettoyage:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
