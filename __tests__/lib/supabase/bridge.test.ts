import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseBridge } from "@/lib/supabase/bridge";

// Mock Supabase clients
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
          single: vi.fn(() => ({ data: null, error: null })),
          gte: vi.fn(() => ({ count: 0, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "test-id" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: "test-id" }, error: null })),
          })),
        })),
      })),
    })),
  },
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({ error: null })),
    })),
  },
}));

describe("SupabaseBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SUPPRIMÉ: Architecture v2.0 optimisée - plus de synchronisation profiles
   * Les tests pour syncUserToSupabase ont été supprimés car la fonction n'existe plus
   *
   * @deprecated Ces tests ont été supprimés dans l'architecture v2.0
   */

  describe("getUserAudits", () => {
    it("should return empty array when no audits found", async () => {
      const result = await SupabaseBridge.getUserAudits("user-id");
      expect(result).toEqual([]);
    });

    it("should return audits when found", async () => {
      const result = await SupabaseBridge.getUserAudits("user-id");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("createAudit", () => {
    it("should create audit successfully", async () => {
      const auditData = {
        user_id: "user-id",
        email: "test@example.com",
        url: "https://example.com",
        audit_type: "manual" as const,
        webhook_id: "webhook-123",
      };

      const result = await SupabaseBridge.createAudit(auditData);
      expect(result).toEqual({ id: "test-id" });
    });

    it("should return null when supabase is not available", async () => {
      const auditData = {
        user_id: "user-id",
        email: "test@example.com",
        url: "https://example.com",
      };

      const result = await SupabaseBridge.createAudit(auditData);
      expect(result).toBeDefined();
    });
  });

  describe("updateAudit", () => {
    it("should update audit successfully", async () => {
      const result = await SupabaseBridge.updateAudit("audit-id", {
        status: "completed",
        score_global: 95,
      });
      expect(result).toEqual({ id: "test-id" });
    });

    it("should update audit with results data", async () => {
      const result = await SupabaseBridge.updateAudit("audit-id", {
        status: "completed",
        results_json: { score: 95, details: "test" },
        score_global: 95,
      });
      expect(result).toEqual({ id: "test-id" });
    });
  });

  describe("getAuditByWebhookId", () => {
    it("should return null when audit not found", async () => {
      const result = await SupabaseBridge.getAuditByWebhookId("webhook-id");
      expect(result).toBeNull();
    });
  });

  describe("getMonthlyAuditCount", () => {
    it("should return 0 when no audits found", async () => {
      const result = await SupabaseBridge.getMonthlyAuditCount("user-id");
      expect(result).toBe(0);
    });

    it("should return count when supabase is not available", async () => {
      const result = await SupabaseBridge.getMonthlyAuditCount("user-id");
      expect(typeof result).toBe("number");
    });
  });

  describe("getUserSubscription", () => {
    it("should return null when no subscription found", async () => {
      const result =
        await SupabaseBridge.getUserSubscription("test@example.com");
      expect(result).toBeNull();
    });
  });

  describe("incrementQuotaUsed", () => {
    it("should increment quota successfully", async () => {
      const result = await SupabaseBridge.incrementQuotaUsed(
        "test@example.com",
        1,
      );
      expect(result).toBeDefined();
    });

    it("should use fallback when RPC fails", async () => {
      // Test du fallback en cas d'échec de la fonction RPC
      const result = await SupabaseBridge.incrementQuotaUsed(
        "test@example.com",
        2,
      );
      expect(result).toBeDefined();
    });
  });

  describe("getQuotaStatus", () => {
    it("should return default quotas for non-subscribers", async () => {
      // Mock getUserSubscription to return a mock subscription object instead of null
      const mockNonSubscriber = {
        user_id: "user-123",
        email: "newuser@example.com",
        stripe_customer_id: null,
        quota_used: 0,
        monthly_quota: 10,
        subscription_tier: "free",
        subscribed: false,
        quota_reset_date: "2025-01-01T00:00:00Z",
        subscription_end: "2024-12-31T23:59:59Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      vi.spyOn(SupabaseBridge, "getUserSubscription").mockResolvedValueOnce(
        mockNonSubscriber,
      );

      const result = await SupabaseBridge.getQuotaStatus("newuser@example.com");

      expect(result).toEqual({
        email: "newuser@example.com",
        quota_used: 0,
        monthly_quota: 10,
        quota_remaining: 10,
        subscription_tier: "free",
        subscribed: false,
        quota_exceeded: false,
      });
    });

    it("should return correct quota status for subscribers", async () => {
      const mockSubscription = {
        user_id: "user-123",
        email: "premium@example.com",
        stripe_customer_id: "cus_123",
        quota_used: 25,
        monthly_quota: 100,
        subscription_tier: "premium",
        subscribed: true,
        quota_reset_date: "2025-01-01T00:00:00Z",
        subscription_end: "2025-12-31T23:59:59Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      vi.spyOn(SupabaseBridge, "getUserSubscription").mockResolvedValueOnce(
        mockSubscription,
      );

      const result = await SupabaseBridge.getQuotaStatus("premium@example.com");

      expect(result).toEqual({
        email: "premium@example.com",
        quota_used: 25,
        monthly_quota: 100,
        quota_remaining: 75,
        subscription_tier: "premium",
        subscribed: true,
        quota_exceeded: false,
        quota_reset_date: "2025-01-01",
        subscription_end: "2025-12-31",
      });
    });

    it("should detect quota exceeded", async () => {
      const mockSubscription = {
        user_id: "user-123",
        email: "exceeded@example.com",
        stripe_customer_id: "cus_123",
        quota_used: 105,
        monthly_quota: 100,
        subscription_tier: "basic",
        subscribed: true,
        quota_reset_date: "2025-01-01T00:00:00Z",
        subscription_end: "2025-12-31T23:59:59Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      vi.spyOn(SupabaseBridge, "getUserSubscription").mockResolvedValueOnce(
        mockSubscription,
      );

      const result = await SupabaseBridge.getQuotaStatus(
        "exceeded@example.com",
      );

      expect(result.quota_exceeded).toBe(true);
      expect(result.quota_remaining).toBe(0);
    });
  });
});
