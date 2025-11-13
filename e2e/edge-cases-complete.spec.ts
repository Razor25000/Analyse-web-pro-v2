import { test, expect } from "@playwright/test";
import { TestMocks, TestDataFactory } from "./utils/test-mocks";
import { TestAssertions } from "./utils/test-assertions";
import { TestCleanup } from "./utils/test-cleanup";

/**
 * Tests des cas limites selon le guide e2e-guide.md
 * Couvre les erreurs de paiement, réseau, validation sécurisée, concurrence, sessions, récupération
 */
test.describe("Cas Limites et Situations d'Erreur", () => {
  let mocks: TestMocks;
  let assertions: TestAssertions;

  test.beforeEach(async ({ page }) => {
    mocks = new TestMocks(page);
    assertions = new TestAssertions(page);
  });

  test.afterEach(async ({ page }) => {
    await mocks.clearAllMocks();
  });

  test.describe("Erreurs de Paiement", () => {
    test("doit gérer une carte refusée Stripe", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      // Mock Stripe pour simuler carte refusée
      await page.route("**/api/stripe/create-checkout", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Your card was declined.",
            code: "card_declined",
          }),
        });
      });

      // Inscription utilisateur
      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Aller au billing et tenter upgrade
      await page.goto("/dashboard/billing");

      page.on("dialog", async (dialog) => {
        await dialog.accept();
      });

      const upgradeButton = page
        .getByRole("button", { name: /choisir.*plan/i })
        .first();
      await upgradeButton.click();

      // Vérifier gestion d'erreur
      await expect(
        page.getByText(/carte.*refusée|payment.*failed|erreur.*paiement/i),
      ).toBeVisible({ timeout: 10000 });
      console.log("✅ Erreur carte refusée gérée correctement");

      await TestCleanup.cleanupUser(userData.email);
    });

    test("doit gérer un timeout Stripe", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      // Mock timeout Stripe
      await page.route("**/api/stripe/create-checkout", async (route) => {
        // Simuler un timeout
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 408,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Request timeout",
            code: "request_timeout",
          }),
        });
      });

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");
      await page.goto("/dashboard/billing");

      page.on("dialog", async (dialog) => {
        await dialog.accept();
      });

      const upgradeButton = page
        .getByRole("button", { name: /choisir.*plan/i })
        .first();
      await upgradeButton.click();

      await expect(
        page.getByText(/timeout|délai.*dépassé|erreur.*réseau/i),
      ).toBeVisible({ timeout: 10000 });
      console.log("✅ Timeout Stripe géré correctement");

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Erreurs Réseau", () => {
    test("doit gérer les timeouts n8n", async ({ page }) => {
      const userData = TestDataFactory.createUserData();
      const auditData = TestDataFactory.createAuditData();

      // Mock timeout n8n
      await page.route("**/n8n.*/webhook/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30s timeout
        await route.fulfill({
          status: 408,
          contentType: "application/json",
          body: JSON.stringify({ error: "Webhook timeout" }),
        });
      });

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Tenter de créer un audit
      await page.getByRole("link", { name: /nouvel audit/i }).click();
      await page.getByLabel(/url/i).fill(auditData.url);
      await page.getByLabel(/email/i).fill(userData.email);
      await page.getByRole("button", { name: /démarrer l'audit/i }).click();

      // Vérifier gestion du timeout
      await expect(
        page.getByText(/erreur.*temporaire|service.*indisponible|timeout/i),
      ).toBeVisible({ timeout: 35000 });
      console.log("✅ Timeout n8n géré correctement");

      await TestCleanup.cleanupUser(userData.email);
    });

    test("doit gérer les webhooks échoués", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      // Mock webhook callback qui échoue
      await page.route("**/api/audits/webhook/n8n", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Webhook processing failed" }),
        });
      });

      await mocks.mockN8nService(); // Mock service principal

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Vérifier que l'application reste stable même avec webhooks échoués
      const auditData = TestDataFactory.createAuditData();
      await page.getByRole("link", { name: /nouvel audit/i }).click();
      await page.getByLabel(/url/i).fill(auditData.url);
      await page.getByLabel(/email/i).fill(userData.email);
      await page.getByRole("button", { name: /démarrer l'audit/i }).click();

      // L'audit doit démarrer même si le webhook échoue
      await expect(page.getByText(/audit démarré|en cours/i)).toBeVisible({
        timeout: 10000,
      });
      console.log("✅ Résilience aux webhooks échoués OK");

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Validation Sécurisée", () => {
    test("doit bloquer les tentatives XSS dans les formulaires", async ({
      page,
    }) => {
      const userData = TestDataFactory.createUserData();
      const xssPayload = '<script>alert("XSS")</script>';

      await page.goto("/auth/signup");

      // Tenter injection XSS dans le nom
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);

      // Si il y a un champ nom visible, tester XSS
      const nameField = page.locator(
        'input[name="name"], input[name="firstName"]',
      );
      if (await nameField.isVisible()) {
        await nameField.fill(xssPayload);
      }

      await page.getByRole("button", { name: /sign up/i }).click();

      // Vérifier qu'aucun script ne s'exécute
      const alerts: string[] = [];
      page.on("dialog", (dialog) => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });

      await page.waitForTimeout(2000);
      expect(alerts).toHaveLength(0);
      console.log("✅ Protection XSS active");

      await TestCleanup.cleanupUser(userData.email);
    });

    test("doit valider les URLs malveillantes dans les audits", async ({
      page,
    }) => {
      const userData = TestDataFactory.createUserData();
      const maliciousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        "ftp://malicious.com/payload",
        "http://localhost:22/ssh-attack",
        "https://test.local/../../etc/passwd",
      ];

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Tester chaque URL malveillante
      for (const maliciousUrl of maliciousUrls) {
        await page.getByRole("link", { name: /nouvel audit/i }).click();
        await page.getByLabel(/url/i).fill(maliciousUrl);
        await page.getByLabel(/email/i).fill(userData.email);
        await page.getByRole("button", { name: /démarrer l'audit/i }).click();

        // Vérifier message d'erreur de validation
        await expect(
          page.getByText(/url.*invalide|format.*incorrect|non.*autorisé/i),
        ).toBeVisible({ timeout: 5000 });
        console.log(
          `✅ URL malveillante bloquée: ${maliciousUrl.substring(0, 30)}...`,
        );

        await page.goto("/dashboard/audits");
        await page.waitForTimeout(500);
      }

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Concurrence et Sessions", () => {
    test("doit gérer plusieurs audits simultanés", async ({
      page,
      context,
    }) => {
      const userData = TestDataFactory.createUserData();

      // Inscription
      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Créer plusieurs onglets pour simuler concurrence
      const page2 = await context.newPage();
      await page2.goto("/dashboard/audits");

      // Mock pour plusieurs audits
      await mocks.mockN8nService();

      // Créer audits simultanément
      const audit1 = TestDataFactory.createAuditData();
      const audit2 = TestDataFactory.createAuditData();

      // Page 1: Premier audit
      const page1Promise = (async () => {
        await page.getByRole("link", { name: /nouvel audit/i }).click();
        await page.getByLabel(/url/i).fill(audit1.url);
        await page.getByLabel(/email/i).fill(userData.email);
        await page.getByRole("button", { name: /démarrer l'audit/i }).click();
        return page.getByText(/audit démarré/i).waitFor({ timeout: 10000 });
      })();

      // Page 2: Deuxième audit concurrent
      const page2Promise = (async () => {
        await page2.getByRole("link", { name: /nouvel audit/i }).click();
        await page2.getByLabel(/url/i).fill(audit2.url);
        await page2.getByLabel(/email/i).fill(userData.email);
        await page2.getByRole("button", { name: /démarrer l'audit/i }).click();
        return page2.getByText(/audit démarré/i).waitFor({ timeout: 10000 });
      })();

      // Attendre que les deux audits démarrent
      await Promise.all([page1Promise, page2Promise]);
      console.log("✅ Audits concurrents créés avec succès");

      await page2.close();
      await TestCleanup.cleanupUser(userData.email);
    });

    test("doit gérer l'expiration de session", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      // Inscription
      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Simuler expiration de session en nettoyant les cookies
      await page.context().clearCookies();

      // Tenter d'accéder à une page protégée
      await page.goto("/dashboard/audits/new");

      // Vérifier redirection vers login
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
      console.log("✅ Expiration de session gérée correctement");

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Récupération après Erreurs", () => {
    test("doit récupérer après rafraîchissement brutal", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Démarrer création d'audit
      await page.getByRole("link", { name: /nouvel audit/i }).click();
      const auditData = TestDataFactory.createAuditData();
      await page.getByLabel(/url/i).fill(auditData.url);
      await page.getByLabel(/email/i).fill(userData.email);

      // Rafraîchissement brutal pendant la saisie
      await page.reload();

      // Vérifier que la page se recharge correctement
      await expect(page).toHaveURL("/dashboard/audits/new");
      await expect(page.getByLabel(/url/i)).toBeVisible();
      console.log("✅ Récupération après rafraîchissement OK");

      // Vérifier que le formulaire est réinitialisé (pas de données corrompues)
      const urlField = page.getByLabel(/url/i);
      const urlValue = await urlField.inputValue();
      expect(urlValue).toBe("");

      await TestCleanup.cleanupUser(userData.email);
    });

    test("doit maintenir l'état après reconnexion réseau", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      await mocks.mockAllServices();

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Simuler déconnexion réseau
      await page.route("**/*", async (route) => route.abort());

      // Tenter action (doit échouer)
      await page.getByRole("link", { name: /nouvel audit/i }).click();

      // Attendre un peu puis restaurer réseau
      await page.waitForTimeout(2000);
      await page.unrouteAll();
      await mocks.mockAllServices();

      // Rafraîchir et vérifier état
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard/);
      await assertions.expectUserToBeLoggedIn();
      console.log("✅ État maintenu après reconnexion réseau");

      await TestCleanup.cleanupUser(userData.email);
    });
  });
});
