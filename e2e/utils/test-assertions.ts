import type { Page } from "@playwright/test";
import { expect, Locator } from "@playwright/test";

/**
 * Assertions spécialisées pour les tests e2e du SaaS
 * Fournit des vérifications de haut niveau pour les fonctionnalités métier
 */

export class TestAssertions {
  constructor(private readonly page: Page) {}

  /**
   * Vérifie que la homepage se charge correctement avec toutes les sections
   */
  async expectHomepageToLoad() {
    await expect(
      this.page.locator('[data-testid="hero-section"]'),
    ).toBeVisible();
    await expect(this.page.locator('[data-testid="hero-title"]')).toContainText(
      "Optimisez votre site web",
    );
    await expect(
      this.page.locator('[data-testid="pricing-section"]'),
    ).toBeVisible();
    await expect(
      this.page.locator('[data-testid="hero-cta-signup"]'),
    ).toBeVisible();
  }

  /**
   * Vérifie que les plans de pricing sont correctement affichés
   */
  async expectPricingPlansToBeVisible() {
    await expect(
      this.page.locator('[data-testid="pricing-title"]'),
    ).toContainText("Choisissez le plan");

    // Vérifier que les 3 plans sont présents
    await expect(this.page.locator('[data-testid="plan-free"]')).toBeVisible();
    await expect(
      this.page.locator('[data-testid="plan-pro_monthly"]'),
    ).toBeVisible();
    await expect(
      this.page.locator('[data-testid="plan-premium_monthly"]'),
    ).toBeVisible();

    // Vérifier les CTAs
    await expect(
      this.page.locator('[data-testid="plan-free-cta"]'),
    ).toContainText("Commencer gratuitement");
    await expect(
      this.page.locator('[data-testid="plan-pro_monthly-cta"]'),
    ).toContainText("Essayer 30 jours");
  }

  /**
   * Vérifie qu'un utilisateur est connecté et redirigé vers le dashboard
   */
  async expectUserToBeLoggedIn() {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(
      this.page.locator(
        '[data-testid="user-dropdown"], [data-testid="user-menu"]',
      ),
    ).toBeVisible();
  }

  /**
   * Vérifie l'affichage du quota utilisateur
   */
  async expectQuotaDisplay(used: number, limit: number) {
    const quotaDisplay = this.page.locator('[data-testid="quota-display"]');
    await expect(quotaDisplay).toBeVisible();
    await expect(quotaDisplay).toContainText(`${used}`);
    await expect(quotaDisplay).toContainText(`${limit}`);
  }

  /**
   * Vérifie qu'un audit est créé et apparaît dans la liste
   */
  async expectAuditToBeCreated(url: string) {
    // Attendre que l'audit apparaisse dans la liste
    const auditList = this.page.locator('[data-testid="audit-list"]');
    await expect(auditList).toBeVisible();

    // Chercher l'audit par URL
    const auditRow = auditList.locator(`text=${url}`).first();
    await expect(auditRow).toBeVisible();

    return auditRow;
  }

  /**
   * Vérifie l'évolution des statuts d'audit
   */
  async expectAuditStatusProgression(auditUrl: string) {
    const auditRow = this.page
      .locator(`[data-testid*="audit-"]:has-text("${auditUrl}")`)
      .first();

    // Vérifier statut initial : pending
    const statusLocator = auditRow.locator('[data-testid*="status"]');
    await expect(statusLocator).toContainText("pending", { timeout: 5000 });

    // Attendre le passage à running
    await expect(statusLocator).toContainText("running", { timeout: 30000 });

    // Optionnel : attendre completion (peut être long en vrai)
    // await expect(statusLocator).toContainText('completed', { timeout: 120000 });
  }

  /**
   * Vérifie l'affichage d'un warning de quota
   */
  async expectQuotaWarning() {
    const warning = this.page.locator('[data-testid="quota-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/quota|limit/i);
  }

  /**
   * Vérifie l'erreur de quota dépassé
   */
  async expectQuotaExceededError() {
    const error = this.page.locator('[data-testid="quota-exceeded"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/quota.*exceeded|limit.*reached/i);
  }

  /**
   * Vérifie la redirection vers Stripe Checkout
   */
  async expectStripeCheckoutRedirection() {
    // Attendre soit une redirection vers Stripe, soit vers notre page de checkout mock
    await expect(this.page).toHaveURL(
      /stripe\.com\/checkout|\/checkout|\/payment/,
      { timeout: 10000 },
    );
  }

  /**
   * Vérifie le succès d'un paiement
   */
  async expectPaymentSuccess() {
    await expect(this.page).toHaveURL(/\/payment\/success/);
    await expect(
      this.page.locator("text=Merci|Success|Paiement réussi"),
    ).toBeVisible();
  }

  /**
   * Vérifie la mise à jour du plan après paiement
   */
  async expectPlanUpgrade(planName: string) {
    // Retourner au dashboard pour vérifier
    await this.page.goto("/dashboard");

    const planDisplay = this.page.locator('[data-testid="current-plan"]');
    await expect(planDisplay).toContainText(planName, { timeout: 10000 });
  }

  /**
   * Vérifie le fonctionnement du batch upload
   */
  async expectBatchUploadToWork(expectedCount: number) {
    await expect(this.page).toHaveURL(/\/dashboard\/audits/);

    // Vérifier que les audits multiples sont créés
    const auditList = this.page.locator('[data-testid="audit-list"]');
    await expect(auditList.locator('[data-testid*="audit-"]')).toHaveCount(
      expectedCount,
      { timeout: 10000 },
    );
  }

  /**
   * Vérifie l'envoi d'une notification email
   */
  async expectEmailNotification(
    emailType: "audit-started" | "audit-completed" | "quota-warning",
  ) {
    // En test, on peut vérifier les logs ou une UI notification
    const notification = this.page.locator(
      `[data-testid="notification-${emailType}"]`,
    );
    await expect(notification).toBeVisible({ timeout: 5000 });
  }

  /**
   * Vérifie que les composants landing sont responsive
   */
  async expectResponsiveDesign() {
    // Tester sur différentes tailles d'écran
    await this.page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await expect(
      this.page.locator('[data-testid="hero-section"]'),
    ).toBeVisible();

    await this.page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await expect(
      this.page.locator('[data-testid="hero-section"]'),
    ).toBeVisible();
  }

  /**
   * Vérifie l'accessibilité de base
   */
  async expectBasicAccessibility() {
    // Vérifier que les éléments interactifs ont des labels
    const buttons = this.page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();

      if (isVisible) {
        const hasText = await button.textContent();
        const hasAriaLabel = await button.getAttribute("aria-label");

        expect(hasText || hasAriaLabel).toBeTruthy();
      }
    }
  }

  /**
   * Vérifie les performances de base de la page
   */
  async expectGoodPerformance() {
    const startTime = Date.now();
    await this.page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // La page doit se charger en moins de 3 secondes
    expect(loadTime).toBeLessThan(3000);
  }
}

/**
 * Helper pour créer des assertions métier spécifiques
 */
export function createTestAssertions(page: Page) {
  return new TestAssertions(page);
}
