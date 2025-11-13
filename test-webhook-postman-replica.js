#!/usr/bin/env node

// Test de réplication exact de Postman
const { config } = require("dotenv");
const crypto = require("crypto");

// Charger les variables d'environnement
config();

const webhookUrl = "https://n8n.redjice.shop/webhook/formulaire-offre-gratuite";
const secret = process.env.N8N_WEBHOOK_SECRET;

console.log("🧪 Test de réplication Postman...\n");

// Test 1: Payload exact de Postman (celui qui fonctionne)
async function testPostmanPayload() {
  console.log("=== TEST 1: Payload exact Postman (qui fonctionne) ===");

  const postmanBody = {
    email: "regis.laffond@yahoo.fr",
    name: "Régis LAFFOND",
    url: "https://www.laverplus.com/",
  };

  const bodyString = JSON.stringify(postmanBody);
  console.log("📤 Payload Postman:", bodyString);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyString,
    });

    const responseText = await response.text();
    console.log(`✅ Réponse: ${response.status} ${response.statusText}`);
    console.log(`📋 Body: ${responseText}`);
    return true;
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

// Test 2: Payload app avec HMAC (comme le fait l'app)
async function testAppPayload() {
  console.log("\n=== TEST 2: Payload app avec HMAC (comme l'app) ===");

  const appBody = {
    website_url: "https://www.laverplus.com/",
    url: "https://www.laverplus.com/",
    email: "regis.laffond@yahoo.fr",
    user_id: "test-user-id",
    org_slug: undefined,
    correlation_id: "test-correlation-123",
    delivery_method: "dashboard",
    plan_id: "free",
    source: "nowts",
  };

  const bodyString = JSON.stringify(appBody);
  console.log("📤 Payload App:", bodyString);

  // Générer signature HMAC
  const signature = crypto
    .createHmac("sha256", secret)
    .update(bodyString, "utf8")
    .digest("hex");

  console.log("🔐 Signature HMAC:", `sha256=${signature}`);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-Signature": `sha256=${signature}`,
        "X-Correlation-ID": "test-correlation-123",
      },
      body: bodyString,
    });

    const responseText = await response.text();
    console.log(`✅ Réponse: ${response.status} ${response.statusText}`);
    console.log(`📋 Body: ${responseText}`);
    return true;
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

// Test 3: Payload app SANS HMAC
async function testAppPayloadNoHmac() {
  console.log("\n=== TEST 3: Payload app SANS HMAC ===");

  const appBody = {
    website_url: "https://www.laverplus.com/",
    url: "https://www.laverplus.com/",
    email: "regis.laffond@yahoo.fr",
    user_id: "test-user-id",
    org_slug: undefined,
    correlation_id: "test-correlation-123",
    delivery_method: "dashboard",
    plan_id: "free",
    source: "nowts",
  };

  const bodyString = JSON.stringify(appBody);
  console.log("📤 Payload App (sans HMAC):", bodyString);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": "test-correlation-123",
      },
      body: bodyString,
    });

    const responseText = await response.text();
    console.log(`✅ Réponse: ${response.status} ${response.statusText}`);
    console.log(`📋 Body: ${responseText}`);
    return true;
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`🎯 Test webhook: ${webhookUrl}\n`);

  await testPostmanPayload();
  await testAppPayload();
  await testAppPayloadNoHmac();

  console.log("\n✅ Tests terminés");
}

main().catch(console.error);
