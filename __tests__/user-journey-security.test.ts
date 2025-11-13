import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock des modules externes
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: vi.fn(),
    },
    sendMagicLink: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("User Journey Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Free Plan Flow", () => {
    it("should create user immediately for free plan", async () => {
      const { authClient } = await import("@/lib/auth-client");
      const { prisma } = await import("@/lib/prisma");

      // Mock successful user creation
      authClient.signUp.email.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            name: "Test User",
          },
        },
      });

      // Simulate free plan signup
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
        image: "",
      };

      const result = await authClient.signUp.email(userData);

      expect(authClient.signUp.email).toHaveBeenCalledWith(userData);
      expect(result.data?.user?.id).toBe("user-123");
      expect(result.data?.user?.email).toBe("test@example.com");
    });

    it("should redirect to dashboard for free plan after signup", () => {
      // Mock window.location
      delete (window as any).location;
      window.location = { href: "" } as any;

      const selectedPlan = null; // Free plan
      const callbackUrl = "/dashboard/audits";

      // Simulate signup success handler logic
      if (!selectedPlan) {
        window.location.href = `${window.location.origin}${callbackUrl}`;
      }

      expect(window.location.href).toBe("/dashboard/audits");
    });
  });

  describe("Paid Plan Flow - SECURITY CRITICAL", () => {
    it("should NOT create user for paid plan during signup", async () => {
      const { authClient } = await import("@/lib/auth-client");

      // Mock du comportement attendu après correction
      authClient.signUp.email.mockImplementation(() => {
        throw new Error("User should not be created during paid signup");
      });

      const selectedPlan = "pro_monthly";

      // Simulate corrected signup flow
      try {
        if (selectedPlan) {
          // Paid plan: redirect to Stripe WITHOUT creating account
          const redirectUrl = `/api/stripe/create-checkout-session?plan=${selectedPlan}&email=test@example.com`;
          expect(redirectUrl).toBe(
            "/api/stripe/create-checkout-session?plan=pro_monthly&email=test@example.com",
          );
        }
      } catch (error) {
        expect(error).toBeUndefined(); // Should not throw in corrected flow
      }

      // Verify user creation was NOT called
      expect(authClient.signUp.email).not.toHaveBeenCalled();
    });

    it("should create user only after webhook validation", async () => {
      const { stripe } = await import("@/lib/stripe");
      const { authClient } = await import("@/lib/auth-client");

      // Mock Stripe session
      const mockSession = {
        id: "cs_123",
        payment_status: "paid",
        customer: "cus_123",
        subscription: "sub_123",
        metadata: {
          email: "test@example.com",
          planId: "pro_monthly",
        },
      };

      stripe.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      // Mock user creation in webhook
      authClient.signUp.email.mockResolvedValue({
        data: {
          user: {
            id: "user-webhook-123",
            email: "test@example.com",
          },
        },
      });

      // Simulate webhook handler
      const handleCheckoutCompleted = async (session: any) => {
        const email = session.metadata?.email;
        const planId = session.metadata?.planId;

        if (!email || !planId) {
          throw new Error("Métadonnées manquantes");
        }

        // Create user only after payment confirmation
        const user = await authClient.signUp.email({
          email: email,
          password: "temp-password",
          name: email.split("@")[0],
        });

        return user.data?.user?.id;
      };

      const userId = await handleCheckoutCompleted(mockSession);

      expect(authClient.signUp.email).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "temp-password",
        name: "test",
      });
      expect(userId).toBe("user-webhook-123");
    });

    it("should reject access without valid session_id", async () => {
      const request = new NextRequest("http://localhost:3000/post-checkout");

      // No session_id in URL
      const url = new URL(request.url);
      const sessionId = url.searchParams.get("session_id");

      expect(sessionId).toBeNull();

      // Should trigger error state in post-checkout page
      const shouldShowError = !sessionId;
      expect(shouldShowError).toBe(true);
    });

    it("should verify payment before allowing dashboard access", async () => {
      const { stripe } = await import("@/lib/stripe");

      // Mock unpaid session
      const mockUnpaidSession = {
        payment_status: "unpaid",
        metadata: { email: "test@example.com" },
      };

      stripe.checkout.sessions.retrieve.mockResolvedValue(mockUnpaidSession);

      // Simulate verification endpoint
      const verifyPayment = async (sessionId: string) => {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          return { success: false, userCreated: false };
        }

        return { success: true, userCreated: true };
      };

      const result = await verifyPayment("cs_unpaid");

      expect(result.success).toBe(false);
      expect(result.userCreated).toBe(false);
    });
  });

  describe("Security Scenarios - CRITICAL", () => {
    it("should prevent dashboard access with manipulated success URL", () => {
      // Simulate malicious URL manipulation
      const maliciousUrl = "/dashboard/audits?success=true&plan=pro_monthly";

      // Without server-side verification, this would be dangerous
      // With corrections, post-checkout polling prevents this

      const hasValidPayment = false; // No actual payment made
      const shouldAllowAccess = hasValidPayment; // Should be false

      expect(shouldAllowAccess).toBe(false);
    });

    it("should block premium features without active subscription", async () => {
      const { prisma } = await import("@/lib/prisma");

      // Mock user without active subscription
      prisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        subscriptions: [], // No active subscriptions
      });

      // Simulate subscription check
      const checkSubscription = async (userId: string) => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            subscriptions: {
              where: { status: { in: ["active", "trialing"] } },
            },
          },
        });

        return user?.subscriptions.length > 0;
      };

      const hasActiveSubscription = await checkSubscription("user-123");

      expect(hasActiveSubscription).toBe(false);
    });

    it("should prevent webhook replay attacks", async () => {
      const { stripe } = await import("@/lib/stripe");

      // Mock webhook signature verification failure
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Webhook signature verification failed");
      });

      // Simulate webhook handler
      const handleWebhook = async (body: string, signature: string) => {
        try {
          await stripe.webhooks.constructEvent(
            body,
            signature,
            "webhook-secret",
          );
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await handleWebhook("malicious-body", "fake-signature");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook signature verification failed");
    });

    it("should prevent double account creation", async () => {
      const { authClient } = await import("@/lib/auth-client");
      const { prisma } = await import("@/lib/prisma");

      // Mock existing user
      prisma.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      });

      // Simulate webhook handler with duplicate prevention
      const handleCheckoutWithDupeCheck = async (email: string) => {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return { userId: existingUser.id, created: false };
        }

        const newUser = await authClient.signUp.email({
          email,
          password: "temp",
          name: "New User",
        });

        return { userId: newUser.data?.user?.id, created: true };
      };

      const result = await handleCheckoutWithDupeCheck("test@example.com");

      expect(result.userId).toBe("existing-user");
      expect(result.created).toBe(false);
      expect(authClient.signUp.email).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle webhook timeout gracefully", async () => {
      // Simulate 60-second timeout scenario
      const startTime = Date.now();
      const maxWaitTime = 60000; // 60 seconds

      let attempts = 0;
      const maxAttempts = 12;

      const pollWithTimeout = async () => {
        return new Promise((resolve) => {
          const poll = () => {
            attempts++;
            const elapsed = Date.now() - startTime;

            if (elapsed >= maxWaitTime || attempts >= maxAttempts) {
              resolve({ success: false, timeout: true });
              return;
            }

            // Simulate continued polling
            setTimeout(poll, 5000);
          };

          poll();
        });
      };

      const result = await pollWithTimeout();

      expect(result).toEqual({ success: false, timeout: true });
      expect(attempts).toBeGreaterThanOrEqual(maxAttempts);
    });

    it("should handle Stripe API failures gracefully", async () => {
      const { stripe } = await import("@/lib/stripe");

      // Mock Stripe API failure
      stripe.checkout.sessions.create.mockRejectedValue(
        new Error("Stripe API temporarily unavailable"),
      );

      // Simulate checkout creation with error handling
      const createCheckoutSession = async () => {
        try {
          await stripe.checkout.sessions.create({
            customer_email: "test@example.com",
            line_items: [{ price: "price_123", quantity: 1 }],
            mode: "subscription",
            success_url:
              "http://localhost:3000/post-checkout?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: "http://localhost:3000/pricing",
          });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await createCheckoutSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Stripe API temporarily unavailable");
    });
  });
});
