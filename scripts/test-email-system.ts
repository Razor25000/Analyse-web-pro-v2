#!/usr/bin/env tsx
/**
 * Script de test du système d'email
 * Usage: npx tsx scripts/test-email-system.ts
 */

import { EmailNotifications } from "../src/lib/email/email-notifications";
import type {
  AuditNotificationData,
  AuditCompletedNotificationData,
  QuotaNotificationData,
} from "../src/lib/email/email-notifications";

const TEST_EMAIL = "test@example.com";
const TEST_USER_NAME = "John Doe";

async function testAuditStartedEmail() {
  console.log("🧪 Test: Notification audit démarré...");

  const data: AuditNotificationData = {
    auditId: "test_audit_001",
    url: "https://example.com",
    userEmail: TEST_EMAIL,
    userName: TEST_USER_NAME,
    estimatedTime: "3-5 minutes",
  };

  try {
    const success = await EmailNotifications.notifyAuditStarted(data);
    console.log(
      success
        ? "✅ Test audit démarré: SUCCESS"
        : "❌ Test audit démarré: FAILED",
    );
    return success;
  } catch (error) {
    console.error("❌ Test audit démarré: ERROR", error);
    return false;
  }
}

async function testAuditCompletedEmail() {
  console.log("🧪 Test: Notification audit terminé...");

  const data: AuditCompletedNotificationData = {
    auditId: "test_audit_002",
    url: "https://example.com",
    userEmail: TEST_EMAIL,
    userName: TEST_USER_NAME,
    globalScore: 85,
    scores: {
      performance: 90,
      seo: 80,
      security: 95,
      modern: 75,
    },
    reportUrl: "https://example.com/report/test_audit_002",
    dashboardUrl: "https://example.com/dashboard",
    completedAt: new Date().toLocaleString("fr-FR"),
  };

  try {
    const success = await EmailNotifications.notifyAuditCompleted(data);
    console.log(
      success
        ? "✅ Test audit terminé: SUCCESS"
        : "❌ Test audit terminé: FAILED",
    );
    return success;
  } catch (error) {
    console.error("❌ Test audit terminé: ERROR", error);
    return false;
  }
}

async function testQuotaWarningEmails() {
  console.log("🧪 Test: Notifications quota...");

  const tests: {
    warningType: "80_percent" | "90_percent" | "quota_exceeded";
    usedQuota: number;
  }[] = [
    { warningType: "80_percent", usedQuota: 8 },
    { warningType: "90_percent", usedQuota: 9 },
    { warningType: "quota_exceeded", usedQuota: 10 },
  ];

  let allSuccess = true;

  for (const test of tests) {
    const data: QuotaNotificationData = {
      userEmail: TEST_EMAIL,
      userName: TEST_USER_NAME,
      usedQuota: test.usedQuota,
      totalQuota: 10,
      remainingQuota: 10 - test.usedQuota,
      planName: "Free",
      upgradeUrl: "https://example.com/upgrade",
      dashboardUrl: "https://example.com/dashboard",
      warningType: test.warningType,
    };

    try {
      const success = await EmailNotifications.notifyQuotaWarning(data);
      console.log(
        success
          ? `✅ Test quota ${test.warningType}: SUCCESS`
          : `❌ Test quota ${test.warningType}: FAILED`,
      );
      allSuccess = allSuccess && success;
    } catch (error) {
      console.error(`❌ Test quota ${test.warningType}: ERROR`, error);
      allSuccess = false;
    }

    // Attendre 1s entre chaque test pour éviter les rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allSuccess;
}

async function testQuotaThresholds() {
  console.log("🧪 Test: Vérification seuils quota...");

  const tests = [
    { used: 8, total: 10, planName: "Free", shouldTrigger: "80_percent" },
    { used: 9, total: 10, planName: "Pro", shouldTrigger: "90_percent" },
    {
      used: 10,
      total: 10,
      planName: "Premium",
      shouldTrigger: "quota_exceeded",
    },
    { used: 5, total: 10, planName: "Free", shouldTrigger: "none" },
  ];

  let allSuccess = true;

  for (const test of tests) {
    try {
      console.log(
        `Testant quota: ${test.used}/${test.total} (${test.planName})`,
      );

      await EmailNotifications.checkAndNotifyQuotaThresholds(
        "test_user_123",
        test.used,
        test.total,
        test.planName,
        TEST_EMAIL,
        TEST_USER_NAME,
      );

      console.log(`✅ Test seuil quota ${test.used}/${test.total}: SUCCESS`);
    } catch (error) {
      console.error(
        `❌ Test seuil quota ${test.used}/${test.total}: ERROR`,
        error,
      );
      allSuccess = false;
    }

    // Attendre 1s entre chaque test
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allSuccess;
}

async function main() {
  console.log("🚀 Démarrage des tests du système d'email\n");

  const results = {
    auditStarted: false,
    auditCompleted: false,
    quotaWarnings: false,
    quotaThresholds: false,
  };

  // Test des notifications individuelles
  results.auditStarted = await testAuditStartedEmail();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  results.auditCompleted = await testAuditCompletedEmail();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  results.quotaWarnings = await testQuotaWarningEmails();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test des seuils automatiques
  results.quotaThresholds = await testQuotaThresholds();

  // Résultats finaux
  console.log("\n📊 Résultats des tests:");
  console.log(`Audit démarré:      ${results.auditStarted ? "✅" : "❌"}`);
  console.log(`Audit terminé:      ${results.auditCompleted ? "✅" : "❌"}`);
  console.log(`Alertes quota:      ${results.quotaWarnings ? "✅" : "❌"}`);
  console.log(`Seuils automatiques: ${results.quotaThresholds ? "✅" : "❌"}`);

  const allPassed = Object.values(results).every(Boolean);
  console.log(
    `\n${allPassed ? "🎉 Tous les tests sont passés!" : "⚠️ Certains tests ont échoué"}`,
  );

  process.exit(allPassed ? 0 : 1);
}

// Gestion des erreurs non capturées
process.on("unhandledRejection", (error) => {
  console.error("❌ Erreur non gérée:", error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}
