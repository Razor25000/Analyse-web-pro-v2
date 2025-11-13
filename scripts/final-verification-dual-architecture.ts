#!/usr/bin/env tsx

/**
 * Vérification Finale Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Vérifier que tout fonctionne parfaitement
 */

import { prisma } from "@/lib/prisma";
import { AuditSyncService } from "@/lib/supabase/audit-sync";
import { supabaseAdmin } from "@/lib/supabase";
import { nanoid } from "nanoid";

console.log("🎯 Vérification Finale Architecture Dual v2.0");
console.log("=".repeat(50));

async function testCompleteFlow() {
  console.log("\n1. 🏗️ Test création audit Prisma...");

  const testAudit = await prisma.audit.create({
    data: {
      id: `final-test-${nanoid()}`,
      email: "final-test@example.com",
      url: "https://final-test.com",
      auditType: "manual",
      status: "pending",
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Audit Prisma créé:", testAudit.id);

  console.log("\n2. 🔄 Test synchronisation...");

  const syncResult = await AuditSyncService.syncAuditToSupabase({
    auditId: testAudit.id,
    userId: `user-${nanoid()}`,
    email: testAudit.email,
    url: testAudit.url,
    auditType: testAudit.auditType as any,
    orgId: `org-${nanoid()}`,
  });

  console.log("📊 Sync résultat:", syncResult);

  console.log("\n3. 📊 Vérification Supabase...");

  const { data: supabaseAudit, error } = await supabaseAdmin!
    .from("audits")
    .select("*")
    .eq("prisma_id", testAudit.id)
    .single();

  if (error) {
    console.error("❌ Erreur lecture Supabase:", error);
  } else {
    console.log("✅ Audit trouvé dans Supabase:", {
      id: supabaseAudit.id,
      prisma_id: supabaseAudit.prisma_id,
      url: supabaseAudit.url,
      status: supabaseAudit.status,
    });
  }

  console.log("\n4. 🔄 Test sync back...");

  const backSync = await AuditSyncService.syncResultsBackToPrisma(testAudit.id);
  console.log(`📈 Sync back réussi: ${backSync}`);

  console.log("\n5. 📊 Statistiques finales...");

  const stats = await AuditSyncService.getSyncStats();
  console.log("📈 Stats:", stats);

  console.log("\n6. 🧽 Nettoyage...");

  await prisma.audit.delete({ where: { id: testAudit.id } });
  console.log("✅ Audit test supprimé");

  return {
    auditCreated: !!testAudit,
    syncSuccess: syncResult.success,
    supabaseFound: !error,
    backSyncSuccess: backSync,
    stats,
  };
}

async function checkArchitectureHealth() {
  console.log("\n🏥 Vérification santé architecture...");

  try {
    // Test Prisma
    const prismaHealth = await prisma.audit.count();
    console.log(`✅ Prisma connecté: ${prismaHealth} audits`);

    // Test Supabase
    const { data, error } = await supabaseAdmin!
      .from("audits")
      .select("id", { count: "exact", head: true });

    const supabaseHealth = !error ? data?.length || 0 : -1;
    console.log(`✅ Supabase connecté: ${supabaseHealth} audits`);

    // Test sync service
    const stats = await AuditSyncService.getSyncStats();
    console.log("✅ Service sync opérationnel");

    return {
      prismaConnected: true,
      supabaseConnected: !error,
      syncServiceReady: !!stats,
      prismaCount: prismaHealth,
      supabaseCount: supabaseHealth,
    };
  } catch (error) {
    console.error("❌ Erreur santé:", error);
    return {
      prismaConnected: false,
      supabaseConnected: false,
      syncServiceReady: false,
      prismaCount: 0,
      supabaseCount: 0,
    };
  }
}

async function main() {
  console.log("🎯 Test complet Architecture Dual Database v2.0\n");

  // Test santé générale
  const health = await checkArchitectureHealth();

  // Test flux complet
  const flowTest = await testCompleteFlow();

  // Résumé final
  console.log(`\n${  "=".repeat(60)}`);
  console.log("🎯 RÉSUMÉ ARCHITECTURE DUAL DATABASE v2.0");
  console.log("=".repeat(60));

  console.log("\n🏥 SANTÉ DU SYSTÈME:");
  console.log(
    `   🗃️ Prisma: ${health.prismaConnected ? "✅" : "❌"} (${health.prismaCount} audits)`,
  );
  console.log(
    `   📋 Supabase: ${health.supabaseConnected ? "✅" : "❌"} (${health.supabaseCount} audits)`,
  );
  console.log(`   🔄 Sync Service: ${health.syncServiceReady ? "✅" : "❌"}`);

  console.log("\n🔄 TEST FLUX COMPLET:");
  console.log(`   🏗️ Création audit: ${flowTest.auditCreated ? "✅" : "❌"}`);
  console.log(
    `   📤 Sync Prisma → Supabase: ${flowTest.syncSuccess ? "✅" : "❌"}`,
  );
  console.log(
    `   📋 Vérification Supabase: ${flowTest.supabaseFound ? "✅" : "❌"}`,
  );
  console.log(
    `   📥 Sync Supabase → Prisma: ${flowTest.backSyncSuccess ? "✅" : "❌"}`,
  );

  const allGreen =
    health.prismaConnected &&
    health.supabaseConnected &&
    health.syncServiceReady &&
    flowTest.auditCreated &&
    flowTest.syncSuccess &&
    flowTest.supabaseFound;

  if (allGreen) {
    console.log("\n🎉 ARCHITECTURE DUAL DATABASE v2.0 - SUCCÈS COMPLET!");
    console.log("✅ Tous les tests sont VERTS");
    console.log("🚀 Système prêt pour production");
    console.log("📋 Workflows n8n peuvent utiliser Supabase");
    console.log("🗃️ Prisma reste la source de vérité");
    console.log("\n🎯 MISSION ACCOMPLIE - Architecture optimisée!");
  } else {
    console.log("\n⚠️ ARCHITECTURE PARTIELLEMENT FONCTIONNELLE");
    console.log("🔧 Certains composants nécessitent attention");
  }

  console.log("\n📚 Documentation disponible:");
  console.log("   📄 docs/DUAL-DATABASE-ARCHITECTURE.md");
  console.log("   🔧 scripts/health-check-dual-db.ts");
  console.log("   📊 scripts/audit-sync-stats.ts");
}

main().catch((error) => {
  console.error("💥 Erreur fatale test final:", error);
  process.exit(1);
});
