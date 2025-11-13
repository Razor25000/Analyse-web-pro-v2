#!/usr/bin/env node

// Test direct du webhook n8n - reproduction exacte de Postman
const crypto = require("crypto");

const webhookUrl = "https://n8n.redjice.shop/webhook/formulaire-offre-gratuite";
const secret = "mon-secret-webhook-super-securise-32-caracteres-minimum";

console.log("🧪 Test direct du webhook n8n\n");

// Test 1: Payload exact de Postman (celui qui fonctionne)
async function testPostmanExact() {
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

    if (response.ok) {
      console.log("🎉 Test Postman: SUCCÈS - Le webhook fonctionne !");
    } else {
      console.log("❌ Test Postman: ÉCHEC");
    }

    return response.ok;
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

// Test 2: Format de l'application (probablement avec HMAC)
async function testAppFormat() {
  console.log("\n=== TEST 2: Format application (avec HMAC) ===");

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

    if (response.ok) {
      console.log("🎉 Test App: SUCCÈS - Le format app fonctionne !");
    } else {
      console.log("❌ Test App: ÉCHEC");
    }

    return response.ok;
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

// Test 3: Format app SANS HMAC
async function testAppNoHmac() {
  console.log("\n=== TEST 3: Format application SANS HMAC ===");

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

    if (response.ok) {
      console.log("🎉 Test App sans HMAC: SUCCÈS !");
    } else {
      console.log("❌ Test App sans HMAC: ÉCHEC");
    }

    return response.ok;
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`🎯 Test webhook: ${webhookUrl}\n`);

  const test1 = await testPostmanExact();
  const test2 = await testAppFormat();
  const test3 = await testAppNoHmac();

  console.log("\n📊 RÉSULTATS:");
  console.log(`   - Postman exact: ${test1 ? "✅ SUCCÈS" : "❌ ÉCHEC"}`);
  console.log(`   - App avec HMAC: ${test2 ? "✅ SUCCÈS" : "❌ ÉCHEC"}`);
  console.log(`   - App sans HMAC: ${test3 ? "✅ SUCCÈS" : "❌ ÉCHEC"}`);

  if (test1 && !test2 && !test3) {
    console.log("\n🔍 DIAGNOSTIC: Seul le format Postman fonctionne.");
    console.log(
      "   Problème probable: L'application envoie un format différent ou incorrect.",
    );
  } else if (test1 && test3 && !test2) {
    console.log("\n🔍 DIAGNOSTIC: Problème avec la signature HMAC.");
    console.log("   La signature est probablement incorrecte ou non attendue.");
  } else if (test1 && test2 && test3) {
    console.log("\n🔍 DIAGNOSTIC: Tous les formats fonctionnent.");
    console.log(
      "   Le problème est ailleurs (authentification utilisateur, URL différente, etc.)",
    );
  }

  console.log("\n✅ Tests terminés");
}

main().catch(console.error);
