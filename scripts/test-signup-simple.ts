#!/usr/bin/env tsx

/**
 * Test simple de l'inscription pour vérifier si les erreurs de base de données sont résolues
 */

import fetch from "node-fetch";

async function testSignup() {
  console.log("🧪 Test de l'inscription...\n");

  try {
    // Test 1: Vérifier que la page d'inscription se charge
    console.log("📄 Test 1: Chargement de la page d'inscription...");
    const pageResponse = await fetch("http://localhost:3001/auth/signup");
    console.log(`Status: ${pageResponse.status}`);

    if (pageResponse.status !== 200) {
      console.log("❌ La page d'inscription ne se charge pas correctement");
      return false;
    }
    console.log("✅ Page d'inscription accessible");

    // Test 2: Essayer une requête d'inscription (simulée)
    console.log("\n📝 Test 2: Tentative d'inscription...");
    const signupData = {
      email: "test@example.com",
      password: "test123456",
      name: "Test User",
    };

    const signupResponse = await fetch(
      "http://localhost:3001/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      },
    );

    console.log(`Status inscription: ${signupResponse.status}`);
    const responseText = await signupResponse.text();

    if (signupResponse.status === 500) {
      console.log(
        "❌ Erreur serveur 500 - problème de base de données probable",
      );
      console.log("Réponse:", `${responseText.substring(0, 200)}...`);
      return false;
    }

    if (signupResponse.status === 200 || signupResponse.status === 201) {
      console.log("✅ Inscription réussie ou gérée correctement");
      return true;
    }

    console.log("⚠️ Réponse inattendue:", responseText.substring(0, 200));
    return false;
  } catch (error: any) {
    console.error("❌ Erreur lors du test:", error.message);
    return false;
  }
}

async function main() {
  console.log("🔧 TEST INSCRIPTION APRÈS CORRECTION BASE DE DONNÉES\n");
  console.log("=".repeat(60));

  const result = await testSignup();

  if (result) {
    console.log("\n🎉 Les problèmes de base de données semblent résolus !");
    console.log("✅ L'inscription fonctionne correctement");
  } else {
    console.log("\n⚠️ Il reste des problèmes à résoudre");
    console.log("📋 Actions recommandées:");
    console.log("1. Vérifier les logs du serveur");
    console.log("2. Contrôler la configuration Better Auth");
    console.log("3. Tester manuellement l'inscription");
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Erreur:", error);
      process.exit(1);
    });
}
