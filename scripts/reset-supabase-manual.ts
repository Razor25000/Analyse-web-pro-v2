#!/usr/bin/env tsx

/**
 * Reset Supabase Manual - Architecture Dual v2.0
 *
 * 🎯 OBJECTIF: Suppression manuelle des tables inutiles via SDK Supabase
 */

import { supabaseAdmin } from "@/lib/supabase";

console.log("🧹 Reset Supabase Manuel v2.0");
console.log("==============================");

async function checkCurrentTables() {
  console.log("\n1️⃣ État actuel des tables...");

  const tablesToCheck = [
    "audits",
    "user",
    "user_quota", // À conserver
    "feedback",
    "account",
    "batch_jobs",
    "payment_history",
    "reports",
    "session",
    "subscription",
    "user_preferences",
    "verification", // À supprimer
  ];

  const existingTables: string[] = [];
  const tablesToRemove: string[] = [];

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabaseAdmin!
        .from(table)
        .select("*", { count: "exact", head: true });

      if (!error) {
        existingTables.push(table);

        if (["audits", "user", "user_quota"].includes(table)) {
          console.log(
            `   ✅ ${table}: ${count || 0} enregistrements - À CONSERVER`,
          );
        } else {
          console.log(
            `   🗑️ ${table}: ${count || 0} enregistrements - À SUPPRIMER`,
          );
          tablesToRemove.push(table);
        }
      } else {
        console.log(`   ❌ ${table}: n'existe pas`);
      }
    } catch (e) {
      console.log(`   ❌ ${table}: erreur d'accès`);
    }
  }

  return { existingTables, tablesToRemove };
}

async function analyzeUserQuotaStructure() {
  console.log("\n2️⃣ Analyse structure user_quota...");

  try {
    const { data, error } = await supabaseAdmin!
      .from("user_quota")
      .select("*")
      .limit(1);

    if (error) {
      console.log("❌ Erreur accès user_quota:", error.message);
      return null;
    }

    if (data && data.length > 0) {
      console.log("📊 Structure actuelle user_quota:");
      const columns = Object.keys(data[0]);
      columns.forEach((col) => {
        console.log(`   📋 ${col}: ${typeof data[0][col]} = ${data[0][col]}`);
      });

      return columns;
    }

    console.log("📋 Table user_quota vide");
    return [];
  } catch (error) {
    console.log("❌ Exception user_quota:", error);
    return null;
  }
}

async function testWorkflowQueries() {
  console.log("\n3️⃣ Test requêtes workflows n8n...");

  // Test 1: Requête audits par status (workflow principal)
  try {
    const { data: audits, error: auditsError } = await supabaseAdmin!
      .from("audits")
      .select("id, status, user_id, email")
      .eq("status", "pending")
      .limit(5);

    if (auditsError) {
      console.log("❌ Test audits:", auditsError.message);
    } else {
      console.log(`✅ Audits query: ${audits?.length || 0} résultats`);
    }
  } catch (e) {
    console.log("❌ Exception audits query");
  }

  // Test 2: Requête user par email (workflow formulaire)
  try {
    const { data: users, error: usersError } = await supabaseAdmin!
      .from("user")
      .select("id, email, name")
      .limit(3);

    if (usersError) {
      console.log("❌ Test users:", usersError.message);
    } else {
      console.log(`✅ Users query: ${users?.length || 0} résultats`);
      if (users && users.length > 0) {
        console.log(`   📧 Exemple: ${users[0].email}`);
      }
    }
  } catch (e) {
    console.log("❌ Exception users query");
  }

  // Test 3: Requête user_quota (workflow gestion quotas)
  try {
    // Test différentes colonnes possibles
    const possibleQueries = [
      ["userId", "quotaLimit", "quotaUsed"],
      ["user_id", "quota_limit", "quota_used"],
      ["userId", "planId", "quotaLimit"],
    ];

    for (const columns of possibleQueries) {
      try {
        const { data: quotas, error: quotasError } = await supabaseAdmin!
          .from("user_quota")
          .select(columns.join(", "))
          .limit(2);

        if (!quotasError) {
          console.log(
            `✅ User_quota query (${columns.join(", ")}): ${quotas?.length || 0} résultats`,
          );
          if (quotas && quotas.length > 0) {
            console.log(`   📊 Structure OK:`, quotas[0]);
          }
          break; // Sortir dès qu'une query fonctionne
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    console.log("❌ Exception user_quota query");
  }
}

async function generateManualCleanupInstructions(tablesToRemove: string[]) {
  console.log("\n4️⃣ Instructions nettoyage manuel...");

  console.log("\n📋 MÉTHODE 1 - Via Supabase Dashboard:");
  console.log("1. Aller sur https://supabase.com/dashboard");
  console.log("2. Sélectionner votre projet");
  console.log("3. Aller dans Table Editor");
  console.log("4. Supprimer les tables suivantes:");

  tablesToRemove.forEach((table, i) => {
    console.log(`   ${i + 1}. ${table} (clic droit → Delete table)`);
  });

  console.log("\n📋 MÉTHODE 2 - Via SQL Editor:");
  console.log("Coller le SQL suivant dans l'éditeur SQL:");
  console.log("\n```sql");
  tablesToRemove.forEach((table) => {
    console.log(`DROP TABLE IF EXISTS public.${table} CASCADE;`);
  });
  console.log("```");

  console.log("\n✅ TABLES À CONSERVER:");
  console.log("   📋 audits (workflows principaux)");
  console.log("   👤 user (formulaires n8n)");
  console.log("   📊 user_quota (gestion quotas)");
}

async function main() {
  console.log("🎯 Analyse et Instructions Nettoyage Supabase");
  console.log("Architecture Dual Database v2.0\n");

  // Étape 1: Analyser l'état actuel
  const { existingTables, tablesToRemove } = await checkCurrentTables();

  // Étape 2: Analyser structure user_quota
  const quotaStructure = await analyzeUserQuotaStructure();

  // Étape 3: Tester requêtes workflows
  await testWorkflowQueries();

  // Étape 4: Générer instructions
  if (tablesToRemove.length > 0) {
    await generateManualCleanupInstructions(tablesToRemove);
  }

  // Résumé
  console.log(`\n${  "=".repeat(60)}`);
  console.log("📊 RÉSUMÉ ANALYSE");
  console.log("=".repeat(60));

  console.log(`\n📋 Tables existantes: ${existingTables.length}`);
  console.log(`🗑️ Tables à supprimer: ${tablesToRemove.length}`);
  console.log(`✅ Tables à conserver: 3 (audits, user, user_quota)`);

  if (tablesToRemove.length === 0) {
    console.log("\n🎉 SUPABASE DÉJÀ OPTIMISÉ!");
    console.log("✅ Seules les tables nécessaires sont présentes");
  } else {
    console.log("\n⚠️ NETTOYAGE REQUIS");
    console.log("📋 Suivez les instructions ci-dessus");
  }

  console.log(
    `\n🚀 Architecture Dual v2.0 - Statut: ${tablesToRemove.length === 0 ? "PRÊT" : "EN ATTENTE NETTOYAGE"}`,
  );
}

main().catch((error) => {
  console.error("💥 Erreur analyse:", error);
  process.exit(1);
});
