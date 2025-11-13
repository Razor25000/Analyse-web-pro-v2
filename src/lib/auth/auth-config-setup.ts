import type { User } from "better-auth";
import { nanoid } from "nanoid";
import { env } from "../env";
import { logger } from "../logger";
import { resend } from "../mail/resend";
import { prisma } from "../prisma";
import { createClient } from "@supabase/supabase-js";

/**
 * SUPPRIMÉ: Architecture v2.0 optimisée - plus de synchronisation profiles
 * Les données utilisateurs sont gérées uniquement dans Prisma (source de vérité)
 * Seuls les audits sont synchronisés pour les workflows n8n
 *
 * @deprecated Cette fonction a été supprimée dans l'architecture v2.0
 */

export const setupResendCustomer = async (user: User) => {
  if (!user.email) {
    return;
  }

  if (!env.RESEND_AUDIENCE_ID) {
    return;
  }

  const contact = await resend.contacts.create({
    audienceId: env.RESEND_AUDIENCE_ID,
    email: user.email,
    firstName: user.name || "",
    unsubscribed: false,
  });

  if (!contact.data) return;

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      resendContactId: contact.data.id,
    },
  });

  return contact.data.id;
};

export const setupDefaultOrganizationsOrInviteUser = async (user: User) => {
  if (!user.email || !user.id) {
    return;
  }

  // Initialiser les quotas dans la table User (UserQuota supprimée)
  await prisma.user
    .update({
      where: { id: user.id },
      data: {
        monthlyQuota: 5, // Quota gratuit par défaut
        quotaUsed: 0,
        quotaResetDate: new Date(
          new Date().setMonth(new Date().getMonth() + 1),
        ),
      },
    })
    .catch((error) => {
      logger.error("Erreur initialisation quota utilisateur", {
        error: error.message,
        userId: user.id,
      });
    });

  // NOTE: Supabase profiles synchronization removed in v2.0 architecture
  // Les données utilisateurs sont gérées uniquement dans Prisma (source de vérité)
  // Seuls les audits sont synchronisés pour les workflows n8n
  logger.info("✅ Setup utilisateur terminé (quotas dans Prisma)", {
    email: user.email,
  });

  // Retourner null pour redirection B2C
  return null;
};
