import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the environment
vi.mock("@/lib/env", () => ({
  env: {
    N8N_WEBHOOK_BASE_URL: "https://test-n8n.example.com",
    N8N_SINGLE_AUDIT_PATH: "/webhook/formulaire-offre-gratuite",
    N8N_BATCH_AUDIT_PATH: "/webhook/batch-upload",
    N8N_WEBHOOK_SECRET: "test-secret-key",
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("N8nClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should throw error if N8N_WEBHOOK_BASE_URL is missing", async () => {
    vi.doMock("@/lib/env", () => ({
      env: {
        N8N_WEBHOOK_BASE_URL: undefined,
        N8N_SINGLE_AUDIT_PATH: "/webhook/formulaire-offre-gratuite",
        N8N_BATCH_AUDIT_PATH: "/webhook/batch-upload",
        N8N_WEBHOOK_SECRET: "test-secret",
      },
    }));

    const { N8nClient: TestClient } = await import("@/lib/n8n/client");

    expect(() => {
      const _client = new TestClient();
      return _client;
    }).toThrow("N8N_WEBHOOK_BASE_URL environment variable is required");
  });

  it("should throw error if N8N_WEBHOOK_SECRET is missing", async () => {
    vi.doMock("@/lib/env", () => ({
      env: {
        N8N_WEBHOOK_BASE_URL: "https://test-n8n.example.com",
        N8N_SINGLE_AUDIT_PATH: "/webhook/formulaire-offre-gratuite",
        N8N_BATCH_AUDIT_PATH: "/webhook/batch-upload",
        N8N_WEBHOOK_SECRET: undefined,
      },
    }));

    const { N8nClient: TestClient } = await import("@/lib/n8n/client");

    expect(() => {
      const _client = new TestClient();
      return _client;
    }).toThrow("N8N_WEBHOOK_SECRET environment variable is required");
  });

  describe("triggerSingleAudit", () => {
    it("should successfully trigger a single audit", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: "Audit triggered" }),
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const { N8nClient } = await import("@/lib/n8n/client");
      const client = new N8nClient();

      const result = await client.triggerSingleAudit({
        url: "https://example.com",
        email: "test@example.com",
        userId: "user-123",
        planId: "free",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-n8n.example.com/webhook/formulaire-offre-gratuite",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Secret": "test-secret-key",
          }),
        }),
      );

      expect(result).toEqual({
        success: true,
        webhookUsed:
          "https://test-n8n.example.com/webhook/formulaire-offre-gratuite",
      });
    });

    it("should handle fetch errors gracefully", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const { N8nClient } = await import("@/lib/n8n/client");
      const client = new N8nClient();

      await expect(
        client.triggerSingleAudit({
          url: "https://example.com",
          email: "test@example.com",
          userId: "user-123",
          planId: "free",
        }),
      ).rejects.toThrow("Network error");
    });

    it("should handle non-200 responses", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const { N8nClient } = await import("@/lib/n8n/client");
      const client = new N8nClient();

      await expect(
        client.triggerSingleAudit({
          url: "https://example.com",
          email: "test@example.com",
          userId: "user-123",
          planId: "free",
        }),
      ).rejects.toThrow();
    });
  });

  describe("triggerBatchAudit", () => {
    it("should successfully trigger a batch audit", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: "Batch triggered" }),
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const { N8nClient } = await import("@/lib/n8n/client");
      const client = new N8nClient();

      const result = await client.triggerBatchAudit({
        csvData: "url,email\nhttps://example.com,test@example.com",
        userId: "user-123",
        batchName: "Test Batch",
        correlationId: "batch-123",
        planId: "premium",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-n8n.example.com/webhook/batch-upload",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Secret": "test-secret-key",
          }),
        }),
      );

      expect(result).toEqual({
        success: true,
        webhookUsed: "https://test-n8n.example.com/webhook/batch-upload",
      });
    });

    it("should handle fetch errors gracefully", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const { N8nClient } = await import("@/lib/n8n/client");
      const client = new N8nClient();

      await expect(
        client.triggerBatchAudit({
          csvData: "url,email\nhttps://example.com,test@example.com",
          userId: "user-123",
          batchName: "Test Batch",
          correlationId: "batch-123",
          planId: "premium",
        }),
      ).rejects.toThrow("Network error");
    });
  });
});
