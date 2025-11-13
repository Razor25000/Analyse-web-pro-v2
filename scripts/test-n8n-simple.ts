#!/usr/bin/env tsx

import * as dotenv from "dotenv";
import { createHmac } from "crypto";
import { nanoid } from "nanoid";

// Load environment variables
dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

console.log("🔍 Testing n8n integration...");
console.log("==============================");

async function testN8nIntegration() {
  // 1. Vérifier la configuration
  console.log("\n1. Configuration check:");
  console.log(`   N8N_BASE_URL: ${N8N_BASE_URL || "❌ Non configuré"}`);
  console.log(
    `   N8N_WEBHOOK_SECRET: ${N8N_WEBHOOK_SECRET ? "✅ Configuré" : "❌ Non configuré"}`,
  );

  if (!N8N_BASE_URL || !N8N_WEBHOOK_SECRET) {
    console.log(
      "\n❌ Configuration incomplète. Vérifiez vos variables d'environnement.",
    );
    return;
  }

  // 2. Test de génération de signature HMAC
  console.log("\n2. Test génération signature HMAC:");
  try {
    const testPayload = JSON.stringify({ test: "data" });
    const signature = createHmac("sha256", N8N_WEBHOOK_SECRET)
      .update(testPayload, "utf8")
      .digest("hex");

    console.log(
      `   ✅ Signature générée: sha256=${signature.substring(0, 8)}...`,
    );
  } catch (error) {
    console.log(`   ❌ Erreur génération signature:`, error);
  }

  // 3. Test webhook single audit (simulation)
  console.log("\n3. Test webhook single audit:");
  const singlePayload = {
    url: "https://example.com",
    email: "test@example.com",
    user_id: "test-user-123",
    org_slug: "test-org",
    correlation_id: `test_${nanoid()}`,
    delivery_method: "dashboard",
  };

  try {
    const cleanBaseUrl = N8N_BASE_URL.replace(/\/+$/, "");
    const webhookUrl = `${cleanBaseUrl}/webhook/formulaire-offre-1`;
    const body = JSON.stringify(singlePayload);
    const signature = createHmac("sha256", N8N_WEBHOOK_SECRET)
      .update(body, "utf8")
      .digest("hex");

    console.log(`   📤 URL: ${webhookUrl}`);
    console.log(`   📦 Payload: ${JSON.stringify(singlePayload, null, 2)}`);
    console.log(`   🔐 Signature: sha256=${signature.substring(0, 8)}...`);

    // Tentative d'appel réel
    console.log(`   🚀 Tentative d'appel webhook...`);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-Signature": `sha256=${signature}`,
        "X-Correlation-ID": singlePayload.correlation_id,
      },
      body,
      signal: AbortSignal.timeout(5000), // 5 secondes de timeout
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Webhook single réussi:`, result);
    } else {
      console.log(
        `   ⚠️ Webhook single échoué: ${response.status} ${response.statusText}`,
      );
      const errorText = await response.text();
      console.log(`   Details: ${errorText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(
      `   ⚠️ Erreur webhook single (normal si n8n non accessible):`,
      error instanceof Error ? error.message : error,
    );
  }

  // 4. Test webhook batch audit (simulation)
  console.log("\n4. Test webhook batch audit:");
  const csvData = `url,email
https://site1.com,contact@site1.com
https://site2.com,contact@site2.com
https://site3.com,contact@site3.com`;

  const batchPayload = {
    user_id: "test-user-123",
    csv_data: csvData,
    batch_name: "Test Batch Integration",
    org_slug: "test-org",
    correlation_id: `batch_test_${nanoid()}`,
    delivery_method: "dashboard",
  };

  try {
    const cleanBaseUrl = N8N_BASE_URL.replace(/\/+$/, "");
    const webhookUrl = `${cleanBaseUrl}/webhook/batch-upload`;
    const body = JSON.stringify(batchPayload);
    const signature = createHmac("sha256", N8N_WEBHOOK_SECRET)
      .update(body, "utf8")
      .digest("hex");

    console.log(`   📤 URL: ${webhookUrl}`);
    console.log(`   📦 CSV lignes: ${csvData.split("\n").length - 1}`);
    console.log(`   🔐 Signature: sha256=${signature.substring(0, 8)}...`);

    // Tentative d'appel réel
    console.log(`   🚀 Tentative d'appel webhook...`);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-Signature": `sha256=${signature}`,
        "X-Correlation-ID": batchPayload.correlation_id,
      },
      body,
      signal: AbortSignal.timeout(5000), // 5 secondes de timeout
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Webhook batch réussi:`, result);
    } else {
      console.log(
        `   ⚠️ Webhook batch échoué: ${response.status} ${response.statusText}`,
      );
      const errorText = await response.text();
      console.log(`   Details: ${errorText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(
      `   ⚠️ Erreur webhook batch (normal si n8n non accessible):`,
      error instanceof Error ? error.message : error,
    );
  }

  // 5. Instructions pour la suite
  console.log("\n5. Prochaines étapes:");
  console.log("   📋 Pour tester complètement:");
  console.log("   1. Assurez-vous que n8n est accessible à l'URL configurée");
  const cleanBaseUrl = N8N_BASE_URL.replace(/\/+$/, "");
  console.log("   2. Configurez les webhooks dans n8n:");
  console.log(`      - Single: ${cleanBaseUrl}/webhook/formulaire-offre-1`);
  console.log(`      - Batch:  ${cleanBaseUrl}/webhook/batch-upload`);
  console.log("   3. Testez depuis le frontend:");
  console.log("      - /orgs/[orgSlug]/audits/new (audit single)");
  console.log("      - /orgs/[orgSlug]/audits/batch (audit batch)");
  console.log("   4. Vérifiez les callbacks webhook:");
  console.log("      - POST /api/orgs/[orgSlug]/audits/webhook/n8n");

  console.log("\n✅ Test d'intégration n8n terminé!");
}

testN8nIntegration().catch(console.error);
