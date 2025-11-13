import { n8nClient } from "@/lib/n8n/client";
import { nanoid } from "nanoid";

async function testN8nWebhookDirectly() {
  console.log("🧪 Test direct du webhook n8n avec vos données exactes");

  const testPayload = {
    url: "https://www.laverplus.com/",
    email: "regis.laffond@yahoo.fr",
    userId: "test-user-id",
    correlationId: nanoid(),
    planId: "free", // Plan gratuit pour déclencher formulaire-offre-gratuite
  };

  console.log(
    "📤 Payload de test (reproduisant votre tentative):",
    testPayload,
  );
  console.log("🎯 Webhook attendu: formulaire-offre-gratuite");

  try {
    const result = await n8nClient.triggerSingleAudit(testPayload);
    console.log("✅ Réponse n8n:", result);
    console.log("📋 Détails:");
    console.log("   - Webhook utilisé:", result.webhookUsed);
    console.log("   - Correlation ID:", result.correlationId);
    console.log(
      "   - Réponse complète:",
      JSON.stringify(result.n8nResponse, null, 2),
    );
    return true;
  } catch (error) {
    console.error("❌ Erreur webhook n8n:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    return false;
  }
}

async function testWithDifferentPlans() {
  console.log("\n🧪 Test avec différents plans");

  const plans = [
    {
      planId: "free",
      description: "Plan gratuit",
      expectedWebhook: "formulaire-offre-gratuite",
    },
    {
      planId: "basic",
      description: "Plan basic",
      expectedWebhook: "batch-upload",
    },
    { planId: "pro", description: "Plan pro", expectedWebhook: "batch-upload" },
    {
      planId: "premium",
      description: "Plan premium",
      expectedWebhook: "batch-upload",
    },
  ];

  for (const plan of plans) {
    console.log(`\n📋 Test ${plan.description} (${plan.planId}):`);
    console.log(`   Webhook attendu: ${plan.expectedWebhook}`);

    const testPayload = {
      url: "https://www.laverplus.com/",
      email: "regis.laffond@yahoo.fr",
      userId: "test-user-id",
      correlationId: nanoid(),
      planId: plan.planId,
    };

    try {
      const result = await n8nClient.triggerSingleAudit(testPayload);
      console.log(`✅ ${plan.description}: Succès`);
      console.log(`   Webhook utilisé: ${result.webhookUsed}`);

      // Vérifier si le bon webhook a été utilisé
      const expectedPath =
        plan.planId === "free" || plan.planId === "basic"
          ? "/webhook/formulaire-offre-gratuite"
          : "/webhook/batch-upload";

      if (result.webhookUsed.includes(expectedPath)) {
        console.log(`   ✅ Bon webhook utilisé: ${expectedPath}`);
      } else {
        console.log(`   ⚠️ Webhook inattendu - attendu: ${expectedPath}`);
      }
    } catch (error) {
      console.error(`❌ ${plan.description}: Échec`);
      console.error(
        `   Erreur: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

async function main() {
  console.log("🚀 Test de débogage des webhooks n8n\n");

  // Test 1: Test direct du webhook
  console.log("=== TEST 1: Test direct du webhook ===");
  await testN8nWebhookDirectly();

  // Test 2: Test avec différents plans
  console.log("\n=== TEST 2: Test avec différents plans ===");
  await testWithDifferentPlans();

  console.log("\n✅ Tests terminés");
}

main().catch(console.error);
