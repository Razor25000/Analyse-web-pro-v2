import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../../../../../app/api/orgs/[orgSlug]/audits/status/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth/auth-user", () => ({
  getRequiredUser: vi.fn(async () => Promise.resolve({ 
    id: "test-user-id", 
    email: "test@example.com", 
    name: "Test User" 
  })),
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

// Mock audit data
const mockAudits = [
  {
    id: "audit-1",
    url: "https://example.com",
    email: "test1@example.com",
    status: "completed",
    score_global: 85,
    created_at: "2024-01-15T10:00:00Z",
    completed_at: "2024-01-15T10:05:00Z",
    delivery_method: "email",
    audit_type: "manual",
    webhook_id: "webhook-1",
  },
  {
    id: "audit-2", 
    url: "https://test.com",
    email: "test2@example.com",
    status: "processing",
    score_global: null,
    created_at: "2024-01-15T11:00:00Z",
    completed_at: null,
    delivery_method: "dashboard",
    audit_type: "bulk",
    webhook_id: "batch_abc123_webhook",
  },
  {
    id: "audit-3",
    url: "https://demo.com", 
    email: "test3@example.com",
    status: "failed",
    score_global: null,
    created_at: "2024-01-15T12:00:00Z",
    completed_at: null,
    delivery_method: "email",
    audit_type: "manual",
    webhook_id: "webhook-3",
  },
  {
    id: "audit-4",
    url: "https://pending.com",
    email: "test4@example.com", 
    status: "pending",
    score_global: null,
    created_at: "2024-01-15T13:00:00Z",
    completed_at: null,
    delivery_method: null,
    audit_type: "bulk",
    webhook_id: "batch_def456_webhook",
  }
];

vi.mock("@/lib/supabase/bridge", () => ({
  SupabaseBridge: {
    getOrgAudits: vi.fn(async () => Promise.resolve(mockAudits)),
    getUserSubscription: vi.fn(async () => 
      Promise.resolve({
        monthly_quota: 100,
        quota_used: 15,
        subscription_tier: "basic",
        subscribed: true,
      })
    ),
  },
}));

describe("GET /api/orgs/[orgSlug]/audits/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return audit status successfully", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "test-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      audits: expect.arrayContaining([
        expect.objectContaining({
          id: "audit-1",
          url: "https://example.com",
          email: "test1@example.com",
          status: "completed",
          score: 85,
          auditType: "manual",
          batchId: null,
        }),
        expect.objectContaining({
          id: "audit-2",
          url: "https://test.com", 
          email: "test2@example.com",
          status: "processing",
          score: null,
          auditType: "bulk",
          batchId: "abc123",
        }),
      ]),
      stats: {
        total: 4,
        completed: 1,
        processing: 1,
        failed: 1,
        pending: 1,
      },
      quota: {
        used: 15,
        total: 100,
        remaining: 85,
        subscription_tier: "basic",
      },
      organization: {
        id: "test-org-id",
        slug: "test-org",
        name: "Test Organization",
      },
      meta: expect.objectContaining({
        total_audits: 4,
        user_id: "test-user-id",
        timestamp: expect.any(String),
      }),
    });
  });

  it("should handle empty audit list", async () => {
    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getOrgAudits).mockResolvedValueOnce([]);

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "test-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.audits).toEqual([]);
    expect(data.stats).toEqual({
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      pending: 0,
    });
  });

  it("should return 404 when organization not found", async () => {
    const { getCurrentOrg } = await import("@/lib/organizations/get-org");
    vi.mocked(getCurrentOrg).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/orgs/wrong-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "wrong-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Organisation non trouvée");
  });

  it("should return 404 when org slug doesn't match", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/wrong-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "wrong-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Organisation non trouvée");
  });

  it("should handle different audit statuses correctly", async () => {
    const customAudits = [
      { ...mockAudits[0], status: "succeeded" },
      { ...mockAudits[1], status: "running" },
      { ...mockAudits[2], status: "error" },
      { ...mockAudits[3], status: "starting" },
      { ...mockAudits[0], id: "audit-5", status: "Terminé" },
      { ...mockAudits[1], id: "audit-6", status: "en cours" },
    ];

    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getOrgAudits).mockResolvedValueOnce(customAudits);

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "test-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toEqual({
      total: 6,
      completed: 2, // "succeeded" and "Terminé"
      processing: 2, // "running" and "en cours"
      failed: 1, // "error"
      pending: 1, // "starting"
    });
  });

  it("should extract batch IDs correctly", async () => {
    const batchAudits = [
      { ...mockAudits[0], webhook_id: "batch_abc123_sub1" },
      { ...mockAudits[1], webhook_id: "batch_def456_sub2" },
      { ...mockAudits[2], webhook_id: "regular_webhook_id" },
    ];

    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getOrgAudits).mockResolvedValueOnce(batchAudits);

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "test-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.audits[0].batchId).toBe("abc123");
    expect(data.audits[1].batchId).toBe("def456");
    expect(data.audits[2].batchId).toBe(null);
  });

  it("should handle free subscription users", async () => {
    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "test-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quota).toEqual({
      used: 0,
      total: 10,
      remaining: 10,
      subscription_tier: "free",
    });
  });

  it("should handle database errors gracefully", async () => {
    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getOrgAudits).mockRejectedValueOnce(
      new Error("Database connection failed")
    );

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "test-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Erreur interne du serveur",
      success: false,
      timestamp: expect.any(String),
    });
  });

  it("should include proper timestamps and metadata", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/status", {
      method: "GET",
    });

    const params = { orgSlug: "test-org" };
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.meta).toEqual({
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
      total_audits: 4,
      user_id: "test-user-id",
    });
  });
});