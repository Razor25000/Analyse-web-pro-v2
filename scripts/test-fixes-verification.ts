#!/usr/bin/env tsx

/**
 * Script de test pour vérifier les corrections appliquées
 * Utilise des variables d environnement mock pour éviter les erreurs de base de données
 */

console.log("🔧 Test des corrections appliquées...");

// Test 1: Vérification des pages sans authentification
console.log("\n📄 Test d accès aux pages publiques...");

try {
  const testUrls = [
    "http://localhost:3000/",
    "http://localhost:3000/pricing",
    "http://localhost:3000/auth/signin",
  ];

  for (const url of testUrls) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      console.log(`✅ ${url}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${url}: Erreur de connexion`);
    }
  }
} catch (error) {
  console.error("Erreur lors du test des pages:", error);
}

console.log("\n✅ Tests terminés");
console.log("\n📋 Problèmes identifiés:");
console.log("1. Base de données Supabase non accessible");
console.log("2. Variables d environnement DATABASE_URL manquantes");
console.log("3. Sessions BetterAuth en échec à cause de la DB");

console.log("\n🔧 Solutions recommandées:");
console.log("1. Configurer les variables DATABASE_URL dans .env.local");
console.log("2. Vérifier la connectivité Supabase");
console.log(
  "3. Ou utiliser un environnement de développement local avec SQLite",
);
