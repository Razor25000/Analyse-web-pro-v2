import { describe, it, expect, vi } from 'vitest';

describe('/api/audits/export/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to make API requests
  async function apiRequest(endpoint: string, options: any = {}) {
    const url = `http://localhost:3000${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json().catch(() => null);
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    };
  }

  describe('POST', () => {
    it('should validate export format', async () => {
      const requestData = {
        format: 'invalid_format',
        filters: {}
      };

      const response = await apiRequest('/api/audits/export', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Données invalides');
    });

    it('should accept valid export formats', async () => {
      const validFormats = ['pdf', 'html', 'json', 'csv'];

      for (const format of validFormats) {
        const requestData = {
          format,
          filters: {},
          includeMetadata: true,
          includeScreenshots: false
        };

        const response = await apiRequest('/api/audits/export', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(200);
        expect(response.data.type).toBe('start');
        expect(response.data.jobId).toBeDefined();
        expect(response.data.jobId).toMatch(/^test-job-[a-z0-9]+$/);
      }
    });

    it('should handle requests with filters', async () => {
      const requestData = {
        format: 'html',
        filters: {
          status: ['completed'],
          dateRange: { from: '2024-01-01', to: '2024-12-31' }
        },
        includeMetadata: true,
        includeScreenshots: true
      };

      const response = await apiRequest('/api/audits/export', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(200);
      expect(response.data.type).toBe('start');
      expect(response.data.jobId).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      const response = await apiRequest('/api/audits/export', {
        method: 'POST',
        body: 'invalid json string',
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('JSON invalide');
    });

    it('should return appropriate headers for SSE response', async () => {
      const requestData = {
        format: 'json',
        filters: {}
      };

      const response = await apiRequest('/api/audits/export', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('text/event-stream');
      expect(response.headers['Cache-Control']).toBe('no-cache');
      expect(response.headers['Connection']).toBe('keep-alive');
    });
  });
});