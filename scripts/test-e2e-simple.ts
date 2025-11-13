#!/usr/bin/env tsx

/**
 * Version simplifiée du runner e2e qui suppose que l'application tourne déjà
 * Usage: Démarrer d'abord `pnpm dev` puis `tsx scripts/test-e2e-simple.ts`
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

class SimpleE2ERunner {
  constructor() {
    this.loadEnvironmentVariables();
  }

  private loadEnvironmentVariables(): void {
    // Charger les variables d'environnement
    const envFiles = [".env.test", ".env.local", ".env"];
    let loaded = false;

    for (const envFile of envFiles) {
      try {
        const result = config({ path: envFile });
        if (!result.error) {
          console.log(
            `🔧 Variables d'environnement chargées depuis ${envFile}`,
          );
          loaded = true;
          break;
        }
      } catch (error) {
        // Continuer avec le fichier suivant
      }
    }

    if (!loaded) {
      console.warn(
        "⚠️ Aucun fichier .env trouvé, utilisation des variables système",
      );
    }
  }

  private async checkApplicationHealth(): Promise<boolean> {
    const baseUrl =
      process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        console.log("✅ Application disponible");
        return true;
      }
    } catch (error) {
      console.error("❌ Application non disponible sur", baseUrl);
      console.log("💡 Assurez-vous que `pnpm dev` est en cours d'exécution");
      return false;
    }

    return false;
  }

  async runTests(): Promise<void> {
    console.log("🎬 Démarrage des tests e2e simplifiés...");

    // Vérifier que l'application est disponible
    const isAppReady = await this.checkApplicationHealth();
    if (!isAppReady) {
      throw new Error(
        "Application non disponible. Démarrez d'abord `pnpm dev`",
      );
    }

    // Créer répertoire des rapports
    const reportDir = "./test-results";
    await fs.mkdir(reportDir, { recursive: true });

    // Arguments pour Playwright
    const playwrightArgs = [
      "npx",
      "playwright",
      "test",
      "--project=chromium",
      `--reporter=html,json`,
      `--output-dir=${reportDir}`,
      "--timeout=30000",
      "--retries=1",
      "--workers=2",
    ];

    // Ajouter les nouveaux tests complets
    const testFiles = [
      "full-user-journey-complete.spec.ts",
      "edge-cases-complete.spec.ts",
      "performance-complete.spec.ts",
    ];

    playwrightArgs.push(...testFiles);

    console.log("🧪 Exécution des tests Playwright...");
    console.log("📋 Tests:", testFiles.join(", "));

    return new Promise((resolve, reject) => {
      const testProcess = spawn(playwrightArgs[0], playwrightArgs.slice(1), {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_ENV: "test",
          CI: "true",
        },
      });

      testProcess.on("close", async (code) => {
        if (code === 0) {
          console.log("🎉 Tous les tests ont réussi!");

          // Afficher liens vers rapports
          console.log(`📊 Rapports disponibles dans ${reportDir}/`);
          console.log(`🔗 Rapport HTML: ${reportDir}/index.html`);

          resolve();
        } else {
          console.error("💥 Des tests ont échoué");
          reject(new Error(`Tests échoués avec le code ${code}`));
        }
      });
    });
  }
}

// CLI Interface
async function main() {
  try {
    const runner = new SimpleE2ERunner();
    await runner.runTests();
    process.exit(0);
  } catch (error) {
    console.error("💥 Erreur:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SimpleE2ERunner };
