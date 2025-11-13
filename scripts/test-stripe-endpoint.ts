#!/usr/bin/env tsx

/**
 * Script pour tester l'endpoint de création de session Stripe
 */

import { config } from "dotenv";
import { upfetch } from "@/lib/up-fetch";

// Charger les variables d'environnement
config({ path: ".env.local" });

async function testStripeEndpoint() {
  try {
    console.log("🔍 Test de l'endpoint Stripe create-checkout-session...\n");

    const testUrl = "http://localhost:3000/api/stripe/create-checkout-session";
    const params = {
      plan: "pro_monthly",
      userId: "4nnIPoVdvG5CLjrs6uSOY4BZAcE1kr63", // Utilisateur existant
    };

    console.log(`🚀 Test GET ${testUrl}`);
    console.log(`📋 Paramètres:`, params);

    // Note: Ce test nécessiterait une session utilisateur valide
    // On teste juste que l'endpoint répond correctement
    const response = await fetch(`${testUrl}?${new URLSearchParams(params)}`);

    console.log(`📊 Status: ${response.status}`);
    console.log(`📍 Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log(
        "✅ L'endpoint fonctionne correctement (401 attendu sans session valide)",
      );
    } else if (response.status === 302 || response.status === 307) {
      const location = response.headers.get("location");
      if (location?.includes("stripe") || location?.includes("checkout")) {
        console.log("✅ Redirection vers Stripe détectée !");
        console.log(`🔗 URL: ${location}`);
      } else {
        console.log("⚠️  Redirection inattendue:", location);
      }
    } else {
      const text = await response.text();
      console.log(`📄 Réponse:`, text);
    }

    console.log("\n✅ Test de l'endpoint terminé");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  }
}

if (require.main === module) {
  testStripeEndpoint();
}
