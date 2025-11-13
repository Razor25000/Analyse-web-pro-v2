/**
 * Test Script: Verify Batch Audit Fix (No Duplicate Records)
 *
 * Purpose: Validates that the N8N workflow modification fixes the duplicate record issue
 *
 * What this script tests:
 * 1. API creates records with auditType: "batch"
 * 2. N8N queries those records (no new "batch_analysis" records created)
 * 3. Status transitions: pending → processing → completed
 * 4. No duplicate records in database
 * 5. Quota deducted correctly
 *
 * Run AFTER implementing N8N workflow changes
 */

import { prisma } from "@/lib/prisma";
import { n8nClient } from "@/lib/n8n/client";

const TEST_USER_EMAIL = "batch-test@example.com";
const TEST_CSV_DATA = `url,email
https://test-site-1.example.com,test1@example.com
https://test-site-2.example.com,test2@example.com
https://test-site-3.example.com,test3@example.com`;

type TestResult = {
  step: string;
  status: "✅ PASS" | "❌ FAIL";
  details: string;
  data?: unknown;
};

const results: TestResult[] = [];

function logResult(
  step: string,
  status: "✅ PASS" | "❌ FAIL",
  details: string,
  data?: unknown,
) {
  results.push({ step, status, details, data });
  console.log(`\n${status} ${step}`);
  console.log(`   ${details}`);
  if (data) {
    console.log(`   Data:`, JSON.stringify(data, null, 2));
  }
}

async function cleanup() {
  console.log("\n🧹 Cleaning up test data...");

  // Delete test audits
  const deletedAudits = await prisma.audit.deleteMany({
    where: {
      url: {
        contains: "test-site",
      },
    },
  });
  console.log(`   Deleted ${deletedAudits.count} test audit records`);

  // Delete test user if exists
  const deletedUser = await prisma.user.deleteMany({
    where: {
      email: TEST_USER_EMAIL,
    },
  });
  console.log(`   Deleted ${deletedUser.count} test user records`);
}

async function createTestUser() {
  console.log("\n📝 Creating test user with premium plan...");

  const user = await prisma.user.create({
    data: {
      id: `test-user-${Date.now()}`,
      email: TEST_USER_EMAIL,
      name: "Batch Test User",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      monthlyQuota: 100,
      quotaUsed: 0,
      subscriptionTier: "premium",
    },
  });

  logResult(
    "Create Test User",
    "✅ PASS",
    `Created user ${user.email} with quota ${user.monthlyQuota}`,
    { userId: user.id, quotaUsed: user.quotaUsed },
  );

  return user;
}

async function simulateBatchAPICall(userId: string) {
  console.log("\n🚀 Simulating batch audit API call...");

  const batchCorrelationId = `batch_test_${Date.now()}`;
  const urls = TEST_CSV_DATA.split("\n")
    .slice(1)
    .map((line) => {
      const [url, email] = line.split(",");
      return { url: url.trim(), email: email.trim() };
    });

  // Create batch audit records (simulating what route.ts does)
  const auditRows = urls.map((item, index) => ({
    userId,
    email: item.email,
    url: item.url,
    status: "pending",
    auditType: "batch",
    webhookId: `${batchCorrelationId}_${index + 1}`,
    orgId: null,
  }));

  const createdAudits = await prisma.$transaction(async (tx) => {
    // Update quota
    await tx.user.update({
      where: { id: userId },
      data: {
        quotaUsed: {
          increment: auditRows.length,
        },
      },
    });

    // Create audit records
    await tx.audit.createMany({ data: auditRows });

    // Return created records
    return tx.audit.findMany({
      where: {
        webhookId: {
          in: auditRows.map((r) => r.webhookId),
        },
      },
      select: {
        id: true,
        webhookId: true,
        url: true,
        auditType: true,
        status: true,
      },
    });
  });

  logResult(
    "Simulate API Batch Creation",
    "✅ PASS",
    `Created ${createdAudits.length} audit records with auditType: "batch"`,
    {
      batchCorrelationId,
      recordCount: createdAudits.length,
      auditTypes: createdAudits.map((a) => a.auditType),
    },
  );

  return { batchCorrelationId, createdAudits };
}

async function triggerN8NWorkflow(batchCorrelationId: string, userId: string) {
  console.log("\n📤 Triggering N8N workflow...");

  try {
    const result = await n8nClient.triggerBatchAudit({
      csvData: TEST_CSV_DATA,
      userId,
      batchName: "Test Batch",
      correlationId: batchCorrelationId,
      planId: "premium",
    });

    logResult(
      "Trigger N8N Workflow",
      "✅ PASS",
      `N8N webhook triggered successfully`,
      { webhookUsed: result.webhookUsed },
    );

    return result;
  } catch (error) {
    logResult(
      "Trigger N8N Workflow",
      "❌ FAIL",
      `N8N webhook failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function waitForProcessing(seconds: number) {
  console.log(`\n⏳ Waiting ${seconds} seconds for N8N to process...`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function verifyNoDuplicates() {
  console.log("\n🔍 Checking for duplicate records...");

  const batchAnalysisRecords = await prisma.audit.findMany({
    where: {
      auditType: "batch_analysis",
      url: {
        contains: "test-site",
      },
    },
  });

  if (batchAnalysisRecords.length === 0) {
    logResult(
      "Verify No Duplicates",
      "✅ PASS",
      'No "batch_analysis" records found - N8N queried existing records correctly!',
      { duplicateCount: 0 },
    );
  } else {
    logResult(
      "Verify No Duplicates",
      "❌ FAIL",
      `Found ${batchAnalysisRecords.length} duplicate "batch_analysis" records - N8N still creating duplicates!`,
      {
        duplicateCount: batchAnalysisRecords.length,
        duplicateIds: batchAnalysisRecords.map((r) => r.id),
      },
    );
  }

  return batchAnalysisRecords.length === 0;
}

async function verifyStatusTransitions() {
  console.log("\n🔄 Checking status transitions...");

  const audits = await prisma.audit.findMany({
    where: {
      url: {
        contains: "test-site",
      },
      auditType: "batch",
    },
    select: {
      id: true,
      url: true,
      status: true,
      auditType: true,
    },
  });

  const statusCounts = audits.reduce(
    (acc, audit) => {
      acc[audit.status] = (acc[audit.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const allProcessingOrCompleted = audits.every(
    (a) => a.status === "processing" || a.status === "completed",
  );

  if (allProcessingOrCompleted) {
    logResult(
      "Verify Status Transitions",
      "✅ PASS",
      'All batch records transitioned from "pending" to "processing" or "completed"',
      { statusCounts, totalRecords: audits.length },
    );
  } else {
    logResult(
      "Verify Status Transitions",
      "❌ FAIL",
      'Some batch records still in "pending" status - N8N may not have processed them',
      { statusCounts, totalRecords: audits.length },
    );
  }

  return allProcessingOrCompleted;
}

async function verifyQuotaDeduction(userId: string, expectedDeduction: number) {
  console.log("\n💳 Verifying quota deduction...");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quotaUsed: true, monthlyQuota: true },
  });

  if (!user) {
    logResult("Verify Quota", "❌ FAIL", "User not found");
    return false;
  }

  if (user.quotaUsed === expectedDeduction) {
    logResult(
      "Verify Quota Deduction",
      "✅ PASS",
      `Quota deducted correctly: ${user.quotaUsed}/${user.monthlyQuota}`,
      { quotaUsed: user.quotaUsed, expected: expectedDeduction },
    );
    return true;
  } else {
    logResult(
      "Verify Quota Deduction",
      "❌ FAIL",
      `Quota mismatch: expected ${expectedDeduction}, got ${user.quotaUsed}`,
      { quotaUsed: user.quotaUsed, expected: expectedDeduction },
    );
    return false;
  }
}

async function printFinalReport() {
  console.log(`\n${  "=".repeat(70)}`);
  console.log("📊 FINAL TEST REPORT");
  console.log("=".repeat(70));

  const passed = results.filter((r) => r.status === "✅ PASS").length;
  const failed = results.filter((r) => r.status === "❌ FAIL").length;

  results.forEach((result) => {
    console.log(`\n${result.status} ${result.step}`);
    console.log(`   ${result.details}`);
  });

  console.log(`\n${  "=".repeat(70)}`);
  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log("=".repeat(70));

  if (failed === 0) {
    console.log(
      "\n🎉 ALL TESTS PASSED - N8N workflow fix is working correctly!",
    );
  } else {
    console.log("\n⚠️  SOME TESTS FAILED - N8N workflow may need adjustment");
  }

  return failed === 0;
}

async function main() {
  console.log("🧪 Starting Batch Audit Fix Validation Test");
  console.log("=".repeat(70));

  try {
    // Cleanup any existing test data
    await cleanup();

    // Step 1: Create test user
    const user = await createTestUser();

    // Step 2: Simulate API batch creation
    const { batchCorrelationId, createdAudits } = await simulateBatchAPICall(
      user.id,
    );

    // Step 3: Trigger N8N workflow
    await triggerN8NWorkflow(batchCorrelationId, user.id);

    // Step 4: Wait for N8N to process
    await waitForProcessing(5);

    // Step 5: Verify no duplicate records
    const noDuplicates = await verifyNoDuplicates();

    // Step 6: Verify status transitions
    const statusesCorrect = await verifyStatusTransitions();

    // Step 7: Verify quota deduction
    const quotaCorrect = await verifyQuotaDeduction(
      user.id,
      createdAudits.length,
    );

    // Print final report
    const allTestsPassed = await printFinalReport();

    // Cleanup
    await cleanup();

    process.exit(allTestsPassed ? 0 : 1);
  } catch (error) {
    console.error("\n💥 Test execution failed:", error);
    await cleanup();
    process.exit(1);
  }
}

main();
