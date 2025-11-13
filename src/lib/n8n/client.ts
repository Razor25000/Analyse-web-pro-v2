// src/lib/n8n/client.ts
import { createHmac } from "crypto";
import { env } from "@/lib/env";

export type N8nSingleAuditPayload = {
  url: string;
  email: string;
  userId: string;
  orgSlug?: string;
  correlationId: string;
  planId: string;
};

export type AuditPayload = {
  id: string;
  webhookId: string;
  url: string;
  email: string;
  userId: string;
};

export type N8nBatchAuditPayload = {
  audits: AuditPayload[];
  userId: string;
  orgSlug?: string;
  batchName?: string;
  correlationId: string;
  planId: string;
};

export class N8nClient {
  private readonly baseUrl: string;
  private readonly singlePath: string;
  private readonly batchPath: string;
  private readonly webhookSecret: string;

  constructor() {
    this.baseUrl = env.N8N_WEBHOOK_BASE_URL.replace(/\/+$/, "");
    this.singlePath = env.N8N_SINGLE_AUDIT_PATH;
    this.batchPath = env.N8N_BATCH_AUDIT_PATH ?? "/webhook/batch-upload";
    this.webhookSecret = env.N8N_WEBHOOK_SECRET;
  }

  async triggerSingleAudit(payload: N8nSingleAuditPayload) {
    const webhookUrl = `${this.baseUrl}${this.singlePath}`;

    // CORRECTION : Ajouter email_client en plus du champ email existant
    const body = JSON.stringify({
      website_url: payload.url,
      url: payload.url,
      email: payload.email, // ← Garde le champ existant
      email_client: payload.email, // ← AJOUT pour compatibilité avec le workflow
      user_id: payload.userId,
      org_slug: payload.orgSlug,
      correlation_id: payload.correlationId,
      delivery_method: "dashboard",
      plan_id: payload.planId,
      source: "nowts",
    });

    const signature = this.hmac(body);

    console.log("🚀 n8n single:", {
      webhookUrl,
      planId: payload.planId,
      correlationId: payload.correlationId,
      email: payload.email, // Pour debug
    });

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-Signature": `sha256=${signature}`,
        "X-Correlation-ID": payload.correlationId,
      },
      body,
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error(
        `n8n webhook failed: ${res.status} ${res.statusText} – ${responseText}`,
      );
      throw new Error(`n8n webhook failed: ${res.status} ${res.statusText}`);
    }

    let result: unknown;
    try {
      result = responseText.trim() ? JSON.parse(responseText) : { ok: true };
    } catch {
      result = { ok: true, raw: responseText };
    }

    console.log("✅ n8n single OK:", result);

    return {
      success: true,
      correlationId: payload.correlationId,
      n8nResponse: result,
      webhookUsed: webhookUrl,
    };
  }

  async triggerBatchAudit(payload: N8nBatchAuditPayload) {
    const webhookUrl = `${this.baseUrl}${this.batchPath}`;

    const body = JSON.stringify({
      user_id: payload.userId,
      audits: payload.audits,
      batch_name: payload.batchName || `Batch ${new Date().toISOString()}`,
      org_slug: payload.orgSlug,
      correlation_id: payload.correlationId,
      delivery_method: "dashboard",
      plan_id: payload.planId,
      source: "nowts",
    });

    const signature = this.hmac(body);

    console.log("🚀 n8n batch:", {
      webhookUrl,
      planId: payload.planId,
      correlationId: payload.correlationId,
    });

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-Signature": `sha256=${signature}`,
        "X-Correlation-ID": payload.correlationId,
      },
      body,
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error(
        `n8n batch failed: ${res.status} ${res.statusText} – ${responseText}`,
      );
      throw new Error(`n8n batch failed: ${res.status} ${res.statusText}`);
    }

    let result: unknown;
    try {
      result = responseText.trim() ? JSON.parse(responseText) : { ok: true };
    } catch {
      result = { ok: true, raw: responseText };
    }

    console.log("✅ n8n batch OK:", result);

    return {
      success: true,
      correlationId: payload.correlationId,
      n8nResponse: result,
      webhookUsed: webhookUrl,
    };
  }

  private hmac(payload: string): string {
    return createHmac("sha256", this.webhookSecret)
      .update(payload, "utf8")
      .digest("hex");
  }
}

// exports
export const n8nClient = new N8nClient();
export default n8nClient;
