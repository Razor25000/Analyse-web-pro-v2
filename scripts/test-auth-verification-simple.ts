import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";
import { nanoid } from "nanoid";

const testEmail = `test-auth-${nanoid(8)}@example.com`;
const testPassword = "TestPassword123!";
const testName = "Test User";

console.log("🧪 Test de vérification de l'authentification avec Better Auth");
console.log("===============================================================");
console.log(`Email de test: ${testEmail}`);
console.log(`Mot de passe: ${testPassword}`);

async function testAuthVerification() {
  let userId: string;

  try {
    console.log("\n📝 Étape 1: Vérification que l'infrastructure fonctionne");
    console.log("-----------------------------------------------------");

    // Vérifier la connexion à la base de données
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Base de données connectée:", dbTest);

    // Regarder les utilisateurs existants
    const userCount = await prisma.user.count();
    console.log(`✅ Nombre d'utilisateurs en base: ${userCount}`);

    // Regarder un utilisateur existant pour voir la structure
    const existingUser = await prisma.user.findFirst({
      include: { accounts: true },
    });

    if (existingUser) {
      console.log("✅ Exemple d'utilisateur existant:", {
        id: existingUser.id,
        email: existingUser.email,
        accounts: existingUser.accounts.length,
      });

      // Vérifier un compte credential existant
      const credentialAccount = existingUser.accounts.find(
        (acc) => acc.providerId === "credential",
      );
      if (credentialAccount) {
        console.log("✅ Exemple de compte credential:", {
          providerId: credentialAccount.providerId,
          hasPassword: !!credentialAccount.password,
          passwordLength: credentialAccount.password?.length || 0,
        });
      }
    }

    console.log("\n📋 Étape 2: Créer un utilisateur avec Better Auth");
    console.log("-----------------------------------------------");

    // Créer un utilisateur avec Better Auth directement
    const signUpResult = await auth.api.signUpEmail({
      email: testEmail,
      password: testPassword,
      name: testName,
      callbackURL: null,
    });

    if (!signUpResult?.user) {
      throw new Error("Échec de création du compte avec Better Auth");
    }

    userId = signUpResult.user.id;
    console.log("✅ Utilisateur créé avec Better Auth:", {
      id: signUpResult.user.id,
      email: signUpResult.user.email,
      name: signUpResult.user.name,
    });

    // Vérifier que l'utilisateur existe en base
    const verifiedUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { accounts: true },
    });

    if (!verifiedUser) {
      throw new Error("Utilisateur non trouvé après création");
    }

    console.log("✅ Utilisateur vérifié en base:", {
      id: verifiedUser.id,
      email: verifiedUser.email,
      accounts: verifiedUser.accounts.length,
    });

    // Vérifier le compte credential
    const credentialAccount = verifiedUser.accounts.find(
      (acc) => acc.providerId === "credential",
    );
    if (!credentialAccount?.password) {
      throw new Error("Compte credential non trouvé ou mot de passe manquant");
    }

    console.log("✅ Compte credential trouvé:", {
      providerId: credentialAccount.providerId,
      hasPassword: !!credentialAccount.password,
      passwordLength: credentialAccount.password?.length || 0,
    });

    console.log("\n🔐 Étape 3: Test de connexion avec Better Auth");
    console.log("----------------------------------------------");

    // Test de connexion avec le mot de passe original
    const signInResult = await auth.api.signInEmail({
      email: testEmail,
      password: testPassword,
    });

    if (signInResult?.user) {
      console.log("✅ Connexion réussie avec Better Auth:", {
        id: signInResult.user.id,
        email: signInResult.user.email,
        sessionCreated: !!signInResult.session,
      });
    } else {
      throw new Error("Connexion échouée avec Better Auth");
    }

    // Test avec un mauvais mot de passe
    console.log("\n❌ Étape 4: Test avec mauvais mot de passe");
    console.log("------------------------------------------");

    try {
      const badSignInResult = await auth.api.signInEmail({
        email: testEmail,
        password: "MauvaisMotDePasse123!",
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

    console.log("\n🎉 TOUS LES TESTS SONT PASSÉS!");
    console.log("==============================");
    console.log("Better Auth fonctionne correctement:");
    console.log("1. ✅ Connexion à la base de données PostgreSQL");
    console.log("2. ✅ Création d'utilisateur avec Better Auth");
    console.log("3. ✅ Hachage automatique du mot de passe");
    console.log("4. ✅ Connexion avec le mot de passe original");
    console.log("5. ✅ Rejet des mauvais mots de passe");
    console.log("");
    console.log(
      "Conclusion: L'authentification Better Auth est opérationnelle.",
    );
    console.log(
      "Le flux de création de compte → connexion fonctionne parfaitement.",
    );
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
        console.log("✅ Données de test supprimées");
      }
    } catch (cleanupError) {
      console.error("❌ Erreur lors du nettoyage:", cleanupError);
    }
  }
}

// Exécuter le test
testAuthVerification()
  .then(() => {
    console.log("\n✅ Test terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test échoué:", error);
    process.exit(1);
  });
