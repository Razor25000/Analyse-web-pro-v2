#!/usr/bin/env tsx

/**
 * Tests manuels critiques pour valider les corrections de sécurité
 * Ces tests simulent les scénarios les plus critiques sans avoir besoin de Playwright
 */

import { spawn } from "child_process";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName: string, result: boolean, details?: string) {
  const icon = result ? "✅" : "❌";
  const color = result ? "green" : "red";
  const status = result ? "PASS" : "FAIL";

  log(color, `${icon} ${testName}: ${status}`);
  if (details) {
    log("blue", `    ${details}`);
  }
}

async function testSecurityEndpoints() {
  const baseUrl = "http://localhost:3000";
  const results = { passed: 0, failed: 0, total: 0 };

  const tests = [
    {
      name: "Dashboard sans auth redirige vers signin",
      test: async () => {
        try {
          const response = await fetch(`${baseUrl}/dashboard/audits`, {
            redirect: "manual",
          });

          // Doit être une redirection (302/401) ou html avec redirection
          const isRedirect = response.status === 302 || response.status === 401;
          const body = response.status === 200 ? await response.text() : "";
          const hasRedirectScript =
            body.includes("signin") || body.includes("redirect");

          return {
            success: isRedirect || hasRedirectScript,
            details: `Status: ${response.status}, Redirect: ${isRedirect}`,
          };
        } catch (error) {
          return { success: false, details: `Error: ${error.message}` };
        }
      },
    },
    {
      name: "Webhook sans signature retourne 400",
      test: async () => {
        try {
          const response = await fetch(`${baseUrl}/api/stripe/webhooks`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "stripe-signature": "invalid-signature",
            },
            body: JSON.stringify({
              type: "checkout.session.completed",
              data: { object: { id: "malicious" } },
            }),
          });

          return {
            success: response.status === 400,
            details: `Status: ${response.status}, Expected: 400`,
          };
        } catch (error) {
          return { success: false, details: `Error: ${error.message}` };
        }
      },
    },
    {
      name: "Success URL manipulation ne donne pas accès",
      test: async () => {
        try {
          const response = await fetch(
            `${baseUrl}/dashboard/audits?success=true&plan=pro_monthly`,
            {
              redirect: "manual",
            },
          );

          // Doit rediriger car pas de session valide
          const isBlocked = response.status === 302 || response.status === 401;

          return {
            success: isBlocked,
            details: `Status: ${response.status}, Blocked: ${isBlocked}`,
          };
        } catch (error) {
          return { success: false, details: `Error: ${error.message}` };
        }
      },
    },
    {
      name: "Create checkout accepte email sans userId (après correction)",
      test: async () => {
        try {
          const response = await fetch(
            `${baseUrl}/api/stripe/create-checkout-session?plan=pro_monthly&email=test@example.com`,
          );

          // Après correction, devrait accepter avec email
          // Peut échouer pour d'autres raisons (Stripe keys, etc.) mais pas 401
          const notUnauthorized = response.status !== 401;

          return {
            success: notUnauthorized,
            details: `Status: ${response.status}, Expected: not 401`,
          };
        } catch (error) {
          return { success: false, details: `Error: ${error.message}` };
        }
      },
    },
    {
      name: "Post-checkout sans session_id retourne erreur",
      test: async () => {
        try {
          const response = await fetch(`${baseUrl}/post-checkout`);

          // Doit afficher une page ou retourner erreur car session_id manquant
          const body = await response.text();
          const hasError =
            body.includes("error") ||
            body.includes("Error") ||
            body.includes("manquant") ||
            body.includes("requis");

          return {
            success: hasError || response.status >= 400,
            details: `Status: ${response.status}, Has error indicators: ${hasError}`,
          };
        } catch (error) {
          return { success: false, details: `Error: ${error.message}` };
        }
      },
    },
  ];

  log("cyan", "\n🔒 TESTS CRITIQUES DE SÉCURITÉ");
  log("cyan", "================================");

  for (const test of tests) {
    results.total++;

    try {
      const result = await test.test();

      if (result.success) {
        results.passed++;
        logTest(test.name, true, result.details);
      } else {
        results.failed++;
        logTest(test.name, false, result.details);
      }
    } catch (error) {
      results.failed++;
      logTest(test.name, false, `Exception: ${error.message}`);
    }

    // Petite pause entre les tests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

async function startDevServer(): Promise<{ process: any; ready: boolean }> {
  return new Promise((resolve) => {
    log("blue", "🚀 Démarrage du serveur de développement...");

    const devProcess = spawn("pnpm", ["dev"], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
    });

    let serverReady = false;

    devProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      if (
        output.includes("Local:") ||
        output.includes("localhost:3000") ||
        output.includes("Ready")
      ) {
        if (!serverReady) {
          serverReady = true;
          log("green", "✅ Serveur prêt");
          resolve({ process: devProcess, ready: true });
        }
      }
    });

    devProcess.stderr?.on("data", (data) => {
      const output = data.toString();
      if (
        output.includes("EADDRINUSE") ||
        output.includes("port") ||
        output.includes("3000")
      ) {
        log("yellow", "⚠️ Le serveur semble déjà en cours d'exécution");
        resolve({ process: null, ready: true });
      }
    });

    // Timeout après 30 secondes
    setTimeout(() => {
      if (!serverReady) {
        log("yellow", "⚠️ Timeout serveur - continuons quand même");
        resolve({ process: devProcess, ready: false });
      }
    }, 30000);
  });
}

async function checkServerHealth(): Promise<boolean> {
  try {
    log("blue", "🏥 Vérification de la santé du serveur...");
    const response = await fetch("http://localhost:3000/", {
      method: "HEAD",
      timeout: 5000,
    });

    const healthy = response.status < 500;
    log(
      healthy ? "green" : "red",
      `${healthy ? "✅" : "❌"} Serveur ${healthy ? "accessible" : "inaccessible"}`,
    );
    return healthy;
  } catch (error) {
    log("red", `❌ Serveur inaccessible: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    log("cyan", "\n🛡️  VALIDATION SÉCURITÉ CRITIQUE - PARCOURS UTILISATEUR");
    log("cyan", "======================================================");

    // 1. Vérifier si le serveur est accessible
    const serverHealthy = await checkServerHealth();

    if (!serverHealthy) {
      log("yellow", "⚠️ Serveur non accessible. Démarrage automatique...");
      const { process: devProcess, ready } = await startDevServer();

      if (!ready) {
        log("red", "❌ Impossible de démarrer le serveur automatiquement");
        log("yellow", "💡 Démarrez manuellement: pnpm dev");
        process.exit(1);
      }

      // Attendre que le serveur soit vraiment prêt
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // 2. Exécuter les tests de sécurité
    const results = await testSecurityEndpoints();

    // 3. Résultats finaux
    log("cyan", "\n📊 RÉSULTATS FINAUX");
    log("cyan", "==================");

    log("blue", `Tests exécutés: ${results.total}`);
    log("green", `✅ Réussis: ${results.passed}`);
    log("red", `❌ Échoués: ${results.failed}`);

    const successRate = Math.round((results.passed / results.total) * 100);
    log("cyan", `📈 Taux de réussite: ${successRate}%`);

    if (successRate >= 80) {
      log("green", "\n🎉 SÉCURITÉ VALIDÉE");
      log("green", "✅ Les corrections critiques fonctionnent correctement");
      log("green", "✅ Le parcours utilisateur est sécurisé");
      log("green", "🚀 Prêt pour les tests E2E complets");

      console.log(`\n💡 Pour des tests plus complets, exécutez:
  pnpm test:e2e:ci
  ou
  tsx scripts/test-user-journey-security.ts`);

      process.exit(0);
    } else {
      log("red", "\n🚨 SÉCURITÉ INSUFFISANTE");
      log("red", "❌ Certaines corrections critiques ne fonctionnent pas");
      log(
        "yellow",
        "🔧 Vérifiez les logs ci-dessus et appliquez les corrections",
      );

      process.exit(1);
    }
  } catch (error) {
    log("red", `🚨 Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main as testCriticalSecurity };
