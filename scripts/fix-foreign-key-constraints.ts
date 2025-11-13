#!/usr/bin/env tsx

/**
 * Fix Foreign Key Constraints - Architecture Dual v2.0
 *
 * 🎯 OBJECTIF: Résoudre les contraintes FK bloquantes dans Supabase
 *
 * PROBLÈME IDENTIFIÉ:
 * "insert or update on table "user_quota" violates foreign key constraint "user_quota_userid_fkey""
 *
 * SOLUTIONS POSSIBLES:
 * 1. Supprimer la contrainte FK (RAPIDE)
 * 2. Créer utilisateurs dans Supabase user avant quota (PROPER)
 * 3. Modifier l'ordre des opérations dans QuotaSyncService
 */

import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

console.log("🔧 Fix Foreign Key Constraints v2.0");
console.log("===================================");

async function analyzeForeignKeyConstraints() {
  console.log("\n1️⃣ Analyse contraintes FK actuelles...");

  try {
    // 1.1 Analyser les contraintes sur user_quota
    console.log("📊 Contraintes table user_quota:");

    const { data: userQuotaConstraints, error } = await supabaseAdmin!
      .from("user_quota")
      .select("*")
      .limit(0); // Juste pour voir la structure

    if (error) {
      console.log(`❌ Erreur accès user_quota: ${error.message}`);
    } else {
      console.log("✅ Table user_quota accessible");
    }

    // 1.2 Vérifier structure table user
    const { data: userTable, error: userError } = await supabaseAdmin!
      .from("user")
      .select("*")
      .limit(1);

    if (userError) {
      console.log(`❌ Erreur table user: ${userError.message}`);
    } else {
      console.log("✅ Table user accessible");
      if (userTable && userTable.length > 0) {
        console.log("📋 Exemple user:", Object.keys(userTable[0]));
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Erreur analyse FK:", error);
    return false;
  }
}

async function testForeignKeyIssue() {
  console.log("\n2️⃣ Test reproduction erreur FK...");

  const testUserId = `fk-test-${nanoid()}`;

  try {
    // Tentative création quota SANS créer user d'abord
    console.log("🧪 Test: Création quota sans user...");

    const { error: quotaError } = await supabaseAdmin!
      .from("user_quota")
      .insert({
        id: `quota-${nanoid()}`,
        userId: testUserId,
        planId: "gratuit",
        auditsUsed: 0,
        auditsLimit: 5,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        resetDay: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (quotaError) {
      console.log(`✅ Erreur FK reproduite: ${quotaError.message}`);

      if (quotaError.message.includes("foreign key constraint")) {
        console.log(
          "🎯 Confirmation: Contrainte FK user_quota_userid_fkey active",
        );
        return { hasFK: true, constraintName: "user_quota_userid_fkey" };
      }
    } else {
      console.log("⚠️ Pas de contrainte FK détectée");
      // Nettoyer le test
      await supabaseAdmin!.from("user_quota").delete().eq("userId", testUserId);
      return { hasFK: false };
    }
  } catch (error) {
    console.log("❌ Exception test FK:", error);
    return { hasFK: true, error };
  }
}

async function implementSolution1_DropConstraint() {
  console.log("\n3️⃣ SOLUTION 1: Supprimer contrainte FK...");

  try {
    console.log("⚠️ Cette solution nécessite accès SQL direct");
    console.log("📋 Commande SQL à exécuter dans Supabase Dashboard:");
    console.log("```sql");
    console.log(
      "ALTER TABLE public.user_quota DROP CONSTRAINT IF EXISTS user_quota_userid_fkey;",
    );
    console.log("```");

    console.log("\n🔗 Instructions:");
    console.log("1. Aller sur https://supabase.com/dashboard");
    console.log("2. Sélectionner votre projet");
    console.log("3. Aller dans SQL Editor");
    console.log("4. Coller la commande SQL ci-dessus");
    console.log("5. Exécuter");

    return {
      solution: "manual",
      instructions: "DROP CONSTRAINT user_quota_userid_fkey",
    };
  } catch (error) {
    console.error("❌ Erreur solution 1:", error);
    return { solution: "failed", error };
  }
}

async function implementSolution2_CreateUsersFirst() {
  console.log("\n4️⃣ SOLUTION 2: Créer users avant quotas...");

  const testUserId = `solution2-${nanoid()}`;
  const testEmail = `solution2-${nanoid()}@example.com`;

  try {
    // 2.1 Créer user d'abord
    console.log("👤 Créer user en premier...");

    const { data: userCreated, error: userError } = await supabaseAdmin!
      .from("user")
      .insert({
        id: testUserId,
        email: testEmail,
        name: "Test Solution 2",
        active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.log(`❌ Erreur création user: ${userError.message}`);
      return { solution: "failed", error: userError.message };
    }

    console.log(`✅ User créé: ${userCreated.id}`);

    // 2.2 Créer quota APRÈS user
    console.log("📊 Créer quota après user...");

    const { data: quotaCreated, error: quotaError } = await supabaseAdmin!
      .from("user_quota")
      .insert({
        id: `quota-${nanoid()}`,
        userId: testUserId,
        planId: "gratuit",
        auditsUsed: 0,
        auditsLimit: 5,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        resetDay: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (quotaError) {
      console.log(`❌ Erreur création quota: ${quotaError.message}`);

      // Nettoyer user créé
      await supabaseAdmin!.from("user").delete().eq("id", testUserId);
      return { solution: "failed", error: quotaError.message };
    }

    console.log(`✅ Quota créé: ${quotaCreated.id}`);
    console.log("🎉 SOLUTION 2 FONCTIONNE!");

    // Nettoyage
    await supabaseAdmin!.from("user_quota").delete().eq("userId", testUserId);
    await supabaseAdmin!.from("user").delete().eq("id", testUserId);

    return {
      solution: "create_users_first",
      success: true,
      recommendation:
        "Modifier QuotaSyncService pour créer users Supabase avant quotas",
    };
  } catch (error) {
    console.error("❌ Exception solution 2:", error);
    // Nettoyage en cas d'erreur
    await supabaseAdmin!
      .from("user_quota")
      .delete()
      .eq("userId", testUserId)
      .catch(() => {});
    await supabaseAdmin!
      .from("user")
      .delete()
      .eq("id", testUserId)
      .catch(() => {});
    return { solution: "failed", error };
  }
}

async function updateQuotaSyncService() {
  console.log("\n5️⃣ Mise à jour QuotaSyncService...");

  console.log("🔄 Modifications nécessaires dans QuotaSyncService:");
  console.log("1. Ajouter méthode ensureSupabaseUser()");
  console.log("2. Appeler ensureSupabaseUser() avant initializeUserQuota()");
  console.log("3. Créer user dans Supabase si n'existe pas");

  console.log("\n📝 Code à ajouter:");
  console.log("```typescript");
  console.log(`
  private static async ensureSupabaseUser(userId: string, email: string, name?: string): Promise<boolean> {
    try {
      // Vérifier si user existe
      const { data: existingUser } = await supabaseAdmin!
        .from('user')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingUser) {
        return true; // User existe déjà
      }

      // Créer user dans Supabase
      const { error } = await supabaseAdmin!
        .from('user')
        .insert({
          id: userId,
          email: email,
          name: name || "User",
          active: true,
          created_at: new Date().toISOString()
        });

      return !error;
    } catch (error) {
      console.error("❌ Erreur ensureSupabaseUser:", error);
      return false;
    }
  }
  `);
  console.log("```");

  return {
    recommendation: "update_service",
    file: "src/lib/supabase/quota-sync.ts",
    method: "ensureSupabaseUser",
  };
}

async function main() {
  console.log("🎯 Diagnostic et résolution contraintes FK");
  console.log("Architecture Dual Database v2.0\n");

  const results = {
    analysis: false,
    fkDetected: false,
    solution1: null as any,
    solution2: null as any,
    recommendation: "",
  };

  // Étape 1: Analyser contraintes
  results.analysis = await analyzeForeignKeyConstraints();

  // Étape 2: Reproduire l'erreur
  const fkTest = await testForeignKeyIssue();
  results.fkDetected = fkTest.hasFK;

  if (results.fkDetected) {
    // Étape 3: Tester Solution 1 (Drop constraint)
    results.solution1 = await implementSolution1_DropConstraint();

    // Étape 4: Tester Solution 2 (Create users first)
    results.solution2 = await implementSolution2_CreateUsersFirst();

    // Étape 5: Recommandation service
    const serviceUpdate = await updateQuotaSyncService();
    results.recommendation = serviceUpdate.recommendation;
  }

  // Résumé final
  console.log(`\n${  "=".repeat(60)}`);
  console.log("🏁 RÉSUMÉ DIAGNOSTIC FK CONSTRAINTS");
  console.log("=".repeat(60));

  console.log(`\n📊 DIAGNOSTIC:`);
  console.log(`   🔍 Analyse contraintes: ${results.analysis ? "✅" : "❌"}`);
  console.log(
    `   ⚠️ FK constraint détectée: ${results.fkDetected ? "✅" : "❌"}`,
  );

  if (results.fkDetected) {
    console.log(`\n🛠️ SOLUTIONS TESTÉES:`);

    if (results.solution1) {
      console.log(
        `   1️⃣ Drop Constraint: ${results.solution1.solution} (manuel requis)`,
      );
    }

    if (results.solution2?.success) {
      console.log(`   2️⃣ Create Users First: ✅ FONCTIONNE`);
      console.log(`   📝 Recommandation: ${results.solution2.recommendation}`);
    }
  }

  // Recommandation finale
  if (results.solution2?.success) {
    console.log("\n🎯 SOLUTION RECOMMANDÉE:");
    console.log("✅ Modifier QuotaSyncService.initializeUserQuota()");
    console.log("✅ Ajouter méthode ensureSupabaseUser()");
    console.log("✅ Créer users Supabase avant quotas");
    console.log("\n🚀 Cette solution préserve l'intégrité référentielle");
  } else {
    console.log("\n⚠️ Solution manuelle requise:");
    console.log("🔧 Supprimer contrainte FK via SQL Dashboard");
  }
}

main().catch((error) => {
  console.error("💥 Erreur diagnostic FK:", error);
  process.exit(1);
});
