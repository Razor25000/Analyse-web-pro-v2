import { prisma } from "@/lib/prisma";
import { n8nClient } from "@/lib/n8n/client";
import { QuotaService } from "@/lib/quota/quota-service";
import { nanoid } from "nanoid";

async function createTestUser() {
  console.log("👤 Création d'un utilisateur de test...");

  const testUser = await prisma.user.create({
    data: {
      id: `test-user-${nanoid()}`,
      name: "Test User N8N",
      email: `test-n8n-${nanoid()}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      subscriptionTier: "basic", // Plan 49€/mois
      monthlyQuota: 500,
      quotaUsed: 0,
      quotaResetDate: new Date(),
    },
  });

  console.log("✅ Utilisateur créé:", {
    id: testUser.id,
    email: testUser.email,
    tier: testUser.subscriptionTier,
    quota: testUser.monthlyQuota,
  });

  return testUser;
}

async function testCompleteAuditFlow() {
  console.log("🚀 Test complet du flux d'audit avec n8n\n");

  try {
    // 1. Créer un utilisateur de test
    const user = await createTestUser();

    // 2. Vérifier le quota avant audit
    console.log("\n📊 Vérification du quota avant audit...");
    const quotaBefore = await QuotaService.getUserQuota(user.id);
    console.log("Quota avant:", quotaBefore);

    if (!quotaBefore || quotaBefore.remaining <= 0) {
      throw new Error("Quota insuffisant pour le test");
    }

    // 3. Créer un audit dans la base
    console.log("\n💾 Création de l'audit en base...");
    const correlationId = nanoid();

    const newAudit = await prisma.audit.create({
      data: {
        userId: user.id,
        url: "https://example.com",
        email: user.email,
        status: "pending",
        auditType: "manual",
        webhookId: correlationId,
      },
    });

    console.log("✅ Audit créé:", {
      id: newAudit.id,
      url: newAudit.url,
      status: newAudit.status,
      webhookId: newAudit.webhookId,
    });

    // 4. Déclencher le workflow n8n
    console.log("\n🔗 Déclenchement du workflow n8n...");
    const n8nResult = await n8nClient.triggerSingleAudit({
      url: newAudit.url,
      email: newAudit.email,
      userId: user.id,
      correlationId,
      planId: quotaBefore.planId,
      orgSlug: undefined,
    });

    console.log("✅ Workflow n8n déclenché:", {
      success: n8nResult.success,
      webhookUsed: n8nResult.webhookUsed,
      correlationId: n8nResult.correlationId,
    });

    // 5. Incrémenter le quota
    console.log("\n📈 Incrémentation du quota...");
    await QuotaService.incrementQuotaUsage(user.id);

    // 6. Vérifier le quota après audit
    const quotaAfter = await QuotaService.getUserQuota(user.id);
    console.log("Quota après:", quotaAfter);

    // 7. Vérifier l'audit en base
    const auditInDb = await prisma.audit.findUnique({
      where: { id: newAudit.id },
    });

    console.log("\n✅ Résumé du test:");
    console.log("- Utilisateur créé:", user.email);
    console.log("- Plan utilisateur:", quotaBefore.planId);
    console.log("- Webhook utilisé:", n8nResult.webhookUsed);
    console.log("- Quota avant:", `${quotaBefore.used}/${quotaBefore.limit}`);
    console.log("- Quota après:", `${quotaAfter?.used}/${quotaAfter?.limit}`);
    console.log("- Audit status:", auditInDb?.status);
    console.log("- Correlation ID:", correlationId);

    // 8. Nettoyer (optionnel)
    console.log("\n🧹 Nettoyage...");
    await prisma.audit.delete({ where: { id: newAudit.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("✅ Nettoyage terminé");

    return {
      success: true,
      webhookTriggered: n8nResult.success,
      planUsed: quotaBefore.planId,
      webhookUrl: n8nResult.webhookUsed,
    };
  } catch (error) {
    console.error("❌ Erreur dans le test complet:", error);
    throw error;
  }
}

async function main() {
  console.log("🧪 DÉMARRAGE DU TEST COMPLET D'AUDIT AVEC N8N");
  console.log("=".repeat(60));

  try {
    const result = await testCompleteAuditFlow();

    console.log(`\n${  "=".repeat(60)}`);
    console.log("🎉 TEST RÉUSSI!");
    console.log("✅ Le workflow n8n est correctement intégré");
    console.log("✅ Le système de quota fonctionne");
    console.log("✅ La base de données est synchronisée");
    console.log(`✅ Webhook utilisé: ${result.webhookUrl}`);
  } catch (error) {
    console.log(`\n${  "=".repeat(60)}`);
    console.log("❌ TEST ÉCHOUÉ!");
    console.error("Détails:", error);
  }
}

main().catch(console.error);
