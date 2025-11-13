#!/usr/bin/env tsx

/**
 * Script pour tester le login d'un utilisateur spécifique
 * Permet de vérifier si un email/mot de passe fonctionne
 */

import { prisma } from "../src/lib/prisma";
import { verifyPassword } from "../src/lib/auth/password-utils";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function testUserLogin() {
  console.log("🔐 TEST DE CONNEXION UTILISATEUR");
  console.log("=".repeat(50));

  try {
    // 1. Lister les utilisateurs disponibles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("📋 Utilisateurs disponibles:");
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name})`);
    });

    // 2. Demander l'email à tester
    console.log("\n");
    const email = await askQuestion("📧 Entrez l'email à tester: ");

    if (!email) {
      console.log("❌ Email requis");
      return;
    }

    // 3. Trouver le compte
    const account = await prisma.account.findFirst({
      where: {
        providerId: "credential",
        user: {
          email: email,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            emailVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!account) {
      console.log("❌ Aucun compte trouvé pour cet email");

      // Vérifier s'il y a un utilisateur sans compte credential
      const userOnly = await prisma.user.findFirst({
        where: { email: email },
      });

      if (userOnly) {
        console.log("ℹ️  Un utilisateur existe mais sans compte 'credential'");
        console.log(
          "   Cela peut indiquer un compte créé via OAuth (Google, GitHub)",
        );
      }
      return;
    }

    if (!account.password) {
      console.log("❌ Aucun mot de passe défini pour ce compte");
      return;
    }

    console.log("\n✅ Compte trouvé:");
    console.log(`   Email: ${account.user?.email}`);
    console.log(`   Nom: ${account.user?.name}`);
    console.log(
      `   Email vérifié: ${account.user?.emailVerified ? "Oui" : "Non"}`,
    );
    console.log(`   Créé: ${account.user?.createdAt.toLocaleString()}`);
    console.log(
      `   Hash format: ${account.password.includes(":") ? "✅ Correct (salt:hash)" : "❌ Incorrect"}`,
    );

    // 4. Demander le mot de passe
    console.log("\n");
    const password = await askQuestion("🔑 Entrez le mot de passe à tester: ");

    if (!password) {
      console.log("❌ Mot de passe requis");
      return;
    }

    // 5. Tester le mot de passe
    console.log("\n🔍 Test en cours...");

    try {
      const isValid = await verifyPassword(password, account.password);

      if (isValid) {
        console.log("🎉 ✅ MOT DE PASSE CORRECT !");
        console.log("   L'authentification devrait fonctionner.");

        // Test additionnel : vérifier si l'email est vérifié
        if (!account.user?.emailVerified) {
          console.log("\n⚠️  ATTENTION: Email non vérifié");
          console.log(
            "   Cela peut bloquer la connexion selon la configuration.",
          );
        }
      } else {
        console.log("❌ MOT DE PASSE INCORRECT");
        console.log("   Le mot de passe ne correspond pas à celui en base.");
        console.log("\n💡 Suggestions:");
        console.log("   1. Vérifiez les majuscules/minuscules");
        console.log("   2. Vérifiez les caractères spéciaux");
        console.log("   3. Assurez-vous qu'il n'y a pas d'espaces");
        console.log("   4. Essayez de réinitialiser le mot de passe");
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de la vérification:",
        (error as Error).message,
      );
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Fonction pour tester directement avec des paramètres
export async function testDirectLogin(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        providerId: "credential",
        user: {
          email: email,
        },
      },
    });

    if (!account?.password) {
      return false;
    }

    return await verifyPassword(password, account.password);
  } catch (error) {
    console.error("Error testing login:", error);
    return false;
  }
}

// Exécuter le test interactif
if (require.main === module) {
  testUserLogin().catch(console.error);
}
