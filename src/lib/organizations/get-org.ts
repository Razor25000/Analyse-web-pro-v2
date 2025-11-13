import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { auth } from "../auth";
import { getSession } from "../auth/auth-user";
import { logger } from "../logger";

/**
 * B2C Mode: Récupère le contexte utilisateur avec ses abonnements
 * (Ne pas confondre avec une organisation - c'est un contexte utilisateur)
 */
export const getCurrentUserContext = async () => {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  try {
    // Récupérer les headers de manière sécurisée (comme dans auth-user.ts)
    let requestHeaders;
    try {
      requestHeaders = await headers();
    } catch (headerError) {
      logger.warn("Impossible d'obtenir les headers pour les abonnements", {
        error: headerError.message,
      });
      requestHeaders = new Headers();
    }

    // Récupérer les abonnements actifs de l'utilisateur (B2C)
    const subscriptions = await auth.api.listActiveSubscriptions({
      headers: requestHeaders,
      query: {
        referenceId: user.id,
      },
    });

    const currentSubscription = subscriptions.find(
      (s) =>
        s.referenceId === user.id &&
        (s.status === "active" || s.status === "trialing"),
    );

    return {
      id: user.id,
      name: user.name,
      slug: user.id, // Identifiant unique de l'utilisateur
      user: user,
      email: user.email,
      subscription: currentSubscription ?? null,
    };
  } catch (error: any) {
    logger.error("Erreur lors de la récupération du contexte utilisateur", {
      error: error.message,
      userId: user.id,
    });

    // Retourner les données utilisateur de base même si les abonnements échouent
    return {
      id: user.id,
      name: user.name,
      slug: user.id,
      user: user,
      email: user.email,
      subscription: null,
    };
  }
};

/**
 * Alias pour la compatibilité avec le code existant
 * TODO: Migrer progressivement vers getCurrentUserContext()
 */
export const getCurrentOrg = getCurrentUserContext;

export type CurrentUserContextPayload = NonNullable<
  Awaited<ReturnType<typeof getCurrentUserContext>>
>;

// Type alias pour compatibilité
export type CurrentOrgPayload = CurrentUserContextPayload;

export const getRequiredUserContext = async () => {
  const result = await getCurrentUserContext();

  if (!result) {
    unauthorized();
  }

  return result;
};

/**
 * Alias pour la compatibilité avec le code existant
 * TODO: Migrer progressivement vers getRequiredUserContext()
 */
export const getRequiredCurrentOrg = getRequiredUserContext;
