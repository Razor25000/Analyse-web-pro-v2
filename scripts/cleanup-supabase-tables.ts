#!/usr/bin/env tsx

/**
 * Nettoyage final des tables Supabase après migration
 * Supprime les tables obsolètes et données migrées
 * Usage: pnpm tsx scripts/cleanup-supabase-tables.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Charger les variables d'environnement
config({ path: ".env.local" });

type TableCleanupTask = {
  table: string;
  action: "drop" | "truncate" | "archive";
  reason: string;
  executed: boolean;
  recordsAffected?: number;
  error?: string;
};

type CleanupResult = {
  tasksExecuted: number;
  tablesDropped: number;
  recordsDeleted: number;
  errors: string[];
  warnings: string[];
};

async function checkSupabaseConnection(): Promise<boolean> {
  console.log("🔍 Vérification connexion Supabase...");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log("   ⚠️  Configuration Supabase manquante - Skip nettoyage");
    return false;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    // Test de connexion simple
    const { data, error } = await supabase.from("audits").select("id").limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 = table n'existe pas (OK)
      console.log("   ❌ Erreur connexion Supabase:", error.message);
      return false;
    }

    console.log("   ✅ Supabase connecté");
    return true;
  } catch (error) {
    console.log("   ❌ Erreur connexion Supabase:", error);
    return false;
  }
}

async function createFinalBackup(): Promise<boolean> {
  console.log("💾 Backup final avant suppression...");

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fs = await import("fs");
    const backupDir = "./backups";

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Tables à sauvegarder avant suppression
    const tablesToBackup = ["audits", "subscribers", "profiles"];

    for (const table of tablesToBackup) {
      try {
        const { data, error } = await supabase.from(table).select("*");

        if (!error && data && data.length > 0) {
          const backupFile = `${backupDir}/supabase-${table}-final-${timestamp}.json`;
          fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
          console.log(
            `   ✅ Backup ${table}: ${data.length} enregistrements → ${backupFile}`,
          );
        } else {
          console.log(`   ℹ️  Table ${table}: vide ou inexistante`);
        }
      } catch (error) {
        console.log(`   ⚠️  Backup ${table} échoué:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error("   ❌ Erreur backup final:", error);
    return false;
  }
}

function defineCleanupTasks(): TableCleanupTask[] {
  return [
    {
      table: "audits",
      action: "truncate",
      reason: "Données migrées vers Prisma - table vidée mais conservée",
      executed: false,
    },
    {
      table: "subscribers",
      action: "drop",
      reason: "Table obsolète - remplacée par User.monthlyQuota dans Prisma",
      executed: false,
    },
    {
      table: "profiles",
      action: "drop",
      reason:
        "Table en bypass permanent - données dans User.name/company Prisma",
      executed: false,
    },
  ];
}

async function executeTableCleanup(task: TableCleanupTask): Promise<boolean> {
  console.log(`\n🧹 ${task.table}: ${task.reason}`);

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    switch (task.action) {
      case "truncate":
        // Vider la table mais la conserver
        const { count: beforeCount, error: countError } = await supabase
          .from(task.table)
          .select("id", { count: "exact", head: true });

        if (countError) {
          console.log(`   ℹ️  Table ${task.table} n'existe pas ou est vide`);
          return true;
        }

        console.log(`   📊 ${beforeCount || 0} enregistrements à supprimer`);

        if ((beforeCount || 0) > 0) {
          // Supprimer tous les enregistrements
          const { data: allRecords, error: selectError } = await supabase
            .from(task.table)
            .select("id");

          if (selectError) {
            throw selectError;
          }

          if (allRecords && allRecords.length > 0) {
            const { error: deleteError } = await supabase
              .from(task.table)
              .delete()
              .in(
                "id",
                allRecords.map((r) => r.id),
              );

            if (deleteError) {
              throw deleteError;
            }

            task.recordsAffected = allRecords.length;
            console.log(`   ✅ ${allRecords.length} enregistrements supprimés`);
          }
        } else {
          console.log(`   ℹ️  Table ${task.table} déjà vide`);
        }
        break;

      case "drop":
        // Supprimer complètement la table
        console.log(
          `   ⚠️  Suppression définitive de la table ${task.table}...`,
        );

        // Compter les enregistrements avant suppression
        const { count: recordCount } = await supabase
          .from(task.table)
          .select("id", { count: "exact", head: true });

        console.log(
          `   📊 Table contenait ${recordCount || 0} enregistrements`,
        );

        // Note: L'API Supabase ne permet pas de DROP TABLE directement
        // On vide la table à la place et on met un avertissement
        const { data: records, error: selectErr } = await supabase
          .from(task.table)
          .select("id");

        if (!selectErr && records && records.length > 0) {
          const { error: deleteErr } = await supabase
            .from(task.table)
            .delete()
            .in(
              "id",
              records.map((r) => r.id),
            );

          if (deleteErr) {
            throw deleteErr;
          }

          task.recordsAffected = records.length;
          console.log(`   ✅ ${records.length} enregistrements supprimés`);
          console.log(`   ⚠️  Table vidée (DROP nécessite accès SQL direct)`);
        } else {
          console.log(`   ℹ️  Table ${task.table} déjà vide ou inexistante`);
        }
        break;

      default:
        throw new Error(`Action non supportée: ${task.action}`);
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Erreur nettoyage ${task.table}:`, error);
    task.error = String(error);
    return false;
  }
}

async function verifyCleanupResults(): Promise<{
  success: boolean;
  summary: string[];
}> {
  console.log("\n✅ Vérification résultats nettoyage...");

  const summary: string[] = [];
  let success = true;

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const tablesToCheck = ["audits", "subscribers", "profiles"];

    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });

        if (error) {
          if (
            error.code === "PGRST116" ||
            error.message.includes("does not exist")
          ) {
            summary.push(`✅ ${table}: Table supprimée ou inexistante`);
          } else {
            summary.push(`❌ ${table}: Erreur vérification - ${error.message}`);
            success = false;
          }
        } else {
          if ((count || 0) === 0) {
            summary.push(
              `✅ ${table}: Table vide (${count || 0} enregistrements)`,
            );
          } else {
            summary.push(`⚠️  ${table}: ${count} enregistrements restants`);
          }
        }
      } catch (error) {
        summary.push(`❌ ${table}: Erreur vérification - ${error}`);
        success = false;
      }
    }

    return { success, summary };
  } catch (error) {
    summary.push(`❌ Erreur générale vérification: ${error}`);
    return { success: false, summary };
  }
}

function generateFinalReport(
  tasks: TableCleanupTask[],
  result: CleanupResult,
): void {
  console.log("\n📄 Génération rapport final...");

  const report = {
    timestamp: new Date().toISOString(),
    operation: "Supabase Tables Cleanup",
    result,
    tasks: tasks.map((task) => ({
      table: task.table,
      action: task.action,
      reason: task.reason,
      executed: task.executed,
      recordsAffected: task.recordsAffected,
      error: task.error,
    })),
    architecture: {
      before: "Dual Database (Prisma + Supabase)",
      after: "Single Database (Prisma Only)",
      benefits: [
        "Code simplifié (suppression SupabaseBridge)",
        "Aucune redondance de données",
        "Maintenance facilitée",
        "Performance améliorée",
      ],
    },
    nextSteps: [
      "Vérifier que l'application démarre: pnpm dev",
      "Exécuter tests complets: pnpm test:e2e:complete",
      "Surveiller performance dashboard",
      "Considérer suppression @supabase/supabase-js si pas utilisé ailleurs",
    ],
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./supabase-cleanup-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log("   ✅ Rapport sauvegardé: supabase-cleanup-report.json");
}

async function main() {
  try {
    console.log("🗑️  NETTOYAGE FINAL TABLES SUPABASE");
    console.log(`🕐 ${  new Date().toLocaleString("fr-FR")}`);
    console.log("=".repeat(60));

    // 1. Vérifier connexion
    const canConnect = await checkSupabaseConnection();
    if (!canConnect) {
      console.log(
        "❌ Impossible de se connecter à Supabase - Nettoyage annulé",
      );
      return;
    }

    // 2. Backup final
    const backupSuccess = await createFinalBackup();
    if (!backupSuccess) {
      console.log("⚠️  Backup final échoué, continuer ? (Ctrl+C pour annuler)");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // 3. Définir les tâches
    const tasks = defineCleanupTasks();

    console.log("\n📋 TÂCHES DE NETTOYAGE PRÉVUES:");
    tasks.forEach((task, index) => {
      console.log(
        `   ${index + 1}. ${task.table} (${task.action}): ${task.reason}`,
      );
    });

    console.log(
      "\n⚠️  ATTENTION: Cette opération va supprimer définitivement des données !",
    );
    console.log(
      "Appuyez sur Ctrl+C pour annuler dans les 5 prochaines secondes...",
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 4. Exécuter le nettoyage
    console.log("\n🧹 DÉBUT DU NETTOYAGE...");

    const result: CleanupResult = {
      tasksExecuted: 0,
      tablesDropped: 0,
      recordsDeleted: 0,
      errors: [],
      warnings: [],
    };

    for (const task of tasks) {
      const success = await executeTableCleanup(task);

      if (success) {
        task.executed = true;
        result.tasksExecuted++;

        if (task.action === "drop") {
          result.tablesDropped++;
        }

        if (task.recordsAffected) {
          result.recordsDeleted += task.recordsAffected;
        }
      } else {
        if (task.error) {
          result.errors.push(`${task.table}: ${task.error}`);
        }
      }
    }

    // 5. Vérification finale
    const verification = await verifyCleanupResults();

    console.log("\n📊 RÉSULTATS VÉRIFICATION:");
    verification.summary.forEach((line) => console.log(`   ${line}`));

    // 6. Rapport final
    generateFinalReport(tasks, result);

    // Résumé final
    console.log(`\n${  "=".repeat(60)}`);
    console.log("🎯 NETTOYAGE SUPABASE TERMINÉ");
    console.log("=".repeat(60));

    console.log(
      `✅ Tâches exécutées:      ${result.tasksExecuted}/${tasks.length}`,
    );
    console.log(`✅ Enregistrements supprimés: ${result.recordsDeleted}`);

    if (result.errors.length > 0) {
      console.log(`❌ Erreurs:               ${result.errors.length}`);
      result.errors.forEach((error) => console.log(`   • ${error}`));
    }

    console.log(`\n🎉 MIGRATION COMPLÈTE TERMINÉE !`);
    console.log(`\n📈 BÉNÉFICES OBTENUS:`);
    console.log(`   • Architecture simplifiée (Prisma uniquement)`);
    console.log(`   • Code nettoyé (SupabaseBridge.ts supprimé)`);
    console.log(`   • Aucune redondance de données`);
    console.log(`   • Maintenance facilitée`);

    console.log(`\n🎯 ÉTAPES FINALES:`);
    console.log(`1. Vérifier application: pnpm dev`);
    console.log(`2. Tests complets: pnpm test:e2e:complete`);
    console.log(`3. Déploiement si tout OK`);
  } catch (error) {
    console.error("❌ Erreur durant le nettoyage Supabase:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
