import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUser } from "@/lib/auth/auth-user";
import type { ExportConfig } from "@/components/nowts/export-audit-modal";
import { exportJobManager } from "@/lib/jobs/export-job-manager";

const exportRequestSchema = z.object({
  format: z.enum(["pdf", "html", "json", "csv"]),
  filters: z.object({
    status: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional(),
    auditType: z.array(z.string()).optional(),
    minScore: z.number().min(0).max(100).optional(),
  }).optional(),
  includeMetadata: z.boolean().default(true),
  includeScreenshots: z.boolean().default(false),
});

// Interface pour le suivi de progression via SSE
type ExportProgress = {
  type: "start" | "progress" | "complete" | "error";
  jobId: string;
  status?: {
    phase: "preparing" | "processing" | "packaging" | "completed" | "error";
    progress: number;
    message: string;
    totalAudits?: number;
    processedAudits?: number;
    currentFile?: string;
    error?: string;
  };
}

// Map pour suivre les clients SSE
const activeSSEConnections = new Map<string, {
  writer: any;
  userId: string;
  startTime: Date;
}>();

// Fonction pour envoyer des mises à jour via SSE
async function sendSSEUpdate(
  jobId: string,
  data: ExportProgress
) {
  const connection = activeSSEConnections.get(jobId);
  if (!connection) return;

  try {
    const encoder = new TextEncoder();
    const eventData = `data: ${JSON.stringify(data)}\n\n`;
    await connection.writer.write(encoder.encode(eventData));
  } catch (error) {
    console.error("❌ Erreur d'envoi SSE:", error);
    // Nettoyer la connexion en cas d'erreur
    activeSSEConnections.delete(jobId);
    connection.writer.close();
  }
}


export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 Début de l'export bulk`);

    // Vérifier l'authentification
    const user = await getRequiredUser();
    console.log(`👤 Utilisateur authentifié: ${user.id}`);

    // Parse and validate request body
    const body = await request.json();
    const parsedConfig = exportRequestSchema.parse(body);

    // Ensure filters object exists (ExportConfig requires it)
    const config: ExportConfig = {
      ...parsedConfig,
      filters: parsedConfig.filters || {},
    };
    console.log(`📋 Format d'export: ${config.format}`);

    // Create job using ExportJobManager
    const job = await exportJobManager.createExportJob(user.id, config);
    console.log(`🆔 Job créé via ExportJobManager: ${job.id}`);

    // Create SSE response for real-time progress tracking
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Send initial SSE message
    writer.write(encoder.encode('retry: 1000\n'));
    writer.write(encoder.encode(`data: ${  JSON.stringify({
      type: "start",
      jobId: job.id
    })  }\n\n`));

    // Store the SSE connection for updates
    activeSSEConnections.set(job.id, {
      writer: writer as any,
      userId: user.id,
      startTime: new Date(),
    });

    // Start monitoring job status and sending SSE updates
    monitorJobProgress(job.id);

    // Set up cleanup timeout
    setTimeout(() => {
      activeSSEConnections.delete(job.id);
      writer.close();
    }, 600000); // 10 minutes

    const response = new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    return response;

  } catch (error) {
    console.error("❌ Erreur lors de l'export:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
}

// Function to monitor job progress and send SSE updates
async function monitorJobProgress(jobId: string) {
  let lastStatus: any = null;

  const checkInterval = setInterval(async () => {
    try {
      const job = exportJobManager.getJob(jobId);
      if (!job) {
        clearInterval(checkInterval);
        await sendSSEUpdate(jobId, {
          type: "error",
          jobId,
          status: {
            phase: "error",
            progress: 0,
            message: "Job non trouvé",
            error: "Job not found in ExportJobManager"
          }
        });
        return;
      }

      // Send update if status changed
      if (JSON.stringify(job.status) !== JSON.stringify(lastStatus)) {
        await sendSSEUpdate(jobId, {
          type: "progress",
          jobId,
          status: job.status
        });
        lastStatus = { ...job.status };
      }

      // Stop monitoring if job is completed or failed
      if (job.status.phase === "completed") {
        clearInterval(checkInterval);
        await sendSSEUpdate(jobId, {
          type: "complete",
          jobId,
          status: job.status
        });
      } else if (job.status.phase === "error") {
        clearInterval(checkInterval);
        await sendSSEUpdate(jobId, {
          type: "error",
          jobId,
          status: job.status
        });
      }

    } catch (error) {
      console.error(`❌ Error monitoring job ${jobId}:`, error);
      clearInterval(checkInterval);
      await sendSSEUpdate(jobId, {
        type: "error",
        jobId,
        status: {
          phase: "error",
          progress: 0,
          message: "Erreur de monitoring",
          error: error instanceof Error ? error.message : "Monitoring error"
        }
      });
    }
  }, 1000); // Check every second

  // Clean up interval after 10 minutes max
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 600000);
}