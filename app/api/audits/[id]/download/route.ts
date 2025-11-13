import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🔍 Demande de téléchargement pour l'audit ${id}`);

    // Vérifier l'authentification
    const user = await getRequiredUser();
    console.log(`👤 Utilisateur authentifié: ${user.id}`);

    // Vérifier que l'audit existe et appartient à l'utilisateur
    const audit = await prisma.audit.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
      select: {
        id: true,
        htmlReport: true,
        url: true,
        status: true,
      },
    });

    if (!audit) {
      console.log(`❌ Audit ${id} non trouvé ou non autorisé pour l'utilisateur ${user.id}`);
      return NextResponse.json(
        { error: "Audit non trouvé" },
        { status: 404 }
      );
    }

    if (!audit.htmlReport) {
      console.log(`❌ Audit ${id} n'a pas de rapport HTML disponible`);
      return NextResponse.json(
        { error: "Aucun rapport disponible pour cet audit" },
        { status: 404 }
      );
    }

    console.log(`✅ Envoi du rapport HTML pour l'audit ${id}`);

    // Retourner le contenu HTML directement avec les bons headers
    return new NextResponse(audit.htmlReport, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-${audit.url.replace(/[^a-zA-Z0-9]/g, '-')}.html"`,
      },
    });

  } catch (error) {
    console.error("❌ Erreur lors du téléchargement de l'audit:", error);
    console.error("❌ Type d'erreur:", error instanceof Error ? error.constructor.name : "Unknown");
    console.error("❌ Message d'erreur:", error instanceof Error ? error.message : "No message");
    console.error("❌ Stack trace:", error instanceof Error ? error.stack : "No stack");

    // Gérer les erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes("Session not found")) {
        return NextResponse.json(
          { error: "Session expirée, veuillez vous reconnecter" },
          { status: 401 }
        );
      }

      if (error.message.includes("User not found")) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 401 }
        );
      }

      if (error.message.includes("Database connection")) {
        return NextResponse.json(
          { error: "Erreur de connexion à la base de données" },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Erreur lors du téléchargement du rapport",
        details: error instanceof Error ? error.message : "Erreur inconnue",
        type: error instanceof Error ? error.constructor.name : "Unknown"
      },
      { status: 500 }
    );
  }
}