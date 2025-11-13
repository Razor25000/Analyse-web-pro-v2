#!/usr/bin/env node

// Test simple pour vérifier la configuration n8n
const { config } = require("dotenv");

// Charger les variables d'environnement depuis .env
config();

console.log("🔍 Vérification de la configuration n8n...\n");

// Vérifier les variables n8n
const n8nVars = {
  N8N_WEBHOOK_BASE_URL: process.env.N8N_WEBHOOK_BASE_URL,
  N8N_SINGLE_AUDIT_PATH: process.env.N8N_SINGLE_AUDIT_PATH,
  N8N_BATCH_AUDIT_PATH: process.env.N8N_BATCH_AUDIT_PATH,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
};

console.log("📋 Variables n8n trouvées:");
Object.entries(n8nVars).forEach(([key, value]) => {
  console.log(`   ${key}: ${value ? "✅ " + value : "❌ Manquant"}`);
});

console.log("\n🔗 URL de webhook construite:");
if (n8nVars.N8N_WEBHOOK_BASE_URL && n8nVars.N8N_SINGLE_AUDIT_PATH) {
  const webhookUrl = `${n8nVars.N8N_WEBHOOK_BASE_URL}${n8nVars.N8N_SINGLE_AUDIT_PATH}`;
  console.log(`   ${webhookUrl}`);

  // Test de la connectivité
  console.log("\n🌐 Test de connectivité...");
  fetch(webhookUrl, { method: "GET" })
    .then((response) => {
      console.log(
        `✅ Réponse reçue: ${response.status} ${response.statusText}`,
      );
    })
    .catch((error) => {
      console.log(`❌ Erreur de connexion: ${error.message}`);
    });
} else {
  console.log("❌ Variables manquantes pour construire l'URL");
}
