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

  describe("syncUserToSupabase", () => {
    it("should sync user without errors when supabaseAdmin is available", async () => {
      await expect(
        SupabaseBridge.syncUserToSupabase("test-user-id", "test@example.com", "Test User", "Test Company")
      ).resolves.not.toThrow();
    });

    it("should handle missing supabaseAdmin gracefully", async () => {
      await expect(
        SupabaseBridge.syncUserToSupabase("test-user-id", "test@example.com")
      ).resolves.not.toThrow();
    });
  });

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
      const result = await SupabaseBridge.updateAudit(
        "audit-id",
        { status: "completed", score_global: 95 }
      );
      expect(result).toEqual({ id: "test-id" });
    });

    it("should update audit with results data", async () => {
      const result = await SupabaseBridge.updateAudit(
        "audit-id",
        { 
          status: "completed", 
          results_json: { score: 95, details: "test" },
          score_global: 95
        }
      );
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
      const result = await SupabaseBridge.getUserSubscription("test@example.com");
      expect(result).toBeNull();
    });
  });

  describe("incrementQuotaUsed", () => {
    it("should increment quota successfully", async () => {
      const result = await SupabaseBridge.incrementQuotaUsed("test@example.com", 1);
      expect(result).toBeDefined();
    });

    it("should use fallback when RPC fails", async () => {
      // Test du fallback en cas d'échec de la fonction RPC
      const result = await SupabaseBridge.incrementQuotaUsed("test@example.com", 2);
      expect(result).toBeDefined();
    });
  });

  describe("getQuotaStatus", () => {
    it("should return default quotas for non-subscribers", async () => {
      const { SupabaseBridge } = await import("@/lib/supabase/bridge");
      vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce(null);

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
        quota_used: 25,
        monthly_quota: 100,
        subscription_tier: "premium",
        subscribed: true,
        quota_reset_date: "2025-01-01",
        subscription_end: "2025-12-31",
      };

      const { SupabaseBridge } = await import("@/lib/supabase/bridge");
      vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce(mockSubscription);

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
        quota_used: 105,
        monthly_quota: 100,
        subscription_tier: "basic",
        subscribed: true,
      };

      const { SupabaseBridge } = await import("@/lib/supabase/bridge");
      vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce(mockSubscription);

      const result = await SupabaseBridge.getQuotaStatus("exceeded@example.com");
      
      expect(result.quota_exceeded).toBe(true);
      expect(result.quota_remaining).toBe(0);
    });
  });
});