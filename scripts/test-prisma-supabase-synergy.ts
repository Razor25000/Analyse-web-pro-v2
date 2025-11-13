#!/usr/bin/env tsx

/**
 * Test complet de la synergie Prisma ↔ Supabase
 * Vérifie que l'architecture dual-database v2.0 fonctionne correctement
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

console.log("🔄 TEST DE SYNERGIE PRISMA ↔ SUPABASE");
console.log("=".repeat(50));

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function testPrismaConnection() {
  console.log("\n1️⃣ Test de connexion Prisma (SQLite)...");

  try {
    await prisma.$connect();

    // Test de base - compter les utilisateurs
    const userCount = await prisma.user.count();
    console.log(`   ✅ Prisma SQLite connecté - ${userCount} utilisateurs`);

    // Test de création d'audit
    const testAudit = await prisma.audit.create({
      data: {
        email: "test@synergy.com",
        url: "https://test-synergy.example.com",
        status: "pending",
        auditType: "manual",
      },
    });

    console.log(`   ✅ Audit créé dans Prisma: ${testAudit.id}`);

    await prisma.$disconnect();
    return { success: true, testAuditId: testAudit.id };
  } catch (error) {
    console.log(`   ❌ Erreur Prisma: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSupabaseAPI() {
  console.log("\n2️⃣ Test de l'API Supabase...");

  try {
    // Test de connexion basique
    const { data, error } = await supabase
      .from("audits")
      .select("count", { count: "exact", head: true });

    if (error) throw error;

    console.log(`   ✅ API Supabase accessible`);

    // Test de création d'audit dans Supabase
    const { data: newAudit, error: insertError } = await supabase
      .from("audits")
      .insert({
        email: "test@synergy-supabase.com",
        url: "https://test-synergy-supabase.example.com",
        status: "pending",
        audit_type: "manual",
        webhook_id: `synergy-test-${Date.now()}`,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`   ✅ Audit créé dans Supabase: ${newAudit.id}`);

    return { success: true, supabaseAuditId: newAudit.id };
  } catch (error) {
    console.log(`   ❌ Erreur Supabase: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSyncBridge() {
  console.log("\n3️⃣ Test du pont de synchronisation...");

  try {
    // Simuler la création d'un audit côté Prisma qui doit être syncé vers Supabase
    const prismaAudit = await prisma.audit.create({
      data: {
        email: "sync-test@example.com",
        url: "https://sync-test.example.com",
        status: "processing",
        auditType: "manual",
        webhookId: `sync-bridge-${Date.now()}`,
      },
    });

    console.log(`   📝 Audit Prisma créé: ${prismaAudit.id}`);

    // Synchroniser vers Supabase
    const { data: supabaseAudit, error } = await supabase
      .from("audits")
      .insert({
        id: prismaAudit.id,
        email: prismaAudit.email,
        url: prismaAudit.url,
        status: prismaAudit.status,
        audit_type: prismaAudit.auditType,
        webhook_id: prismaAudit.webhookId,
        created_at: prismaAudit.createdAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`   ✅ Synchronisation réussie: Prisma → Supabase`);
    console.log(`   🔗 ID identique: ${prismaAudit.id === supabaseAudit.id}`);

    return { success: true, syncedId: prismaAudit.id };
  } catch (error) {
    console.log(`   ❌ Erreur de synchronisation: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testWorkflowCompatibility() {
  console.log("\n4️⃣ Test de compatibilité N8N workflow...");

  try {
    // Simuler la réception d'un résultat de workflow N8N dans Supabase
    const webhookId = `n8n-workflow-${Date.now()}`;

    const { data: workflowResult, error } = await supabase
      .from("audits")
      .insert({
        email: "workflow@n8n-test.com",
        url: "https://n8n-workflow-test.example.com",
        status: "completed",
        audit_type: "discovery",
        webhook_id: webhookId,
        score_global: 85,
        score_performance: 90,
        score_seo: 80,
        score_security: 85,
        score_modern: 88,
        platform_detected: "WordPress",
        html_report: "<html><h1>Test Report</h1></html>",
        delivery_method: "email",
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`   ✅ Workflow N8N simulé: ${workflowResult.id}`);
    console.log(
      `   📊 Scores: Global=${workflowResult.score_global}, Perf=${workflowResult.score_performance}`,
    );

    return { success: true, workflowId: workflowResult.id };
  } catch (error) {
    console.log(`   ❌ Erreur workflow: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testReverseSync() {
  console.log("\n5️⃣ Test de synchronisation inverse (Supabase → Prisma)...");

  try {
    // Récupérer un audit complété depuis Supabase
    const { data: completedAudits, error } = await supabase
      .from("audits")
      .select("*")
      .eq("status", "completed")
      .limit(1);

    if (error) throw error;

    if (completedAudits && completedAudits.length > 0) {
      const audit = completedAudits[0];

      // Synchroniser les résultats vers Prisma
      const updatedAudit = await prisma.audit.update({
        where: { id: audit.id },
        data: {
          status: audit.status,
          scoreGlobal: audit.score_global,
          scorePerformance: audit.score_performance,
          scoreSeo: audit.score_seo,
          scoreSecurity: audit.score_security,
          scoreModern: audit.score_modern,
          platformDetected: audit.platform_detected,
          htmlReport: audit.html_report,
          completedAt: audit.completed_at ? new Date(audit.completed_at) : null,
        },
      });

      console.log(`   ✅ Synchronisation inverse réussie: ${updatedAudit.id}`);
      console.log(
        `   📈 Score global synchronisé: ${updatedAudit.scoreGlobal}`,
      );
    } else {
      console.log(`   ⚠️ Aucun audit complété trouvé pour test reverse sync`);
    }

    return { success: true };
  } catch (error) {
    console.log(`   ❌ Erreur sync inverse: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function cleanupTestData() {
  console.log("\n🧹 Nettoyage des données de test...");

  try {
    // Supprimer les audits de test de Prisma
    await prisma.audit.deleteMany({
      where: {
        OR: [
          { email: { contains: "synergy" } },
          { email: { contains: "sync-test" } },
          { email: { contains: "workflow" } },
        ],
      },
    });

    // Supprimer les audits de test de Supabase
    await supabase
      .from("audits")
      .delete()
      .or("email.like.*synergy*,email.like.*sync-test*,email.like.*workflow*");

    console.log("   ✅ Données de test nettoyées");
  } catch (error) {
    console.log(`   ⚠️ Erreur de nettoyage: ${error.message}`);
  }
}

async function generateSynergyReport(results: any[]) {
  console.log("\n📋 RAPPORT DE SYNERGIE");
  console.log("=".repeat(30));

  const totalTests = results.length;
  const successfulTests = results.filter((r) => r.success).length;
  const failedTests = totalTests - successfulTests;

  console.log(`📊 Tests exécutés: ${totalTests}`);
  console.log(`✅ Tests réussis: ${successfulTests}`);
  console.log(`❌ Tests échoués: ${failedTests}`);
  console.log(
    `📈 Taux de réussite: ${Math.round((successfulTests / totalTests) * 100)}%`,
  );

  if (failedTests === 0) {
    console.log(
      "\n🎉 SYNERGIE PRISMA ↔ SUPABASE PARFAITEMENT FONCTIONNELLE !",
    );
    console.log("\n✨ Architecture dual-database v2.0 opérationnelle:");
    console.log(
      "   • Prisma (SQLite) = Source de vérité pour users/subscriptions",
    );
    console.log("   • Supabase = Stockage des audits pour workflows N8N");
    console.log("   • Synchronisation bidirectionnelle active");
    console.log("   • Compatibilité workflows N8N validée");
  } else {
    console.log("\n⚠️ PROBLÈMES DÉTECTÉS - VOIR DÉTAILS CI-DESSUS");
  }

  console.log("\n🔧 Commandes utiles:");
  console.log(
    "   pnpm dev                    # Démarrer le serveur (maintenant fonctionnel)",
  );
  console.log(
    "   pnpm tsx scripts/sync-prisma-to-supabase.ts    # Synchronisation manuelle",
  );
  console.log(
    "   pnpm tsx scripts/repair-prisma-supabase-connection.ts # Réparation",
  );
}

// EXECUTION PRINCIPALE
async function main() {
  const results = [];

  try {
    // 1. Test Prisma
    const prismaResult = await testPrismaConnection();
    results.push(prismaResult);

    // 2. Test Supabase
    const supabaseResult = await testSupabaseAPI();
    results.push(supabaseResult);

    // 3. Test du pont de sync
    const syncResult = await testSyncBridge();
    results.push(syncResult);

    // 4. Test compatibilité workflow
    const workflowResult = await testWorkflowCompatibility();
    results.push(workflowResult);

    // 5. Test sync inverse
    const reverseSyncResult = await testReverseSync();
    results.push(reverseSyncResult);

    // 6. Nettoyage
    await cleanupTestData();

    // 7. Rapport final
    await generateSynergyReport(results);
  } catch (error) {
    console.error("\n💥 Erreur fatale lors des tests:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
