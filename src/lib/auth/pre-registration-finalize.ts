import { prisma } from "@/lib/prisma";
import { QuotaService } from "@/lib/quota/quota-service";

export type FinalizationOptions = {
  customerId?: string;
  subscriptionId?: string;
};

/**
 * Finalise une pré-inscription en créant un compte utilisateur réel
 * Utilisé pour les comptes gratuits ET payants après validation du paiement
 */
export async function finalizePreRegistration(
  preRegistrationId: string,
  stripeData?: FinalizationOptions,
) {
  console.log(`🔄 Finalisation inscription pour: ${preRegistrationId}`);

  // 1. Trouver la pré-inscription
  const preReg = await prisma.preRegistration.findUnique({
    where: { id: preRegistrationId },
  });

  if (!preReg) {
    throw new Error("Pré-inscription introuvable");
  }

  if (preReg.status !== "pending") {
    throw new Error(
      `Pré-inscription déjà finalisée ou expirée (status: ${preReg.status})`,
    );
  }

  console.log(
    `✅ Pré-inscription trouvée: ${preReg.email}, plan: ${preReg.selectedPlan}`,
  );

  // 2. Créer le nouvel utilisateur
  const newUser = await prisma.user.create({
    data: {
      email: preReg.email,
      name: preReg.name,
      password: preReg.password, // Le mot de passe est déjà haché
      stripeCustomerId: stripeData?.customerId,
      subscriptionTier: preReg.selectedPlan === "free" ? "free" : "basic", // basic pour pro, premium pour premium
    },
  });

  console.log(`✅ Utilisateur créé: ${newUser.email} (ID: ${newUser.id})`);

  // 3. Initialiser le quota par défaut pour le nouvel utilisateur
  await QuotaService.createDefaultQuota(newUser.id);
  console.log(`✅ Quota par défaut initialisé pour ${newUser.id}`);

  // 4. Si c'est un plan payant, créer l'abonnement
  if (stripeData && preReg.selectedPlan !== "free") {
    const subscription = await prisma.subscription.create({
      data: {
        plan: preReg.selectedPlan,
        userId: newUser.id,
        stripeCustomerId: stripeData.customerId!,
        stripeSubscriptionId: stripeData.subscriptionId!,
        status: "active",
        seats: 1,
        // Note: periodStart et periodEnd peuvent être ajoutés plus tard si nécessaire
      },
    });
    console.log(
      `💳 Abonnement ${preReg.selectedPlan} créé: ${subscription.id}`,
    );
  }

  // 5. Mettre à jour le quota selon le plan choisi
  await QuotaService.updateQuotaForSubscription(
    newUser.id,
    preReg.selectedPlan,
  );
  console.log(`✅ Quota mis à jour pour le plan ${preReg.selectedPlan}`);

  // 6. Marquer la pré-inscription comme complétée
  await prisma.preRegistration.update({
    where: { id: preRegistrationId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  console.log(`🎉 Finalisation complète pour ${newUser.email}`);
  return newUser;
}
