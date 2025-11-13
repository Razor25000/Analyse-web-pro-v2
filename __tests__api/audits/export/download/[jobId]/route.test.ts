import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/audits/export/download/[jobId]/route';
import { getRequiredUser } from '@/lib/auth/auth-user';
import { exportJobManager } from '@/lib/jobs/export-job-manager';
import { existsSync } from 'fs';

// Mock dependencies
vi.mock('@/lib/auth/auth-user');
vi.mock('@/lib/jobs/export-job-manager');
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  createReadStream: vi.fn()
}));

const mockGetRequiredUser = vi.mocked(getRequiredUser);
const mockExportJobManager = vi.mocked(exportJobManager);
const mockExistsSync = vi.mocked(existsSync);

describe('/api/audits/export/download/[jobId]/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    const mockParams = { params: { jobId: 'job123' } };

    it('should return error for unauthenticated users', async () => {
      mockGetRequiredUser.mockRejectedValue(new Error('Unauthorized'));

      const result = await GET({} as any, mockParams);

      expect(result.status).toBe(500);
      const data = await result.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent job', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };
      mockGetRequiredUser.mockResolvedValue(mockUser);
      mockExportJobManager.getJob.mockReturnValue(null);

      const result = await GET({} as any, mockParams);

      expect(result.status).toBe(404);
      const data = await result.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Export non trouvé ou expiré');
    });

    it('should return 403 for unauthorized user access', async () => {
      const mockUser = {
        id: 'different_user',
        email: 'different@example.com'
      };
      mockGetRequiredUser.mockResolvedValue(mockUser);

      const mockJob = {
        id: 'job123',
        userId: 'user123',
        config: { format: 'json', filters: {} },
        status: { phase: 'completed', progress: 100, message: 'Terminé' },
        zipPath: '/tmp/export.zip'
      };
      mockExportJobManager.getJob.mockReturnValue(mockJob);

      const result = await GET({} as any, mockParams);

      expect(result.status).toBe(403);
      const data = await result.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Non autorisé à accéder à cet export');
    });

    it('should return 400 for incomplete jobs', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };
      mockGetRequiredUser.mockResolvedValue(mockUser);

      const mockJob = {
        id: 'job123',
        userId: mockUser.id,
        config: { format: 'json', filters: {} },
        status: { phase: 'processing', progress: 50, message: 'En cours...' },
        zipPath: '/tmp/export.zip'
      };
      mockExportJobManager.getJob.mockReturnValue(mockJob);

      const result = await GET({} as any, mockParams);

      expect(result.status).toBe(400);
      const data = await result.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Export pas encore terminé');
      expect(data.phase).toBe('processing');
      expect(data.progress).toBe(50);
    });

    it('should return 404 when zip file does not exist', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };
      mockGetRequiredUser.mockResolvedValue(mockUser);

      const mockJob = {
        id: 'job123',
        userId: mockUser.id,
        config: { format: 'json', filters: {} },
        status: { phase: 'completed', progress: 100, message: 'Terminé' },
        zipPath: '/tmp/export.zip'
      };
      mockExportJobManager.getJob.mockReturnValue(mockJob);
      mockExistsSync.mockReturnValue(false);

      const result = await GET({} as any, mockParams);

      expect(result.status).toBe(404);
      const data = await result.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Fichier d\'export introuvable ou expiré');
    });

    it('should return 404 when zipPath is null', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };
      mockGetRequiredUser.mockResolvedValue(mockUser);

      const mockJob = {
        id: 'job123',
        userId: mockUser.id,
        config: { format: 'json', filters: {} },
        status: { phase: 'completed', progress: 100, message: 'Terminé' },
        zipPath: null
      };
      mockExportJobManager.getJob.mockReturnValue(mockJob);

      const result = await GET({} as any, mockParams);

      expect(result.status).toBe(404);
      const data = await result.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Fichier d\'export non disponible');
    });

    it('should return file stream for valid download', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };
      mockGetRequiredUser.mockResolvedValue(mockUser);

      const mockJob = {
        id: 'job123',
        userId: mockUser.id,
        config: { format: 'json', filters: {} },
        status: { phase: 'completed', progress: 100, message: 'Terminé' },
        zipPath: '/tmp/export.zip'
      };
      mockExportJobManager.getJob.mockReturnValue(mockJob);
      mockExistsSync.mockReturnValue(true);

      const result = await GET({} as any, mockParams);

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('application/zip');
      expect(result.headers.get('Content-Disposition')).toMatch(/attachment; filename=/);
      expect(result.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(result.headers.get('Pragma')).toBe('no-cache');
      expect(result.headers.get('Expires')).toBe('0');
    });

    it('should generate appropriate download filename', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };
      mockGetRequiredUser.mockResolvedValue(mockUser);

      const mockJob = {
        id: 'job123',
        userId: mockUser.id,
        config: { format: 'json', filters: {} },
        status: { phase: 'completed', progress: 100, message: 'Terminé' },
        zipPath: '/tmp/export.zip'
      };
      mockExportJobManager.getJob.mockReturnValue(mockJob);
      mockExistsSync.mockReturnValue(true);

      // Mock Date.now to return a consistent timestamp for testing
      const mockDate = new Date('2024-10-14T12:34:56.789Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = await GET({} as any, mockParams);

      expect(result.headers.get('Content-Disposition')).toBe(
        'attachment; filename="audits_export_job123_20241014123456.zip"'
      );
    });
  });
});