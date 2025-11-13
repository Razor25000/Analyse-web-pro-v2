#!/usr/bin/env tsx
/**
 * 🎬 Démonstration du système d'emailing
 * Montre comment les emails fonctionnent avec des données réalistes
 */

import { EmailNotifications } from "@/lib/email";

async function demonstrateEmailSystem() {
  console.log("🎬 DÉMONSTRATION du Système d'Emailing");
  console.log("=".repeat(50));

  // Email de test
  const testEmail = "contact@nowts.app";
  const testUser = "Claude Assistant";

  console.log(`📧 Destinataire: ${testEmail}`);
  console.log(`👤 Utilisateur: ${testUser}`);
  console.log("");

  // 1. 🚀 Email d'audit démarré
  console.log("1️⃣ Test: Email d'audit démarré");
  console.log("─".repeat(40));

  try {
    const auditStartResult = await EmailNotifications.notifyAuditStarted({
      auditId: `demo_audit_${Date.now()}`,
      url: "https://example.com",
      userEmail: testEmail,
      userName: testUser,
      estimatedTime: "3-5 minutes",
    });

    console.log(
      auditStartResult
        ? "✅ Email audit démarré: ENVOYÉ"
        : "❌ Email audit démarré: ÉCHEC",
    );
  } catch (error) {
    console.log("❌ Erreur email audit démarré:", error);
  }
  console.log("");

  // 2. 🎉 Email d'audit terminé (avec scores réalistes)
  console.log("2️⃣ Test: Email d'audit terminé");
  console.log("─".repeat(40));

  const auditId = `demo_audit_completed_${Date.now()}`;
  const baseUrl = "http://localhost:3000";

  try {
    const auditCompletedResult = await EmailNotifications.notifyAuditCompleted({
      auditId,
      url: "https://example.com",
      userEmail: testEmail,
      userName: testUser,
      globalScore: 87,
      scores: {
        performance: 82,
        seo: 94,
        security: 89,
        modern: 83,
      },
      reportUrl: `${baseUrl}/reports/${auditId}`,
      dashboardUrl: `${baseUrl}/dashboard`,
      completedAt: new Date().toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    console.log(
      auditCompletedResult
        ? "✅ Email audit terminé: ENVOYÉ"
        : "❌ Email audit terminé: ÉCHEC",
    );
  } catch (error) {
    console.log("❌ Erreur email audit terminé:", error);
  }
  console.log("");

  // 3. ⚠️ Test des alertes de quota
  console.log("3️⃣ Test: Alertes de quota");
  console.log("─".repeat(40));

  const quotaTests = [
    { used: 4, total: 5, type: "80% (4/5 audits utilisés)" },
    { used: 9, total: 10, type: "90% (9/10 audits utilisés)" },
    { used: 5, total: 5, type: "100% (quota épuisé)" },
  ];

  for (const test of quotaTests) {
    try {
      console.log(`   Testing ${test.type}...`);

      await EmailNotifications.checkAndNotifyQuotaThresholds(
        `demo_user_${Date.now()}`,
        test.used,
        test.total,
        "Free",
        testEmail,
        testUser,
      );

      console.log(`   ✅ Alerte quota ${test.type}: Vérifiée`);
    } catch (error) {
      console.log(`   ❌ Erreur quota ${test.type}:`, error);
    }
  }
  console.log("");

  // 4. 📊 Résumé
  console.log("📊 RÉSUMÉ de la Démonstration");
  console.log("=".repeat(50));
  console.log("✅ Emails testés:");
  console.log("   • Audit démarré (avec estimation temps)");
  console.log("   • Audit terminé (avec scores détaillés)");
  console.log("   • Alertes quota (80%, 90%, 100%)");
  console.log("");
  console.log("📧 Vérifiez votre boîte email:", testEmail);
  console.log(
    "💡 Les emails peuvent arriver dans le dossier spam la première fois",
  );
  console.log("");
  console.log("🎨 Pour voir les templates visuellement:");
  console.log("   pnpm email  # Ouvre React Email Studio");
  console.log("");
  console.log("🔧 Logs détaillés dans la console ci-dessus");
}

// Exécution
demonstrateEmailSystem()
  .then(() => {
    console.log("🏁 Démonstration terminée avec succès !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Erreur lors de la démonstration:", error);
    process.exit(1);
  });
