import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { createReadStream, existsSync } from "fs";
import { exportJobManager } from "@/lib/jobs/export-job-manager";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Vérifier l'authentification
    const user = await getRequiredUser();
    console.log(`🔍 Vérification du téléchargement pour le job ${jobId} par l'utilisateur ${user.id}`);

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

    // Vérifier que l'export est terminé avec succès
    if (job.status.phase !== "completed") {
      return NextResponse.json(
        {
          success: false,
          error: "Export pas encore terminé",
          phase: job.status.phase,
          progress: job.progress,
          message: job.status.message,
        },
        { status: 400 }
      );
    }

    // Vérifier que le fichier ZIP existe
    if (!job.zipPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Fichier d'export non disponible",
        },
        { status: 404 }
      );
    }

    if (!existsSync(job.zipPath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Fichier d'export introuvable ou expiré",
        },
        { status: 404 }
      );
    }

    console.log(`📁 Téléchargement du fichier: ${job.zipPath}`);

    // Créer le nom de fichier pour le téléchargement
    const timestamp = new Date().toISOString().slice(0, 10).replace(/[-:]/g, '');
    const downloadFilename = `audits_export_${jobId}_${timestamp}.zip`;

    // Préparer les en-têtes pour le téléchargement
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${downloadFilename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    // Créer un flux de lecture du fichier
    const fileStream = createReadStream(job.zipPath);

    // Stream le fichier au client
    const response = new NextResponse(fileStream as any, {
      headers,
    });

    // Note: Cleanup is handled by ExportJobManager's internal cleanup mechanism
    // The job will be automatically cleaned up after the configured time

    return response;

  } catch (error) {
    console.error("❌ Erreur lors du téléchargement:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}