import { test, expect } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";
import { TestMocks, TestDataFactory } from "./utils/test-mocks";
import { TestCleanup } from "./utils/test-cleanup";
import { createTestAssertions } from "./utils/test-assertions";
import { prisma } from "@/lib/prisma";

test.describe("Parcours utilisateur complet", () => {
  // Setup et cleanup automatique
  test.beforeEach(async ({ page }) => {
    const mocks = new TestMocks(page);
    await mocks.mockAllServices();
  });

  test.afterEach(async ({ page }) => {
    const mocks = new TestMocks(page);
    await mocks.clearAllMocks();
  });

  test("Journey complet A-Z: Homepage → Pricing → Signup → Dashboard → Audit → Payment → Premium", async ({
    page,
  }) => {
    const assertions = createTestAssertions(page);
    const userData = TestDataFactory.createUserData();

    // ===== PHASE 1: DÉCOUVERTE =====
    console.log("🔍 Phase 1: Découverte du service");

    // 1. Charger la homepage avec toutes les sections
    await page.goto("/");
    await assertions.expectHomepageToLoad();
    await assertions.expectResponsiveDesign();

    // 2. Explorer la section pricing
    await page.click('[data-testid="hero-cta-signup"]');
    await page.waitForURL(/signup|pricing/);

    // 3. Sélectionner le plan gratuit pour commencer
    if (!page.url().includes("signup")) {
      await page.goto("/"); // Retour homepage
      await page.evaluate(() => window.scrollTo(0, 2000)); // Scroll vers pricing
      await assertions.expectPricingPlansToBeVisible();
      await page.click('[data-testid="plan-free-cta"]');
    }

    // ===== PHASE 2: INSCRIPTION =====
    console.log("✍️ Phase 2: Inscription utilisateur");

    // Redirection vers signup si non connecté
    await page.waitForURL("/auth/signup");

    // 4. Processus de signup avec données générées
    await page.fill('[name="name"]', userData.name);
    await page.fill('[name="email"]', userData.email);
    await page.fill('[name="password"]', userData.password);

    await page.click('button[type="submit"]');

    // Attendre la redirection vers le dashboard
    await page.waitForURL("/dashboard/audits");
    await assertions.expectUserToBeLoggedIn();

    // ===== PHASE 3: PREMIÈRE UTILISATION =====
    console.log("🎯 Phase 3: Première utilisation");

    // 5. Vérifier l'affichage du quota gratuit (5 audits)
    await assertions.expectQuotaDisplay(0, 5);

    // 6. Créer le premier audit
    await page.click('[data-testid="new-audit-btn"]');
    await page.waitForURL("/dashboard/audits/new");

    const auditData = TestDataFactory.createAuditData();
    await page.fill('[name="url"]', auditData.url);
    await page.selectOption(
      '[name="deliveryMethod"]',
      auditData.deliveryMethod,
    );

    // Lancer l'audit
    await page.click('button[type="submit"]');

    // ===== PHASE 4: SUIVI DES AUDITS =====
    console.log("📊 Phase 4: Suivi des audits en temps réel");

    // 7. Vérifier que l'audit est créé
    await page.waitForURL("/dashboard/audits");
    await assertions.expectAuditToBeCreated(auditData.url);

    // 8. Vérifier l'évolution des statuts en temps réel
    await assertions.expectAuditStatusProgression(auditData.url);

    // 9. Vérifier la création dans la base de données
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
      include: {
        auditsCreated: true,
      },
    });

    expect(user).not.toBeNull();
    expect(user?.auditsCreated.length).toBe(1);
    expect(user?.quotaUsed).toBe(1);
    expect(user?.monthlyQuota).toBe(5); // Plan gratuit = 5 audits

    // ===== PHASE 5: ATTEINTE DES LIMITES =====
    console.log("⚠️ Phase 5: Test des limites de quota");

    // 10. Créer plusieurs audits pour approcher la limite
    for (let i = 2; i <= 4; i++) {
      const nextAuditData = TestDataFactory.createAuditData();
      await page.goto("/dashboard/audits/new");
      await page.fill('[name="url"]', nextAuditData.url);
      await page.selectOption('[name="deliveryMethod"]', "email");
      await page.click('button[type="submit"]');
      await page.waitForURL("/dashboard/audits");
    }

    // Vérifier le warning de quota (4/5)
    await assertions.expectQuotaWarning();

    // 11. Créer le 5ème audit (limite atteinte)
    const lastFreeAudit = TestDataFactory.createAuditData();
    await page.goto("/dashboard/audits/new");
    await page.fill('[name="url"]', lastFreeAudit.url);
    await page.selectOption('[name="deliveryMethod"]', "email");
    await page.click('button[type="submit"]');

    // 12. Tenter de créer un 6ème audit (doit être bloqué)
    const blockedAudit = TestDataFactory.createAuditData();
    await page.goto("/dashboard/audits/new");
    await page.fill('[name="url"]', blockedAudit.url);
    await page.selectOption('[name="deliveryMethod"]', "email");
    await page.click('button[type="submit"]');

    // Vérifier le message d'erreur de quota dépassé
    await assertions.expectQuotaExceededError();

    // ===== PHASE 6: UPGRADE VERS PLAN PAYANT =====
    console.log("💳 Phase 6: Upgrade vers plan payant");

    // 13. Déclencher l'upgrade vers Pro
    await page.click('[data-testid="upgrade-btn"]');
    await page.waitForURL(/pricing|upgrade/);

    // 14. Sélectionner le plan Pro
    await page.click('[data-testid="plan-pro_monthly-cta"]');

    // 15. Vérifier la redirection vers Stripe Checkout
    await assertions.expectStripeCheckoutRedirection();

    // 16. Simuler le succès du paiement (via mock)
    await page.goto("/payment/success?session_id=cs_test_mock_session_id");
    await assertions.expectPaymentSuccess();

    // 17. Vérifier la mise à jour du plan
    await assertions.expectPlanUpgrade("Professionnel");

    // ===== PHASE 7: FONCTIONNALITÉS PREMIUM =====
    console.log("🚀 Phase 7: Test des fonctionnalités premium");

    // 18. Vérifier l'augmentation du quota (500 audits)
    await assertions.expectQuotaDisplay(5, 500); // 5 audits utilisés, 500 de limite

    // 19. Créer plusieurs audits sans être bloqué
    for (let i = 1; i <= 3; i++) {
      const premiumAudit = TestDataFactory.createAuditData();
      await page.goto("/dashboard/audits/new");
      await page.fill('[name="url"]', premiumAudit.url);
      await page.selectOption('[name="deliveryMethod"]', "dashboard");
      await page.click('button[type="submit"]');
      await page.waitForURL("/dashboard/audits");
    }

    // ===== PHASE 8: VÉRIFICATIONS FINALES =====
    console.log("✅ Phase 8: Vérifications finales");

    // 20. Vérifier l'état final en base de données
    const finalUser = await prisma.user.findUnique({
      where: { email: userData.email },
      include: {
        auditsCreated: true,
        subscriptions: true,
      },
    });

    expect(finalUser?.auditsCreated.length).toBe(8); // 5 gratuits + 3 premium
    expect(finalUser?.quotaUsed).toBe(8);
    expect(finalUser?.monthlyQuota).toBe(500);
    expect(finalUser?.subscriptions?.length).toBeGreaterThan(0);

    // 21. Test de performance et accessibilité
    await assertions.expectGoodPerformance();
    await assertions.expectBasicAccessibility();

    // ===== NETTOYAGE =====
    console.log("🧹 Nettoyage des données de test");

    // Clean up - Supprimer l'utilisateur de test et ses données
    await TestCleanup.cleanupUser(userData.email);
  });

  test("Test spécifique des notifications email", async ({ page }) => {
    // Créer un utilisateur de test
    const userData = await createTestAccount({
      page,
      callbackURL: "/dashboard",
    });

    await page.waitForURL("/dashboard/audits");

    // Créer un audit pour déclencher l'email
    await page.goto("/dashboard/audits/new");
    await page.fill('[name="url"]', "https://test-email.com");
    await page.selectOption('[name="deliveryMethod"]', "email");
    await page.click('button[type="submit"]');

    // Vérifier dans la base de données que l'audit est créé
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
      include: { auditsCreated: true },
    });

    expect(user?.auditsCreated.length).toBe(1);

    // Note: Les emails sont envoyés de manière asynchrone
    // Dans un environnement de test, on peut vérifier les logs
    // ou utiliser un service mock comme MailHog

    // Clean up
    if (user) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
  });

  test("Test du batch upload", async ({ page }) => {
    // Créer un utilisateur de test
    const userData = await createTestAccount({
      page,
      callbackURL: "/dashboard",
    });

    await page.waitForURL("/dashboard/audits");

    // Aller à la page batch upload
    await page.goto("/dashboard/audits/batch");

    // Préparer un fichier CSV de test
    const csvContent = `url,email
https://example1.com,test1@example.com
https://example2.com,test2@example.com
https://example3.com,test3@example.com`;

    // Créer un fichier temporaire et l'uploader
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-batch.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    // Donner un nom au batch
    await page.fill('[name="batchName"]', "Test Batch Upload");

    // Lancer le batch upload
    await page.click('button[type="submit"]');

    // Vérifier la redirection et le succès
    await page.waitForURL("/dashboard/audits");

    // Vérifier que les 3 audits sont créés
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    expect(user?.quotaUsed).toBe(3);

    // Clean up
    if (user) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
  });

  test("Test des différents états d'audit", async ({ page }) => {
    const userData = await createTestAccount({
      page,
      callbackURL: "/dashboard",
    });

    await page.waitForURL("/dashboard/audits");

    // Créer un audit
    await page.goto("/dashboard/audits/new");
    await page.fill('[name="url"]', "https://test-states.com");
    await page.selectOption('[name="deliveryMethod"]', "dashboard");
    await page.click('button[type="submit"]');

    await page.waitForURL("/dashboard/audits");

    // Vérifier l'évolution des états via SSE
    const auditRow = page.locator('[data-testid*="audit-"]').first();

    // État initial: pending
    await expect(auditRow.locator('[data-testid="status"]')).toContainText(
      "pending",
    );

    // Attendre le passage à "running"
    await expect(auditRow.locator('[data-testid="status"]')).toContainText(
      "running",
      { timeout: 30000 },
    );

    // Vérifier la barre de progression
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // Clean up
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (user) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
  });
});
