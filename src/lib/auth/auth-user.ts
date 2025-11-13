import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { auth } from "../auth";
import { logger } from "../logger";

// Fallback session cache for headerless contexts
let sessionCache: { session: any; user: any; timestamp: number } | null = null;
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getSession = async () => {
  try {
    // Essayer d'obtenir les headers de manière sécurisée
    let requestHeaders;

    try {
      requestHeaders = await headers();
    } catch (headerError) {
      // Si headers() échoue (par exemple dans certains contextes Next.js 15),
      // utiliser un objet headers vide
      logger.warn(
        "Impossible d'obtenir les headers, utilisation de headers vides",
        {
          error: headerError.message,
        },
      );
      requestHeaders = new Headers();
    }

    // Si on a un cache valide et qu'on est dans un contexte sans headers, utiliser le cache
    if (sessionCache && requestHeaders.keys.length === 0) {
      const now = Date.now();
      if (now - sessionCache.timestamp < SESSION_CACHE_TTL) {
        logger.info(
          "Utilisation du cache de session pour contexte sans headers",
        );
        return sessionCache;
      }
    }

    const session = await auth.api.getSession({
      headers: requestHeaders,
    });

    // Mettre en cache la session si elle est valide
    if (session?.user && session?.session) {
      sessionCache = {
        session: session.session,
        user: session.user,
        timestamp: Date.now(),
      };
    }

    return session;
  } catch (error: any) {
    logger.error("Erreur lors de la récupération de la session", {
      error: error.message,
      stack: error.stack,
    });

    // En cas d'erreur, retourner le cache s'il existe et est valide
    if (sessionCache) {
      const now = Date.now();
      if (now - sessionCache.timestamp < SESSION_CACHE_TTL) {
        logger.info("Utilisation du cache de session après erreur");
        return sessionCache;
      }
    }

    // Retourner une session vide plutôt que de faire planter l'app
    return {
      session: null,
      user: null,
    };
  }
};

export const getUser = async () => {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  return user;
};

export const getRequiredUser = async () => {
  const user = await getUser();

  if (!user) {
    unauthorized();
  }

  return user;
};
