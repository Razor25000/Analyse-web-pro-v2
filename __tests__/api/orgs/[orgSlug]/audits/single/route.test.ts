import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../../../../app/api/orgs/[orgSlug]/audits/single/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth/auth-user", () => ({
  getRequiredUser: vi.fn(async () => Promise.resolve({ id: "test-user-id" })),
}));

// Create a mock org object that matches the expected type
const mockOrg = {
  id: "test-org-id",
  slug: "test-org",
  name: "Test Organization",
  user: {
    id: "test-user-id",
    email: "test@example.com",
    emailVerified: true,
    name: "Test User",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  email: "test@example.com",
  memberRoles: ["member" as const],
  subscription: null,
  members: [],
  invitations: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: null,
};

vi.mock("@/lib/organizations/get-org", () => ({
  getCurrentOrg: vi.fn(async () => Promise.resolve(mockOrg)),
}));

vi.mock("@/lib/supabase/bridge", () => ({
  SupabaseBridge: {
    getUserSubscription: vi.fn(async () => 
      Promise.resolve({
        monthly_quota: 100,
        quota_used: 5,
        subscription_tier: "basic",
        subscribed: true,
      })
    ),
    syncUserToSupabase: vi.fn(async () => Promise.resolve()),
    createAudit: vi.fn(async () =>
      Promise.resolve({
        id: "test-audit-id",
        webhook_id: "test-webhook-id",
      })
    ),
    incrementQuotaUsed: vi.fn(async () => Promise.resolve()),
  },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-webhook-id"),
}));

describe("POST /api/orgs/[orgSlug]/audits/single", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create audit successfully with valid data", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/single", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com",
        email: "test@example.com",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: "Audit démarré avec succès",
      auditId: "test-audit-id",
      webhookId: "test-webhook-id",
      estimatedTime: "2-3 minutes",
      quota: {
        used: 6,
        total: 100,
        remaining: 94,
      },
      subscription: {
        tier: "basic",
        subscribed: true,
      },
    });
  });

  it("should reject invalid URL", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/single", {
      method: "POST",
      body: JSON.stringify({
        url: "invalid-url",
        email: "test@example.com",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Données invalides");
    expect(data.details).toBeDefined();
  });

  it("should reject invalid email", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/single", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com",
        email: "invalid-email",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Données invalides");
    expect(data.details).toBeDefined();
  });

  it("should return 429 when quota exceeded", async () => {
    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce({
      monthly_quota: 10,
      quota_used: 10,
      subscription_tier: "free",
      subscribed: false,
    });

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/single", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com",
        email: "test@example.com",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Quota mensuel dépassé");
    expect(data.quota).toBe(10);
    expect(data.used).toBe(10);
  });

  it("should handle subscription with available quota", async () => {
    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce({
      monthly_quota: 1000,
      quota_used: 50,
      subscription_tier: "premium",
      subscribed: true,
    });

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/single", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com",
        email: "test@example.com",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quota).toEqual({
      used: 51,
      total: 1000,
      remaining: 949,
    });
    expect(data.subscription).toEqual({
      tier: "premium",
      subscribed: true,
    });
  });
});