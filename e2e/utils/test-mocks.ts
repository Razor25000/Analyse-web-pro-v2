import type { Page } from "@playwright/test";

/**
 * Mock utilities pour les tests e2e
 * Isole les services externes (Stripe, emails, n8n) pour des tests reproductibles
 */

export class TestMocks {
  constructor(private readonly page: Page) {}

  /**
   * Mock Stripe Checkout pour éviter les vraies transactions
   */
  async mockStripeCheckout() {
    await this.page.route(
      "**/stripe.com/checkout/sessions/**",
      async (route) => {
        // Simuler une redirection de succès Stripe
        await route.fulfill({
          status: 302,
          headers: {
            Location: `${process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000"}/payment/success?session_id=cs_test_mock_session_id`,
          },
        });
      },
    );

    // Mock les appels à l'API Stripe
    await this.page.route("**/api/stripe/create-checkout", async (route) => {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          checkoutUrl: "https://checkout.stripe.com/c/pay/mock_session_id",
        }),
      });
    });
  }

  /**
   * Mock les webhooks Stripe pour simuler le succès de paiement
   */
  async mockStripeWebhooks() {
    await this.page.route("**/api/stripe/webhooks", async (route) => {
      const headers = route.request().headers();
      const body = await route.request().postData();

      // Simuler un webhook de succès de paiement
      if (headers["stripe-signature"]) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ received: true }),
        });

        // Déclencher les actions post-paiement dans la base de données
        await this.simulateSuccessfulPayment();
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Mock le service d'email pour éviter l'envoi de vrais emails
   */
  async mockEmailService() {
    await this.page.route("**/api/emails/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          messageId: `mock_email_${Date.now()}`,
          status: "sent",
        }),
      });
    });

    // Mock Resend API
    await this.page.route("**/resend.com/emails", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: `mock_resend_${Date.now()}`,
        }),
      });
    });
  }

  /**
   * Mock n8n webhooks pour simuler le traitement des audits
   */
  async mockN8nService() {
    // Mock le déclenchement d'audit
    await this.page.route("**/n8n.*/webhook/**", async (route) => {
      const body = await route.request().postDataJSON();
      const runId = body?.runId || `test_run_${Date.now()}`;

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          runId: runId,
          status: "started",
        }),
      });

      // Simuler l'évolution des statuts d'audit
      setTimeout(() => {
        this.simulateAuditStatusUpdates(runId);
      }, 1000);
    });
  }

  /**
   * Simule les mises à jour de statut d'audit via SSE
   */
  private async simulateAuditStatusUpdates(runId: string) {
    const statuses = ["pending", "running", "completed"];

    for (let i = 0; i < statuses.length; i++) {
      await this.page.waitForTimeout(2000); // 2 secondes entre chaque statut

      // Envoyer l'événement SSE via JavaScript
      await this.page.evaluate(
        (data) => {
          const event = new CustomEvent("audit-status-update", {
            detail: data,
          });
          window.dispatchEvent(event);
        },
        {
          runId,
          status: statuses[i],
          progress: ((i + 1) / statuses.length) * 100,
        },
      );
    }
  }

  /**
   * Simule un paiement réussi en mettant à jour la base de données
   */
  private async simulateSuccessfulPayment() {
    await this.page.evaluate(() => {
      // Déclencher une mise à jour via une requête API simulée
      fetch("/api/test/simulate-payment-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cs_test_mock_session_id",
          plan: "pro_monthly",
        }),
      });
    });
  }

  /**
   * Mock tous les services externes en une seule fois
   */
  async mockAllServices() {
    await Promise.all([
      this.mockStripeCheckout(),
      this.mockStripeWebhooks(),
      this.mockEmailService(),
      this.mockN8nService(),
    ]);
  }

  /**
   * Nettoie tous les mocks
   */
  async clearAllMocks() {
    await this.page.unrouteAll();
  }
}

/**
 * Helper pour créer des données de test cohérentes
 */
export class TestDataFactory {
  static createUserData() {
    const timestamp = Date.now();
    return {
      name: `Test User ${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: "TestPassword123!",
    };
  }

  static createAuditData() {
    const timestamp = Date.now();
    return {
      url: `https://example-${timestamp}.com`,
      deliveryMethod: "email" as const,
    };
  }

  static createBatchAuditData() {
    const timestamp = Date.now();
    return {
      csvContent: `url,email
https://example1-${timestamp}.com,test1@example.com
https://example2-${timestamp}.com,test2@example.com
https://example3-${timestamp}.com,test3@example.com`,
      batchName: `Test Batch ${timestamp}`,
    };
  }
}
