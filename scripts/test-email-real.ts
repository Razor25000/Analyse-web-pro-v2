/**
 * Script de test des emails avec données réelles
 * Teste l'envoi d'emails via Resend avec des templates React Email
 */

import { EmailService } from "@/src/lib/email/email-service";
import { EmailNotifications } from "@/src/lib/email/email-notifications";
import { prisma } from "@/lib/prisma";
import { faker } from "@faker-js/faker";

async function testEmailService() {
  console.log("🧪 Test du système d'email avec données réelles...\n");

  try {
    // 1. Test de l'envoi d'email de démarrage d'audit
    console.log("📧 Test 1: Email de démarrage d'audit");
    const auditStartedResult = await EmailService.sendAuditStarted({
      to: "test@example.com",
      url: "https://example.com",
      auditId: faker.string.uuid(),
      userName: "Test User",
      estimatedTime: 120,
      features: [
        "Performance Analysis",
        "SEO Optimization",
        "Accessibility Check",
        "Security Scan",
      ],
    });

    if (auditStartedResult.success) {
      console.log("✅ Email de démarrage envoyé avec succès");
      console.log(`   ID: ${auditStartedResult.data?.id}`);
    } else {
      console.log(
        "❌ Échec envoi email de démarrage:",
        auditStartedResult.error,
      );
    }

    // 2. Test de l'email de completion d'audit
    console.log("\n📧 Test 2: Email de completion d'audit");
    const auditCompletedResult = await EmailService.sendAuditCompleted({
      to: "test@example.com",
      url: "https://example.com",
      auditId: faker.string.uuid(),
      userName: "Test User",
      globalScore: 85,
      scores: {
        performance: 92,
        seo: 88,
        accessibility: 76,
        security: 94,
        bestPractices: 82,
      },
      reportUrl: "https://app.example.com/reports/test-report-id",
    });

    if (auditCompletedResult.success) {
      console.log("✅ Email de completion envoyé avec succès");
      console.log(`   ID: ${auditCompletedResult.data?.id}`);
    } else {
      console.log(
        "❌ Échec envoi email de completion:",
        auditCompletedResult.error,
      );
    }

    // 3. Test de l'email d'avertissement quota
    console.log("\n📧 Test 3: Email d'avertissement quota");
    const quotaWarningResult = await EmailService.sendQuotaWarning({
      to: "test@example.com",
      userName: "Test User",
      warningType: "90_percent",
      currentUsage: 9,
      quotaLimit: 10,
      planName: "Free",
    });

    if (quotaWarningResult.success) {
      console.log("✅ Email d'avertissement quota envoyé avec succès");
      console.log(`   ID: ${quotaWarningResult.data?.id}`);
    } else {
      console.log("❌ Échec envoi email quota:", quotaWarningResult.error);
    }
  } catch (error) {
    console.error("❌ Erreur lors du test des emails:", error);
  }
}

async function testEmailNotifications() {
  console.log("\n🔔 Test du système de notifications email...\n");

  try {
    // Créer un utilisateur de test temporaire
    const testUser = await prisma.user.create({
      data: {
        name: "Test Email User",
        email: "test-notifications@example.com",
        id: faker.string.uuid(),
        quota: {
          create: {
            used: 8,
            limit: 10,
          },
        },
      },
      include: {
        quota: true,
      },
    });

    console.log(`👤 Utilisateur de test créé: ${testUser.email}`);

    // 1. Test notification démarrage audit
    console.log("\n📧 Test notification démarrage audit");
    const startNotification = await EmailNotifications.notifyAuditStarted({
      userId: testUser.id,
      url: "https://test-notifications.com",
      auditId: faker.string.uuid(),
      estimatedTime: 180,
    });

    if (startNotification.success) {
      console.log("✅ Notification de démarrage envoyée");
    } else {
      console.log("❌ Échec notification démarrage:", startNotification.error);
    }

    // 2. Test notification completion
    console.log("\n📧 Test notification completion audit");
    const completionNotification =
      await EmailNotifications.notifyAuditCompleted({
        userId: testUser.id,
        url: "https://test-notifications.com",
        auditId: faker.string.uuid(),
        results: {
          globalScore: 78,
          scores: {
            performance: 85,
            seo: 92,
            accessibility: 65,
            security: 88,
            bestPractices: 74,
          },
          reportUrl: "https://app.example.com/reports/test",
        },
      });

    if (completionNotification.success) {
      console.log("✅ Notification de completion envoyée");
    } else {
      console.log(
        "❌ Échec notification completion:",
        completionNotification.error,
      );
    }

    // 3. Test notification quota warning
    console.log("\n📧 Test notification quota warning");
    const quotaNotification =
      await EmailNotifications.checkAndNotifyQuotaThreshold({
        userId: testUser.id,
        currentUsage: 9,
        quotaLimit: 10,
      });

    if (quotaNotification.success) {
      console.log("✅ Notification de quota envoyée");
    } else {
      console.log("❌ Échec notification quota:", quotaNotification.error);
    }

    // 4. Test quota dépassé
    console.log("\n📧 Test notification quota dépassé");
    await prisma.quota.update({
      where: { userId: testUser.id },
      data: { used: 10 },
    });

    const exceededNotification =
      await EmailNotifications.checkAndNotifyQuotaThreshold({
        userId: testUser.id,
        currentUsage: 10,
        quotaLimit: 10,
      });

    if (exceededNotification.success) {
      console.log("✅ Notification de quota dépassé envoyée");
    } else {
      console.log(
        "❌ Échec notification quota dépassé:",
        exceededNotification.error,
      );
    }

    // Clean up
    console.log("\n🧹 Nettoyage...");
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log("✅ Utilisateur de test supprimé");
  } catch (error) {
    console.error("❌ Erreur lors du test des notifications:", error);
  }
}

async function testEmailTemplateRendering() {
  console.log("\n🎨 Test du rendu des templates email...\n");

  try {
    // Import des templates
    const { AuditStartedEmail } = await import("@/emails/audit-started.email");
    const { AuditCompletedEmail } = await import(
      "@/emails/audit-completed.email"
    );
    const { QuotaWarningEmail } = await import("@/emails/quota-warning.email");
    const { render } = await import("@react-email/render");

    // Test template audit started
    console.log("🎨 Test template audit started");
    const auditStartedHtml = await render(
      AuditStartedEmail({
        url: "https://example.com",
        auditId: "test-audit-123",
        userName: "John Doe",
        estimatedTime: 120,
        features: ["Performance", "SEO", "Accessibility", "Security"],
      }),
    );
    console.log(
      `✅ Template audit started rendu (${auditStartedHtml.length} caractères)`,
    );

    // Test template audit completed
    console.log("🎨 Test template audit completed");
    const auditCompletedHtml = await render(
      AuditCompletedEmail({
        url: "https://example.com",
        auditId: "test-audit-123",
        userName: "John Doe",
        globalScore: 85,
        scores: {
          performance: 92,
          seo: 88,
          accessibility: 76,
          security: 94,
          bestPractices: 82,
        },
        reportUrl: "https://app.example.com/reports/test",
      }),
    );
    console.log(
      `✅ Template audit completed rendu (${auditCompletedHtml.length} caractères)`,
    );

    // Test template quota warning
    console.log("🎨 Test template quota warning");
    const quotaWarningHtml = await render(
      QuotaWarningEmail({
        userName: "John Doe",
        warningType: "90_percent",
        currentUsage: 9,
        quotaLimit: 10,
        planName: "Free",
      }),
    );
    console.log(
      `✅ Template quota warning rendu (${quotaWarningHtml.length} caractères)`,
    );
  } catch (error) {
    console.error("❌ Erreur lors du test des templates:", error);
  }
}

async function main() {
  console.log("🚀 Démarrage des tests email complets\n");
  console.log("=".repeat(50));

  // Test 1: Service d'email basique
  await testEmailService();

  console.log(`\n${"=".repeat(50)}`);

  // Test 2: Système de notifications
  await testEmailNotifications();

  console.log(`\n${"=".repeat(50)}`);

  // Test 3: Rendu des templates
  await testEmailTemplateRendering();

  console.log(`\n${"=".repeat(50)}`);
  console.log("✅ Tous les tests email terminés!");

  // Fermer la connexion Prisma
  await prisma.$disconnect();
}

// Gestion des erreurs non capturées
process.on("unhandledRejection", (error) => {
  console.error("❌ Erreur non gérée:", error);
  prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("\n⏹️  Arrêt du script...");
  await prisma.$disconnect();
  process.exit(0);
});

// Exécution du script si appelé directement
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Erreur fatale:", error);
    prisma.$disconnect();
    process.exit(1);
  });
}
