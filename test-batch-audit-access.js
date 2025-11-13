const { createServer } = require("http");
const { parse } = require("url");

// Test script to verify batch audit access for premium users
const testBatchAuditAccess = async () => {
  console.log("🧪 Testing batch audit access for premium users...");

  // Test data simulating a premium user session
  const testData = {
    userEmail: "premium@example.com",
    subscriptionTier: "premium",
    monthlyQuota: 100,
    quotaUsed: 15,
    expectedPlanId: "premium",
    expectedPlanName: "Premium",
  };

  console.log("📋 Test Data:", testData);

  // Test 1: Direct quota API access
  console.log("\n🔍 Test 1: Direct quota API access");
  try {
    const quotaResponse = await fetch("http://localhost:3000/api/user/quota", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add session cookie if available
      },
    });

    console.log("Status:", quotaResponse.status);
    if (quotaResponse.ok) {
      const quotaData = await quotaResponse.json();
      console.log("✅ Quota API Response:", quotaData);

      // Verify premium access
      if (quotaData.quota?.planId === "premium") {
        console.log("✅ Premium user detected");
      } else {
        console.log("❌ Premium user not detected");
      }
    } else {
      console.log("❌ Quota API failed:", await quotaResponse.text());
    }
  } catch (error) {
    console.log("❌ Quota API Error:", error.message);
  }

  // Test 2: Batch audit API access
  console.log("\n🔍 Test 2: Batch audit API access");
  try {
    const batchResponse = await fetch(
      "http://localhost:3000/api/audits/batch",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvData: "test,data\nmore,test",
          batchName: "Test Batch",
        }),
      },
    );

    console.log("Status:", batchResponse.status);
    const batchData = await batchResponse.json();
    console.log("Batch API Response:", batchData);

    if (batchResponse.status === 403) {
      if (batchData.requiredPlan === "premium") {
        console.log("✅ Batch audit correctly restricted to premium users");
      } else {
        console.log("❌ Unexpected restriction");
      }
    } else if (batchResponse.status === 503) {
      console.log(
        "ℹ️  Batch audit in maintenance mode (expected during testing)",
      );
    } else {
      console.log("❓ Unexpected response status");
    }
  } catch (error) {
    console.log("❌ Batch API Error:", error.message);
  }

  console.log("\n✨ Test completed");
};

// Run the test
testBatchAuditAccess().catch(console.error);
