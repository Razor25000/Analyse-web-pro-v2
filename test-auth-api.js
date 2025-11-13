#!/usr/bin/env node

// Test direct de l'API Better Auth
const crypto = require("crypto");

console.log("🔍 Test direct de l'API Better Auth...\n");

const baseUrl = "http://localhost:3000";
const authUrl = `${baseUrl}/api/auth`;

async function testAuthEndpoints() {
  console.log("=== TEST 1: Endpoints Better Auth disponibles ===");

  try {
    // Test de la session sans cookies
    console.log("🔄 Test GET /api/auth/session (sans cookies)");
    const sessionResponse = await fetch(`${authUrl}/session`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(
      `   Status: ${sessionResponse.status} ${sessionResponse.statusText}`,
    );
    const sessionText = await sessionResponse.text();
    console.log(`   Response: ${sessionText}`);
  } catch (error) {
    console.log(`❌ Erreur session: ${error.message}`);
  }

  console.log("\n=== TEST 2: Test de connexion directe ===");

  try {
    // Test de connexion avec email/password
    console.log("🔄 Test POST /api/auth/sign-in/email");
    const loginResponse = await fetch(`${authUrl}/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "regis.laffond@yahoo.fr",
        password: "test123", // Password de test probable
      }),
    });

    console.log(
      `   Status: ${loginResponse.status} ${loginResponse.statusText}`,
    );
    const loginText = await loginResponse.text();
    console.log(`   Response: ${loginText}`);

    // Récupérer les cookies de la réponse
    const cookies = loginResponse.headers.get("set-cookie");
    if (cookies) {
      console.log(`   Cookies: ${cookies}`);

      // Test de la session avec les cookies reçus
      console.log("\n🔄 Test GET /api/auth/session (avec cookies)");
      const sessionWithCookieResponse = await fetch(`${authUrl}/session`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies,
        },
      });

      console.log(
        `   Status: ${sessionWithCookieResponse.status} ${sessionWithCookieResponse.statusText}`,
      );
      const sessionWithCookieText = await sessionWithCookieResponse.text();
      console.log(`   Response: ${sessionWithCookieText}`);
    }
  } catch (error) {
    console.log(`❌ Erreur login: ${error.message}`);
  }

  console.log("\n=== TEST 3: Vérification de la configuration ===");

  try {
    // Vérifier si l'endpoint auth répond
    console.log("🔄 Test GET /api/auth (base)");
    const baseAuthResponse = await fetch(`${authUrl}`, {
      method: "GET",
    });

    console.log(
      `   Status: ${baseAuthResponse.status} ${baseAuthResponse.statusText}`,
    );
  } catch (error) {
    console.log(`❌ Erreur base auth: ${error.message}`);
  }
}

async function main() {
  console.log(`🎯 Test de l'API Better Auth sur: ${baseUrl}\n`);

  // Attendre que le serveur soit prêt
  console.log("⏳ Attente que le serveur soit prêt...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testAuthEndpoints();

  console.log("\n=== DIAGNOSTIC ===");
  console.log("1. Si 404 → Endpoints Better Auth non configurés");
  console.log("2. Si 401/403 → Problème d'authentification");
  console.log("3. Si session vide → Problème de cookies/session");
  console.log("4. Si login échoue → Problème de mot de passe ou configuration");
  console.log("\n✅ Tests terminés");
}

main().catch(console.error);
