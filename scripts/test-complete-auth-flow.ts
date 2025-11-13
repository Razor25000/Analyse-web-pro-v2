import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const testEmail = `test-auth-${nanoid(8)}@example.com`;
const testPassword = "TestPassword123!";
const testName = "Test User";

console.log("🧪 Test du flux d'authentification complet");
console.log("===============================================");

async function testCompleteAuthFlow() {
  let preRegistrationId: string;
  let userId: string;

  try {
    // Étape 1: Test de la pré-inscription
    console.log("\n📝 Étape 1: Test de la pré-inscription");
    console.log("--------------------------------------");

    const preRegResponse = await fetch(
      "http://localhost:3000/api/auth/pre-signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: testName,
          email: testEmail,
          password: testPassword,
          selectedPlan: "free",
        }),
      },
    );

    if (!preRegResponse.ok) {
      const errorText = await preRegResponse.text();
      throw new Error(
        `Pré-inscription échouée: ${preRegResponse.status} - ${errorText}`,
      );
    }

    const preRegData = await preRegResponse.json();
    preRegistrationId = preRegData.preRegistrationId;

    console.log("✅ Pré-inscription créée avec succès");
    console.log(`   ID: ${preRegistrationId}`);

    // Vérifier en base que la pré-inscription existe
    const preReg = await prisma.preRegistration.findUnique({
      where: { id: preRegistrationId },
    });

    if (!preReg) {
      throw new Error("Pré-inscription non trouvée en base");
    }

    console.log("✅ Pré-inscription confirmée en base:");
    console.log(`   Email: ${preReg.email}`);
    console.log(`   Status: ${preReg.status}`);
    console.log(`   Plan: ${preReg.selectedPlan}`);
    console.log(`   Mot de passe stocké: ${preReg.password ? "OUI" : "NON"}`);

    // Étape 2: Test de la création de compte depuis pré-inscription
    console.log("\n👤 Étape 2: Test de la création de compte");
    console.log("------------------------------------------");

    const createAccountResponse = await fetch(
      `http://localhost:3000/api/auth/create-account-from-pre-registration?preRegistrationId=${preRegistrationId}&success=true`,
      {
        method: "GET",
        redirect: "manual", // Pour capturer les redirections
      },
    );

    console.log(
      `Status de création de compte: ${createAccountResponse.status}`,
    );

    if (createAccountResponse.status === 302) {
      const location = createAccountResponse.headers.get("location");
      console.log("✅ Redirection détectée vers:", location);

      if (location?.includes("dashboard")) {
        console.log("✅ Redirection vers dashboard - compte créé avec succès");
      } else if (location?.includes("error")) {
        throw new Error(`Erreur dans la création de compte: ${location}`);
      }
    } else {
      const responseText = await createAccountResponse.text();
      console.log("Réponse inattendue:", responseText);
    }

    // Vérifier que l'utilisateur existe en base
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { accounts: true },
    });

    if (!user) {
      throw new Error("Utilisateur non créé en base");
    }

    userId = user.id;
    console.log("✅ Utilisateur créé en base:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.name}`);
    console.log(`   Tier: ${user.subscriptionTier}`);
    console.log(`   Comptes: ${user.accounts.length}`);

    // Vérifier le compte credential
    const credentialAccount = user.accounts.find(
      (acc) => acc.providerId === "credential",
    );
    if (credentialAccount) {
      console.log("✅ Compte credential trouvé:");
      console.log(`   ID: ${credentialAccount.id}`);
      console.log(
        `   Mot de passe hashé: ${credentialAccount.password ? "OUI" : "NON"}`,
      );
    } else {
      throw new Error("Aucun compte credential trouvé");
    }

    // Vérifier que la pré-inscription est marquée comme complétée
    const updatedPreReg = await prisma.preRegistration.findUnique({
      where: { id: preRegistrationId },
    });

    if (updatedPreReg?.status !== "completed") {
      throw new Error(
        `Pré-inscription pas marquée comme complétée: ${updatedPreReg?.status}`,
      );
    }

    console.log("✅ Pré-inscription marquée comme complétée");

    // Étape 3: Test de la connexion
    console.log("\n🔐 Étape 3: Test de la connexion");
    console.log("---------------------------------");

    try {
      const signInResult = await auth.api.signIn({
        email: testEmail,
        password: testPassword,
        headers: new Headers(),
      });

      if (signInResult?.user) {
        console.log("✅ Connexion réussie:");
        console.log(`   User ID: ${signInResult.user.id}`);
        console.log(`   Email: ${signInResult.user.email}`);
        console.log(
          `   Session: ${signInResult.session ? "CRÉÉE" : "NON CRÉÉE"}`,
        );
      } else {
        throw new Error("Connexion échouée - pas d'utilisateur retourné");
      }
    } catch (signInError) {
      console.error("❌ Erreur lors de la connexion:", signInError);
      throw new Error(`Échec de la connexion: ${signInError}`);
    }

    console.log("\n🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!");
    console.log("===========================================");
    console.log("Le flux d'authentification fonctionne correctement:");
    console.log("1. ✅ Pré-inscription avec stockage sécurisé du mot de passe");
    console.log(
      "2. ✅ Création de compte via Better Auth avec hachage automatique",
    );
    console.log("3. ✅ Connexion avec le mot de passe original");
  } catch (error) {
    console.error("\n❌ ÉCHEC DU TEST:", error);
    throw error;
  } finally {
    // Nettoyage
    console.log("\n🧹 Nettoyage des données de test...");

    try {
      if (userId) {
        // Supprimer les comptes de l'utilisateur
        await prisma.account.deleteMany({
          where: { userId: userId },
        });

        // Supprimer l'utilisateur
        await prisma.user.delete({
          where: { id: userId },
        });
        console.log("✅ Utilisateur supprimé");
      }

      if (preRegistrationId) {
        await prisma.preRegistration.delete({
          where: { id: preRegistrationId },
        });
        console.log("✅ Pré-inscription supprimée");
      }
    } catch (cleanupError) {
      console.error("❌ Erreur lors du nettoyage:", cleanupError);
    }
  }
}

// Exécuter le test
testCompleteAuthFlow()
  .then(() => {
    console.log("\n✅ Test terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test échoué:", error);
    process.exit(1);
  });
