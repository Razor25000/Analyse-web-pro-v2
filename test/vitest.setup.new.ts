import "@testing-library/jest-dom/vitest";

import type { PrismaClient } from "@prisma/client";
import type { AuthClientType } from "@/lib/auth-client";
import { cleanup } from "@testing-library/react";
import type { Resend } from "resend";
import type Stripe from "stripe";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

beforeEach(() => {
  cleanup();
});

// MOCKS

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      mockLocalStorage[key] = undefined as unknown as string;
    }),
    clear: vi.fn(() => {
      Object.keys(mockLocalStorage).forEach((key) => {
        mockLocalStorage[key] = undefined as unknown as string;
      });
    }),
  },
  writable: true,
});

// Mock fetch for API tests
const mockFetch = vi
  .fn()
  .mockImplementation(async (url: string, options: any = {}) => {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const method = options.method || "GET";

    // Helper to create a consistent response object
    const createResponse = (status: number, data: any, headers: Record<string, string> = {}) => {
      return {
        status,
        ok: status >= 200 && status < 300,
        headers: {
          entries: vi.fn(() => Object.entries(headers)),
          get: vi.fn((key: string) => headers[key] || null),
          has: vi.fn((key: string) => key in headers),
          ...headers,
        },
        json: async () => Promise.resolve(data),
        text: async () => Promise.resolve(JSON.stringify(data)),
      };
    };

    // Mock response for pre-signup API
    if (pathname === "/api/auth/pre-signup" && method === "POST") {
      try {
        const body = JSON.parse(options.body || "{}");

        // Validate required fields
        if (!body.name || body.name.length < 2) {
          return createResponse(400, {
            error: "Nom invalide",
            details: { name: "Le nom doit contenir au moins 2 caractères" },
          });
        }

        if (!body.email?.includes("@")) {
          return createResponse(400, {
            error: "Email invalide",
            details: { email: "L'email doit être valide" },
          });
        }

        if (!body.password || body.password.length < 6) {
          return createResponse(400, {
            error: "Mot de passe invalide",
            details: {
              password: "Le mot de passe doit contenir au moins 6 caractères",
            },
          });
        }

        // Check for duplicate email simulation
        if (body.email === "duplicate@example.com") {
          return createResponse(400, {
            error: "Email déjà utilisé",
          });
        }

        // Return successful pre-registration
        return createResponse(200, {
          preRegistrationId: `test-pre-reg-${Math.random().toString(36).substr(2, 9)}`,
          message: "Pré-inscription créée avec succès",
        });
      } catch (error) {
        return createResponse(400, {
          error: "JSON invalide",
        });
      }
    }

    // Mock response for Stripe checkout session creation
    if (pathname === "/api/stripe/create-checkout-session" && method === "GET") {
      const plan = parsedUrl.searchParams.get("plan");
      const preRegistrationId = parsedUrl.searchParams.get("preRegistrationId");

      // Validate required parameters
      if (!plan || !preRegistrationId) {
        return createResponse(400, {
          error: "Plan et preRegistrationId requis",
        });
      }

      // Validate plan
      const validPlans = ["pro_monthly", "pro_yearly", "premium_monthly", "premium_yearly"];
      if (!validPlans.includes(plan)) {
        return createResponse(400, {
          error: "Plan invalide",
        });
      }

      // Check if pre-registration exists (simulation)
      if (preRegistrationId === "non-existent-id") {
        return createResponse(404, {
          error: "Pré-inscription introuvable",
        });
      }

      // Check if pre-registration is expired (simulation)
      if (preRegistrationId.startsWith("expired-")) {
        return createResponse(400, {
          error: "Pré-inscription expirée",
        });
      }

      // Return redirect to Stripe
      return createResponse(302, {}, {
        location: `https://stripe.com/checkout/test-session-${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    // Mock response for auth status
    if (pathname === "/api/auth/status") {
      return createResponse(200, {
        user: {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
        },
      });
    }

    // Mock response for export API
    if (pathname === "/api/audits/export" && method === "POST") {
      try {
        const body = JSON.parse(options.body || "{}");

        // Validate format
        const validFormats = ["pdf", "html", "json", "csv"];
        if (!validFormats.includes(body.format)) {
          return createResponse(400, {
            success: false,
            error: "Données invalides",
            details: [{ field: "format", message: "Format invalide" }],
          });
        }

        // Return successful export job creation
        return createResponse(200, {
          type: "start",
          jobId: `test-job-${Math.random().toString(36).substr(2, 9)}`,
        }, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });
      } catch (error) {
        return createResponse(400, {
          success: false,
          error: "JSON invalide",
        });
      }
    }

    // Mock response for export status API
    if (pathname.startsWith("/api/audits/export/status/") && method === "GET") {
      const jobId = pathname.split("/").pop();

      // Simulate job not found
      if (jobId === "non-existent") {
        return createResponse(404, {
          success: false,
          error: "Export non trouvé ou expiré",
        });
      }

      // Simulate job in progress
      if (jobId === "in-progress") {
        return createResponse(200, {
          success: true,
          job: {
            id: jobId,
            userId: "test-user-id",
            config: { format: "json", filters: {} },
            status: {
              phase: "processing",
              progress: 50,
              message: "En cours...",
            },
          },
        });
      }

      // Simulate completed job
      return createResponse(200, {
        success: true,
        job: {
          id: jobId,
          userId: "test-user-id",
          config: { format: "json", filters: {} },
          status: {
            phase: "completed",
            progress: 100,
            message: "Terminé avec succès",
          },
          zipPath: "/tmp/export.zip",
        },
      });
    }


    // Mock response for auth signup API
    if (pathname === "/api/auth/signup" && method === "POST") {
      try {
        const body = JSON.parse(options.body || "{}");

        // Validate required fields
        if (!body.name || body.name.length < 2) {
          return createResponse(400, {
            error: "Nom invalide",
            details: { name: "Le nom doit contenir au moins 2 caractères" },
          });
        }

        if (!body.email?.includes("@")) {
          return createResponse(400, {
            error: "Email invalide",
            details: { email: "L'email doit être valide" },
          });
        }

        if (!body.password || body.password.length < 6) {
          return createResponse(400, {
            error: "Mot de passe invalide",
            details: {
              password: "Le mot de passe doit contenir au moins 6 caractères",
            },
          });
        }

        // Check for duplicate email simulation
        if (body.email === "existing@example.com" || body.email.startsWith("existing-")) {
          return createResponse(400, {
            error: "Email déjà utilisé",
          });
        }

        // Return successful signup
        return createResponse(200, {
          success: true,
          user: {
            id: `test-user-${Math.random().toString(36).substr(2, 9)}`,
            email: body.email,
            name: body.name,
          },
          message: "Compte créé avec succès",
        });
      } catch (error) {
        return createResponse(400, {
          error: "JSON invalide",
        });
      }
    }

    // Mock response for create-account-from-pre-registration API (GET)
    if (pathname === "/api/auth/create-account-from-pre-registration" && method === "GET") {
      const preRegistrationId = parsedUrl.searchParams.get("preRegistrationId");
      const success = parsedUrl.searchParams.get("success");

      // Validate required parameters
      if (!preRegistrationId || !success) {
        return createResponse(302, {}, {
          location: "/auth/pre-signup?error=invalid_parameters",
        });
      }

      // Check if pre-registration exists (simulation)
      if (preRegistrationId === "non-existent-id") {
        return createResponse(302, {}, {
          location: "/auth/pre-signup?error=pre_registration_not_found",
        });
      }

      // Check if pre-registration is expired (simulation)
      if (preRegistrationId.startsWith("expired-")) {
        return createResponse(302, {}, {
          location: "/auth/pre-signup?error=pre_registration_expired",
        });
      }

      // Check if already processed (simulation)
      if (preRegistrationId.startsWith("processed-")) {
        return createResponse(302, {}, {
          location: "/auth/pre-signup?error=pre_registration_already_processed",
        });
      }

      // Handle success/failure
      if (success === "true") {
        // Successful account creation - redirect to dashboard
        return createResponse(302, {}, {
          location: "/dashboard/audits",
        });
      } else {
        // Cancelled flow - redirect back to pre-signup
        return createResponse(302, {}, {
          location: "/auth/pre-signup?cancelled=true",
        });
      }
    }

    // Mock response for create-account-from-pre-registration API (POST - webhook)
    if (pathname === "/api/auth/create-account-from-pre-registration" && method === "POST") {
      try {
        const body = JSON.parse(options.body || "{}");
        const signature = options.headers?.["stripe-signature"];

        // Validate signature
        if (!signature || signature === "invalid_signature") {
          return createResponse(400, {
            error: "Webhook signature verification failed",
          });
        }

        // Validate webhook structure
        if (!body.type || !body.data?.object?.metadata) {
          return createResponse(400, {
            error: "Missing metadata",
          });
        }

        const { preRegistrationId, plan } = body.data.object.metadata;

        // Validate required metadata
        if (!preRegistrationId || !plan) {
          return createResponse(400, {
            error: "Missing metadata",
          });
        }

        // Check if pre-registration exists
        if (preRegistrationId === "non-existent-id") {
          return createResponse(404, {
            error: "Pre-registration not found",
          });
        }

        // Check for existing user scenario
        if (preRegistrationId.startsWith("existing-user-")) {
          return createResponse(400, {
            error: "User already exists",
          });
        }

        // Return successful account creation
        return createResponse(200, {
          success: true,
          userId: `test-user-${Math.random().toString(36).substr(2, 9)}`,
          message: "Account created successfully from webhook",
        });
      } catch (error) {
        return createResponse(400, {
          error: "JSON invalide",
        });
      }
    }

    // Default mock response for unhandled endpoints
    return createResponse(404, {
      error: "Endpoint non trouvé",
      pathname: pathname,
    });
  });

// Mock the Response constructor
const mockResponse = {
  ok: true,
  status: 200,
  headers: {
    entries: vi.fn(() => []),
    get: vi.fn(() => null),
    has: vi.fn(() => false),
  },
  json: async () => Promise.resolve({}),
  text: async () => Promise.resolve(""),
};

global.Response = vi.fn().mockImplementation(() => mockResponse);
global.fetch = mockFetch;

// Mock next/navigation
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");

  // Helper to create a fully mocked URLSearchParams that passes TypeScript checks
  const createMockSearchParams = (
    defaultParams: Record<string, string> = {},
  ) => {
    const params = new Map(Object.entries(defaultParams));

    // Create an empty iterator
    const emptyIterator = {
      next: () => ({ done: true, value: undefined }),
      [Symbol.iterator]: function () {
        return this;
      },
    };

    return {
      get: vi.fn((key: string) => params.get(key) ?? null),
      getAll: vi.fn((key: string) =>
        params.has(key) ? [params.get(key) as string] : [],
      ),
      has: vi.fn((key: string) => params.has(key)),
      keys: vi.fn(() =>
        params.size
          ? Array.from(params.keys())[Symbol.iterator]()
          : emptyIterator,
      ),
      values: vi.fn(() =>
        params.size
          ? Array.from(params.values())[Symbol.iterator]()
          : emptyIterator,
      ),
      entries: vi.fn(() =>
        params.size
          ? Array.from(params.entries())[Symbol.iterator]()
          : emptyIterator,
      ),
      forEach: vi.fn(
        (
          callback: (
            value: string,
            key: string,
            parent: URLSearchParams,
          ) => void,
        ) => {
          params.forEach((value, key) => {
            // Using mock parent as URLSearchParams is not constructable in tests
            callback(value, key, {} as URLSearchParams);
          });
        },
      ),
      toString: vi.fn(() => {
        return Array.from(params.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
      }),
      // These props need to be present for ReadonlyURLSearchParams interface
      append: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
      sort: vi.fn(),
      size: params.size,
      [Symbol.iterator]: vi.fn(() => params.entries()),
    };
  };

  return {
    ...actual,
    useSearchParams: vi.fn().mockReturnValue(createMockSearchParams()),
    readonlySearchParamsHook: vi.fn().mockReturnValue(createMockSearchParams()),
  };
});

const prisma = mockDeep<PrismaClient>();
const stripe = mockDeep<Stripe>();
const authClient = mockDeep<AuthClientType>();
const resend = mockDeep<Resend>();
global.fetch = fetch;

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/stripe", () => ({ stripe }));
vi.mock("@/lib/auth-client", () => ({ authClient }));
vi.mock("@/lib/mail/resend", () => ({
  resend,
  resendMailAdapter: {
    send: vi.fn(),
  }
}));
vi.mock("@/lib/env", () => ({
  env: {
    N8N_WEBHOOK_BASE_URL: "https://n8n-test.example.com",
    N8N_SINGLE_AUDIT_PATH: "/webhook/formulaire-offre-gratuite",
    N8N_BATCH_AUDIT_PATH: "/webhook/batch-upload",
    N8N_WEBHOOK_SECRET: "test_webhook_secret_123",
  },
}));
vi.mock("@/lib/auth/auth-user", () => ({
  getUser: vi.fn(),
  getRequiredUser: vi.fn(),
}));
vi.mock("@/lib/organizations/get-org", () => ({
  getCurrentOrg: vi.fn(),
  getRequiredCurrentOrg: vi.fn(),
}));

// Define the type for our global helper

declare global {
  var createTestSearchParams: (
    params?: Record<string, string>,
  ) => ReadonlyURLSearchParams;
}

beforeEach(() => {
  // Reset mocks
  mockReset(prisma);
  mockReset(stripe);
  mockReset(authClient);

  // Reset localStorage mock
  vi.mocked(window.localStorage.getItem).mockClear();
  vi.mocked(window.localStorage.setItem).mockClear();
  vi.mocked(window.localStorage.removeItem).mockClear();
  vi.mocked(window.localStorage.clear).mockClear();

  // Mock toast
  vi.mock("sonner", () => ({
    toast: {
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  }));

  // Clear localStorage without using delete
  Object.keys(mockLocalStorage).forEach((key) => {
    mockLocalStorage[key] = undefined as unknown as string;
  });

  // Expose helper for creating search params mocks with specific values
  global.createTestSearchParams = (
    params: Record<string, string> = {},
  ): ReadonlyURLSearchParams => {
    const mockSearchParams = {
      get: vi.fn((key: string) => params[key] ?? null),
      getAll: vi.fn((key: string) => (params[key] ? [params[key]] : [])),
      has: vi.fn((key: string) => key in params),
      keys: vi.fn(() => Object.keys(params)[Symbol.iterator]()),
      values: vi.fn(() => Object.values(params)[Symbol.iterator]()),
      entries: vi.fn(() => Object.entries(params)[Symbol.iterator]()),
      forEach: vi.fn(
        (
          callback: (
            value: string,
            key: string,
            parent: URLSearchParams,
          ) => void,
        ) => {
          Object.entries(params).forEach(([key, value]) => {
            // Using mock parent as URLSearchParams is not constructable in tests
            callback(value, key, {} as URLSearchParams);
          });
        },
      ),
      toString: vi.fn(() => {
        return Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
      }),
      // These props need to be present for ReadonlyURLSearchParams interface
      append: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
      sort: vi.fn(),
      size: Object.keys(params).length,
      [Symbol.iterator]: vi.fn(() => Object.entries(params)[Symbol.iterator]()),
    };

    return mockSearchParams as ReadonlyURLSearchParams;
  };
});
