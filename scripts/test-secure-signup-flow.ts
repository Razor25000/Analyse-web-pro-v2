#!/usr/bin/env tsx

/**
 * Script pour tester le flux complet de pré-inscription sécurisé
 */

import { prisma } from "../src/lib/prisma";
import { upfetch } from "../src/lib/up-fetch";

const TEST_USER = {
  name: "Test User",
  email: "test.secure@example.com",
  password: "SecurePassword123!",
  selectedPlan: "free",
};

async function testSecureSignupFlow() {
  console.log("🔒 Test du flux de pré-inscription sécurisé...");

  try {
    // 1. Nettoyer les données existantes
    console.log("🧹 Nettoyage des données existantes...");
    await prisma.user.deleteMany({
      where: { email: TEST_USER.email },
    });
    await prisma.preRegistration.deleteMany({
      where: { email: TEST_USER.email },
    });

    // 2. Créer une pré-inscription
    console.log("📝 Création de la pré-inscription...");
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

    // 3. Vérifier que la pré-inscription est créée
    const preRegistration = await prisma.preRegistration.findUnique({
      where: { id: preSignupResponse.preRegistrationId },
    });

    if (!preRegistration) {
      throw new Error("Pré-inscription non trouvée dans la base");
    }

    console.log("✅ Pré-inscription créée:", {
      id: preRegistration.id,
      email: preRegistration.email,
      status: preRegistration.status,
      passwordStored: preRegistration.password ? "✅ Stocké" : "❌ Manquant",
    });

    // 4. Simuler la création de compte après paiement (plan gratuit)
    console.log("💳 Simulation de la création de compte après paiement...");
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

    // 5. Vérifier que l'utilisateur est créé
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: {
        accounts: true,
        sessions: true,
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
      sessions: user.sessions.length,
    });

    // 6. Vérifier le compte d'authentification
    const account = user.accounts[0];
    if (!account) {
      throw new Error("Compte d'authentification non créé");
    }

    console.log("✅ Compte d'authentification:", {
      providerId: account.providerId,
      accountId: account.accountId,
      passwordHashed: account.password ? "✅ Hashé" : "❌ Manquant",
    });

    // 7. Tester la connexion avec Better Auth
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
    }

    // 8. Vérifier l'état final de la pré-inscription
    const finalPreRegistration = await prisma.preRegistration.findUnique({
      where: { id: preRegistration.id },
    });

    console.log("📊 État final pré-inscription:", {
      status: finalPreRegistration?.status || "Supprimée",
    });

    console.log("✅ Test complet terminé avec succès");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);

    // Debug: afficher l'état de la base
    const users = await prisma.user.findMany({
      where: { email: TEST_USER.email },
      include: { accounts: true },
    });

    const preRegs = await prisma.preRegistration.findMany({
      where: { email: TEST_USER.email },
    });

    console.log("🔍 Debug état base:");
    console.log("Users:", users);
    console.log("PreRegistrations:", preRegs);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testSecureSignupFlow().catch(console.error);
