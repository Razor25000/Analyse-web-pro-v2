import { describe, it, expect, vi } from 'vitest';

describe('/api/audits/export/status/[jobId]/route', () => {
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

  describe('GET', () => {
    it('should return 404 for non-existent job', async () => {
      const response = await apiRequest('/api/audits/export/status/non-existent', {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Export non trouvé ou expiré');
    });

    it('should return job status for completed job', async () => {
      const response = await apiRequest('/api/audits/export/status/completed-job', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.job).toBeDefined();
      expect(response.data.job.id).toBe('completed-job');
      expect(response.data.job.status.phase).toBe('completed');
      expect(response.data.job.status.progress).toBe(100);
      expect(response.data.job.status.message).toBe('Terminé avec succès');
      expect(response.data.job.zipPath).toBe('/tmp/export.zip');
    });

    it('should return job status for job in progress', async () => {
      const response = await apiRequest('/api/audits/export/status/in-progress', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.job).toBeDefined();
      expect(response.data.job.id).toBe('in-progress');
      expect(response.data.job.status.phase).toBe('processing');
      expect(response.data.job.status.progress).toBe(50);
      expect(response.data.job.status.message).toBe('En cours...');
    });

    it('should handle different job IDs', async () => {
      const jobIds = ['job-1', 'job-2', 'job-abc123', 'job-test'];

      for (const jobId of jobIds) {
        const response = await apiRequest(`/api/audits/export/status/${jobId}`, {
          method: 'GET',
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.job.id).toBe(jobId);
        expect(response.data.job.status.phase).toBe('completed');
        expect(response.data.job.status.progress).toBe(100);
      }
    });

    it('should return consistent response structure', async () => {
      const response = await apiRequest('/api/audits/export/status/test-job', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('job');
      expect(response.data.job).toHaveProperty('id', 'test-job');
      expect(response.data.job).toHaveProperty('userId', 'test-user-id');
      expect(response.data.job).toHaveProperty('config');
      expect(response.data.job).toHaveProperty('status');
      expect(response.data.job).toHaveProperty('zipPath');
    });

    it('should handle malformed job IDs', async () => {
      const response = await apiRequest('/api/audits/export/status/', {
        method: 'GET',
      });

      // Should return default completed job response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });
});