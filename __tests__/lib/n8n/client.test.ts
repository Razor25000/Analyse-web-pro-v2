import { describe, it, expect, beforeEach, vi } from 'vitest';
import { N8nClient } from '@/lib/n8n/client';

// Mock the environment
vi.mock('@/lib/env', () => ({
  env: {
    N8N_BASE_URL: 'https://test-n8n.example.com',
    N8N_WEBHOOK_SECRET: 'test-secret-key'
  }
}));

describe('N8nClient', () => {
  let client: N8nClient;

  beforeEach(() => {
    client = new N8nClient();
  });

  describe('constructor', () => {
    it('should create instance with valid environment variables', () => {
      expect(client).toBeInstanceOf(N8nClient);
    });

    it('should throw error if N8N_BASE_URL is missing', () => {
      vi.doMock('@/lib/env', () => ({
        env: {
          N8N_BASE_URL: undefined,
          N8N_WEBHOOK_SECRET: 'test-secret'
        }
      }));

      expect(() => {
        // Force reimport to get the mocked env
        delete require.cache[require.resolve('@/lib/n8n/client')];
        const { N8nClient: TestClient } = require('@/lib/n8n/client');
        new TestClient();
      }).toThrow('N8N_BASE_URL environment variable is required');
    });

    it('should throw error if N8N_WEBHOOK_SECRET is missing', () => {
      vi.doMock('@/lib/env', () => ({
        env: {
          N8N_BASE_URL: 'https://test.com',
          N8N_WEBHOOK_SECRET: undefined
        }
      }));

      expect(() => {
        // Force reimport to get the mocked env
        delete require.cache[require.resolve('@/lib/n8n/client')];
        const { N8nClient: TestClient } = require('@/lib/n8n/client');
        new TestClient();
      }).toThrow('N8N_WEBHOOK_SECRET environment variable is required');
    });
  });

  describe('triggerSingleAudit', () => {
    it('should return simulation response for single audit', async () => {
      const payload = {
        url: 'https://example.com',
        email: 'test@example.com',
        userId: 'user-123',
        orgSlug: 'test-org',
        correlationId: 'corr-123'
      };

      const result = await client.triggerSingleAudit(payload);

      expect(result).toEqual({
        success: true,
        message: 'Audit single déclenché (simulé)',
        correlationId: 'corr-123'
      });
    });

    it('should handle errors in triggerSingleAudit', async () => {
      // Mock console.error to avoid output during test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a payload that will cause JSON.parse to fail
      const client = new N8nClient();
      
      // Mock the generateSignature method to throw an error
      vi.spyOn(client as any, 'generateSignature').mockImplementation(() => {
        throw new Error('Test error');
      });

      const payload = {
        url: 'https://example.com',
        email: 'test@example.com',
        userId: 'user-123',
        orgSlug: 'test-org',
        correlationId: 'corr-123'
      };

      await expect(client.triggerSingleAudit(payload)).rejects.toThrow('Test error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur trigger single audit:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('triggerBatchAudit', () => {
    it('should return simulation response for batch audit', async () => {
      const payload = {
        csvData: 'url,email\nhttps://example1.com,test1@example.com\nhttps://example2.com,test2@example.com',
        userId: 'user-123',
        orgSlug: 'test-org',
        correlationId: 'batch-corr-123'
      };

      const result = await client.triggerBatchAudit(payload);

      expect(result).toEqual({
        success: true,
        message: 'Audit batch déclenché (simulé)',
        correlationId: 'batch-corr-123'
      });
    });

    it('should use default batch name when not provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const payload = {
        csvData: 'url,email\nhttps://example.com,test@example.com',
        userId: 'user-123',
        orgSlug: 'test-org',
        correlationId: 'batch-corr-123'
      };

      await client.triggerBatchAudit(payload);

      // Check that console.log was called with payload containing default batch name
      expect(consoleSpy).toHaveBeenCalledWith(
        '📝 Simulation - Payload envoyé à n8n:',
        expect.objectContaining({
          batch_name: expect.stringMatching(/^Batch \d{4}-\d{2}-\d{2}T/)
        })
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors in triggerBatchAudit', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      vi.spyOn(JSON, 'stringify').mockImplementation(() => {
        throw new Error('JSON stringify error');
      });

      const payload = {
        csvData: 'test',
        userId: 'user-123',
        orgSlug: 'test-org',
        correlationId: 'batch-corr-123'
      };

      await expect(client.triggerBatchAudit(payload)).rejects.toThrow('JSON stringify error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur trigger batch audit:', expect.any(Error));
      
      // Restore mocks
      JSON.stringify = originalStringify;
      consoleErrorSpy.mockRestore();
    });
  });
});