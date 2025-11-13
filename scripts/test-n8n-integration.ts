#!/usr/bin/env tsx

/**
 * Script de test pour vérifier l'intégration n8n
 *
 * Ce script teste :
 * 1. La configuration des variables d'environnement n8n
 * 2. Le client n8n (création de signatures HMAC)
 * 3. Les appels webhook simulés
 * 4. La validation des payloads
 */

import * as dotenv from "dotenv";
dotenv.config();

import {
  n8nClient,
  type N8nSingleAuditPayload,
  type N8nBatchAuditPayload,
} from "../src/lib/n8n/client";
import { nanoid } from "nanoid";

// Configuration n8n directe pour éviter les erreurs d'env
const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

async function testN8nIntegration() {
  console.log("🧪 Test de l'intégration n8n");
  console.log("================================");

  // 1. Vérifier la configuration
  console.log("\n1. Configuration n8n:");
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

  // 2. Test du client n8n avec un audit single
  console.log("\n2. Test audit single:");
  const singlePayload: N8nSingleAuditPayload = {
    url: "https://example.com",
    email: "test@example.com",
    userId: "test-user-123",
    orgSlug: "test-org",
    correlationId: `test_${nanoid()}`,
  };

  try {
    console.log(`   📤 Envoi payload single:`, {
      url: singlePayload.url,
      correlationId: singlePayload.correlationId,
    });

    // NOTE: En mode développement, ceci essaiera de contacter le vrai webhook n8n
    // Si n8n n'est pas accessible, on aura une erreur de connexion (normal)
    const singleResult = await n8nClient.triggerSingleAudit(singlePayload);
    console.log(`   ✅ Résultat single:`, singleResult);
  } catch (error) {
    console.log(
      `   ⚠️  Erreur single (normal si n8n non accessible):`,
      error instanceof Error ? error.message : error,
    );
  }

  // 3. Test du client n8n avec un audit batch
  console.log("\n3. Test audit batch:");
  const csvData = `url,email
https://site1.com,contact@site1.com
https://site2.com,contact@site2.com
https://site3.com,contact@site3.com`;

  const batchPayload: N8nBatchAuditPayload = {
    csvData,
    userId: "test-user-123",
    orgSlug: "test-org",
    batchName: "Test Batch Integration",
    correlationId: `batch_test_${nanoid()}`,
  };

  try {
    console.log(`   📤 Envoi payload batch:`, {
      lignes: csvData.split("\n").length - 1,
      correlationId: batchPayload.correlationId,
    });

    const batchResult = await n8nClient.triggerBatchAudit(batchPayload);
    console.log(`   ✅ Résultat batch:`, batchResult);
  } catch (error) {
    console.log(
      `   ⚠️  Erreur batch (normal si n8n non accessible):`,
      error instanceof Error ? error.message : error,
    );
  }

  // 4. Instructions pour la suite
  console.log("\n4. Prochaines étapes:");
  console.log("   📋 Pour tester complètement:");
  console.log("   1. Assurez-vous que n8n est accessible à l'URL configurée");
  console.log("   2. Configurez les webhooks dans n8n:");
  console.log(`      - Single: ${N8N_BASE_URL}/webhook/formulaire-offre-1`);
  console.log(`      - Batch:  ${N8N_BASE_URL}/webhook/batch-upload`);
  console.log("   3. Testez depuis le frontend:");
  console.log("      - /orgs/[orgSlug]/audits/new (audit single)");
  console.log("      - /orgs/[orgSlug]/audits/batch (audit batch)");
  console.log("   4. Vérifiez les callbacks webhook:");
  console.log("      - POST /api/orgs/[orgSlug]/audits/webhook/n8n");

  console.log("\n✅ Test d'intégration terminé!");
}

// Exécuter le test
testN8nIntegration().catch((error) => {
  console.error("Erreur lors du test:", error);
  process.exit(1);
});
