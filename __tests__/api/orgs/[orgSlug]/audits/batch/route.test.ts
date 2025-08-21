import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../../../../app/api/orgs/[orgSlug]/audits/batch/route";
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
        email: "test@example.com",
        status: "pending",
      })
    ),
    incrementQuotaUsed: vi.fn(async () => Promise.resolve()),
  },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-batch-id"),
}));

const validCsvData = `url,email,company
example.com,contact@example.com,Example Corp
test.com,info@test.com,Test Inc
demo.org,hello@demo.org,Demo Org`;

describe("POST /api/orgs/[orgSlug]/audits/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create batch audit successfully with valid CSV data", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: validCsvData,
        batchName: "Test Batch",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: "Batch démarré avec succès",
      batchId: "batch_test-batch-id",
      totalProspects: 3,
      estimatedTime: "6 minutes",
      audits: expect.arrayContaining([
        expect.objectContaining({
          id: "test-audit-id",
          status: "pending"
        })
      ]),
      quota: {
        used: 8,
        total: 100,
        remaining: 92,
      },
      subscription: {
        tier: "basic",
        subscribed: true,
      },
    });
  });

  it("should reject CSV without URL column", async () => {
    const invalidCsvData = `name,email,company
John,john@example.com,Example Corp`;

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: invalidCsvData,
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Colonne "url" manquante dans le CSV');
  });

  it("should reject CSV data that's too short", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: "short",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Données invalides");
    expect(data.details).toBeDefined();
  });

  it("should return 429 when quota would be exceeded", async () => {
    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce({
      monthly_quota: 10,
      quota_used: 9,
      subscription_tier: "free",
      subscribed: false,
    });

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: validCsvData,
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Quota mensuel dépassé");
    expect(data.quota).toBe(10);
    expect(data.used).toBe(9);
    expect(data.requested).toBe(3);
    expect(data.available).toBe(1);
  });

  it("should handle CSV with missing email fields", async () => {
    const csvDataMissingEmails = `url,company
example.com,Example Corp
test.com,Test Inc`;

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: csvDataMissingEmails,
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalProspects).toBe(2);
    expect(data.success).toBe(true);
  });

  it("should add https protocol to URLs without protocol", async () => {
    const csvDataNoProtocol = `url,email
example.com,contact@example.com
https://test.com,info@test.com`;

    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    const createAuditSpy = vi.mocked(SupabaseBridge.createAudit);

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: csvDataNoProtocol,
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });

    expect(response.status).toBe(200);
    
    // Check that URLs were properly formatted
    expect(createAuditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
      })
    );
    expect(createAuditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://test.com",
      })
    );
  });

  it("should limit processing to 50 prospects maximum", async () => {
    // Create CSV with more than 50 rows
    const headers = "url,email\n";
    const rows = Array.from({ length: 60 }, (_, i) => 
      `example${i}.com,contact${i}@example${i}.com`
    ).join("\n");
    const largeCsvData = headers + rows;

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: largeCsvData,
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalProspects).toBe(50); // Should be limited to 50
  });

  it("should return 404 when org slug doesn't match", async () => {
    const request = new NextRequest("http://localhost:3000/api/orgs/wrong-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: validCsvData,
      }),
    });

    const params = { orgSlug: "wrong-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Organisation non trouvée");
  });

  it("should handle premium subscription with higher quota", async () => {
    const { SupabaseBridge } = await import("@/lib/supabase/bridge");
    vi.mocked(SupabaseBridge.getUserSubscription).mockResolvedValueOnce({
      monthly_quota: 1000,
      quota_used: 50,
      subscription_tier: "premium",
      subscribed: true,
    });

    const request = new NextRequest("http://localhost:3000/api/orgs/test-org/audits/batch", {
      method: "POST",
      body: JSON.stringify({
        csvData: validCsvData,
        batchName: "Premium Batch",
      }),
    });

    const params = { orgSlug: "test-org" };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quota).toEqual({
      used: 53,
      total: 1000,
      remaining: 947,
    });
    expect(data.subscription).toEqual({
      tier: "premium",
      subscribed: true,
    });
  });
});