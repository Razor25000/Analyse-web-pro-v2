import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { exportJobManager } from "@/lib/jobs/export-job-manager";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Vérifier l'authentification
    const user = await getRequiredUser();
    console.log(`🔍 Vérification du statut pour le job ${jobId} par l'utilisateur ${user.id}`);

    // Vérifier si le job existe via ExportJobManager
    const job = exportJobManager.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "Export non trouvé ou expiré",
        },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est bien le propriétaire du job
    if (job.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Non autorisé à accéder à cet export",
        },
        { status: 403 }
      );
    }

    // Retourner le statut actuel
    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: job.status,
        config: job.config,
        startTime: job.startTime,
        endTime: job.endTime,
        progress: job.progress,
        totalAudits: job.totalAudits,
        processedAudits: job.processedAudits,
        downloadUrl: job.downloadUrl,
        error: job.error,
      },
    });

  } catch (error) {
    console.error("❌ Erreur lors de la vérification du statut:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}