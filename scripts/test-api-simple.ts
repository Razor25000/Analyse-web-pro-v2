#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

console.log("🧪 Test des APIs...");
console.log("==================");

async function testAPIs() {
  const baseUrl = "http://localhost:3001"; // Utiliseons le port 3001
  const orgSlug = "test-org";

  // Test de connectivité de base
  console.log("\n1️⃣ Test de connectivité serveur...");
  try {
    const healthResponse = await fetch(`${baseUrl}/`, {
      signal: AbortSignal.timeout(3000),
    });

    if (healthResponse.ok) {
      console.log("✅ Serveur accessible");
    } else {
      console.log(`⚠️ Serveur répond mais status: ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(
      "❌ Serveur non accessible:",
      error instanceof Error ? error.message : error,
    );
    console.log("📝 Note: Démarrez le serveur avec 'pnpm dev -p 3001'");
    console.log("   ou modifiez le baseUrl dans ce script");
    return;
  }

  // Test 1: API Status
  console.log("\n2️⃣ Test API Status...");
  try {
    const statusResponse = await fetch(
      `${baseUrl}/api/orgs/${orgSlug}/audits/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    console.log(
      `   Status HTTP: ${statusResponse.status} ${statusResponse.statusText}`,
    );

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log("   ✅ API Status OK");
      console.log("   📊 Données:", JSON.stringify(statusData, null, 2));
    } else {
      console.log("   ❌ API Status Error");
      const errorText = await statusResponse.text();
      console.log("   Details:", errorText.substring(0, 300));
    }
  } catch (error) {
    console.log(
      "   ❌ Erreur requête API Status:",
      error instanceof Error ? error.message : error,
    );
  }

  // Test 2: API Single Audit (simulation sans auth)
  console.log("\n3️⃣ Test API Single Audit...");
  const singlePayload = {
    url: "https://example.com",
    email: "test@example.com",
    deliveryMethod: "dashboard",
  };

  try {
    const singleResponse = await fetch(
      `${baseUrl}/api/orgs/${orgSlug}/audits/single`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(singlePayload),
        signal: AbortSignal.timeout(5000),
      },
    );

    console.log(
      `   Status HTTP: ${singleResponse.status} ${singleResponse.statusText}`,
    );
    const responseText = await singleResponse.text();

    if (singleResponse.status === 401) {
      console.log("   ⚠️ Authentification requise (normal)");
    } else if (singleResponse.ok) {
      console.log("   ✅ API Single accessible");
      console.log("   📊 Réponse:", responseText.substring(0, 200));
    } else {
      console.log("   ❌ Erreur API Single");
      console.log("   Details:", responseText.substring(0, 300));
    }
  } catch (error) {
    console.log(
      "   ❌ Erreur requête API Single:",
      error instanceof Error ? error.message : error,
    );
  }

  // Test 3: API Batch Audit (simulation sans auth)
  console.log("\n4️⃣ Test API Batch Audit...");
  const csvData =
    "url,email\nhttps://example.com,test1@example.com\nhttps://google.com,test2@example.com";
  const batchPayload = {
    csvData,
    batchName: "Test Batch",
  };

  try {
    const batchResponse = await fetch(
      `${baseUrl}/api/orgs/${orgSlug}/audits/batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchPayload),
        signal: AbortSignal.timeout(5000),
      },
    );

    console.log(
      `   Status HTTP: ${batchResponse.status} ${batchResponse.statusText}`,
    );
    const responseText = await batchResponse.text();

    if (batchResponse.status === 401) {
      console.log("   ⚠️ Authentification requise (normal)");
    } else if (batchResponse.ok) {
      console.log("   ✅ API Batch accessible");
      console.log("   📊 Réponse:", responseText.substring(0, 200));
    } else {
      console.log("   ❌ Erreur API Batch");
      console.log("   Details:", responseText.substring(0, 300));
    }
  } catch (error) {
    console.log(
      "   ❌ Erreur requête API Batch:",
      error instanceof Error ? error.message : error,
    );
  }

  console.log("\n✅ Test des APIs terminé!");
  console.log("🔗 Endpoints testés:");
  console.log(`   GET  ${baseUrl}/api/orgs/${orgSlug}/audits/status`);
  console.log(`   POST ${baseUrl}/api/orgs/${orgSlug}/audits/single`);
  console.log(`   POST ${baseUrl}/api/orgs/${orgSlug}/audits/batch`);
  console.log(
    "\n📝 Note: Pour un test complet, utilisez l'interface web avec authentification",
  );
}

testAPIs().catch(console.error);
