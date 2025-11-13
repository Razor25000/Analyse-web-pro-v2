import { SiteConfig } from "@/site-config";
import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Gestion sécurisée de la redirection de la page d'accueil
  if (pathname === "/" && SiteConfig.features.enableLandingRedirection) {
    try {
      // Tentative de récupération de la session de manière sécurisée
      const session = getSessionCookie(request, {
        cookiePrefix: SiteConfig.appId,
      });

      if (session) {
        // Rediriger vers le dashboard B2C si l'utilisateur est connecté
        const url = new URL(request.url);
        url.pathname = "/dashboard/audits";
        return NextResponse.redirect(url.toString());
      }

      // Si pas de session, laisser l'utilisateur accéder à la page d'accueil
      // (pas de redirection vers signin)
    } catch (error) {
      // En cas d'erreur avec la session, permettre l'accès à la page d'accueil
      console.warn(
        "Erreur middleware lors de la vérification de session:",
        error,
      );
      // Continuer normalement vers la page d'accueil
    }
  }

  // Protection des routes dashboard - redirection vers auth si pas connecté
  if (pathname.startsWith("/dashboard")) {
    try {
      const session = getSessionCookie(request, {
        cookiePrefix: SiteConfig.appId,
      });

      if (!session) {
        const url = new URL(request.url);
        url.pathname = "/auth/signin";
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url.toString());
      }
    } catch (error) {
      // En cas d'erreur, rediriger vers signin par sécurité
      console.warn("Erreur middleware pour route protégée:", error);
      const url = new URL(request.url);
      url.pathname = "/auth/signin";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url.toString());
    }
  }

  // Protection des routes API non-publiques
  if (pathname.startsWith("/api/audits") || pathname.startsWith("/api/user")) {
    try {
      const session = getSessionCookie(request, {
        cookiePrefix: SiteConfig.appId,
      });

      if (!session) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }
    } catch (error) {
      console.warn("Erreur middleware pour route API protégée:", error);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
