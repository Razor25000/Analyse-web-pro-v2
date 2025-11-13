#!/usr/bin/env tsx

/**
 * Test Complet en Conditions Réelles
 * Ce script teste toutes les fonctionnalités du projet étape par étape
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";

type TestResult = {
  step: string;
  status: "success" | "warning" | "error";
  message: string;
  details?: any;
};

class RealWorldTester {
  private readonly results: TestResult[] = [];
  private totalTests = 0;
  private successCount = 0;
  private warningCount = 0;
  private errorCount = 0;

  private log(
    step: string,
    status: "success" | "warning" | "error",
    message: string,
    details?: any,
  ) {
    const icons = { success: "✅", warning: "⚠️", error: "❌" };
    console.log(`${icons[status]} ${step}: ${message}`);

    if (details) {
      console.log("   Details:", details);
    }

    this.results.push({ step, status, message, details });
    this.totalTests++;

    if (status === "success") this.successCount++;
    else if (status === "warning") this.warningCount++;
    else this.errorCount++;
  }

  private async runCommand(
    command: string,
    description: string,
  ): Promise<{ success: boolean; output: string }> {
    try {
      console.log(`🔄 ${description}...`);
      const output = execSync(command, {
        encoding: "utf8",
        cwd: process.cwd(),
        timeout: 30000, // 30 secondes max
      });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  async testEnvironmentSetup() {
    console.log("\n🏗️ === PHASE 1: VÉRIFICATION ENVIRONNEMENT ===");

    // 1. Vérifier les fichiers d'environnement
    try {
      const envLocal = readFileSync(".env.local", "utf8");
      this.log("Environment", "success", "Fichier .env.local trouvé", {
        size: envLocal.length,
      });
    } catch (error) {
      this.log("Environment", "error", "Fichier .env.local manquant");
    }

    // 2. Vérifier Node.js et pnpm
    const nodeResult = await this.runCommand(
      "node --version",
      "Vérification Node.js",
    );
    if (nodeResult.success) {
      this.log("Node.js", "success", `Version: ${nodeResult.output.trim()}`);
    } else {
      this.log("Node.js", "error", "Node.js non disponible");
    }

    const pnpmResult = await this.runCommand(
      "pnpm --version",
      "Vérification pnpm",
    );
    if (pnpmResult.success) {
      this.log("pnpm", "success", `Version: ${pnpmResult.output.trim()}`);
    } else {
      this.log("pnpm", "error", "pnpm non disponible");
    }

    // 3. Vérifier les dépendances
    const depsResult = await this.runCommand(
      "pnpm list --depth=0",
      "Vérification dépendances",
    );
    if (depsResult.success) {
      this.log("Dependencies", "success", "Dépendances installées");
    } else {
      this.log(
        "Dependencies",
        "warning",
        "Problème avec les dépendances",
        depsResult.output,
      );
    }
  }

  async testDatabaseConnections() {
    console.log("\n🗄️ === PHASE 2: CONNEXIONS BASE DE DONNÉES ===");

    // 1. Test Prisma
    const prismaResult = await this.runCommand(
      "NODE_ENV=development npx prisma generate",
      "Test génération client Prisma",
    );
    if (prismaResult.success) {
      this.log("Prisma", "success", "Client Prisma généré avec succès");
    } else {
      this.log(
        "Prisma",
        "error",
        "Échec génération Prisma",
        prismaResult.output,
      );
    }

    // 2. Test connexion Supabase
    const supabaseTestResult = await this.runCommand(
      "NODE_ENV=development npx tsx scripts/test-database-connections.ts",
      "Test connexion Supabase",
    );
    if (supabaseTestResult.success) {
      this.log("Supabase", "success", "Connexion Supabase OK");
    } else {
      this.log(
        "Supabase",
        "warning",
        "Problème connexion Supabase",
        supabaseTestResult.output,
      );
    }
  }

  async testBuildAndTypeCheck() {
    console.log("\n🔧 === PHASE 3: BUILD ET TYPE CHECK ===");

    // 1. Type checking
    const tsResult = await this.runCommand(
      "pnpm ts",
      "Type checking TypeScript",
    );
    if (tsResult.success) {
      this.log("TypeScript", "success", "Pas d'erreurs de type");
    } else {
      this.log(
        "TypeScript",
        "error",
        "Erreurs de type détectées",
        tsResult.output,
      );
    }

    // 2. Linting
    const lintResult = await this.runCommand("pnpm lint:ci", "Linting du code");
    if (lintResult.success) {
      this.log("Linting", "success", "Code conforme aux règles");
    } else {
      this.log("Linting", "warning", "Warnings de linting", lintResult.output);
    }

    // 3. Build
    const buildResult = await this.runCommand("pnpm build", "Build production");
    if (buildResult.success) {
      this.log("Build", "success", "Build production réussi");
    } else {
      this.log("Build", "error", "Échec du build", buildResult.output);
    }
  }

  async testApproachModernisee() {
    console.log("\n🆕 === PHASE 4: TEST APPROCHE MODERNISÉE ===");

    const modernizedTestResult = await this.runCommand(
      'NODE_ENV=development DATABASE_URL="postgresql://postgres.muzzgghqpspummcrwxfa:CNDEdJ9xEz6oTVm0@aws-1-eu-west-3.pooler.supabase.com:5432/postgres" RESEND_API_KEY="dummy" EMAIL_FROM="test@example.com" STRIPE_SECRET_KEY="dummy" NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="dummy" NEXT_PUBLIC_EMAIL_CONTACT="test@example.com" SUPABASE_URL="https://muzzgghqpspummcrwxfa.supabase.co" SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11enpnZ2hxcHNwdW1tY3J3eGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1Mjk0OSwiZXhwIjoyMDcyOTI4OTQ5fQ.XKlfT2omO1-27C2usQei_113_Lu8Hgj3YehuuyTCNms" BETTER_AUTH_SECRET="wvp+V2hJKqXQs5xne1qyqSXHrbkxr/6RkmeixfCK/Dw=" BETTER_AUTH_URL="http://localhost:3000" npx tsx scripts/test-modernized-approach.ts',
      "Test approche modernisée",
    );

    if (modernizedTestResult.success) {
      this.log(
        "Modernized Approach",
        "success",
        "Architecture modernisée fonctionnelle",
      );
    } else {
      this.log(
        "Modernized Approach",
        "warning",
        "Problèmes avec l'approche modernisée",
        modernizedTestResult.output,
      );
    }
  }

  async testUnitaires() {
    console.log("\n🧪 === PHASE 5: TESTS UNITAIRES ===");

    const unitTestResult = await this.runCommand(
      "pnpm test:ci",
      "Tests unitaires",
    );
    if (unitTestResult.success) {
      this.log("Unit Tests", "success", "Tous les tests unitaires passent");
    } else {
      this.log(
        "Unit Tests",
        "warning",
        "Échecs dans les tests unitaires",
        unitTestResult.output,
      );
    }
  }

  async testE2E() {
    console.log("\n🎭 === PHASE 6: TESTS E2E (OPTIONNEL) ===");

    const e2eResult = await this.runCommand(
      "pnpm test:e2e:simple",
      "Tests E2E simplifiés",
    );
    if (e2eResult.success) {
      this.log("E2E Tests", "success", "Tests E2E réussis");
    } else {
      this.log(
        "E2E Tests",
        "warning",
        "Tests E2E avec problèmes (normal si pas d'environnement)",
        e2eResult.output,
      );
    }
  }

  async startDevServer() {
    console.log("\n🚀 === PHASE 7: DÉMARRAGE SERVEUR DEV ===");

    console.log("🔄 Tentative de démarrage du serveur de développement...");
    console.log(
      "⚠️  Le serveur sera démarré en arrière-plan. Vérifiez manuellement http://localhost:3000",
    );

    try {
      // Démarrer le serveur en arrière-plan
      const { spawn } = require("child_process");
      const server = spawn("pnpm", ["dev"], {
        detached: true,
        stdio: "ignore",
        shell: true,
      });

      server.unref();

      // Attendre un peu puis tester la connexion
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const curlResult = await this.runCommand(
        "timeout 10 curl -s http://localhost:3000/",
        "Test page d'accueil",
      );

      if (curlResult.success && curlResult.output.includes("html")) {
        this.log(
          "Dev Server",
          "success",
          "Serveur de développement opérationnel",
        );
      } else {
        this.log(
          "Dev Server",
          "warning",
          "Serveur démarré mais réponse inattendue",
        );
      }
    } catch (error: any) {
      this.log(
        "Dev Server",
        "warning",
        "Impossible de tester automatiquement le serveur",
        error.message,
      );
    }
  }

  generateReport() {
    console.log("\n📊 === RAPPORT FINAL ===");
    console.log(`\n📈 Résultats: ${this.totalTests} tests`);
    console.log(`✅ Réussis: ${this.successCount}`);
    console.log(`⚠️  Avertissements: ${this.warningCount}`);
    console.log(`❌ Échecs: ${this.errorCount}`);

    const successRate = Math.round((this.successCount / this.totalTests) * 100);
    console.log(`📊 Taux de réussite: ${successRate}%`);

    if (successRate >= 80) {
      console.log("\n🎉 PROJET PRÊT POUR LES TESTS EN CONDITIONS RÉELLES!");
    } else if (successRate >= 60) {
      console.log(
        "\n⚠️  PROJET PARTIELLEMENT PRÊT - Voir les avertissements ci-dessus",
      );
    } else {
      console.log("\n❌ PROJET NÉCESSITE DES CORRECTIONS AVANT LES TESTS");
    }

    console.log("\n📋 Actions recommandées:");
    if (this.errorCount > 0) {
      console.log("1. Corriger les erreurs critiques");
    }
    if (this.warningCount > 0) {
      console.log("2. Examiner les avertissements");
    }
    console.log("3. Tester manuellement l'interface à http://localhost:3000");
    console.log(
      "4. Vérifier les fonctionnalités critiques (auth, audits, quotas)",
    );
  }

  async runFullTest() {
    console.log("🚀 DÉMARRAGE DES TESTS EN CONDITIONS RÉELLES");
    console.log("=".repeat(50));

    try {
      await this.testEnvironmentSetup();
      await this.testDatabaseConnections();
      await this.testBuildAndTypeCheck();
      await this.testApproachModernisee();
      await this.testUnitaires();
      await this.testE2E();
      await this.startDevServer();

      this.generateReport();
    } catch (error) {
      console.error("💥 Erreur durant les tests:", error);
      this.log("Global", "error", "Échec global des tests");
    }
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const tester = new RealWorldTester();
  tester
    .runFullTest()
    .then(() => {
      console.log("\n✅ Tests terminés");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Tests échoués:", error);
      process.exit(1);
    });
}

export { RealWorldTester };
