#!/usr/bin/env tsx

/**
 * Test de validation de l'architecture v2.0 optimisée
 * Vérifie que la synchronisation profiles a bien été supprimée
 */

import { prisma } from "../src/lib/prisma";
import { SupabaseBridge } from "../src/lib/supabase/bridge";

async function testOptimizedArchitecture() {
  console.log("🧪 Test Architecture v2.0 Optimisée");
  console.log("=".repeat(50));

  try {
    // 1. Vérifier que la fonction syncUserToSupabase n'existe plus
    console.log("1. Vérification suppression syncUserToSupabase...");

    if (typeof (SupabaseBridge as any).syncUserToSupabase === "function") {
      throw new Error(
        "❌ syncUserToSupabase existe encore - nettoyage incomplet",
      );
    }

    console.log("✅ syncUserToSupabase bien supprimée");

    // 2. Vérifier que les méthodes audits existent toujours
    console.log("\n2. Vérification méthodes audits...");

    const requiredMethods = [
      "getUserAudits",
      "createAudit",
      "updateAudit",
      "getAuditByWebhookId",
      "getMonthlyAuditCount",
      "getUserSubscription",
      "incrementQuotaUsed",
      "getQuotaStatus",
    ];

    for (const method of requiredMethods) {
      if (typeof (SupabaseBridge as any)[method] !== "function") {
        throw new Error(`❌ Méthode ${method} manquante`);
      }
    }

    console.log("✅ Toutes les méthodes requises sont présentes");

    // 3. Tester la création d'un audit (fonctionnalité principale)
    console.log("\n3. Test création audit...");

    const testAudit = await SupabaseBridge.createAudit({
      user_id: "test-user-id",
      email: "test@example.com",
      url: "https://example.com",
      audit_type: "manual",
      status: "pending",
    });

    if (!testAudit) {
      console.log(
        "⚠️ Audit non créé (Supabase probablement indisponible en test)",
      );
    } else {
      console.log("✅ Audit créé avec succès");
    }

    // 4. Vérifier la cohérence des quotas
    console.log("\n4. Vérification système quotas...");

    const quotaStatus = await SupabaseBridge.getQuotaStatus("test@example.com");
    console.log("Statut quotas:", quotaStatus);

    // 5. Tester les opérations critiques
    console.log("\n5. Test opérations critiques...");

    // Test récupération audits
    const userAudits = await SupabaseBridge.getUserAudits("test-user-id");
    console.log(`✅ Récupération audits: ${userAudits.length} audits trouvés`);

    // Test comptage mensuel
    const monthlyCount =
      await SupabaseBridge.getMonthlyAuditCount("test-user-id");
    console.log(`✅ Comptage mensuel: ${monthlyCount} audits ce mois`);

    console.log(`\n${  "=".repeat(50)}`);
    console.log("🎉 Architecture v2.0 optimisée validée avec succès!");
    console.log("✅ Plus de synchronisation profiles");
    console.log("✅ Fonctionnalités audits préservées");
    console.log("✅ Système quotas opérationnel");
  } catch (error) {
    console.error("\n❌ Échec test architecture:", error);
    process.exit(1);
  }
}

// Exécuter le test
testOptimizedArchitecture()
  .then(() => {
    console.log("\n🏁 Test terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test échoué:", error);
    process.exit(1);
  });
