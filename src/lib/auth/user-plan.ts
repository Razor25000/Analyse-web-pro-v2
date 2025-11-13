import { getUser } from "./auth-user";
import { prisma } from "../prisma";
import { logger } from "../logger";

export type UserPlan = "free" | "starter" | "pro" | "premium" | "enterprise";

// Mapping des tiers d'abonnement vers les plans
// Cohérent avec quota-service.ts et pricing-section.tsx
const TIER_TO_PLAN: Record<string, UserPlan> = {
  free: "free",
  starter: "starter",
  basic: "pro", // 80 audits - Plan Pro à 79€
  premium: "premium", // 250 audits - Plan Premium à 149€
  enterprise: "enterprise",
};

export async function getUserPlan(): Promise<UserPlan> {
  try {
    const user = await getUser();

    if (!user?.email) {
      logger.warn("getUserPlan: Aucun utilisateur authentifié");
      return "free";
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { subscriptionTier: true },
    });

    if (!userRecord) {
      logger.warn("getUserPlan: Utilisateur introuvable dans la base", {
        email: user.email,
      });
      return "free";
    }

    const plan = TIER_TO_PLAN[userRecord.subscriptionTier || "free"] || "free";

    logger.info("getUserPlan: Plan déterminé", {
      email: user.email,
      subscriptionTier: userRecord.subscriptionTier,
      plan,
    });

    return plan;
  } catch (error) {
    logger.error("getUserPlan: Erreur lors de la récupération du plan", error);
    return "free"; // Défaut sécurisé
  }
}

export async function requirePlan(requiredPlan: UserPlan): Promise<boolean> {
  const PLAN_HIERARCHY: Record<UserPlan, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    premium: 3,
    enterprise: 4,
  };

  const userPlan = await getUserPlan();
  const userLevel = PLAN_HIERARCHY[userPlan];
  const requiredLevel = PLAN_HIERARCHY[requiredPlan];

  return userLevel >= requiredLevel;
}

export function isPremiumOrEnterprise(plan: UserPlan): boolean {
  return plan === "premium" || plan === "enterprise";
}

export function getPlanDisplayName(plan: UserPlan): string {
  const PLAN_NAMES: Record<UserPlan, string> = {
    free: "Gratuit",
    starter: "Starter",
    pro: "Pro",
    premium: "Premium",
    enterprise: "Enterprise",
  };

  return PLAN_NAMES[plan] || "Gratuit";
}
