import { createHmac } from 'crypto';
import { env } from '@/lib/env';

export interface N8nSingleAuditPayload {
  url: string;
  email: string;
  userId: string;
  orgSlug: string;
  correlationId: string;
}

export interface N8nBatchAuditPayload {
  csvData: string;
  userId: string;
  orgSlug: string;
  batchName?: string;
  correlationId: string;
}

export class N8nClient {
  private baseUrl: string;
  private webhookSecret: string;

  constructor() {
    if (!env.N8N_BASE_URL) {
      throw new Error('N8N_BASE_URL environment variable is required');
    }
    if (!env.N8N_WEBHOOK_SECRET) {
      throw new Error('N8N_WEBHOOK_SECRET environment variable is required');
    }
    
    this.baseUrl = env.N8N_BASE_URL;
    this.webhookSecret = env.N8N_WEBHOOK_SECRET;
  }

  // Générer une signature HMAC
  private generateSignature(payload: string): string {
    return createHmac('sha256', this.webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  // Déclencher un audit single (Formulaire Offre 1)
  async triggerSingleAudit(payload: N8nSingleAuditPayload) {
    try {
      const webhookUrl = `${this.baseUrl}/webhook/formulaire-offre-1`;
      const body = JSON.stringify({
        url: payload.url,
        email: payload.email,
        user_id: payload.userId,
        org_slug: payload.orgSlug,
        correlation_id: payload.correlationId,
        delivery_method: 'dashboard',
      });

      const signature = this.generateSignature(body);

      console.log('🚀 Déclenchement single audit n8n:', {
        webhookUrl,
        correlationId: payload.correlationId
      });

      // Pour l'instant, on simule l'appel
      console.log('📝 Simulation - Payload envoyé à n8n:', JSON.parse(body));
      
      return {
        success: true,
        message: 'Audit single déclenché (simulé)',
        correlationId: payload.correlationId
      };

      // Quand tu seras prêt, décommente ce code pour l'appel réel :
      /*
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Signature': `sha256=${signature}`,
          'X-Correlation-ID': payload.correlationId,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.statusText}`);
      }

      return await response.json();
      */

    } catch (error) {
      console.error('Erreur trigger single audit:', error);
      throw error;
    }
  }

  // Déclencher un audit batch (Aiguilleur)
  async triggerBatchAudit(payload: N8nBatchAuditPayload) {
    try {
      const webhookUrl = `${this.baseUrl}/webhook/batch-upload`;
      const body = JSON.stringify({
        user_id: payload.userId,
        csv_data: payload.csvData,
        batch_name: payload.batchName || `Batch ${new Date().toISOString()}`,
        org_slug: payload.orgSlug,
        correlation_id: payload.correlationId,
        delivery_method: 'dashboard',
      });

      console.log('🚀 Déclenchement batch audit n8n:', {
        webhookUrl,
        correlationId: payload.correlationId,
        csvLines: payload.csvData.split('\n').length
      });

      // Simulation pour l'instant
      console.log('📝 Simulation - Payload envoyé à n8n:', JSON.parse(body));
      
      return {
        success: true,
        message: 'Audit batch déclenché (simulé)',
        correlationId: payload.correlationId
      };

    } catch (error) {
      console.error('Erreur trigger batch audit:', error);
      throw error;
    }
  }
}

// Instance singleton
export const n8nClient = new N8nClient();