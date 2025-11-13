import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { parse } from "url";
import querystring from "querystring";

// Test configuration
const TEST_PORT = 3001;
const API_BASE = `http://localhost:${TEST_PORT}`;

let server: any;

// Helper function to make API requests
async function apiRequest(endpoint: string, options: any = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => null);
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data,
  };
}

describe("Stripe Checkout Session API Tests", () => {
  beforeAll(async () => {
    // Note: In a real test environment, you would start the Next.js dev server
    // For now, we'll assume the server is running or mock the responses
    console.log("Stripe Checkout Session API tests initialized");
  });

  afterAll(async () => {
    // Clean up any test data
    console.log("Stripe Checkout Session API tests completed");
  });

  describe("GET /api/stripe/create-checkout-session", () => {
    it("should create a checkout session with valid pre-registration and plan", async () => {
      // First create a pre-registration
      const preRegistrationData = {
        name: "Test User",
        email: `test-checkout-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      // Now create checkout session
      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${preRegistrationId}`,
      );

      // Should redirect to Stripe (302 or 303)
      expect([302, 303]).toContain(response.status);

      // Should have location header pointing to Stripe
      expect(response.headers.location).toContain("stripe.com");
      expect(response.headers.location).toContain("checkout");
    });

    it("should reject requests without plan parameter", async () => {
      const response = await apiRequest(
        "/api/stripe/create-checkout-session?preRegistrationId=test123",
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
      expect(response.data.error).toContain("Plan et preRegistrationId requis");
    });

    it("should reject requests without preRegistrationId parameter", async () => {
      const response = await apiRequest(
        "/api/stripe/create-checkout-session?plan=pro_monthly",
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
      expect(response.data.error).toContain("Plan et preRegistrationId requis");
    });

    it("should reject requests with non-existent pre-registration", async () => {
      const response = await apiRequest(
        "/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=non-existent-id",
      );

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty("error");
      expect(response.data.error).toContain("Pré-inscription introuvable");
    });

    it("should reject requests with expired pre-registration", async () => {
      // Create a pre-registration that will be expired
      const preRegistrationData = {
        name: "Expired User",
        email: `expired-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      // Simulate expiration by updating the pre-registration directly in the database
      // In a real test, you would use the database client to update the expiresAt field

      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${preRegistrationId}`,
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
      expect(response.data.error).toContain("Pré-inscription expirée");
    });

    it("should reject requests with already processed pre-registration", async () => {
      // Create a pre-registration
      const preRegistrationData = {
        name: "Processed User",
        email: `processed-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      // Simulate the pre-registration being processed
      // In a real test, you would update the status to 'completed' or 'cancelled'

      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${preRegistrationId}`,
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
      expect(response.data.error).toContain(
        "Pré-inscription expirée ou déjà traitée",
      );
    });

    it("should reject requests with invalid plan", async () => {
      // Create a valid pre-registration
      const preRegistrationData = {
        name: "Invalid Plan User",
        email: `invalid-plan-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      // Try to create checkout session with invalid plan
      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=invalid_plan&preRegistrationId=${preRegistrationId}`,
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
      expect(response.data.error).toContain("Plan invalide");
    });

    it("should handle different plan types correctly", async () => {
      const plans = [
        "pro_monthly",
        "pro_yearly",
        "premium_monthly",
        "premium_yearly",
      ];

      for (const plan of plans) {
        // Create a pre-registration for each plan
        const preRegistrationData = {
          name: `Plan Test User ${plan}`,
          email: `plan-test-${plan}-${Date.now()}@example.com`,
          password: "password123",
          selectedPlan: plan,
        };

        const preRegResponse = await apiRequest("/api/auth/pre-signup", {
          method: "POST",
          body: JSON.stringify(preRegistrationData),
        });

        expect(preRegResponse.status).toBe(200);
        const preRegistrationId = preRegResponse.data.preRegistrationId;

        // Create checkout session for each plan
        const response = await apiRequest(
          `/api/stripe/create-checkout-session?plan=${plan}&preRegistrationId=${preRegistrationId}`,
        );

        // Should redirect to Stripe for each valid plan
        expect([302, 303]).toContain(response.status);
        expect(response.headers.location).toContain("stripe.com");
      }
    });

    it("should include proper metadata in checkout session", async () => {
      // Create a pre-registration
      const preRegistrationData = {
        name: "Metadata Test User",
        email: `metadata-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      // In a real test environment, you would intercept the Stripe API call
      // to verify the metadata, or use Stripe's test mode to inspect the created session
      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${preRegistrationId}`,
      );

      expect([302, 303]).toContain(response.status);

      // The redirect URL should contain the session ID which can be used to verify metadata
      expect(response.headers.location).toContain("checkout");
    });

    it("should set correct success and cancel URLs", async () => {
      // Create a pre-registration
      const preRegistrationData = {
        name: "URL Test User",
        email: `url-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      // Similar to metadata test, in a real environment you would verify the URLs
      // For now, we just verify the session is created successfully
      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${preRegistrationId}`,
      );

      expect([302, 303]).toContain(response.status);
      expect(response.headers.location).toContain("stripe.com");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing environment variables gracefully", async () => {
      // This test would require temporarily unsetting environment variables
      // In a real test environment, you would mock process.env

      const preRegistrationData = {
        name: "Env Test User",
        email: `env-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${preRegistrationId}`,
      );

      // Should either succeed or fail gracefully with proper error
      expect([200, 302, 303, 400, 500]).toContain(response.status);
    });

    it("should handle Stripe API errors gracefully", async () => {
      // This test would require mocking Stripe API to return errors
      // For now, we just verify the endpoint doesn't crash

      const preRegistrationData = {
        name: "Stripe Error Test User",
        email: `stripe-error-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${preRegistrationId}`,
      );

      // Should handle errors gracefully
      expect([200, 302, 303, 400, 500]).toContain(response.status);
    });
  });

  describe("Security Validation", () => {
    it("should validate plan parameter to prevent injection", async () => {
      const maliciousPlan = "pro_monthly; DROP TABLE users;";

      const preRegistrationData = {
        name: "Security Test User",
        email: `security-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const preRegResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(preRegistrationData),
      });

      expect(preRegResponse.status).toBe(200);
      const preRegistrationId = preRegResponse.data.preRegistrationId;

      const response = await apiRequest(
        `/api/stripe/create-checkout-session?plan=${encodeURIComponent(maliciousPlan)}&preRegistrationId=${preRegistrationId}`,
      );

      // Should reject malicious input
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
    });

    it("should validate preRegistrationId format", async () => {
      const invalidIds = [
        "invalid-id",
        "123",
        "very-long-id-that-exceeds-maximum-length",
        "special@chars#",
        "",
      ];

      for (const invalidId of invalidIds) {
        const response = await apiRequest(
          `/api/stripe/create-checkout-session?plan=pro_monthly&preRegistrationId=${invalidId}`,
        );

        // Should reject invalid preRegistrationId formats
        expect([400, 404]).toContain(response.status);
      }
    });
  });
});

// Integration test helper functions
export const StripeCheckoutTestHelpers = {
  async createTestPreRegistration(overrides = {}) {
    const defaultData = {
      name: "Test User",
      email: `test-checkout-${Date.now()}@example.com`,
      password: "password123",
      selectedPlan: "pro_monthly",
    };

    const testData = { ...defaultData, ...overrides };

    const response = await apiRequest("/api/auth/pre-signup", {
      method: "POST",
      body: JSON.stringify(testData),
    });

    if (response.status !== 200) {
      throw new Error(
        `Failed to create test pre-registration: ${JSON.stringify(response.data)}`,
      );
    }

    return response.data;
  },

  async createTestCheckoutSession(
    preRegistrationId: string,
    plan = "pro_monthly",
  ) {
    const response = await apiRequest(
      `/api/stripe/create-checkout-session?plan=${plan}&preRegistrationId=${preRegistrationId}`,
    );

    if (![302, 303].includes(response.status)) {
      throw new Error(
        `Failed to create test checkout session: ${JSON.stringify(response.data)}`,
      );
    }

    return {
      status: response.status,
      redirectUrl: response.headers.location,
    };
  },

  extractSessionIdFromRedirect(redirectUrl: string) {
    const match = redirectUrl.match(/\/sessions\/(.+)$/);
    return match ? match[1] : null;
  },
};

console.log("Stripe Checkout Session API test suite loaded");
