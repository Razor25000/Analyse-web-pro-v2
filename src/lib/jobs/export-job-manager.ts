import type { ExportConfig, ExportStatus } from "@/components/nowts/export-audit-modal";
import { join } from "path";
import { tmpdir } from "os";
import { unlink, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { auditToHtml, auditToJson, auditToCsv } from "./export-formatters";

export type ExportJob = {
  id: string;
  userId: string;
  config: ExportConfig;
  status: ExportStatus;
  progress: number;
  totalAudits: number;
  processedAudits: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  tempFiles: string[];
  zipPath?: string;
  downloadUrl?: string;
  tempDir?: string;
}

export class ExportJobManager {
  private readonly jobs = new Map<string, ExportJob>();
  private static instance: ExportJobManager;

  private constructor() {}

  static getInstance(): ExportJobManager {
    if (!ExportJobManager.instance) {
      ExportJobManager.instance = new ExportJobManager();
    }
    return ExportJobManager.instance;
  }

  // Create new export job
  async createExportJob(userId: string, config: ExportConfig): Promise<ExportJob> {
    const jobId = this.generateJobId();
    const job: ExportJob = {
      id: jobId,
      userId,
      config,
      status: {
        phase: "preparing",
        progress: 0,
        message: "Initialisation de l'export...",
      },
      progress: 0,
      totalAudits: 0,
      processedAudits: 0,
      startTime: new Date(),
      tempFiles: [],
    };

    this.jobs.set(jobId, job);

    // Start background processing
    this.processExportJob(jobId);

    return job;
  }

  // Get job by ID
  getJob(jobId: string): ExportJob | undefined {
    return this.jobs.get(jobId);
  }

  // Get all jobs for user
  getUserJobs(userId: string): ExportJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Update job status
  updateJobStatus(jobId: string, status: Partial<ExportStatus>, progress?: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = { ...job.status, ...status };
    if (progress !== undefined) {
      job.progress = progress;
    }

    // Log status update
    console.log(`📊 Job ${jobId}: ${status.phase} - ${progress || job.progress}% - ${status.message}`);
  }

  // Generate unique job ID
  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Process export job in background
  private async processExportJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Phase 1: Preparation
      await this.prepareExport(job);

      // Phase 2: Fetch data
      const audits = await this.fetchAuditData(job);
      job.totalAudits = audits.length;

      if (audits.length === 0) {
        this.updateJobStatus(jobId, {
          phase: "error",
          message: "Aucun audit trouvé avec les filtres spécifiés",
          error: "No audits found"
        });
        return;
      }

      // Phase 3: Process audits
      await this.processAudits(job, audits);

      // Phase 4: Create ZIP archive
      await this.createZipArchive(job);

      // Phase 5: Finalize
      await this.finalizeExport(job);

    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error);
      this.updateJobStatus(jobId, {
        phase: "error",
        message: "Erreur lors du traitement",
        error: error instanceof Error ? error.message : "Erreur inconnue"
      });
    }
  }

  // Phase 1: Preparation
  private async prepareExport(job: ExportJob): Promise<void> {
    this.updateJobStatus(job.id, {
      phase: "preparing",
      message: "Préparation des fichiers temporaires...",
    }, 5);

    // Create temporary directory with error handling
    const baseTempDir = tmpdir();
    job.tempDir = join(baseTempDir, `export_${job.id}`);

    try {
      await import('fs').then(fs => fs.promises.mkdir(job.tempDir!, { recursive: true }));
      console.log(`📁 Created temp directory: ${job.tempDir}`);
    } catch (mkdirError) {
      console.error(`❌ Failed to create temp directory: ${mkdirError}`);
      throw new Error(`Failed to create temporary directory: ${mkdirError instanceof Error ? mkdirError.message : 'Unknown error'}`);
    }
  }

  // Phase 2: Fetch data
  private async fetchAuditData(job: ExportJob): Promise<any[]> {
    this.updateJobStatus(job.id, {
      phase: "processing",
      message: "Récupération des données...",
    }, 10);

    const allAudits = await prisma.audit.findMany({
      where: {
        userId: job.userId,
      },
      select: {
        id: true,
        url: true,
        email: true,
        status: true,
        scoreGlobal: true,
        scorePerformance: true,
        scoreSeo: true,
        scoreSecurity: true,
        scoreModern: true,
        resultsJson: true,
        createdAt: true,
        completedAt: true,
        auditType: true,
        webhookId: true,
        htmlReport: true,
        userId: true,
        orgId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Apply filters
    return this.filterAudits(allAudits, job.config);
  }

  // Phase 3: Process audits
  private async processAudits(job: ExportJob, audits: any[]): Promise<void> {
    const tempFiles: string[] = [];

    for (let i = 0; i < audits.length; i++) {
      const audit = audits[i];

      this.updateJobStatus(job.id, {
        phase: "processing",
        message: `Traitement de l'audit ${i + 1}/${audits.length}`,
        currentFile: audit.url,
        processedAudits: i,
        totalAudits: audits.length,
      }, 10 + (i / audits.length) * 70);

      try {
        let content: string;
        let filename: string;

        switch (job.config.format) {
          case "html":
            content = auditToHtml(audit);
            filename = `audit_${audit.id.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
            break;

          case "json":
            content = auditToJson(audit, job.config);
            filename = `audit_${audit.id.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            break;

          case "csv":
            content = auditToCsv(audit);
            filename = `audit_${audit.id.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
            break;

          default:
            throw new Error(`Format non supporté: ${job.config.format}`);
        }

        const filePath = join(job.tempDir!, filename);
        await writeFile(filePath, content, 'utf8');
        tempFiles.push(filePath);

        console.log(`✅ Created file: ${filename} (${content.length} characters)`);

      } catch (fileError) {
        console.error(`❌ Error processing audit ${audit.id}:`, fileError);
        continue;
      }
    }

    job.tempFiles = tempFiles;
    job.processedAudits = tempFiles.length;
    console.log(`✅ Processed ${tempFiles.length} audit files successfully`);
  }

  // Phase 4: Create ZIP archive
  private async createZipArchive(job: ExportJob): Promise<void> {
    this.updateJobStatus(job.id, {
      phase: "packaging",
      message: "Création de l'archive ZIP...",
    }, 85);

    // Fix: Use a simpler ZIP filename without duplicate job ID
    job.zipPath = join(job.tempDir!, `audits_export.zip`);

    try {
      console.log(`📁 Starting ZIP creation for ${job.tempFiles.length} files`);
      console.log(`📂 Target ZIP path: ${job.zipPath}`);

      // Verify temp directory exists
      if (!existsSync(job.tempDir!)) {
        throw new Error(`Temporary directory does not exist: ${job.tempDir}`);
      }
      console.log(`✅ Temp directory exists: ${job.tempDir}`);

      // Create archive using JSZip (browser-compatible)
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      console.log(`✅ JSZip instance created`);

      // Add each temporary file to the archive
      let addedFiles = 0;
      for (const tempFile of job.tempFiles) {
        try {
          console.log(`📖 Reading file: ${tempFile}`);

          // Check if file exists before reading
          if (!existsSync(tempFile)) {
            console.warn(`⚠️ File does not exist: ${tempFile}`);
            continue;
          }

          const fileContent = await readFile(tempFile, 'utf8');
          const fileName = tempFile.split('/').pop() || 'file';
          console.log(`📋 Adding to ZIP: ${fileName} (${fileContent.length} bytes)`);

          zip.file(fileName, fileContent);
          addedFiles++;
        } catch (fileError) {
          console.error(`❌ Error reading file ${tempFile}:`, fileError);
          continue;
        }
      }

      console.log(`✅ Added ${addedFiles} files to ZIP`);

      // Generate the ZIP file
      console.log(`📦 Generating ZIP content...`);
      const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
      console.log(`✅ ZIP content generated (${zipContent.length} bytes)`);

      await writeFile(job.zipPath, zipContent);

      // Verify ZIP file was created
      if (existsSync(job.zipPath)) {
        const fs = await import('fs');
        const stats = fs.statSync(job.zipPath);
        console.log(`✅ ZIP archive created successfully: ${job.zipPath} (${stats.size} bytes)`);
      } else {
        throw new Error(`ZIP file was not created: ${job.zipPath}`);
      }
    } catch (zipError) {
      console.error(`❌ ZIP creation failed:`, zipError);
      throw new Error(`Failed to create ZIP archive: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`);
    }
  }

  // Phase 5: Finalize
  private async finalizeExport(job: ExportJob): Promise<void> {
    this.updateJobStatus(job.id, {
      phase: "completed",
      message: "Export terminé avec succès",
    }, 100);

    job.endTime = new Date();
    job.downloadUrl = `/api/audits/export/download/${job.id}`;

    // Schedule cleanup
    this.scheduleCleanup(job.id);
  }

  // Schedule cleanup of temporary files
  private scheduleCleanup(jobId: string): void {
    // Clean up after 10 minutes
    setTimeout(async () => {
      await this.cleanupJob(jobId);
    }, 600000);

    // Clean up after 30 minutes (more aggressive)
    setTimeout(async () => {
      await this.forceCleanupJob(jobId);
    }, 1800000);
  }

  // Clean up job and temporary files
  private async cleanupJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Clean up temporary files
      for (const tempFile of job.tempFiles) {
        try {
          if (existsSync(tempFile)) {
            await unlink(tempFile);
            console.log(`🗑️ Cleaned temp file: ${tempFile}`);
          }
        } catch (error) {
          console.error(`❌ Error cleaning file ${tempFile}:`, error);
        }
      }

      // Clean up ZIP file
      if (job.zipPath && existsSync(job.zipPath)) {
        await unlink(job.zipPath);
        console.log(`🗑️ Cleaned ZIP file: ${job.zipPath}`);
      }

      // Clean up temp directory
      if (job.tempDir && existsSync(job.tempDir!)) {
        try {
          const fs = await import('fs');
          await fs.promises.rm(job.tempDir!, { recursive: true, force: true });
          console.log(`🗑️ Cleaned temp directory: ${job.tempDir}`);
        } catch (dirError) {
          console.error(`❌ Error cleaning temp directory ${job.tempDir}:`, dirError);
        }
      }

      // Update job status to indicate files are cleaned
      if (job.status.phase === "completed") {
        job.status.message = "Export terminé avec succès (fichiers temporaires nettoyés)";
      }

    } catch (error) {
      console.error(`❌ Error during cleanup for job ${jobId}:`, error);
    }
  }

  // Force cleanup of job and all its files
  private async forceCleanupJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Remove from active jobs after delay
      this.jobs.delete(jobId);
      console.log(`🗑️ Removed job from active list: ${jobId}`);
    } catch (error) {
      console.error(`❌ Error removing job ${jobId}:`, error);
    }
  }

  // Filter audits according to configuration
  private filterAudits(audits: any[], config: ExportConfig): any[] {
    let filteredAudits = [...audits];

    // Filter by status
    if (config.filters?.status && config.filters.status.length > 0) {
      filteredAudits = filteredAudits.filter((audit: any) =>
        config.filters!.status!.includes(audit.status)
      );
    }

    // Filter by date range
    if (config.filters?.dateRange?.from || config.filters?.dateRange?.to) {
      const fromDate = config.filters.dateRange.from ? new Date(config.filters.dateRange.from) : null;
      const toDate = config.filters.dateRange.to ? new Date(config.filters.dateRange.to) : null;

      filteredAudits = filteredAudits.filter((audit: any) => {
        const auditDate = new Date(audit.createdAt);
        if (fromDate && auditDate < fromDate) return false;
        if (toDate && auditDate > toDate) return false;
        return true;
      });
    }

    // Filter by audit type
    if (config.filters?.auditType && config.filters.auditType.length > 0) {
      filteredAudits = filteredAudits.filter((audit: any) =>
        config.filters!.auditType!.includes(audit.auditType)
      );
    }

    // Filter by minimum score
    if (config.filters?.minScore !== undefined) {
      filteredAudits = filteredAudits.filter((audit: any) => {
        const score = audit.scores?.global || audit.scoreGlobal || 0;
        return score >= config.filters!.minScore!;
      });
    }

    return filteredAudits;
  }

  // Clean up old jobs (run periodically)
  cleanupOldJobs(maxAgeMinutes = 60): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - maxAgeMinutes * 60 * 1000);

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.startTime < cutoffTime) {
        this.forceCleanupJob(jobId);
      }
    }
  }

  // Clean up completed jobs that are old
  cleanupCompletedJobs(): void {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status.phase === "completed" && job.endTime) {
        // Keep completed jobs for 30 minutes, then force cleanup
        const ageInMinutes = (Date.now() - job.endTime.getTime()) / (60 * 1000);
        if (ageInMinutes > 30) {
          this.forceCleanupJob(jobId);
        }
      }
    }
  }
}

// Export singleton instance
export const exportJobManager = ExportJobManager.getInstance();

// Schedule periodic cleanup
setInterval(() => {
  exportJobManager.cleanupOldJobs();
  exportJobManager.cleanupCompletedJobs();
}, 5 * 60 * 1000); // Every 5 minutes