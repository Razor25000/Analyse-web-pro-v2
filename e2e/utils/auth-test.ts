import { logger } from "@/lib/logger";
import { faker } from "@faker-js/faker";
import type { Page } from "@playwright/test";

export const getUserEmail = () =>
  `playwright-test-${faker.internet.email().toLowerCase()}`;

/**
 * Helper function to create a test account
 * @returns Object containing the test user's credentials
 */
export async function createTestAccount(options: {
  page: Page;
  callbackURL?: string;
  initialUserData?: { name: string; email: string; password: string };
}) {
  const { page, callbackURL, initialUserData } = options;

  // Generate fake user data
  const userData = initialUserData ?? {
    name: faker.person.fullName(),
    email: getUserEmail(),
    password: faker.internet.password({ length: 12, memorable: true }),
  };

  // Navigate to signup page
  await page.goto(`/auth/signup?callbackUrl=${callbackURL}`);

  // Fill out the form
  await page.getByLabel("Name").fill(userData.name);
  await page.getByLabel("Email").fill(userData.email);
  await page.locator('input[name="password"]').fill(userData.password);
  await page.locator('input[name="verifyPassword"]').fill(userData.password);

  // Submit the form
  await page.getByRole("button", { name: /sign up/i }).click();

  // Wait for navigation to complete - we should be redirected to the callback URL
  if (callbackURL) {
    await page.pause();
    await page.waitForURL(new RegExp(callbackURL), { timeout: 30000 });
  }

  return userData;
}

/**
 * Helper function to sign in with an existing account
 * @returns Object containing the user's credentials
 */
export async function signInAccount(options: {
  page: Page;
  userData: { email: string; password: string };
  callbackURL?: string;
}) {
  const { page, userData, callbackURL } = options;

  // Navigate to signin page
  await page.goto(
    `/auth/signin${callbackURL ? `?callbackUrl=${callbackURL}` : ""}`,
  );

  // Fill out the form
  await page.getByLabel("Email").fill(userData.email);
  await page.locator('input[name="password"]').fill(userData.password);

  // Submit the form
  await page
    .getByRole("button", { name: /sign in/i })
    .first()
    .click();

  // Wait for navigation to complete if a callback URL is provided
  if (callbackURL) {
    try {
      await page.waitForURL(new RegExp(callbackURL), { timeout: 30000 });
    } catch (error) {
      logger.error("Error waiting for navigation to complete", error);
    }
  }

  return userData;
}

/**
 * Helper function to sign out the current user
 * @param page - Playwright page object
 */
export async function signOutAccount(options: { page: Page }) {
  const { page } = options;

  // Navigate to account page
  await page.goto(`/account`);

  // Click the sign out button
  await page.getByRole("button", { name: /sign out/i }).click();

  await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
}
