#!/usr/bin/env tsx

/**
 * Script pour tester Better Auth en direct
 * Simule une vraie requête d'authentification
 */

import { upfetch } from "../src/lib/up-fetch";

async function testBetterAuthLive() {
  console.log("🔐 TEST BETTER AUTH EN DIRECT");
  console.log("=".repeat(50));

  const email = "girard.jeannemarie25220@gmail.com"; // Email du dernier utilisateur créé
  const testPasswords = [
    "password",
    "Password123",
    "password123",
    "123456",
    "test123",
    "motdepasse",
    "12345678",
  ];

  console.log(`📧 Test avec l'email: ${email}`);
  console.log("🔑 Test avec différents mots de passe...\n");

  // Vérifier si le serveur est en marche
  try {
    console.log("🔍 Vérification du serveur...");

    const healthCheck = await fetch("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!healthCheck.ok) {
      console.log("❌ Serveur non accessible sur http://localhost:3000");
      console.log("💡 Veuillez démarrer le serveur avec: pnpm dev");
      return;
    }

    console.log("✅ Serveur accessible\n");

    // Tester l'authentification avec chaque mot de passe
    for (const password of testPasswords) {
      console.log(`🔐 Test: "${password}"`);

      try {
        const response = await fetch(
          "http://localhost:3000/api/auth/sign-in/email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email,
              password: password,
              rememberMe: false,
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          console.log("🎉 ✅ CONNEXION RÉUSSIE !");
          console.log("   Réponse:", data);
          return; // Arrêter dès qu'on trouve le bon mot de passe
        } else {
          const errorData = await response.text();
          console.log(
            `   ❌ Échec: ${response.status} - ${errorData.substring(0, 100)}`,
          );
        }
      } catch (error) {
        console.log(`   ❌ Erreur: ${(error as Error).message}`);
      }
    }

    console.log("\n❌ Aucun mot de passe testé ne fonctionne");
    console.log("💡 Suggestions:");
    console.log(
      "   1. Utilisez le script test-user-login.ts pour tester interactivement",
    );
    console.log("   2. Vérifiez les logs du serveur");
    console.log("   3. Essayez de créer un nouveau compte de test");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    console.log("\n💡 Assurez-vous que:");
    console.log("   1. Le serveur est démarré (pnpm dev)");
    console.log("   2. Les variables d'environnement sont chargées");
    console.log("   3. La base de données est accessible");
  }
}

// Fonction pour tester un login spécifique
export async function testSpecificAuth(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      "http://localhost:3000/api/auth/sign-in/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
          rememberMe: false,
        }),
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Error testing auth:", error);
    return false;
  }
}

// Exécuter le test
if (require.main === module) {
  testBetterAuthLive().catch(console.error);
}
