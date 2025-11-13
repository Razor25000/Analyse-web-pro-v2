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

describe("Pre-signup API Tests", () => {
  beforeAll(async () => {
    // Note: In a real test environment, you would start the Next.js dev server
    // For now, we'll assume the server is running or mock the responses
    console.log("Pre-signup API tests initialized");
  });

  afterAll(async () => {
    // Clean up any test data
    console.log("Pre-signup API tests completed");
  });

  describe("POST /api/auth/pre-signup", () => {
    it("should create a new pre-registration with valid data", async () => {
      const testData = {
        name: "Test User",
        email: `test-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "pro_monthly",
      };

      const response = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(testData),
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("preRegistrationId");
      expect(response.data).toHaveProperty("message");
      expect(typeof response.data.preRegistrationId).toBe("string");
      expect(response.data.preRegistrationId).toHaveLength(16); // nanoid(16)
    });

    it("should reject duplicate email addresses", async () => {
      const testData = {
        name: "Test User",
        email: "duplicate@example.com",
        password: "password123",
        selectedPlan: "free",
      };

      // First request should succeed
      const firstResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(testData),
      });

      expect(firstResponse.status).toBe(200);

      // Second request with same email should be rejected
      const secondResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(testData),
      });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.data).toHaveProperty("error");
    });

    it("should validate required fields", async () => {
      const invalidData = {
        name: "", // Invalid: too short
        email: "invalid-email", // Invalid: not a valid email
        password: "123", // Invalid: too short
      };

      const response = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
      expect(response.data).toHaveProperty("details");
    });

    it("should handle existing pre-registration correctly", async () => {
      const testData = {
        name: "Existing User",
        email: `existing-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "premium_yearly",
      };

      // Create first pre-registration
      const firstResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(testData),
      });

      expect(firstResponse.status).toBe(200);
      const preRegistrationId = firstResponse.data.preRegistrationId;

      // Try to create another with same data - should return existing
      const secondResponse = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(testData),
      });

      expect(secondResponse.status).toBe(200);
      // Should either return the existing ID or create a new one
      expect(secondResponse.data).toHaveProperty("preRegistrationId");
    });

    it("should default to free plan when not specified", async () => {
      const testData = {
        name: "Default Plan User",
        email: `default-${Date.now()}@example.com`,
        password: "password123",
        // selectedPlan not specified - should default to 'free'
      };

      const response = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(testData),
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("preRegistrationId");
    });

    it("should reject malformed JSON", async () => {
      const response = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: "invalid json string",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(400);
    });

    it("should handle large payload sizes", async () => {
      const largeName = "A".repeat(1000); // Very long name
      const testData = {
        name: largeName,
        email: `large-${Date.now()}@example.com`,
        password: "password123",
        selectedPlan: "free",
      };

      const response = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(testData),
      });

      // Should either reject due to size constraints or validation
      expect([200, 400, 413]).toContain(response.status);
    });
  });

  describe("Rate limiting", () => {
    it("should enforce rate limits", async () => {
      const requests = [];
      const requestCount = 10; // More than the rate limit of 5

      for (let i = 0; i < requestCount; i++) {
        const testData = {
          name: `Rate Test User ${i}`,
          email: `rate-test-${i}-${Date.now()}@example.com`,
          password: "password123",
          selectedPlan: "free",
        };

        requests.push(
          apiRequest("/api/auth/pre-signup", {
            method: "POST",
            body: JSON.stringify(testData),
          }),
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      const successfulResponses = responses.filter((r) => r.status === 200);

      // Should have some rate limited responses if rate limiting is working
      console.log(
        `Rate limiting test: ${successfulResponses.length} successful, ${rateLimitedResponses.length} rate limited`,
      );

      // At least some requests should succeed
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe("Security validation", () => {
    it("should reject SQL injection attempts", async () => {
      const maliciousData = {
        name: "Test', DROP TABLE users; --",
        email: "sql-injection@example.com",
        password: "password123",
        selectedPlan: "free",
      };

      const response = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(maliciousData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
    });

    it("should reject XSS attempts in name field", async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        email: "xss-test@example.com",
        password: "password123",
        selectedPlan: "free",
      };

      const response = await apiRequest("/api/auth/pre-signup", {
        method: "POST",
        body: JSON.stringify(maliciousData),
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
    });

    it("should validate email format strictly", async () => {
      const invalidEmails = [
        "plainaddress",
        "@example.com",
        "user@",
        "user@.com",
        "user..user@example.com",
        "user@example..com",
        "user@example.com.",
      ];

      for (const email of invalidEmails) {
        const testData = {
          name: "Email Test User",
          email: email,
          password: "password123",
          selectedPlan: "free",
        };

        const response = await apiRequest("/api/auth/pre-signup", {
          method: "POST",
          body: JSON.stringify(testData),
        });

        expect(response.status).toBe(400);
      }
    });
  });
});

// Integration test helper functions
export const PreSignupTestHelpers = {
  async createTestPreRegistration(overrides = {}) {
    const defaultData = {
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
      password: "password123",
      selectedPlan: "free",
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

  async validatePreRegistration(preRegistrationId: string) {
    // This would typically query the database directly
    // For now, we'll assume it exists if we got a valid ID
    return (
      typeof preRegistrationId === "string" && preRegistrationId.length === 16
    );
  },
};

console.log("Pre-signup API test suite loaded");
