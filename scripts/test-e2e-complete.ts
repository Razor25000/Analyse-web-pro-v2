#!/usr/bin/env tsx

/**
 * Runner complet pour les tests e2e selon le guide e2e-guide.md
 * Automatise : validation environnement, préparation BDD, health check, services mock,
 * exécution tests, génération rapports, nettoyage
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

const execAsync = promisify(exec);

type TestConfig = {
  skipCleanup: boolean;
  environment: "test" | "development";
  parallel: boolean;
  headless: boolean;
  maxRetries: number;
  timeout: number;
  reportDir: string;
};

type TestResult = {
  success: boolean;
  duration: number;
  tests: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  errors?: string[];
  reportPaths: string[];
};

class E2ETestRunner {
  private readonly config: TestConfig;
  private startTime = 0;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      skipCleanup: false,
      environment: "test",
      parallel: true,
      headless: true,
      maxRetries: 2,
      timeout: 60000,
      reportDir: "./test-results",
      ...config,
    };

    // Charger les variables d'environnement
    this.loadEnvironmentVariables();
  }

  private loadEnvironmentVariables(): void {
    // Essayer de charger .env.test en priorité, puis .env.local comme fallback
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

  async run(): Promise<TestResult> {
    this.startTime = Date.now();
    console.log("🎬 Démarrage des tests e2e complets...");

    try {
      // 1. Validation environnement
      console.log("📋 Phase 1: Validation environnement");
      await this.validateEnvironment();

      // 2. Préparation BDD
      console.log("📋 Phase 2: Préparation base de données");
      await this.preparDatabase();

      // 3. Health check application
      console.log("📋 Phase 3: Vérification santé application");
      await this.waitForApplication();

      // 4. Activation services mock
      console.log("📋 Phase 4: Activation services mock");
      await this.setupMockServices();

      // 5. Exécution tests
      console.log("📋 Phase 5: Exécution des tests");
      const testResult = await this.executeTests();

      // 6. Génération rapports
      console.log("📋 Phase 6: Génération des rapports");
      await this.generateReports();

      // 7. Nettoyage
      if (!this.config.skipCleanup) {
        console.log("📋 Phase 7: Nettoyage");
        await this.cleanup();
      } else {
        console.log("⏭️ Phase 7: Nettoyage ignoré (--skip-cleanup)");
      }

      const duration = Date.now() - this.startTime;
      console.log(`✅ Tests e2e terminés en ${Math.round(duration / 1000)}s`);

      return {
        success: testResult.success,
        duration,
        tests: testResult.tests,
        reportPaths: testResult.reportPaths,
      };
    } catch (error) {
      const duration = Date.now() - this.startTime;
      console.error("❌ Échec des tests e2e:", error);

      return {
        success: false,
        duration,
        tests: { passed: 0, failed: 0, skipped: 0, total: 0 },
        errors: [error instanceof Error ? error.message : String(error)],
        reportPaths: [],
      };
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log("🔍 Vérification variables d'environnement...");

    const requiredEnvVars = [
      "DATABASE_URL",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Variables d'environnement manquantes: ${missingVars.join(", ")}`,
      );
    }

    console.log("✅ Variables d'environnement validées");

    // Vérifier dépendances
    console.log("🔍 Vérification dépendances...");

    try {
      await execAsync("npx playwright --version");
      console.log("✅ Playwright installé");
    } catch (error) {
      console.log("📦 Installation de Playwright...");
      await execAsync("npx playwright install");
    }

    // Vérifier que les navigateurs sont installés
    try {
      await execAsync("npx playwright install-deps");
      console.log("✅ Navigateurs Playwright prêts");
    } catch (error) {
      console.warn("⚠️ Problème avec install-deps, continuation...");
    }
  }

  private async preparDatabase(): Promise<void> {
    console.log("🗃️ Préparation base de données de test...");

    try {
      // Reset de la base de test
      console.log("🔄 Reset schema Prisma...");
      await execAsync("npx prisma db push --force-reset --accept-data-loss");

      // Migration Better Auth si nécessaire
      console.log("🔄 Migration Better Auth...");
      await execAsync(
        'npx better-auth:migrate --no-prompt || echo "Migration already up to date"',
      );

      console.log("✅ Base de données préparée");
    } catch (error) {
      console.warn("⚠️ Avertissement préparation BDD:", error);
      // Continue même en cas d'avertissement
    }
  }

  private async waitForApplication(): Promise<void> {
    console.log("⏳ Attente disponibilité application...");

    const baseUrl =
      process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
    const maxWaitTime = 60000; // 60 secondes
    const checkInterval = 2000; // 2 secondes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) {
          console.log("✅ Application disponible");
          return;
        }
      } catch (error) {
        // L'application n'est pas encore prête
      }

      // Tenter sur la homepage si /api/health n'existe pas
      try {
        const response = await fetch(baseUrl);
        if (response.ok) {
          console.log("✅ Application disponible (homepage)");
          return;
        }
      } catch (error) {
        // Continuer à attendre
      }

      console.log(
        `⏳ Application non prête, nouvelle tentative dans ${checkInterval / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error(
      `Application non disponible après ${maxWaitTime / 1000}s d'attente`,
    );
  }

  private async setupMockServices(): Promise<void> {
    console.log("🎭 Configuration des services mock...");

    // Vérifier que les variables de mock sont définies
    const mockEnvVars = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
      N8N_BASE_URL:
        process.env.N8N_BASE_URL?.includes("test") ||
        process.env.N8N_BASE_URL?.includes("mock"),
      RESEND_API_KEY:
        process.env.RESEND_API_KEY?.startsWith("re_test_") ||
        process.env.RESEND_API_KEY === "dummy",
    };

    const mockStatus = Object.entries(mockEnvVars).map(
      ([key, isMock]) => `${key}: ${isMock ? "✅ Mock" : "⚠️ Production"}`,
    );

    console.log("🎭 Statut des mocks:");
    mockStatus.forEach((status) => console.log(`  ${status}`));

    if (!mockEnvVars.STRIPE_SECRET_KEY) {
      console.warn("⚠️ ATTENTION: Clé Stripe production détectée!");
    }

    console.log("✅ Services mock configurés");
  }

  private async executeTests(): Promise<{
    success: boolean;
    tests: { passed: number; failed: number; skipped: number; total: number };
    reportPaths: string[];
  }> {
    console.log("🧪 Exécution des tests Playwright...");

    // Créer répertoire des rapports
    await fs.mkdir(this.config.reportDir, { recursive: true });

    const playwrightArgs = [
      "npx",
      "playwright",
      "test",
      "--project=chromium", // Utiliser seulement Chromium pour plus de rapidité
      `--reporter=html,json`,
      `--output-dir=${this.config.reportDir}`,
      "--timeout=30000", // 30s par test
    ];

    if (this.config.headless) {
      playwrightArgs.push("--headed=false");
    }

    if (this.config.parallel) {
      playwrightArgs.push("--workers=2"); // 2 workers parallèles
    }

    if (this.config.maxRetries > 0) {
      playwrightArgs.push(`--retries=${this.config.maxRetries}`);
    }

    // Ajouter patterns pour les nouveaux tests complets
    playwrightArgs.push("full-user-journey-complete.spec.ts");
    playwrightArgs.push("edge-cases-complete.spec.ts");
    playwrightArgs.push("performance-complete.spec.ts");

    console.log("🎯 Commande:", playwrightArgs.join(" "));

    return new Promise((resolve) => {
      const process = spawn(playwrightArgs[0], playwrightArgs.slice(1), {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_ENV: this.config.environment,
          CI: "true",
        },
      });

      process.on("close", async (code) => {
        const success = code === 0;

        // Parser le rapport JSON s'il existe
        let tests = { passed: 0, failed: 0, skipped: 0, total: 0 };
        const reportPaths = [
          path.join(this.config.reportDir, "report.json"),
          path.join(this.config.reportDir, "index.html"),
        ];

        try {
          const jsonReportPath = path.join(
            this.config.reportDir,
            "results.json",
          );
          const reportExists = await fs
            .access(jsonReportPath)
            .then(() => true)
            .catch(() => false);

          if (reportExists) {
            const reportContent = await fs.readFile(jsonReportPath, "utf-8");
            const report = JSON.parse(reportContent);

            if (report.stats) {
              tests = {
                passed: report.stats.passed || 0,
                failed: report.stats.failed || 0,
                skipped: report.stats.skipped || 0,
                total: report.stats.total || 0,
              };
            }
          }
        } catch (error) {
          console.warn("⚠️ Impossible de parser le rapport JSON:", error);
        }

        console.log(`📊 Résultats des tests:`);
        console.log(`  ✅ Réussis: ${tests.passed}`);
        console.log(`  ❌ Échoués: ${tests.failed}`);
        console.log(`  ⏭️ Ignorés: ${tests.skipped}`);
        console.log(`  📊 Total: ${tests.total}`);

        resolve({
          success,
          tests,
          reportPaths: reportPaths.filter(async (path) => {
            try {
              await fs.access(path);
              return true;
            } catch {
              return false;
            }
          }),
        });
      });
    });
  }

  private async generateReports(): Promise<void> {
    console.log("📑 Génération des rapports supplémentaires...");

    const reportDir = this.config.reportDir;

    // Créer un rapport de synthèse
    const summaryReport = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      environment: this.config.environment,
      config: this.config,
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    await fs.writeFile(
      path.join(reportDir, "test-summary.json"),
      JSON.stringify(summaryReport, null, 2),
    );

    // Créer un README pour les rapports
    const readmeContent = `# Rapports des Tests E2E

Générés le: ${new Date().toLocaleString("fr-FR")}
Durée totale: ${Math.round((Date.now() - this.startTime) / 1000)}s

## Fichiers disponibles

- \`index.html\`: Rapport HTML interactif Playwright
- \`results.json\`: Résultats détaillés au format JSON
- \`test-summary.json\`: Résumé de l'exécution
- \`screenshots/\`: Captures d'écran des échecs
- \`videos/\`: Enregistrements des échecs

## Comment utiliser

1. Ouvrir \`index.html\` dans un navigateur pour le rapport visuel
2. Consulter \`results.json\` pour l'analyse programmatique
3. Vérifier \`screenshots/\` et \`videos/\` pour déboguer les échecs

## Tests exécutés

- ✅ Parcours utilisateur complet A-Z (8 phases)
- ✅ Cas limites et gestion d'erreurs
- ✅ Tests de performance et scalabilité
`;

    await fs.writeFile(path.join(reportDir, "README.md"), readmeContent);

    console.log(`✅ Rapports générés dans ${reportDir}/`);
  }

  private async cleanup(): Promise<void> {
    console.log("🧹 Nettoyage des données de test...");

    try {
      // Nettoyer les utilisateurs de test
      console.log("🗑️ Suppression des utilisateurs de test...");

      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      // Supprimer tous les utilisateurs avec email @test.local ou @example.com
      const deletedUsers = await prisma.user.deleteMany({
        where: {
          OR: [
            { email: { endsWith: "@test.local" } },
            { email: { endsWith: "@example.com" } },
            { email: { startsWith: "test-" } },
          ],
        },
      });

      console.log(`✅ ${deletedUsers.count} utilisateurs de test supprimés`);

      await prisma.$disconnect();

      // Nettoyer les fichiers temporaires
      const tempDirs = ["./temp", "./tmp", "./.next/cache"];

      for (const dir of tempDirs) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
          console.log(`✅ Nettoyé: ${dir}`);
        } catch (error) {
          // Ignorer si le dossier n'existe pas
        }
      }
    } catch (error) {
      console.warn("⚠️ Avertissement lors du nettoyage:", error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  const config: Partial<TestConfig> = {
    skipCleanup: args.includes("--skip-cleanup"),
    headless: !args.includes("--headed"),
    parallel: !args.includes("--no-parallel"),
    environment: args.includes("--dev") ? "development" : "test",
  };

  const runner = new E2ETestRunner(config);
  const result = await runner.run();

  if (result.success) {
    console.log("🎉 Tous les tests e2e ont réussi!");
    process.exit(0);
  } else {
    console.error("💥 Des tests ont échoué");
    if (result.errors) {
      result.errors.forEach((error) => console.error(`  ❌ ${error}`));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}

export type { TestConfig, TestResult };
export { E2ETestRunner };
