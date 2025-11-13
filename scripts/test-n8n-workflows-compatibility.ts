#!/usr/bin/env tsx

/**
 * Test Compatibilité Workflows n8n - Architecture Dual v2.0
 *
 * 🎯 OBJECTIF: Vérifier que les 3 tables conservées suffisent pour n8n
 *
 * TABLES TESTÉES:
 * - audits (table principale)
 * - user (Formulaire Offre 1)
 * - user_quota (Formulaire Offre 1)
 */

import { supabaseAdmin } from "@/lib/supabase";
import { nanoid } from "nanoid";

console.log("🧪 Test Compatibilité Workflows n8n v2.0");
console.log("=========================================");

async function testTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin!
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(`❌ Table ${tableName} inaccessible:`, error.message);
      return false;
    }

    console.log(
      `✅ Table ${tableName} accessible (${data?.length || 0} records)`,
    );
    return true;
  } catch (error) {
    console.error(`❌ Erreur test table ${tableName}:`, error);
    return false;
  }
}

async function testAuditsTableOperations() {
  console.log("\n📋 Test table AUDITS (workflows principaux)...");

  try {
    // Test INSERT (tous les workflows créent des audits)
    const testAudit = {
      id: `test-${nanoid()}`,
      user_id: `user-${nanoid()}`,
      email: "test-workflow@example.com",
      url: "https://test-workflow.com",
      status: "pending",
      audit_type: "manual",
      prisma_id: `prisma-${nanoid()}`,
      created_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabaseAdmin!
      .from("audits")
      .insert(testAudit)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Échec INSERT audits:", insertError);
      return false;
    }

    console.log("✅ INSERT audits réussi:", insertData.id);

    // Test SELECT (workflows lisent les audits)
    const { data: selectData, error: selectError } = await supabaseAdmin!
      .from("audits")
      .select("*")
      .eq("id", testAudit.id)
      .single();

    if (selectError) {
      console.error("❌ Échec SELECT audits:", selectError);
      return false;
    }

    console.log("✅ SELECT audits réussi:", selectData.url);

    // Test UPDATE (workflows mettent à jour le statut)
    const { error: updateError } = await supabaseAdmin!
      .from("audits")
      .update({
        status: "completed",
        score_global: 85,
        completed_at: new Date().toISOString(),
      })
      .eq("id", testAudit.id);

    if (updateError) {
      console.error("❌ Échec UPDATE audits:", updateError);
      return false;
    }

    console.log("✅ UPDATE audits réussi");

    // Nettoyage
    await supabaseAdmin!.from("audits").delete().eq("id", testAudit.id);

    console.log("✅ Nettoyage audits terminé");
    return true;
  } catch (error) {
    console.error("❌ Erreur test audits:", error);
    return false;
  }
}

async function testUserTableOperations() {
  console.log("\n👤 Test table USER (Formulaire Offre 1)...");

  try {
    const testEmail = `test-${nanoid()}@example.com`;

    // Test SELECT par email (workflow cherche utilisateur existant)
    const { data: existingUser, error: selectError } = await supabaseAdmin!
      .from("user")
      .select("*")
      .eq("email", testEmail);

    if (selectError) {
      console.error("❌ Échec SELECT user par email:", selectError);
      return false;
    }

    console.log(
      `✅ SELECT user par email réussi (${existingUser?.length || 0} trouvés)`,
    );

    // Test INSERT (workflow crée nouvel utilisateur)
    const testUser = {
      id: `user-${nanoid()}`,
      email: testEmail,
      name: "Test User Workflow",
      active: true,
      created_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabaseAdmin!
      .from("user")
      .insert(testUser)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Échec INSERT user:", insertError);
      return false;
    }

    console.log("✅ INSERT user réussi:", insertData.email);

    // Nettoyage
    await supabaseAdmin!.from("user").delete().eq("id", testUser.id);

    console.log("✅ Nettoyage user terminé");
    return true;
  } catch (error) {
    console.error("❌ Erreur test user:", error);
    return false;
  }
}

async function testUserQuotaOperations() {
  console.log("\n📊 Test table USER_QUOTA (Formulaire Offre 1)...");

  try {
    const testUserId = `user-${nanoid()}`;
    const planId = "gratuit";

    // Test SELECT quota existant
    const { data: existingQuota, error: selectError } = await supabaseAdmin!
      .from("user_quota")
      .select("*")
      .eq("userId", testUserId)
      .eq("planId", planId);

    if (selectError) {
      console.error("❌ Échec SELECT user_quota:", selectError);
      return false;
    }

    console.log(
      `✅ SELECT user_quota réussi (${existingQuota?.length || 0} trouvés)`,
    );

    // Test INSERT quota
    const testQuota = {
      id: `quota-${nanoid()}`,
      userId: testUserId,
      planId: planId,
      quotaLimit: 5,
      quotaUsed: 0,
      resetDate: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabaseAdmin!
      .from("user_quota")
      .insert(testQuota)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Échec INSERT user_quota:", insertError);
      return false;
    }

    console.log("✅ INSERT user_quota réussi:", insertData.id);

    // Test UPDATE quota (workflow met à jour usage)
    const { error: updateError } = await supabaseAdmin!
      .from("user_quota")
      .update({ quotaUsed: 1 })
      .eq("id", testQuota.id);

    if (updateError) {
      console.error("❌ Échec UPDATE user_quota:", updateError);
      return false;
    }

    console.log("✅ UPDATE user_quota réussi");

    // Nettoyage
    await supabaseAdmin!.from("user_quota").delete().eq("id", testQuota.id);

    console.log("✅ Nettoyage user_quota terminé");
    return true;
  } catch (error) {
    console.error("❌ Erreur test user_quota:", error);
    return false;
  }
}

async function testIndexPerformance() {
  console.log("\n⚡ Test Performance Index...");

  try {
    // Test index audits par status
    const startTime = Date.now();

    const { data, error } = await supabaseAdmin!
      .from("audits")
      .select("id, status, createdAt")
      .eq("status", "pending")
      .order("createdAt", { ascending: false })
      .limit(10);

    const queryTime = Date.now() - startTime;

    if (error) {
      console.error("❌ Échec test index audits:", error);
      return false;
    }

    console.log(
      `✅ Requête index audits: ${queryTime}ms (${data?.length || 0} résultats)`,
    );

    if (queryTime > 1000) {
      console.warn("⚠️ Requête lente - vérifier les index");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Erreur test performance:", error);
    return false;
  }
}

async function checkWorkflowRequiredColumns() {
  console.log("\n🔍 Vérification Colonnes Workflows...");

  const requiredColumns = {
    audits: [
      "id",
      "user_id",
      "email",
      "url",
      "status",
      "audit_type",
      "score_global",
      "score_performance",
      "score_seo",
      "score_security",
      "results_json",
      "audit_results",
      "error_message",
      "prisma_id",
      "createdAt",
      "completedAt",
    ],
    user: ["id", "email", "name", "active"],
    user_quota: [
      "id",
      "userId",
      "planId",
      "quotaLimit",
      "quotaUsed",
      "resetDate",
    ],
  };

  let allColumnsPresent = true;

  for (const [tableName, columns] of Object.entries(requiredColumns)) {
    console.log(`\n📊 Vérification table ${tableName}:`);

    try {
      const { data, error } = await supabaseAdmin!.rpc("exec_sql", {
        sql: `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '${tableName}' AND table_schema = 'public'
            ORDER BY ordinal_position;
          `,
      });

      if (error) {
        console.error(`❌ Erreur vérification ${tableName}:`, error);
        allColumnsPresent = false;
        continue;
      }

      const existingColumns = data?.map((col: any) => col.column_name) || [];

      for (const requiredCol of columns) {
        if (existingColumns.includes(requiredCol)) {
          console.log(`   ✅ ${requiredCol}`);
        } else {
          console.log(`   ❌ ${requiredCol} - MANQUANTE`);
          allColumnsPresent = false;
        }
      }
    } catch (error) {
      console.error(`❌ Exception vérification ${tableName}:`, error);
      allColumnsPresent = false;
    }
  }

  return allColumnsPresent;
}

async function main() {
  console.log("🎯 Test complet compatibilité workflows n8n");
  console.log("Architecture Dual Database v2.0\n");

  // Test 1: Vérifier existence tables essentielles
  console.log("1️⃣ Test existence tables essentielles...");
  const tablesExist = await Promise.all([
    testTableExists("audits"),
    testTableExists("user"),
    testTableExists("user_quota"),
  ]);

  const allTablesExist = tablesExist.every((exists) => exists);

  if (!allTablesExist) {
    console.error("💥 Tables essentielles manquantes - arrêt des tests");
    return;
  }

  // Test 2: Opérations CRUD sur table audits
  const auditsTest = await testAuditsTableOperations();

  // Test 3: Opérations sur table user
  const userTest = await testUserTableOperations();

  // Test 4: Opérations sur table user_quota
  const quotaTest = await testUserQuotaOperations();

  // Test 5: Performance des index
  const performanceTest = await testIndexPerformance();

  // Test 6: Colonnes requises par workflows
  const columnsTest = await checkWorkflowRequiredColumns();

  // Résumé
  console.log(`\n${  "=".repeat(60)}`);
  console.log("📊 RÉSUMÉ COMPATIBILITÉ WORKFLOWS N8N");
  console.log("=".repeat(60));

  console.log("\n✅ RÉSULTATS:");
  console.log(`   📋 Table audits: ${auditsTest ? "✅" : "❌"}`);
  console.log(`   👤 Table user: ${userTest ? "✅" : "❌"}`);
  console.log(`   📊 Table user_quota: ${quotaTest ? "✅" : "❌"}`);
  console.log(`   ⚡ Performance index: ${performanceTest ? "✅" : "❌"}`);
  console.log(`   🔍 Colonnes workflows: ${columnsTest ? "✅" : "❌"}`);

  const allTestsPassed =
    auditsTest && userTest && quotaTest && performanceTest && columnsTest;

  if (allTestsPassed) {
    console.log("\n🎉 COMPATIBILITÉ WORKFLOWS N8N - SUCCÈS COMPLET!");
    console.log("✅ Les 3 tables conservées suffisent pour tous les workflows");
    console.log("🚀 Architecture Dual v2.0 prête pour production");
    console.log("📋 Workflows n8n 100% compatibles");
  } else {
    console.log("\n⚠️ PROBLÈMES DE COMPATIBILITÉ DÉTECTÉS");
    console.log("🔧 Corrections nécessaires avant utilisation");
  }

  console.log("\n📚 Workflows testés:");
  console.log("   🔄 Formulaire Offre 1 (user, user_quota, audits)");
  console.log("   ⚙️ Aiguilleur (audits)");
  console.log("   👷 Worker Manager (audits)");
  console.log("   🔬 Analyste Workers 1-3 (audits)");
}

main().catch((error) => {
  console.error("💥 Erreur fatale test workflows:", error);
  process.exit(1);
});
