import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth/auth-user";
import {
  getUserPlan,
  getPlanDisplayName,
  type UserPlan,
} from "@/lib/auth/user-plan";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Mapping des tiers vers les IDs de plan
const TIER_TO_PLAN_ID: Record<string, string> = {
  free: "free",
  starter: "starter_monthly",
  basic: "pro_monthly",
  premium: "premium",
  enterprise: "enterprise",
};

export async function GET(request: NextRequest) {
  try {
    logger.info("API Quota appelée");

    // 1. Vérifier l'authentification
    const user = await getRequiredUser();
    logger.info("Utilisateur authentifié", { email: user.email });

    // 2. Utiliser la nouvelle fonction utilitaire pour récupérer le plan
    const userPlan = await getUserPlan();
    const planDisplayName = getPlanDisplayName(userPlan);

    logger.info("Plan utilisateur déterminé", {
      email: user.email,
      plan: userPlan,
      planDisplayName,
    });

    // 3. Récupérer les données de quota depuis Prisma
    const userRecord = await prisma.user.findUnique({
      where: {
        email: user.email,
      },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        monthlyQuota: true,
        quotaUsed: true,
        quotaResetDate: true,
      },
    });

    if (!userRecord) {
      logger.error("Utilisateur introuvable dans Prisma", {
        email: user.email,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur introuvable",
        },
        { status: 404 },
      );
    }

    // 4. Calculer les informations de quota
    const monthlyQuota = userRecord.monthlyQuota || 5;
    const quotaUsed = userRecord.quotaUsed || 0;
    const remainingQuota = Math.max(0, monthlyQuota - quotaUsed);
    const percentage =
      monthlyQuota > 0 ? Math.round((quotaUsed / monthlyQuota) * 100) : 0;

    // 5. Mapper le plan vers l'ID pour compatibilité
    const planId =
      TIER_TO_PLAN_ID[userRecord.subscriptionTier || "free"] || "free";

    const quotaInfo = {
      used: quotaUsed,
      limit: monthlyQuota,
      remaining: remainingQuota,
      percentage: percentage,
      planId: planId,
      planName: planDisplayName,
      resetDate: userRecord.quotaResetDate,
      canExceed: userPlan !== "free", // Les plans payants peuvent potentiellement dépasser
    };

    logger.info("Quota info calculé avec succès", {
      email: user.email,
      quotaInfo,
    });

    return NextResponse.json({
      success: true,
      quota: quotaInfo,
    });
  } catch (error) {
    logger.error("Erreur API quota", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du quota",
      },
      { status: 500 },
    );
  }
}
