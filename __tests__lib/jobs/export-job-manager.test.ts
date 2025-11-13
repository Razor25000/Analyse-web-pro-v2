import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExportJobManager } from '@/lib/jobs/export-job-manager';
import fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises');

describe('ExportJobManager', () => {
  let exportManager: ExportJobManager;

  beforeEach(() => {
    exportManager = ExportJobManager.getInstance();
    exportManager.clearJobs(); // Clear any existing jobs for clean testing
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ExportJobManager.getInstance();
      const instance2 = ExportJobManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createExportJob', () => {
    it('should create job with required properties', async () => {
      const userId = 'user123';
      const config = {
        format: 'json' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      const job = await exportManager.createExportJob(userId, config);

      expect(job.id).toBeDefined();
      expect(job.id).toHaveLength(8); // UUID-like length
      expect(job.userId).toBe(userId);
      expect(job.config).toEqual(config);
      expect(job.status.phase).toBe('preparing');
      expect(job.status.progress).toBe(0);
      expect(job.status.message).toBe('Initialisation de l\'export...');
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.updatedAt).toBeInstanceOf(Date);
    });

    it('should start processing immediately', async () => {
      const userId = 'user123';
      const config = {
        format: 'html' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      const job = await exportManager.createExportJob(userId, config);

      // Wait a bit for the async processing to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedJob = exportManager.getJob(job.id);
      expect(updatedJob?.status.phase).not.toBe('preparing');
    });
  });

  describe('getJob', () => {
    it('should return null for non-existent job', () => {
      const job = exportManager.getJob('nonexistent');
      expect(job).toBeNull();
    });

    it('should return job for existing job', async () => {
      const userId = 'user123';
      const config = {
        format: 'json' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      const createdJob = await exportManager.createExportJob(userId, config);
      const retrievedJob = exportManager.getJob(createdJob.id);

      expect(retrievedJob).toEqual(createdJob);
    });
  });

  describe('getAllJobs', () => {
    it('should return empty array for no jobs', () => {
      const jobs = exportManager.getAllJobs();
      expect(jobs).toEqual([]);
    });

    it('should return all jobs', async () => {
      const userId = 'user123';
      const config = {
        format: 'json' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      const job1 = await exportManager.createExportJob(userId, config);
      const job2 = await exportManager.createExportJob(userId, { ...config, format: 'html' });

      const jobs = exportManager.getAllJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs).toContainEqual(job1);
      expect(jobs).toContainEqual(job2);
    });
  });

  describe('getUserJobs', () => {
    it('should return empty array for user with no jobs', () => {
      const jobs = exportManager.getUserJobs('nonexistent_user');
      expect(jobs).toEqual([]);
    });

    it('should return only user\'s jobs', async () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      const config = {
        format: 'json' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      const job1 = await exportManager.createExportJob(userId1, config);
      const job2 = await exportManager.createExportJob(userId2, config);

      const user1Jobs = exportManager.getUserJobs(userId1);
      const user2Jobs = exportManager.getUserJobs(userId2);

      expect(user1Jobs).toHaveLength(1);
      expect(user2Jobs).toHaveLength(1);
      expect(user1Jobs[0]).toEqual(job1);
      expect(user2Jobs[0]).toEqual(job2);
    });
  });

  describe('clearJobs', () => {
    it('should remove all jobs', async () => {
      const userId = 'user123';
      const config = {
        format: 'json' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      await exportManager.createExportJob(userId, config);
      await exportManager.createExportJob(userId, { ...config, format: 'html' });

      expect(exportManager.getAllJobs()).toHaveLength(2);

      exportManager.clearJobs();
      expect(exportManager.getAllJobs()).toHaveLength(0);
    });
  });

  describe('cleanupExpiredJobs', () => {
    it('should remove jobs older than 1 hour', async () => {
      const userId = 'user123';
      const config = {
        format: 'json' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      // Create a job
      const job = await exportManager.createExportJob(userId, config);

      // Mock the job as being older than 1 hour
      job.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      exportManager.cleanupExpiredJobs();

      expect(exportManager.getAllJobs()).toHaveLength(0);
    });

    it('should keep jobs younger than 1 hour', async () => {
      const userId = 'user123';
      const config = {
        format: 'json' as const,
        filters: {},
        includeMetadata: true,
        includeScreenshots: false
      };

      // Create a job
      const job = await exportManager.createExportJob(userId, config);

      // Mock the job as being 30 minutes old
      job.createdAt = new Date(Date.now() - 30 * 60 * 1000);

      exportManager.cleanupExpiredJobs();

      expect(exportManager.getAllJobs()).toHaveLength(1);
    });
  });
});