/* eslint-disable no-console */
async function testAPIs() {
  const baseUrl = "http://localhost:3000";
  const orgSlug = "test-org"; // Remplace par un vrai slug d'org

  console.log("🧪 Test des APIs...");

  try {
    // Test 1: API Status
    console.log("\n1️⃣ Test API Status...");
    const statusResponse = await fetch(
      `${baseUrl}/api/orgs/${orgSlug}/audits/status`,
    );
    console.log("Status:", statusResponse.status);

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log("✅ API Status OK:", statusData.stats);
    } else {
      console.log("❌ API Status Error:", await statusResponse.text());
    }

    // Test 2: API Single Audit (simulation)
    console.log("\n2️⃣ Test API Single Audit...");
    const singlePayload = {
      url: "https://example.com",
      email: "test@example.com",
    };

    console.log("Payload:", singlePayload);
    console.log("📝 Note: Cette API nécessite une authentification");
    console.log("   Tu peux la tester via ton frontend une fois connecté");

    // Test 3: API Batch Audit (simulation)
    console.log("\n3️⃣ Test API Batch Audit...");
    const csvData =
      "url,email\nexample.com,test1@example.com\ngoogle.com,test2@example.com";
    const batchPayload = {
      csvData,
      batchName: "Test Batch",
    };

    console.log("CSV Lines:", csvData.split("\n").length - 1);
    console.log("📝 Note: Cette API nécessite aussi une authentification");

    console.log("\n✅ Structure des APIs créée avec succès !");
    console.log("🔗 Endpoints disponibles:");
    console.log(`   POST ${baseUrl}/api/orgs/[orgSlug]/audits/single`);
    console.log(`   POST ${baseUrl}/api/orgs/[orgSlug]/audits/batch`);
    console.log(`   GET  ${baseUrl}/api/orgs/[orgSlug]/audits/status`);
  } catch (error) {
    console.error("❌ Erreur test APIs:", error);
  }
}

void testAPIs();
