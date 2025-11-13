#!/usr/bin/env tsx

/**
 * Script de test simple pour diagnostiquer l'export
 */

import { upfetch } from "@/lib/up-fetch";

async function testExportAPI() {
  console.log("🔍 Test de l'API d'export...");

  try {
    // Test 1: Vérifier si l'API répond
    console.log("\n1️⃣ Test de l'API /api/audits/export...");

    const testData = {
      format: "json",
      filters: {
        status: ["completed"],
        minScore: 50
      },
      includeMetadata: true,
      includeScreenshots: false
    };

    console.log("📤 Envoi des données de test:", testData);

    const response = await fetch('/api/audits/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log("📊 Status de la réponse:", response.status);
    console.log("📊 Headers de la réponse:", response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur de l'API:", errorText);
      return;
    }

    console.log("✅ API répond correctement");

    // Test 2: Vérifier le flux SSE
    console.log("\n2️⃣ Test du flux SSE...");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let buffer = '';
      let messageCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("🏁 Fin du flux SSE");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Traiter les lignes complètes sauf la dernière
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          if (line.startsWith('data: ')) {
            try {
              const eventData = line.substring(6);
              const data = JSON.parse(eventData);
              messageCount++;

              console.log(`📨 Message ${messageCount}:`, data);

              if (data.type === 'error') {
                console.error("❌ Erreur SSE:", data.status?.error);
              }

              // Arrêter après quelques messages pour éviter l'attente infinie
              if (messageCount >= 5) {
                break;
              }
            } catch (parseError) {
              console.error("❌ Erreur de parsing SSE:", parseError);
            }
          }
        }

        // Garder la dernière ligne incomplète
        buffer = lines[lines.length - 1];
      }
    }

    console.log("✅ Test SSE terminé");

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

// Vérifier si nous sommes dans un environnement browser ou Node
if (typeof window !== 'undefined') {
  console.log("🌐 Environnement browser détecté");
  // Version browser du test
  testExportAPI();
} else {
  console.log("🖥️ Environnement Node.js détecté");
  // Version Node.js du test
  testExportAPI().then(() => {
    console.log("🏁 Test terminé");
  }).catch((error) => {
    console.error("❌ Erreur lors du test:", error);
    process.exit(1);
  });
}