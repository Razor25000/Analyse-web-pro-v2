#!/usr/bin/env tsx

/**
 * Script CI/CD pour l'exécution des tests e2e
 * Prépare l'environnement, lance les tests, nettoie automatiquement
 */

import { spawn } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

type TestConfig = {
  baseUrl: string;
  headless: boolean;
  workers: number;
  retries: number;
  timeout: number;
  skipCleanup?: boolean;
};

class E2ETestRunner {
  private readonly config: TestConfig;
  private readonly startTime: number;
  private testResults: any[] = [];

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
      headless: process.env.CI === "true",
      workers: process.env.CI === "true" ? 2 : 1,
      retries: process.env.CI === "true" ? 2 : 0,
      timeout: 60000,
      skipCleanup: false,
      ...config,
    };
    this.startTime = Date.now();
  }

  /**
   * Point d'entrée principal
   */
  async run() {
    try {
      console.log("🚀 Lancement des tests e2e...");
      this.logConfig();

      // Étapes d'exécution
      await this.validateEnvironment();
      await this.setupTestDatabase();
      await this.waitForApplication();
      await this.runMockServices();
      await this.executeTests();
      await this.generateReport();

      if (!this.config.skipCleanup) {
        await this.cleanup();
      }

      console.log("✅ Tests e2e terminés avec succès");
      process.exit(0);
    } catch (error) {
      console.error("❌ Échec des tests e2e:", error);
      await this.emergencyCleanup();
      process.exit(1);
    }
  }

  /**
   * Validation de l'environnement
   */
  private async validateEnvironment() {
    console.log("🔍 Validation de l'environnement...");

    // Vérifier les variables d'environnement requises
    const requiredEnvs = ["DATABASE_URL", "NEXTAUTH_SECRET", "NODE_ENV"];

    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        throw new Error(`Variable d'environnement manquante: ${env}`);
      }
    }

    // Vérifier que l'application est en mode test
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.NODE_ENV !== "development"
    ) {
      console.warn(`⚠️ NODE_ENV=${process.env.NODE_ENV} (recommandé: test)`);
    }

    // Vérifier les dépendances
    await this.checkDependencies();

    console.log("✅ Environnement validé");
  }

  /**
   * Vérification des dépendances
   */
  private async checkDependencies() {
    const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
    const requiredDeps = ["@playwright/test", "prisma", "@prisma/client"];

    for (const dep of requiredDeps) {
      if (
        !packageJson.devDependencies?.[dep] &&
        !packageJson.dependencies?.[dep]
      ) {
        throw new Error(`Dépendance manquante: ${dep}`);
      }
    }
  }

  /**
   * Préparation de la base de données de test
   */
  private async setupTestDatabase() {
    console.log("🗃️ Préparation de la base de données de test...");

    // Nettoyer les données de test existantes
    await this.runCommand("tsx", ["scripts/test-cleanup.ts"], {
      stdio: "inherit",
    });

    // Push du schéma Prisma
    await this.runCommand(
      "npx",
      ["prisma", "db", "push", "--accept-data-loss"],
      {
        stdio: "inherit",
      },
    );

    console.log("✅ Base de données préparée");
  }

  /**
   * Attendre que l'application soit prête
   */
  private async waitForApplication() {
    console.log("⏳ Attente du démarrage de l'application...");

    const maxAttempts = 30;
    const delay = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(this.config.baseUrl);
        if (response.ok) {
          console.log("✅ Application prête");
          return;
        }
      } catch (error) {
        // Application pas encore prête
      }

      console.log(`⏳ Tentative ${i + 1}/${maxAttempts}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error("Application non accessible après 60 secondes");
  }

  /**
   * Démarrage des services mock
   */
  private async runMockServices() {
    console.log("🎭 Démarrage des services mock...");

    // Les mocks sont gérés dans les tests via TestMocks
    // Ici on pourrait démarrer des services externes si nécessaire

    console.log("✅ Services mock prêts");
  }

  /**
   * Exécution des tests Playwright
   */
  private async executeTests() {
    console.log("🧪 Exécution des tests Playwright...");

    const playwrightArgs = [
      "--config=playwright.config.ts",
      `--workers=${this.config.workers}`,
      `--retries=${this.config.retries}`,
      "--reporter=json",
      "--output-dir=test-results",
    ];

    if (this.config.headless) {
      playwrightArgs.push("--headed=false");
    }

    // Patterns de tests à exécuter
    const testPatterns = process.argv.slice(2);
    if (testPatterns.length > 0) {
      playwrightArgs.push(...testPatterns);
    }

    await this.runCommand("npx", ["playwright", "test", ...playwrightArgs], {
      stdio: "inherit",
      env: {
        ...process.env,
        PLAYWRIGHT_TEST_BASE_URL: this.config.baseUrl,
      },
    });

    // Lire les résultats
    await this.parseTestResults();

    console.log("✅ Tests exécutés");
  }

  /**
   * Analyse des résultats de tests
   */
  private async parseTestResults() {
    const resultsPath = "test-results/results.json";

    if (existsSync(resultsPath)) {
      try {
        const results = JSON.parse(readFileSync(resultsPath, "utf-8"));
        this.testResults = results.tests || [];

        const stats = {
          total: this.testResults.length,
          passed: this.testResults.filter((t) => t.outcome === "expected")
            .length,
          failed: this.testResults.filter((t) => t.outcome === "unexpected")
            .length,
          skipped: this.testResults.filter((t) => t.outcome === "skipped")
            .length,
        };

        console.log(
          `📊 Résultats: ${stats.passed}✅ ${stats.failed}❌ ${stats.skipped}⏭️`,
        );

        if (stats.failed > 0) {
          throw new Error(`${stats.failed} test(s) en échec`);
        }
      } catch (error) {
        console.warn("⚠️ Impossible de lire les résultats détaillés");
      }
    }
  }

  /**
   * Génération du rapport
   */
  private async generateReport() {
    console.log("📊 Génération du rapport...");

    const duration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      config: this.config,
      results: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: process.env.CI === "true",
      },
    };

    // Sauvegarder le rapport
    writeFileSync(
      "test-results/e2e-report.json",
      JSON.stringify(report, null, 2),
    );

    // Générer un rapport HTML simple
    await this.generateHtmlReport(report);

    console.log("✅ Rapport généré: test-results/e2e-report.json");
  }

  /**
   * Génération du rapport HTML
   */
  private async generateHtmlReport(report: any) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Rapport de Tests E2E - ${new Date().toLocaleDateString("fr-FR")}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center; }
    .success { background: #e8f5e8; }
    .failure { background: #ffebee; }
    .duration { background: #fff3e0; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 6px; overflow: auto; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 Rapport de Tests E2E</h1>
    <p>Généré le ${new Date().toLocaleString("fr-FR")}</p>
    <p>Durée totale: ${report.duration}</p>
  </div>

  <div class="stats">
    <div class="stat success">
      <h3>✅ Succès</h3>
      <p>${report.results.filter((t: any) => t.outcome === "expected").length}</p>
    </div>
    <div class="stat failure">
      <h3>❌ Échecs</h3>
      <p>${report.results.filter((t: any) => t.outcome === "unexpected").length}</p>
    </div>
    <div class="stat">
      <h3>📊 Total</h3>
      <p>${report.results.length}</p>
    </div>
    <div class="stat duration">
      <h3>⏱️ Durée</h3>
      <p>${report.duration}</p>
    </div>
  </div>

  <h2>🔧 Configuration</h2>
  <pre>${JSON.stringify(report.config, null, 2)}</pre>

  <h2>🌍 Environnement</h2>
  <pre>${JSON.stringify(report.environment, null, 2)}</pre>
</body>
</html>`;

    writeFileSync("test-results/e2e-report.html", html);
  }

  /**
   * Nettoyage des données de test
   */
  private async cleanup() {
    console.log("🧹 Nettoyage des données de test...");

    try {
      await this.runCommand("tsx", ["scripts/test-cleanup.ts", "--full"], {
        stdio: "inherit",
      });
      console.log("✅ Nettoyage terminé");
    } catch (error) {
      console.warn("⚠️ Erreur durant le nettoyage:", error);
    }
  }

  /**
   * Nettoyage d'urgence en cas d'erreur
   */
  private async emergencyCleanup() {
    console.log("🚨 Nettoyage d'urgence...");

    try {
      await this.runCommand("tsx", ["scripts/test-cleanup.ts", "--emergency"], {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("💥 Échec du nettoyage d'urgence:", error);
    }
  }

  /**
   * Utilitaire pour lancer des commandes
   */
  private async runCommand(
    command: string,
    args: string[],
    options: any = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: "pipe",
        shell: process.platform === "win32",
        ...options,
      });

      let stdout = "";
      let stderr = "";

      if (proc.stdout) {
        proc.stdout.on("data", (data) => {
          stdout += data.toString();
          if (options.stdio === "inherit") {
            process.stdout.write(data);
          }
        });
      }

      if (proc.stderr) {
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
          if (options.stdio === "inherit") {
            process.stderr.write(data);
          }
        });
      }

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `Command failed: ${command} ${args.join(" ")}\n${stderr}`,
            ),
          );
        }
      });

      proc.on("error", reject);
    });
  }

  /**
   * Affichage de la configuration
   */
  private logConfig() {
    console.log("⚙️ Configuration:");
    console.log(`  - Base URL: ${this.config.baseUrl}`);
    console.log(`  - Headless: ${this.config.headless}`);
    console.log(`  - Workers: ${this.config.workers}`);
    console.log(`  - Retries: ${this.config.retries}`);
    console.log(`  - Timeout: ${this.config.timeout}ms`);
    console.log(`  - CI Mode: ${process.env.CI === "true"}`);
  }
}

// Lancement si appelé directement
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.run().catch(console.error);
}

export { E2ETestRunner };
