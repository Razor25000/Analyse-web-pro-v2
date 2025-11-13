#!/usr/bin/env tsx

/**
 * Script de diagnostic pour le problème d'authentification
 * Teste le processus de connexion avec Better Auth
 */

import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";
import { verifyPassword } from "../src/lib/auth/password-utils";

async function debugAuthLoginIssue() {
  console.log("🔍 DIAGNOSTIC PROBLÈME D'AUTHENTIFICATION");
  console.log("=".repeat(60));

  try {
    // 1. Vérifier les utilisateurs existants
    console.log("1️⃣ Vérification des utilisateurs...");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`   Utilisateurs trouvés: ${users.length}`);

    if (users.length === 0) {
      console.log("❌ Aucun utilisateur trouvé dans la base de données");
      return;
    }

    // Afficher les derniers utilisateurs créés
    console.log("\n   Derniers utilisateurs créés:");
    users.slice(0, 3).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
      console.log(`      - Nom: ${user.name || "Non défini"}`);
      console.log(
        `      - Email vérifié: ${user.emailVerified ? "Oui" : "Non"}`,
      );
      console.log(`      - Créé: ${user.createdAt.toLocaleString()}`);
    });

    // 2. Vérifier les comptes avec mot de passe
    console.log("\n2️⃣ Vérification des comptes avec mot de passe...");

    const accounts = await prisma.account.findMany({
      where: {
        providerId: "credential",
        password: { not: null },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`   Comptes avec credentials trouvés: ${accounts.length}`);

    if (accounts.length === 0) {
      console.log("❌ Aucun compte avec credentials trouvé");
      console.log("🔍 Vérification des autres types de comptes...");

      const allAccounts = await prisma.account.findMany({
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      console.log(`   Total comptes: ${allAccounts.length}`);
      allAccounts.forEach((account, index) => {
        console.log(
          `   ${index + 1}. ${account.user?.email} - Provider: ${account.providerId}`,
        );
      });
      return;
    }

    // Analyser les comptes avec credentials
    console.log("\n   Comptes avec credentials:");
    accounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.user?.email}`);
      console.log(`      - Account ID: ${account.accountId}`);
      console.log(`      - Provider: ${account.providerId}`);
      console.log(
        `      - Password hash: ${account.password?.substring(0, 30)}...`,
      );
      console.log(`      - Hash length: ${account.password?.length}`);
      console.log(
        `      - Contains colon: ${account.password?.includes(":") ? "Oui" : "Non"}`,
      );
      console.log(`      - Créé: ${account.createdAt.toLocaleString()}`);

      if (account.password?.includes(":")) {
        const parts = account.password.split(":");
        console.log(`      - Salt length: ${parts[0].length}`);
        console.log(`      - Hash part length: ${parts[1].length}`);
      }
    });

    // 3. Test de vérification de mot de passe
    console.log("\n3️⃣ Test de vérification de mot de passe...");

    const testAccount = accounts[0]; // Prendre le premier compte
    if (testAccount && testAccount.password) {
      console.log(`   Test avec le compte: ${testAccount.user?.email}`);

      // Demander le mot de passe pour test (simulation)
      console.log(
        "   🔒 Pour tester, nous allons simuler différents mots de passe",
      );

      const commonPasswords = [
        "password",
        "Password123",
        "password123",
        "123456",
        "test123",
        "motdepasse",
        "12345678",
      ];

      for (const testPassword of commonPasswords) {
        try {
          const isValid = await verifyPassword(
            testPassword,
            testAccount.password,
          );
          console.log(
            `   - "${testPassword}": ${isValid ? "✅ VALIDE" : "❌ Invalide"}`,
          );

          if (isValid) {
            console.log(`   🎉 Mot de passe trouvé: "${testPassword}"`);
            break;
          }
        } catch (error) {
          console.log(
            `   - "${testPassword}": ❌ Erreur - ${(error as Error).message}`,
          );
        }
      }
    }

    // 4. Test avec Better Auth directement
    console.log("\n4️⃣ Test avec Better Auth...");

    if (testAccount && testAccount.user?.email) {
      console.log(
        `   Test de connexion Better Auth avec: ${testAccount.user.email}`,
      );

      try {
        // Simuler une requête de connexion
        const testRequest = new Request(
          "http://localhost:3000/api/auth/sign-in/email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: testAccount.user.email,
              password: "test123", // Mot de passe de test
              rememberMe: false,
            }),
          },
        );

        console.log("   📡 Tentative de connexion avec Better Auth...");

        // Note: Cette partie nécessiterait un environnement de test complet
        console.log(
          "   ℹ️  Pour un test complet, lancer le serveur en mode dev",
        );
      } catch (error) {
        console.log(`   ❌ Erreur Better Auth: ${(error as Error).message}`);
      }
    }

    // 5. Vérifications de configuration
    console.log("\n5️⃣ Vérifications de configuration...");

    console.log("   Variables d'environnement:");
    console.log(
      `   - DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Définie" : "❌ Manquante"}`,
    );
    console.log(
      `   - BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? "✅ Définie" : "❌ Manquante"}`,
    );
    console.log(
      `   - BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL || "❌ Non définie"}`,
    );

    // 6. Recommandations
    console.log("\n6️⃣ Recommandations:");
    console.log("   📋 Actions à vérifier:");
    console.log(
      "   1. Vérifier que le mot de passe utilisé correspond à celui en base",
    );
    console.log("   2. Tester la connexion avec un nouveau compte");
    console.log(
      "   3. Vérifier les logs du serveur lors de la tentative de connexion",
    );
    console.log("   4. S'assurer que Better Auth est correctement configuré");
    console.log(
      "   5. Vérifier que l'email n'est pas mal formaté (espaces, etc.)",
    );
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour tester un login spécifique
export async function testSpecificLogin(email: string, password: string) {
  console.log(`\n🔑 Test de login spécifique: ${email}`);

  try {
    // Trouver le compte
    const account = await prisma.account.findFirst({
      where: {
        providerId: "credential",
        user: {
          email: email,
        },
      },
      include: {
        user: true,
      },
    });

    if (!account) {
      console.log("❌ Compte non trouvé");
      return false;
    }

    if (!account.password) {
      console.log("❌ Mot de passe non défini pour ce compte");
      return false;
    }

    // Tester le mot de passe
    const isValid = await verifyPassword(password, account.password);
    console.log(`Résultat: ${isValid ? "✅ VALIDE" : "❌ INVALIDE"}`);

    return isValid;
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    return false;
  }
}

// Exécuter le diagnostic
if (require.main === module) {
  debugAuthLoginIssue().catch(console.error);
}
