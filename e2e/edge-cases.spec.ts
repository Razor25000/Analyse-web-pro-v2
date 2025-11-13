import { test, expect } from "@playwright/test";
import { TestMocks, TestDataFactory } from "./utils/test-mocks";
import { TestCleanup } from "./utils/test-cleanup";
import { createTestAssertions } from "./utils/test-assertions";
import { prisma } from "@/lib/prisma";

test.describe("Tests des cas limites et erreurs", () => {
  test.beforeEach(async ({ page }) => {
    const mocks = new TestMocks(page);
    await mocks.mockAllServices();
  });

  test.afterEach(async ({ page }) => {
    const mocks = new TestMocks(page);
    await mocks.clearAllMocks();
  });

  test("Gestion des erreurs de paiement Stripe", async ({ page }) => {
    const assertions = createTestAssertions(page);
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur et atteindre la limite de quota
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Mock un échec de paiement Stripe
    await page.route("**/api/stripe/create-checkout", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Payment failed",
          code: "card_declined",
        }),
      });
    });

    // Tenter un upgrade
    await page.click('[data-testid="upgrade-btn"]');
    await page.waitForURL(/pricing/);
    await page.click('[data-testid="plan-pro_monthly-cta"]');

    // Vérifier l'affichage de l'erreur
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText(
      /payment.*failed|card.*declined/i,
    );

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Gestion des erreurs réseau et timeouts", async ({ page }) => {
    const userData = TestDataFactory.createUserData();
    const auditData = TestDataFactory.createAuditData();

    // Créer un utilisateur
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Mock un timeout n8n
    await page.route("**/n8n.*/webhook/**", async (route) => {
      // Simuler un timeout
      await page.waitForTimeout(5000);
      await route.abort("timedout");
    });

    // Tenter de créer un audit
    await page.goto("/dashboard/audits/new");
    await page.fill('[name="url"]', auditData.url);
    await page.selectOption('[name="deliveryMethod"]', "email");
    await page.click('button[type="submit"]');

    // Vérifier la gestion de l'erreur
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Test du retry
    await page.unroute("**/n8n.*/webhook/**");
    await page.click('[data-testid="retry-button"]');
    await page.waitForURL("/dashboard/audits");

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Test de concurrence - Multiples audits simultanés", async ({
    page,
  }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur premium
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Simuler un upgrade réussi
    await prisma.user.update({
      where: { email: userData.email },
      data: {
        monthlyQuota: 500,
      },
    });

    // Créer plusieurs audits en parallèle
    const auditPromises = [];
    for (let i = 0; i < 5; i++) {
      const auditData = TestDataFactory.createAuditData();
      const promise = (async () => {
        const newPage = await page.context().newPage();
        await newPage.goto("/dashboard/audits/new");
        await newPage.fill('[name="url"]', auditData.url);
        await newPage.selectOption('[name="deliveryMethod"]', "dashboard");
        await newPage.click('button[type="submit"]');
        await newPage.waitForURL("/dashboard/audits");
        await newPage.close();
      })();
      auditPromises.push(promise);
    }

    // Attendre que tous les audits soient créés
    await Promise.all(auditPromises);

    // Vérifier que tous les audits sont présents
    await page.reload();
    const auditList = page.locator('[data-testid="audit-list"]');
    await expect(auditList.locator('[data-testid*="audit-"]')).toHaveCount(5);

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Validation des données d'entrée - URLs invalides", async ({ page }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Tester différentes URLs invalides
    const invalidUrls = [
      "not-a-url",
      "http://",
      "https://",
      "ftp://example.com",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "",
    ];

    for (const invalidUrl of invalidUrls) {
      await page.goto("/dashboard/audits/new");
      await page.fill('[name="url"]', invalidUrl);
      await page.selectOption('[name="deliveryMethod"]', "email");
      await page.click('button[type="submit"]');

      // Vérifier que l'erreur de validation est affichée
      await expect(
        page.locator('[data-testid="url-validation-error"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="url-validation-error"]'),
      ).toContainText(/invalid.*url|url.*required/i);
    }

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Gestion des sessions expirées", async ({ page }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Simuler une session expirée en supprimant les cookies
    await page.context().clearCookies();

    // Tenter d'accéder à une page protégée
    await page.goto("/dashboard/audits/new");

    // Vérifier la redirection vers login
    await page.waitForURL(/\/auth\/signin/);
    await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Test de charge - Batch upload volumineux", async ({ page }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur premium
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Simuler un upgrade vers Premium
    await prisma.user.update({
      where: { email: userData.email },
      data: {
        monthlyQuota: 500,
      },
    });

    // Aller à la page batch upload
    await page.goto("/dashboard/audits/batch");

    // Créer un gros fichier CSV (50 URLs)
    let csvContent = "url,email\n";
    for (let i = 1; i <= 50; i++) {
      csvContent += `https://example-batch-${i}.com,test${i}@example.com\n`;
    }

    // Upload du fichier
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "large-batch.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    await page.fill('[name="batchName"]', "Large Batch Test");
    await page.click('button[type="submit"]');

    // Vérifier le traitement progressif
    await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="batch-status"]')).toContainText(
      /processing|in.*progress/i,
    );

    // Attendre la completion (ou timeout après 30s)
    await expect(page.locator('[data-testid="batch-status"]')).toContainText(
      /completed|success/i,
      { timeout: 30000 },
    );

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Test de sécurité - Injection et XSS", async ({ page }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur
    await page.goto("/auth/signup");

    // Tester l'injection dans le nom
    const maliciousName = '<script>alert("XSS")</script>';
    await page.fill('[name="name"]', maliciousName);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("/dashboard/audits");

    // Vérifier que le script n'est pas exécuté
    const userName = page.locator('[data-testid="user-name"]');
    await expect(userName).not.toContainText("<script>");

    // Tester l'injection SQL dans l'URL d'audit
    await page.goto("/dashboard/audits/new");
    const sqlInjection = "https://example.com'; DROP TABLE audits; --";
    await page.fill('[name="url"]', sqlInjection);
    await page.selectOption('[name="deliveryMethod"]', "email");
    await page.click('button[type="submit"]');

    // Vérifier que l'injection est bloquée
    await expect(
      page.locator('[data-testid="url-validation-error"]'),
    ).toBeVisible();

    // Vérifier que la base de données est intacte
    const auditCount = await prisma.audit.count();
    expect(auditCount).toBeGreaterThanOrEqual(0); // Table existe toujours

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Test de récupération après crash", async ({ page }) => {
    const userData = TestDataFactory.createUserData();
    const auditData = TestDataFactory.createAuditData();

    // Créer un utilisateur et un audit
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    await page.goto("/dashboard/audits/new");
    await page.fill('[name="url"]', auditData.url);
    await page.selectOption('[name="deliveryMethod"]', "email");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Simuler un crash/rafraîchissement brutal
    await page.reload({ waitUntil: "domcontentloaded" });

    // Vérifier que l'état est récupéré
    await expect(page.locator('[data-testid="audit-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-list"]')).toContainText(
      auditData.url,
    );

    // Vérifier que l'utilisateur est toujours connecté
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });
});
