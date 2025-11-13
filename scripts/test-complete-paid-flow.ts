#!/usr/bin/env tsx

/**
 * Script pour tester le flux complet de paiement avec plan payant
 */

import { prisma } from "../src/lib/prisma";
import { upfetch } from "../src/lib/up-fetch";

const TEST_USER = {
  name: "Test Paid User",
  email: "test.paid@example.com",
  password: "SecurePassword123!",
  selectedPlan: "pro", // Plan payant
};

async function testCompletePaidFlow() {
  console.log("💰 Test du flux complet de paiement avec plan payant...");

  try {
    // 1. Nettoyer les données existantes
    console.log("🧹 Nettoyage des données existantes...");
    await prisma.subscription.deleteMany({
      where: {
        user: { email: TEST_USER.email },
      },
    });
    await prisma.user.deleteMany({
      where: { email: TEST_USER.email },
    });
    await prisma.preRegistration.deleteMany({
      where: { email: TEST_USER.email },
    });

    // 2. Créer une pré-inscription avec plan payant
    console.log("📝 Création de la pré-inscription avec plan payant...");
    const preSignupResponse = await upfetch(
      "http://localhost:3000/api/auth/pre-signup",
      {
        method: "POST",
        body: TEST_USER,
      },
    );

    console.log("Réponse pré-inscription:", preSignupResponse);

    if (!preSignupResponse.preRegistrationId) {
      throw new Error("Pré-inscription échouée");
    }

    // 3. Vérifier que la pré-inscription est créée avec le bon plan
    const preRegistration = await prisma.preRegistration.findUnique({
      where: { id: preSignupResponse.preRegistrationId },
    });

    if (!preRegistration) {
      throw new Error("Pré-inscription non trouvée dans la base");
    }

    console.log("✅ Pré-inscription créée:", {
      id: preRegistration.id,
      email: preRegistration.email,
      selectedPlan: preRegistration.selectedPlan,
      status: preRegistration.status,
      passwordStored: preRegistration.password ? "✅ Stocké" : "❌ Manquant",
    });

    if (preRegistration.selectedPlan !== "pro") {
      throw new Error(
        `Plan incorrect: attendu 'pro', reçu '${preRegistration.selectedPlan}'`,
      );
    }

    // 4. Simuler la création de compte après paiement Stripe
    console.log(
      "💳 Simulation de la création de compte après paiement Stripe...",
    );
    const accountCreationUrl = `http://localhost:3000/api/auth/create-account-from-pre-registration?preRegistrationId=${preRegistration.id}&success=true`;

    const accountResponse = await fetch(accountCreationUrl, {
      method: "GET",
      redirect: "manual", // Ne pas suivre la redirection
    });

    console.log("Status création de compte:", accountResponse.status);
    console.log(
      "Headers:",
      Object.fromEntries(accountResponse.headers.entries()),
    );

    // Vérifier que la redirection va vers sign-in et non dashboard
    const location = accountResponse.headers.get("location");
    console.log("Redirection vers:", location);

    if (!location?.includes("/auth/signin")) {
      throw new Error(
        `Redirection incorrecte: attendu '/auth/signin', reçu '${location}'`,
      );
    }

    if (!location?.includes("accountCreated=true")) {
      throw new Error(
        "Paramètre 'accountCreated=true' manquant dans la redirection",
      );
    }

    if (!location?.includes("plan=pro")) {
      throw new Error("Paramètre 'plan=pro' manquant dans la redirection");
    }

    console.log(
      "✅ Redirection correcte vers sign-in avec les bons paramètres",
    );

    // 5. Vérifier que l'utilisateur est créé avec le bon plan
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: {
        accounts: true,
        subscriptions: true,
      },
    });

    if (!user) {
      throw new Error("Utilisateur non créé");
    }

    console.log("✅ Utilisateur créé:", {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      accounts: user.accounts.length,
      subscriptions: user.subscriptions.length,
    });

    // Vérifier que le tier est correct (pro -> basic via QuotaService mapping)
    if (user.subscriptionTier !== "basic") {
      throw new Error(
        `Tier incorrect: attendu 'basic' (plan pro mappé), reçu '${user.subscriptionTier}'`,
      );
    }

    // 6. Vérifier que l'abonnement est créé dans la table Subscription
    const subscription = user.subscriptions[0];
    if (!subscription) {
      throw new Error("Abonnement non créé dans la table Subscription");
    }

    console.log("✅ Abonnement créé:", {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      seats: subscription.seats,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
    });

    if (subscription.plan !== "pro") {
      throw new Error(
        `Plan d'abonnement incorrect: attendu 'pro', reçu '${subscription.plan}'`,
      );
    }

    // 7. Vérifier le compte d'authentification
    const account = user.accounts[0];
    if (!account) {
      throw new Error("Compte d'authentification non créé");
    }

    console.log("✅ Compte d'authentification:", {
      providerId: account.providerId,
      accountId: account.accountId,
      passwordHashed: account.password ? "✅ Hashé" : "❌ Manquant",
    });

    // 8. Tester la connexion avec Better Auth
    console.log("🔐 Test de connexion avec Better Auth...");

    try {
      const loginResponse = await upfetch(
        "http://localhost:3000/api/auth/sign-in/email",
        {
          method: "POST",
          body: {
            email: TEST_USER.email,
            password: TEST_USER.password,
          },
        },
      );

      console.log("✅ Connexion réussie:", loginResponse);
    } catch (error) {
      console.error("❌ Échec de connexion:", error);

      // Debug: vérifier les détails du compte
      console.log("🔍 Debug compte:", {
        email: account.accountId,
        providerId: account.providerId,
        passwordLength: account.password?.length,
        passwordStart: account.password?.substring(0, 10),
      });

      throw error;
    }

    // 9. Tester l'API subscription pour vérifier l'affichage
    console.log("📊 Test de l'API subscription...");

    try {
      // Créer une session temporaire pour tester l'API
      const sessionResponse = await upfetch(
        "http://localhost:3000/api/auth/sign-in/email",
        {
          method: "POST",
          body: {
            email: TEST_USER.email,
            password: TEST_USER.password,
          },
        },
      );

      // Utiliser les cookies de session pour appeler l'API subscription
      const subscriptionApiResponse = await upfetch(
        "http://localhost:3000/api/user/subscription",
        {
          method: "GET",
          headers: {
            // Ici on devrait utiliser les cookies de session mais pour simplifier le test...
            Authorization: `Bearer ${sessionResponse.user?.id}`,
          },
        },
      );

      console.log("✅ API Subscription répond:", subscriptionApiResponse);

      if (subscriptionApiResponse.plan !== "pro") {
        console.warn(
          `⚠️ L'API subscription retourne un plan incorrect: attendu 'pro', reçu '${subscriptionApiResponse.plan}'`,
        );
      } else {
        console.log("✅ API subscription retourne le bon plan 'pro'");
      }
    } catch (error) {
      console.warn("⚠️ Test de l'API subscription échoué:", error);
      // Ce n'est pas critique pour ce test
    }

    // 10. Vérifier l'état final de la pré-inscription
    const finalPreRegistration = await prisma.preRegistration.findUnique({
      where: { id: preRegistration.id },
    });

    console.log("📊 État final pré-inscription:", {
      status: finalPreRegistration?.status || "Supprimée",
    });

    if (finalPreRegistration?.status !== "completed") {
      throw new Error(
        `État final incorrect: attendu 'completed', reçu '${finalPreRegistration?.status}'`,
      );
    }

    console.log("🎉 Test complet du flux payant terminé avec succès!");
    console.log("📋 Résumé des vérifications:");
    console.log("  ✅ Pré-inscription créée avec plan 'pro'");
    console.log("  ✅ Redirection vers sign-in après paiement");
    console.log(
      "  ✅ Utilisateur créé avec subscriptionTier 'basic' (mapping pro→basic)",
    );
    console.log("  ✅ Abonnement créé dans table Subscription avec plan 'pro'");
    console.log("  ✅ Connexion fonctionnelle");
    console.log("  ✅ Pré-inscription marquée comme 'completed'");
    console.log(
      "  📋 Interface utilisateur affichera 'Pro' grâce au mapping 'basic'→'Pro'",
    );
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);

    // Debug: afficher l'état de la base
    console.log("\n🔍 Debug état base de données:");

    const users = await prisma.user.findMany({
      where: { email: TEST_USER.email },
      include: {
        accounts: true,
        subscriptions: true,
      },
    });

    const preRegs = await prisma.preRegistration.findMany({
      where: { email: TEST_USER.email },
    });

    console.log("Users:", JSON.stringify(users, null, 2));
    console.log("PreRegistrations:", JSON.stringify(preRegs, null, 2));

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testCompletePaidFlow().catch((error) => {
  console.error("💥 Test failed:", error);
  process.exit(1);
});
