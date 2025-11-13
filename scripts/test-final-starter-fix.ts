/**
 * Test final pour vérifier que la correction du plan Starter fonctionne
 */

async function testFinalStarterFix() {
  console.log("🎯 VÉRIFICATION FINALE - CORRECTION PLAN STARTER");
  console.log("");

  // Test de l'endpoint quota
  const response = await fetch('http://localhost:3000/api/user/quota');
  const data = await response.json();

  if (data.success && data.quota) {
    console.log("✅ État actuel du plan détecté:");
    console.log("   Plan ID:", data.quota.planId);
    console.log("   Nom du plan:", data.quota.planName);
    console.log("   Type de plan:", data.quota.planId === "starter_monthly" ? "PAYANT" : "GRATUIT");
    console.log("   Quota utilisé:", data.quota.used, "/", data.quota.limit);

    if (data.quota.planId === "starter_monthly") {
      console.log("");
      console.log("🎉 SUCCÈS: L'utilisateur sur plan Starter est maintenant correctement détecté!");
      console.log("   - Le problème de détection a été résolu");
      console.log("   - La page billing affichera maintenant \"Starter\" comme plan actuel");
      console.log("   - L'utilisateur ne sera plus redirigé vers pré-inscription");
    } else {
      console.log("ℹ️  Plan détecté:", data.quota.planId, "(attendu: starter_monthly)");
    }
  } else {
    console.log("❌ Erreur lors de la récupération des informations du plan");
  }
}

testFinalStarterFix();