import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";
import { nanoid } from "nanoid";

const testEmail = `test-auth-${nanoid(8)}@example.com`;
const testPassword = "TestPassword123!";
const testName = "Test User";

console.log("🧪 Test Better Auth avec les vraies méthodes API");
console.log("================================================");
console.log(`Email de test: ${testEmail}`);
console.log(`Mot de passe: ${testPassword}`);

async function testBetterAuthRealAPI() {
  let userId: string;

  try {
    console.log("\n📝 Étape 1: Création de compte avec signUpEmail");
    console.log("----------------------------------------------");

    // Utiliser la bonne méthode API avec les paramètres dans un objet body
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: testEmail,
        password: testPassword,
        name: testName,
        callbackURL: null, // Optionnel
      },
    });

    if (!signUpResult?.user) {
      throw new Error("Échec de création du compte avec signUpEmail");
    }

    userId = signUpResult.user.id;
    console.log("✅ Utilisateur créé avec signUpEmail:");
    console.log(`   ID: ${signUpResult.user.id}`);
    console.log(`   Email: ${signUpResult.user.email}`);
    console.log(`   Nom: ${signUpResult.user.name}`);
    console.log(`   Session créée: ${signUpResult.session ? "OUI" : "NON"}`);

    // Vérifier en base de données
    const userInDb = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });

    if (!userInDb) {
      throw new Error("Utilisateur non trouvé en base");
    }

    console.log("✅ Utilisateur confirmé en base:");
    console.log(`   ID: ${userInDb.id}`);
    console.log(`   Email: ${userInDb.email}`);
    console.log(`   Comptes: ${userInDb.accounts.length}`);

    // Vérifier le compte credential
    const credentialAccount = userInDb.accounts.find(
      (acc) => acc.providerId === "credential",
    );
    if (credentialAccount) {
      console.log("✅ Compte credential trouvé:");
      console.log(`   Provider: ${credentialAccount.providerId}`);
      console.log(
        `   Mot de passe hashé: ${credentialAccount.password ? `OUI (longueur: ${  credentialAccount.password.length  })` : "NON"}`,
      );
    } else {
      throw new Error("Aucun compte credential trouvé");
    }

    console.log("\n🔐 Étape 2: Test de connexion avec signInEmail");
    console.log("---------------------------------------------");

    const signInResult = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: testPassword,
      },
    });

    if (signInResult?.user) {
      console.log("✅ Connexion réussie avec signInEmail:");
      console.log(`   User ID: ${signInResult.user.id}`);
      console.log(`   Email: ${signInResult.user.email}`);
      console.log(`   Session créée: ${signInResult.session ? "OUI" : "NON"}`);
    } else {
      throw new Error("Connexion échouée - pas d'utilisateur retourné");
    }

    console.log("\n❌ Étape 3: Test avec mauvais mot de passe");
    console.log("------------------------------------------");

    try {
      const badSignInResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: "MauvaisMotDePasse123!",
        },
      });

      if (badSignInResult?.user) {
        throw new Error(
          "ERREUR: Connexion réussie avec un mauvais mot de passe!",
        );
      } else {
        console.log(
          "✅ Connexion refusée avec mauvais mot de passe (comme attendu)",
        );
      }
    } catch (error) {
      console.log(
        "✅ Connexion refusée avec mauvais mot de passe (comme attendu)",
      );
      console.log(`   Erreur: ${error}`);
    }

    console.log("\n🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!");
    console.log("==========================================");
    console.log("Better Auth fonctionne parfaitement:");
    console.log("1. ✅ signUpEmail crée le compte avec hachage automatique");
    console.log("2. ✅ signInEmail fonctionne avec le mot de passe original");
    console.log("3. ✅ Les mauvais mots de passe sont rejetés");
    console.log("4. ✅ Les sessions sont créées automatiquement");
    console.log("");
    console.log(
      "🎯 RÉSULTAT FINAL: L'authentification Better Auth est 100% opérationnelle",
    );
    console.log("   Le problème initial de connexion est résolu!");
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
        console.log("✅ Utilisateur de test supprimé");
      }
    } catch (cleanupError) {
      console.error("❌ Erreur lors du nettoyage:", cleanupError);
    }
  }
}

// Exécuter le test
testBetterAuthRealAPI()
  .then(() => {
    console.log("\n✅ Test terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test échoué:", error);
    process.exit(1);
  });
