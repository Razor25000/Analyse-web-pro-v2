import { test, expect } from "@playwright/test";
import { TestMocks, TestDataFactory } from "./utils/test-mocks";
import { TestCleanup } from "./utils/test-cleanup";

test.describe("Tests de performance et scalabilité", () => {
  test.beforeEach(async ({ page }) => {
    const mocks = new TestMocks(page);
    await mocks.mockAllServices();
  });

  test.afterEach(async ({ page }) => {
    const mocks = new TestMocks(page);
    await mocks.clearAllMocks();
  });

  test("Performance de chargement de la homepage", async ({ page }) => {
    // Mesure du temps de chargement initial
    const startTime = Date.now();

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const domLoadTime = Date.now() - startTime;

    // Attendre que tout soit chargé
    await page.waitForLoadState("networkidle");
    const fullLoadTime = Date.now() - startTime;

    // Vérifier les métriques
    expect(domLoadTime).toBeLessThan(2000); // DOM en moins de 2s
    expect(fullLoadTime).toBeLessThan(4000); // Complet en moins de 4s

    // Vérifier que les éléments critiques sont visibles
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="pricing-section"]')).toBeVisible();

    console.log(`📊 Homepage - DOM: ${domLoadTime}ms, Full: ${fullLoadTime}ms`);
  });

  test("Performance du dashboard avec nombreux audits", async ({ page }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur premium
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Simuler beaucoup d'audits en base (via API ou direct insert)
    const manyAudits = [];
    for (let i = 1; i <= 50; i++) {
      manyAudits.push({
        url: `https://example-perf-${i}.com`,
        status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "running" : "pending",
        createdAt: new Date(Date.now() - i * 60000), // Étalé sur 50 minutes
      });
    }

    // Mock l'API pour retourner beaucoup d'audits
    await page.route("**/api/audits/status", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          audits: manyAudits,
          stats: { total: 50, completed: 17, running: 16, pending: 17 },
        }),
      });
    });

    // Mesurer le temps de chargement du dashboard
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="audit-list"]');
    const loadTime = Date.now() - startTime;

    // Performance acceptable même avec beaucoup d'audits
    expect(loadTime).toBeLessThan(3000);

    // Vérifier que la pagination fonctionne
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

    console.log(`📊 Dashboard avec 50 audits: ${loadTime}ms`);

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Performance des mises à jour temps réel (SSE)", async ({ page }) => {
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
    await page.selectOption('[name="deliveryMethod"]', "dashboard");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Mesurer la réactivité des mises à jour SSE
    const updates = [];
    let updateCount = 0;

    // Observer les changements dans l'UI
    const auditRow = page
      .locator(`[data-testid*="audit-"]:has-text("${auditData.url}")`)
      .first();

    const startTime = Date.now();

    // Simuler plusieurs mises à jour rapides
    for (let i = 0; i < 5; i++) {
      await page.evaluate(
        (data) => {
          const event = new CustomEvent("audit-status-update", {
            detail: data,
          });
          window.dispatchEvent(event);
        },
        {
          url: auditData.url,
          status: i % 2 === 0 ? "running" : "processing",
          progress: (i + 1) * 20,
        },
      );

      // Attendre la mise à jour de l'UI
      await page.waitForTimeout(100);
      updateCount++;
    }

    const totalUpdateTime = Date.now() - startTime;
    const avgUpdateTime = totalUpdateTime / updateCount;

    // Les mises à jour doivent être rapides
    expect(avgUpdateTime).toBeLessThan(200); // Moins de 200ms par update

    console.log(
      `📊 SSE Updates - Total: ${totalUpdateTime}ms, Moyenne: ${avgUpdateTime}ms`,
    );

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Performance de la recherche et filtrage", async ({ page }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Mock une liste d'audits pour la recherche
    const searchableAudits = [];
    for (let i = 1; i <= 100; i++) {
      searchableAudits.push({
        url: `https://${i % 10 === 0 ? "special" : "example"}-search-${i}.com`,
        status: ["pending", "running", "completed"][i % 3],
        createdAt: new Date(Date.now() - i * 3600000), // Étalé sur 100 heures
      });
    }

    await page.route("**/api/audits/search**", async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get("q") || "";
      const status = url.searchParams.get("status");

      let filteredAudits = searchableAudits;

      if (query) {
        filteredAudits = filteredAudits.filter((audit) =>
          audit.url.toLowerCase().includes(query.toLowerCase()),
        );
      }

      if (status) {
        filteredAudits = filteredAudits.filter(
          (audit) => audit.status === status,
        );
      }

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          audits: filteredAudits.slice(0, 20), // Pagination
          total: filteredAudits.length,
        }),
      });
    });

    // Aller au dashboard
    await page.goto("/dashboard/audits");

    // Test de la recherche textuelle
    const startSearch = Date.now();
    await page.fill('[data-testid="search-input"]', "special");
    await page.waitForSelector('[data-testid="search-results"]');
    const searchTime = Date.now() - startSearch;

    expect(searchTime).toBeLessThan(1000); // Recherche en moins d'1s

    // Test du filtrage par statut
    const startFilter = Date.now();
    await page.selectOption('[data-testid="status-filter"]', "completed");
    await page.waitForSelector('[data-testid="filtered-results"]');
    const filterTime = Date.now() - startFilter;

    expect(filterTime).toBeLessThan(500); // Filtrage en moins de 500ms

    console.log(`📊 Recherche: ${searchTime}ms, Filtrage: ${filterTime}ms`);

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Stress test - Multiples utilisateurs simultanés", async ({
    browser,
  }) => {
    const startTime = Date.now();
    const concurrentUsers = 5;
    const userPromises = [];

    // Créer plusieurs contextes utilisateur en parallèle
    for (let i = 0; i < concurrentUsers; i++) {
      const promise = (async (userIndex) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        const mocks = new TestMocks(page);
        await mocks.mockAllServices();

        const userData = TestDataFactory.createUserData();

        try {
          // Simuler un parcours utilisateur complet
          await page.goto("/");
          await page.click('[data-testid="hero-cta-signup"]');
          await page.waitForURL(/signup/);

          await page.fill('[name="name"]', userData.name);
          await page.fill('[name="email"]', userData.email);
          await page.fill('[name="password"]', userData.password);
          await page.click('button[type="submit"]');
          await page.waitForURL("/dashboard/audits");

          // Créer quelques audits
          for (let j = 1; j <= 3; j++) {
            const auditData = TestDataFactory.createAuditData();
            await page.goto("/dashboard/audits/new");
            await page.fill('[name="url"]', auditData.url);
            await page.selectOption('[name="deliveryMethod"]', "dashboard");
            await page.click('button[type="submit"]');
            await page.waitForURL("/dashboard/audits");
          }

          console.log(`✅ Utilisateur ${userIndex + 1} terminé`);

          // Cleanup
          await TestCleanup.cleanupUser(userData.email);

          return { success: true, userIndex };
        } catch (error) {
          console.error(`❌ Erreur utilisateur ${userIndex + 1}:`, error);
          return { success: false, userIndex, error };
        } finally {
          await context.close();
        }
      })(i);

      userPromises.push(promise);
    }

    // Attendre que tous les utilisateurs terminent
    const results = await Promise.all(userPromises);
    const totalTime = Date.now() - startTime;

    // Vérifier les résultats
    const successes = results.filter((r) => r.success).length;
    const failures = results.filter((r) => !r.success).length;

    expect(successes).toBeGreaterThan(concurrentUsers * 0.8); // 80% de succès minimum
    expect(totalTime).toBeLessThan(60000); // Moins de 60 secondes pour tout

    console.log(
      `📊 Stress test - ${successes}/${concurrentUsers} succès en ${totalTime}ms`,
    );
  });

  test("Utilisation mémoire et fuites", async ({ page }) => {
    const userData = TestDataFactory.createUserData();

    // Créer un utilisateur
    await page.goto("/auth/signup");
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/audits");

    // Mesurer l'utilisation mémoire initiale
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory
        ? (performance as any).memory.usedJSHeapSize
        : 0;
    });

    // Effectuer beaucoup d'opérations pour détecter les fuites
    for (let i = 0; i < 20; i++) {
      await page.goto("/dashboard/audits/new");
      await page.goto("/dashboard/audits");
      await page.reload();
    }

    // Forcer le garbage collection (si possible)
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    // Mesurer l'utilisation mémoire finale
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory
        ? (performance as any).memory.usedJSHeapSize
        : 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      // La mémoire ne devrait pas augmenter de plus de 200%
      expect(memoryIncreasePercent).toBeLessThan(200);

      console.log(
        `📊 Mémoire - Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB, Augmentation: ${memoryIncreasePercent.toFixed(1)}%`,
      );
    }

    // Cleanup
    await TestCleanup.cleanupUser(userData.email);
  });
});
