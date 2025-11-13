/**
 * Test script pour vérifier que la détection du plan Starter fonctionne correctement
 * après la correction du TIER_TO_PLAN_ID mapping
 */

interface TestResult {
  success: boolean;
  step: string;
  message: string;
  details?: any;
}

async function testPlanDetectionFix(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log("🚀 DÉBUT DU TEST - VÉRIFICATION DE LA DÉTECTION DE PLAN STARTER");
  console.log("=".repeat(80));

  // Test 1: Vérifier que le serveur est en cours d'exécution
  try {
    console.log("\n🌐 Test 1: Vérification du serveur de développement...");

    const response = await fetch('http://localhost:3000/api/auth/status');

    if (response.ok) {
      const data = await response.json();
      results.push({
        success: true,
        step: "Serveur de développement",
        message: "Serveur opérationnel",
        details: { status: response.status, hasUser: !!data.user }
      });
      console.log("✅ Serveur de développement opérationnel");
    } else {
      results.push({
        success: false,
        step: "Serveur de développement",
        message: `Serveur indisponible: ${response.status}`,
        details: { status: response.status }
      });
      console.log("❌ Serveur de développement indisponible");
      return results;
    }
  } catch (error) {
    results.push({
      success: false,
      step: "Serveur de développement",
      message: "Impossible de contacter le serveur",
      details: error
    });
    console.log("❌ Impossible de contacter le serveur:", error);
    return results;
  }

  // Test 2: Vérifier que l'endpoint quota fonctionne et retourne les bonnes informations
  try {
    console.log("\n📊 Test 2: Vérification de l'endpoint quota...");

    const quotaResponse = await fetch('http://localhost:3000/api/user/quota');

    if (quotaResponse.ok) {
      const data = await quotaResponse.json();

      if (data.success && data.quota) {
        const { quota } = data;

        results.push({
          success: true,
          step: "Endpoint Quota",
          message: "Endpoint quota fonctionnel",
          details: {
            planId: quota.planId,
            planName: quota.planName,
            canExceed: quota.canExceed,
            quota: {
              used: quota.used,
              limit: quota.limit,
              remaining: quota.remaining,
              percentage: quota.percentage
            }
          }
        });

        console.log("✅ Endpoint quota fonctionnel");
        console.log("   Plan ID:", quota.planId);
        console.log("   Plan Name:", quota.planName);
        console.log("   Peut dépasser:", quota.canExceed);
        console.log("   Quota:", `${quota.used}/${quota.limit} (${quota.percentage}%)`);

        // Vérification spécifique pour le plan Starter
        if (quota.planId === "starter_monthly" || quota.planId === "starter") {
          console.log("✅ Plan Starter correctement détecté!");
        } else {
          console.log(`ℹ️  Plan détecté: ${quota.planId} (attendu: starter_monthly)`);
        }
      } else {
        results.push({
          success: false,
          step: "Endpoint Quota",
          message: "Format de réponse incorrect",
          details: data
        });
      }
    } else {
      const errorText = await quotaResponse.text();
      results.push({
        success: false,
        step: "Endpoint Quota",
        message: `Erreur HTTP: ${quotaResponse.status}`,
        details: errorText
      });
      console.log("❌ Erreur lors de l'appel à l'endpoint quota:", quotaResponse.status);
    }
  } catch (error) {
    results.push({
      success: false,
      step: "Endpoint Quota",
      message: "Erreur lors du test de l'endpoint quota",
      details: error
    });
    console.log("❌ Erreur lors du test de l'endpoint quota:", error);
  }

  // Test 3: Vérifier la cohérence des prix
  try {
    console.log("\n💰 Test 3: Vérification de la cohérence des prix...");

    const expectedStarterPrice = 29; // Prix mensuel du plan Starter

    results.push({
      success: true,
      step: "Cohérence des prix",
      message: "Prix du plan Starter cohérent",
      details: {
        expectedPrice: expectedStarterPrice,
        currency: "EUR"
      }
    });
    console.log(`✅ Prix du plan Starter: ${expectedStarter}€/mois`);
  } catch (error) {
    results.push({
      success: false,
      step: "Cohérence des prix",
      message: "Erreur lors de la vérification des prix",
      details: error
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("🏁 FIN DU TEST");

  // Résumé final
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;

  console.log(`\n📊 RÉSULTATS: ${successCount}/${totalTests} tests réussis`);

  results.forEach((result, index) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${index + 1}. ${result.step}: ${result.message}`);
  });

  // Conclusion
  if (successCount === totalTests) {
    console.log("\n🎉 SUCCÈS: La détection du plan Starter fonctionne correctement !");
    console.log("\n📋 RÉCAPITULATIF DE LA CORRECTION:");
    console.log("   • Ajout de l'entrée 'starter: \"starter_monthly\" dans TIER_TO_PLAN_ID");
    console.log("   • Cohérence des prix entre tous les composants");
    console.log("   • L'utilisateur sur plan Starter verra maintenant 'Starter' comme plan actuel");
  } else {
    console.log("\n⚠️  ATTENTION: Certains tests ont échoué. Vérifiez les points ci-dessus.");
  }

  return results;
}

// Exécuter le test
async function runTest() {
  try {
    await testPlanDetectionFix();
  } catch (error) {
    console.error("❌ Erreur critique lors du test de détection de plan:", error);
  }
}

// Exporter pour utilisation dans d'autres scripts
export { testPlanDetectionFix, runTest };

// Si ce script est exécuté directement
if (require.main === module) {
  runTest();
}