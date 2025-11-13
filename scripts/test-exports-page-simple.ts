#!/usr/bin/env tsx

/**
 * Test simple de la page d'exports sans dépendances Node.js
 */

async function testExportsPage() {
  console.log("🔍 Test de la page d'exports...");

  try {
    // Vérifier que le serveur est en cours d'exécution
    console.log("\n1️⃣ Vérification du serveur...");
    const serverResponse = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }).catch(() => null);

    if (serverResponse && serverResponse.ok) {
      console.log("✅ Serveur répond correctement");
    } else {
      console.log("⚠️ Serveur non accessible, test limité aux imports");
    }

    // Test de la page d'exports
    console.log("\n2️⃣ Test de la page d'exports...");
    const exportsResponse = await fetch('http://localhost:3000/dashboard/exports', {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (exportsResponse.ok) {
      console.log("✅ Page d'exports accessible");
      console.log(`📊 Status: ${exportsResponse.status}`);
    } else {
      console.error("❌ Erreur d'accès à la page d'exports");
      console.log(`📊 Status: ${exportsResponse.status}`);

      const errorText = await exportsResponse.text();
      console.log("📄 Détail de l'erreur:", errorText.substring(0, 500));
    }

    // Test de l'API des jobs d'exports
    console.log("\n3️⃣ Test de l'API des jobs d'exports...");
    const jobsResponse = await fetch('http://localhost:3000/api/audits/export/jobs', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (jobsResponse.ok) {
      const data = await jobsResponse.json();
      console.log("✅ API des jobs accessible");
      console.log(`📊 Jobs trouvés: ${data.jobs?.length || 0}`);

      if (data.jobs && data.jobs.length > 0) {
        console.log("📋 Premier job:");
        console.log(`   - ID: ${data.jobs[0]?.id}`);
        console.log(`   - Statut: ${data.jobs[0]?.status?.phase}`);
        console.log(`   - Progression: ${data.jobs[0]?.status?.progress}%`);
      }
    } else {
      console.log("⚠️ API des jobs non accessible (normal si pas de jobs en cours)");
      console.log(`📊 Status: ${jobsResponse.status}`);
    }

    console.log("\n✅ Test de la page d'exports terminé!");
    console.log("🌐 Test dans le navigateur: http://localhost:3000/dashboard/exports");

  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  }
}

// Exécuter le test
testExportsPage().then(() => {
  console.log("🏁 Test terminé");
}).catch((error) => {
  console.error("❌ Erreur lors du test:", error);
  process.exit(1);
});