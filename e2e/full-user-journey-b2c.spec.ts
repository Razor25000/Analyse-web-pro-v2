import { test, expect } from "@playwright/test";

test.describe("B2C User Journey", () => {
  test("should complete full user journey - signup to quota limit", async ({
    page,
  }) => {
    // Réinitialiser les audits temporaires avant de commencer
    console.log("🔄 Resetting temporary audits for test isolation...");
    const resetResponse = await page.request.delete(
      "/api/audits/status?reset=test",
    );
    const resetData = await resetResponse.json();
    console.log("✅ Reset result:", resetData);

    // Générer un email de test unique
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = "Test123!";

    console.log("🧪 Starting B2C journey test with:", testEmail);

    // 1. Aller sur la homepage
    await page.goto("/");
    console.log("✅ Homepage loaded");

    // 2. Cliquer sur inscription
    await page.getByTestId("hero-cta-signup").click();
    await expect(page).toHaveURL(/\/auth\/signup/);
    console.log("✅ Signup page loaded");

    // 3. S'inscrire
    await page.getByLabel(/email/i).fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="verifyPassword"]').fill(testPassword);
    await page.getByRole("button", { name: /sign up/i }).click();

    // Attendre la redirection vers le dashboard
    await page.waitForURL("/dashboard/audits", { timeout: 30000 });
    console.log("✅ Account created and redirected to dashboard");

    // 4. Vérifier le dashboard et le quota
    await expect(page.getByText(/0\/5/)).toBeVisible();
    console.log("✅ Dashboard shows quota 0/5");

    // 5. Créer des audits jusqu'à atteindre la limite
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 Creating audit ${i}/5`);

      // Aller sur la page de création d'audit
      await page.getByRole("link", { name: /nouvel audit/i }).click();
      await expect(page).toHaveURL("/dashboard/audits/new");

      // Remplir le formulaire
      await page.getByLabel(/url/i).fill(`https://example${i}.com`);
      await page.getByLabel(/email/i).fill(testEmail);

      // Soumettre
      await page.getByRole("button", { name: /démarrer l'audit/i }).click();

      // Attendre le succès et la redirection
      await expect(page.getByText(/audit démarré avec succès/i)).toBeVisible({
        timeout: 10000,
      });

      // Retourner au dashboard pour le prochain audit
      await page.goto("/dashboard/audits");

      // Attendre que le quota se mette à jour (dashboard auto-refresh)
      await page.waitForTimeout(2000);

      // Essayer de trouver le quota mis à jour
      try {
        await expect(page.getByText(new RegExp(`${i}/5`))).toBeVisible({
          timeout: 8000,
        });
      } catch (error) {
        console.log(
          `⚠️ Quota text ${i}/5 not found, trying to refresh manually`,
        );
        // Forcer un refresh de la page si le quota ne s'affiche pas
        await page.reload();
        await page.waitForTimeout(1000);
        await expect(page.getByText(new RegExp(`${i}/5`))).toBeVisible({
          timeout: 5000,
        });
      }

      console.log(`✅ Audit ${i}/5 created successfully`);
    }

    // 6. Tenter un 6ème audit (doit être bloqué)
    console.log("🚫 Testing 6th audit (should be blocked)");

    await page.getByRole("link", { name: /nouvel audit/i }).click();
    await expect(page).toHaveURL("/dashboard/audits/new");

    // Attendre que la page se charge complètement et que le quota soit vérifié
    await page.waitForTimeout(2000);

    await page.getByLabel(/url/i).fill("https://example6.com");
    await page.getByLabel(/email/i).fill(testEmail);

    // Vérifier si le bouton a changé de texte (quota épuisé)
    const quotaExceededButton = page.getByRole("button", {
      name: /quota épuisé/i,
    });
    const regularButton = page.getByRole("button", {
      name: /démarrer l'audit/i,
    });

    if (await quotaExceededButton.isVisible()) {
      console.log("✅ Button shows quota exceeded state");
      // Cliquer sur le bouton "Quota épuisé" devrait ouvrir la modal d'upgrade
      await quotaExceededButton.click();

      // Vérifier que la modal d'upgrade s'ouvre
      await expect(page.getByText(/choisir.*plan/i)).toBeVisible({
        timeout: 5000,
      });
      console.log("✅ Upgrade modal opened successfully");

      // Fermer la modal et aller directement au billing
      await page.keyboard.press("Escape");
      await page.goto("/dashboard/billing");
    } else {
      console.log("ℹ️ Testing API-level quota rejection");
      // Si le bouton est encore normal, tester le rejet API
      await regularButton.click();

      // Doit afficher l'erreur de quota et rediriger vers billing
      await expect(page.getByText(/quota.*atteint/i)).toBeVisible({
        timeout: 10000,
      });
      console.log("✅ Quota exceeded message displayed");

      // Attendre la redirection vers billing
      await page.waitForURL("/dashboard/billing", { timeout: 10000 });
    }

    // 7. Vérifier la page de billing
    console.log("✅ Redirected to billing page");
    await expect(page.getByText(/mise à niveau/i)).toBeVisible({
      timeout: 5000,
    });
    console.log("✅ Billing page shows upgrade options");

    // 8. Tester le bouton upgrade (doit montrer l'alerte de test)
    const upgradeButtons = page.getByRole("button", { name: /choisir.*plan/i });
    if (await upgradeButtons.first().isVisible()) {
      // Configurer l'écouteur de dialogue AVANT de cliquer
      page.on("dialog", async (dialog) => {
        expect(dialog.message()).toContain("Mode Test");
        await dialog.accept();
        console.log("✅ Test mode alert displayed correctly");
      });

      await upgradeButtons.first().click();

      // Attendre un peu pour que le dialogue se déclenche
      await page.waitForTimeout(1000);
    } else {
      console.log(
        "ℹ️ No upgrade buttons found, checking for alternative billing interface",
      );
    }

    console.log("🎉 B2C User Journey completed successfully!");
  });
});
