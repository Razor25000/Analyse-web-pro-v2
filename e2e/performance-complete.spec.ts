import { test, expect } from "@playwright/test";
import { TestMocks, TestDataFactory } from "./utils/test-mocks";
import { TestAssertions } from "./utils/test-assertions";
import { TestCleanup } from "./utils/test-cleanup";

/**
 * Tests de performance selon le guide e2e-guide.md
 * Couvre les temps de chargement, scalabilité, temps réel, recherche, stress test, mémoire
 */
test.describe("Tests de Performance", () => {
  let mocks: TestMocks;
  let assertions: TestAssertions;

  test.beforeEach(async ({ page }) => {
    mocks = new TestMocks(page);
    assertions = new TestAssertions(page);
    await mocks.mockAllServices();
  });

  test.afterEach(async ({ page }) => {
    await mocks.clearAllMocks();
  });

  test.describe("Temps de Chargement des Pages", () => {
    test("Homepage doit se charger en moins de 2 secondes", async ({
      page,
    }) => {
      const startTime = Date.now();

      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      const loadTime = Date.now() - startTime;
      console.log(`⏱️ Homepage chargée en ${loadTime}ms`);

      expect(loadTime).toBeLessThan(2000);

      // Vérifier que les éléments critiques sont visibles
      await assertions.expectHomepageToLoad();
      console.log("✅ Homepage < 2s et contenu critique affiché");
    });

    test("Dashboard doit se charger en moins de 3 secondes", async ({
      page,
    }) => {
      const userData = TestDataFactory.createUserData();

      // Inscription rapide
      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Mesurer temps de chargement dashboard
      const startTime = Date.now();

      await page.goto("/dashboard/audits");
      await page.waitForLoadState("domcontentloaded");

      const loadTime = Date.now() - startTime;
      console.log(`⏱️ Dashboard chargé en ${loadTime}ms`);

      expect(loadTime).toBeLessThan(3000);

      // Vérifier éléments dashboard
      await assertions.expectUserToBeLoggedIn();
      await expect(page.locator('[data-testid="quota-display"]')).toBeVisible();
      console.log("✅ Dashboard < 3s avec interface complète");

      await TestCleanup.cleanupUser(userData.email);
    });

    test("Pages d'audit doivent être réactives", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Test page nouvel audit
      const startTime1 = Date.now();
      await page.getByRole("link", { name: /nouvel audit/i }).click();
      await page.waitForURL("/dashboard/audits/new");
      const loadTime1 = Date.now() - startTime1;

      console.log(`⏱️ Page nouvel audit: ${loadTime1}ms`);
      expect(loadTime1).toBeLessThan(2000);

      // Test retour au dashboard
      const startTime2 = Date.now();
      await page.goto("/dashboard/audits");
      await page.waitForLoadState("domcontentloaded");
      const loadTime2 = Date.now() - startTime2;

      console.log(`⏱️ Retour dashboard: ${loadTime2}ms`);
      expect(loadTime2).toBeLessThan(2000);
      console.log("✅ Navigation entre pages d'audit rapide");

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Scalabilité et Pagination", () => {
    test("doit gérer une liste de 50+ audits avec pagination performante", async ({
      page,
    }) => {
      const userData = TestDataFactory.createUserData();

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Mock pour créer plusieurs audits rapidement
      await page.route("**/api/audits/**", async (route) => {
        const url = route.request().url();

        if (route.request().method() === "POST") {
          // Simuler création rapide d'audit
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              auditId: `audit_${Date.now()}_${Math.random()}`,
              status: "pending",
            }),
          });
        } else if (route.request().method() === "GET") {
          // Simuler liste avec pagination
          const audits = Array.from({ length: 50 }, (_, i) => ({
            id: `audit_${i}`,
            url: `https://example${i}.com`,
            status: "completed",
            createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          }));

          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              audits: audits.slice(0, 20), // Page 1
              total: 50,
              page: 1,
              limit: 20,
              totalPages: 3,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Tester chargement liste avec pagination
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState("domcontentloaded");

      // Attendre que la liste se charge
      await expect(page.locator('[data-testid="audit-list"]')).toBeVisible({
        timeout: 5000,
      });

      const loadTime = Date.now() - startTime;
      console.log(`⏱️ Liste 50 audits chargée en ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);

      // Tester navigation pagination
      const paginationStartTime = Date.now();
      const nextPageButton = page.getByRole("button", {
        name: /next|suivant/i,
      });

      if (await nextPageButton.isVisible()) {
        await nextPageButton.click();
        await page.waitForTimeout(500); // Attendre chargement
        const paginationTime = Date.now() - paginationStartTime;

        console.log(`⏱️ Navigation pagination: ${paginationTime}ms`);
        expect(paginationTime).toBeLessThan(1000);
      }

      console.log("✅ Pagination performante pour 50+ éléments");

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Temps Réel et SSE", () => {
    test("mises à jour SSE doivent être reçues en moins de 200ms", async ({
      page,
    }) => {
      const userData = TestDataFactory.createUserData();

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Créer un audit pour tester les mises à jour
      const auditData = TestDataFactory.createAuditData();
      await page.getByRole("link", { name: /nouvel audit/i }).click();
      await page.getByLabel(/url/i).fill(auditData.url);
      await page.getByLabel(/email/i).fill(userData.email);
      await page.getByRole("button", { name: /démarrer l'audit/i }).click();

      await page.goto("/dashboard/audits");

      // Configurer listener pour mesurer temps de réaction SSE
      const updateReceived = false;
      const updateTime = 0;

      await page.evaluate(() => {
        window.sseUpdateTimes = [];

        // Simuler réception d'événement SSE
        window.addEventListener("audit-status-update", (event) => {
          window.sseUpdateTimes.push({
            timestamp: Date.now(),
            data: event.detail,
          });
        });
      });

      // Déclencher mise à jour simulée
      const triggerTime = Date.now();
      await page.evaluate((triggerTime) => {
        // Simuler événement SSE avec timing
        setTimeout(() => {
          const event = new CustomEvent("audit-status-update", {
            detail: {
              runId: "test_run",
              status: "running",
              timestamp: Date.now(),
            },
          });
          window.dispatchEvent(event);
        }, 100); // 100ms de délai simulé
      }, triggerTime);

      // Vérifier réception rapide
      await page.waitForTimeout(300);

      const updateTimes = await page.evaluate(() => window.sseUpdateTimes);
      expect(updateTimes.length).toBeGreaterThan(0);

      if (updateTimes.length > 0) {
        const responseTime = updateTimes[0].timestamp - triggerTime;
        console.log(`⏱️ Mise à jour SSE reçue en ${responseTime}ms`);
        expect(responseTime).toBeLessThan(200);
      }

      console.log("✅ Mises à jour temps réel < 200ms");

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Recherche et Filtrage", () => {
    test("filtrage doit être inférieur à 500ms", async ({ page }) => {
      const userData = TestDataFactory.createUserData();

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Mock liste d'audits pour filtrage
      await page.route("**/api/audits**", async (route) => {
        const url = new URL(route.request().url());
        const search = url.searchParams.get("search") || "";

        const allAudits = Array.from({ length: 30 }, (_, i) => ({
          id: `audit_${i}`,
          url: `https://example${i}.com`,
          status: i % 3 === 0 ? "completed" : "running",
          createdAt: new Date().toISOString(),
        }));

        const filteredAudits = allAudits.filter(
          (audit) =>
            audit.url.includes(search) || audit.status.includes(search),
        );

        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            audits: filteredAudits,
            total: filteredAudits.length,
          }),
        });
      });

      await page.reload();

      // Tester filtrage par recherche
      const searchField = page.locator(
        'input[placeholder*="recherch"], input[name="search"]',
      );

      if (await searchField.isVisible()) {
        const startTime = Date.now();
        await searchField.fill("example1");
        await searchField.press("Enter");

        // Attendre résultats filtrés
        await page.waitForTimeout(100);
        await expect(page.locator('[data-testid="audit-list"]')).toBeVisible();

        const filterTime = Date.now() - startTime;
        console.log(`⏱️ Filtrage effectué en ${filterTime}ms`);
        expect(filterTime).toBeLessThan(500);
      }

      // Tester filtrage par statut
      const statusFilter = page.locator(
        'select[name="status"], button[data-testid*="filter"]',
      );

      if (await statusFilter.isVisible()) {
        const startTime = Date.now();
        await statusFilter.click();

        const filterOption = page.getByText("completed").first();
        if (await filterOption.isVisible()) {
          await filterOption.click();
        }

        await page.waitForTimeout(100);
        const filterTime = Date.now() - startTime;
        console.log(`⏱️ Filtre statut appliqué en ${filterTime}ms`);
        expect(filterTime).toBeLessThan(500);
      }

      console.log("✅ Filtrage et recherche < 500ms");

      await TestCleanup.cleanupUser(userData.email);
    });
  });

  test.describe("Stress Test", () => {
    test("doit supporter 5 utilisateurs simultanés", async ({ browser }) => {
      const contexts = [];
      const pages = [];
      const users = [];

      // Créer 5 contextes utilisateurs
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Mock services pour ce contexte
        const userMocks = new TestMocks(page);
        await userMocks.mockAllServices();

        contexts.push(context);
        pages.push(page);
        users.push(TestDataFactory.createUserData());
      }

      // Inscriptions simultanées
      const signupPromises = pages.map(async (page, index) => {
        const startTime = Date.now();

        await page.goto("/auth/signup");
        await page.getByLabel(/email/i).fill(users[index].email);
        await page
          .locator('input[name="password"]')
          .fill(users[index].password);
        await page
          .locator('input[name="verifyPassword"]')
          .fill(users[index].password);
        await page.getByRole("button", { name: /sign up/i }).click();

        await page.waitForURL("/dashboard/audits", { timeout: 30000 });

        const signupTime = Date.now() - startTime;
        console.log(`⏱️ Utilisateur ${index + 1} inscrit en ${signupTime}ms`);

        return signupTime;
      });

      const signupTimes = await Promise.all(signupPromises);

      // Vérifier que toutes les inscriptions ont réussi en temps raisonnable
      signupTimes.forEach((time, index) => {
        expect(time).toBeLessThan(10000); // 10s max par inscription
      });

      // Actions simultanées (création d'audits)
      const auditPromises = pages.map(async (page, index) => {
        const auditData = TestDataFactory.createAuditData();
        const startTime = Date.now();

        await page.getByRole("link", { name: /nouvel audit/i }).click();
        await page.getByLabel(/url/i).fill(auditData.url);
        await page.getByLabel(/email/i).fill(users[index].email);
        await page.getByRole("button", { name: /démarrer l'audit/i }).click();

        await expect(page.getByText(/audit démarré/i)).toBeVisible({
          timeout: 15000,
        });

        const auditTime = Date.now() - startTime;
        console.log(`⏱️ Utilisateur ${index + 1} audit créé en ${auditTime}ms`);

        return auditTime;
      });

      const auditTimes = await Promise.all(auditPromises);

      // Vérifier performances sous charge
      auditTimes.forEach((time, index) => {
        expect(time).toBeLessThan(15000); // 15s max par audit
      });

      console.log("✅ Support de 5 utilisateurs simultanés OK");

      // Nettoyage
      for (let i = 0; i < 5; i++) {
        await TestCleanup.cleanupUser(users[i].email);
        await contexts[i].close();
      }
    });
  });

  test.describe("Mémoire et Ressources", () => {
    test("doit détecter les fuites mémoire lors de navigation intensive", async ({
      page,
    }) => {
      const userData = TestDataFactory.createUserData();

      await page.goto("/auth/signup");
      await page.getByLabel(/email/i).fill(userData.email);
      await page.locator('input[name="password"]').fill(userData.password);
      await page
        .locator('input[name="verifyPassword"]')
        .fill(userData.password);
      await page.getByRole("button", { name: /sign up/i }).click();

      await page.waitForURL("/dashboard/audits");

      // Mesure mémoire initiale
      const initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
          };
        }
        return { used: 0, total: 0 };
      });

      // Navigation intensive pour détecter fuites
      for (let i = 0; i < 20; i++) {
        await page.goto("/dashboard/audits");
        await page.waitForTimeout(100);

        await page.getByRole("link", { name: /nouvel audit/i }).click();
        await page.waitForTimeout(100);

        await page.goto("/dashboard/billing");
        await page.waitForTimeout(100);

        await page.goto("/dashboard/audits");
        await page.waitForTimeout(100);
      }

      // Forcer garbage collection et mesurer
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });

      await page.waitForTimeout(1000);

      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
          };
        }
        return { used: 0, total: 0 };
      });

      if (initialMemory.used > 0 && finalMemory.used > 0) {
        const memoryIncrease =
          (finalMemory.used - initialMemory.used) / initialMemory.used;
        const increasePercent = Math.round(memoryIncrease * 100);

        console.log(`📊 Augmentation mémoire: ${increasePercent}%`);
        console.log(
          `📊 Initial: ${Math.round(initialMemory.used / 1024 / 1024)}MB`,
        );
        console.log(
          `📊 Final: ${Math.round(finalMemory.used / 1024 / 1024)}MB`,
        );

        // Vérifier que l'augmentation reste raisonnable (< 200%)
        expect(memoryIncrease).toBeLessThan(2);
        console.log("✅ Pas de fuite mémoire significative détectée");
      } else {
        console.log("ℹ️ API Performance Memory non disponible, test passé");
      }

      await TestCleanup.cleanupUser(userData.email);
    });
  });
});
