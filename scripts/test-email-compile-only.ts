#!/usr/bin/env tsx
/**
 * Test de compilation seulement - ne nécessite pas d'env vars
 */

console.log("🧪 Test de compilation des modules email...");

try {
  // Test import des types
  const { AuditStartedEmail } = require("../emails/audit-started.email");
  const { AuditCompletedEmail } = require("../emails/audit-completed.email");
  const { QuotaWarningEmail } = require("../emails/quota-warning.email");

  console.log("✓ Templates email: Chargés");

  // Test que les templates sont des fonctions
  if (typeof AuditStartedEmail === "function") {
    console.log("✓ AuditStartedEmail: Template valide");
  } else {
    throw new Error("AuditStartedEmail n'est pas une fonction");
  }

  if (typeof AuditCompletedEmail === "function") {
    console.log("✓ AuditCompletedEmail: Template valide");
  } else {
    throw new Error("AuditCompletedEmail n'est pas une fonction");
  }

  if (typeof QuotaWarningEmail === "function") {
    console.log("✓ QuotaWarningEmail: Template valide");
  } else {
    throw new Error("QuotaWarningEmail n'est pas une fonction");
  }

  console.log("\n🎉 Compilation des emails validée !");
  console.log("📋 Composants disponibles:");
  console.log("  - AuditStartedEmail (démarrage d'audit)");
  console.log("  - AuditCompletedEmail (audit terminé avec scores)");
  console.log("  - QuotaWarningEmail (alertes quota 80%/90%/100%)");

  console.log("\n✅ Tous les templates email sont prêts à l'utilisation");
} catch (error) {
  console.error("❌ Erreur compilation:", error);
  process.exit(1);
}
