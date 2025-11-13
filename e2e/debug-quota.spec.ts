import { test, expect } from "@playwright/test";

test.describe("Debug Quota Display", () => {
  test("should debug quota display after audit creation", async ({ page }) => {
    // Reset audits
    console.log("🔄 Resetting temporary audits...");
    const resetResponse = await page.request.delete(
      "/api/audits/status?reset=test",
    );
    const resetData = await resetResponse.json();
    console.log("✅ Reset result:", resetData);

    const testEmail = `debug-${Date.now()}@example.com`;
    const testPassword = "Test123!";

    // 1. Signup
    await page.goto("/auth/signup");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="verifyPassword"]').fill(testPassword);
    await page.getByRole("button", { name: /sign up/i }).click();

    // 2. Wait for dashboard
    await page.waitForURL("/dashboard/audits", { timeout: 30000 });
    console.log("✅ Dashboard loaded");

    // 3. Check initial quota
    await page.waitForTimeout(2000);
    const initialQuotaText = await page.textContent("body");
    console.log(
      "📊 Initial page content (searching for 0/5):",
      initialQuotaText?.substring(0, 500),
    );

    // 4. Create one audit
    await page.getByRole("link", { name: /nouvel audit/i }).click();
    await page.getByLabel(/url/i).fill("https://debug.com");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByRole("button", { name: /démarrer l'audit/i }).click();

    await expect(page.getByText(/audit démarré avec succès/i)).toBeVisible({
      timeout: 10000,
    });
    console.log("✅ Audit created");

    // 5. Check API directly
    const apiResponse = await page.request.get("/api/audits/status");
    const apiData = await apiResponse.json();
    console.log("📊 API quota data:", apiData.quota);

    // 6. Return to dashboard and debug quota display
    await page.goto("/dashboard/audits");
    await page.waitForTimeout(3000);

    const updatedQuotaText = await page.textContent("body");
    console.log(
      "📊 Updated page content (searching for 1/5):",
      updatedQuotaText?.substring(0, 500),
    );

    // Try to find any quota-like patterns
    const quotaMatches = updatedQuotaText?.match(/\d+\/\d+/g) || [];
    console.log("📊 Found quota patterns:", quotaMatches);

    // Try to screenshot for debugging
    await page.screenshot({ path: "debug-quota.png", fullPage: true });
    console.log("📸 Screenshot saved as debug-quota.png");
  });
});
