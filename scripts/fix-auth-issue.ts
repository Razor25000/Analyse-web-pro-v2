#!/usr/bin/env tsx

/**
 * Script de correction pour les problèmes d'authentification
 * Diagnostique et corrige les problèmes courants
 */

import { prisma } from "../src/lib/prisma";
import { verifyPassword, hashPassword } from "../src/lib/auth/password-utils";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

async function fixAuthIssue() {
  console.log("🔧 SCRIPT DE CORRECTION AUTHENTIFICATION");
  console.log("=".repeat(60));

  try {
    // 1. Vérification des variables d'environnement
    console.log("1️⃣ Vérification des variables d'environnement...");

    const requiredEnvVars = [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
    ];

    const missingVars: string[] = [];

    for (const varName of requiredEnvVars) {
      const value = process.env[varName];
      if (!value) {
        missingVars.push(varName);
        console.log(`   ❌ ${varName}: Manquante`);
      } else {
        console.log(`   ✅ ${varName}: Définie`);
      }
    }

    if (missingVars.length > 0) {
      console.log("\n❌ Variables manquantes détectées!");
      console.log(
        "💡 Solution: Vérifiez que votre fichier .env.local contient:",
      );
      missingVars.forEach((varName) => {
        console.log(`   ${varName}=<valeur>`);
      });
      console.log(
        "\n⚠️  Redémarrez le serveur après avoir ajouté les variables",
      );
      return;
    }

    // 2. Test de connexion base de données
    console.log("\n2️⃣ Test de connexion à la base de données...");

    try {
      await prisma.$connect();
      console.log("   ✅ Connexion à la base de données réussie");
    } catch (error) {
      console.log("   ❌ Impossible de se connecter à la base de données");
      console.log(`   Erreur: ${(error as Error).message}`);
      return;
    }

    // 3. Vérification des utilisateurs
    console.log("\n3️⃣ Vérification des utilisateurs et comptes...");

    const users = await prisma.user.findMany({
      include: {
        accounts: {
          where: {
            providerId: "credential",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`   Utilisateurs trouvés: ${users.length}`);

    if (users.length === 0) {
      console.log("   ⚠️  Aucun utilisateur trouvé");
      console.log("   💡 Créez un compte via l'interface web d'abord");
      return;
    }

    const usersWithCredentials = users.filter((user) =>
      user.accounts.some(
        (acc) => acc.providerId === "credential" && acc.password,
      ),
    );

    console.log(
      `   Utilisateurs avec credentials: ${usersWithCredentials.length}`,
    );

    if (usersWithCredentials.length === 0) {
      console.log("   ⚠️  Aucun utilisateur avec credentials trouvé");
      console.log(
        "   💡 Tous les comptes semblent être des comptes OAuth (Google, GitHub)",
      );
      console.log("   💡 Pour tester, créez un compte avec email/mot de passe");
      return;
    }

    // 4. Analyse des comptes credentials
    console.log("\n4️⃣ Analyse des comptes credentials...");

    for (const user of usersWithCredentials) {
      const credentialAccount = user.accounts.find(
        (acc) => acc.providerId === "credential" && acc.password,
      );

      if (!credentialAccount?.password) continue;

      console.log(`\n   👤 ${user.email}:`);
      console.log(`      - ID: ${user.id}`);
      console.log(`      - Nom: ${user.name}`);
      console.log(
        `      - Email vérifié: ${user.emailVerified ? "Oui" : "Non"}`,
      );
      console.log(
        `      - Hash format: ${credentialAccount.password.includes(":") ? "✅ Correct" : "❌ Incorrect"}`,
      );
      console.log(`      - Hash length: ${credentialAccount.password.length}`);

      // Vérifier le format du hash
      if (!credentialAccount.password.includes(":")) {
        console.log(`      ⚠️  Format de hash incorrect détecté`);
        console.log(`      💡 Le hash doit être au format 'salt:hash'`);

        // Proposition de correction
        console.log(
          `      🔧 Correction suggérée: Recréer le compte ou réinitialiser le mot de passe`,
        );
      } else {
        const parts = credentialAccount.password.split(":");
        if (
          parts.length !== 2 ||
          parts[0].length !== 32 ||
          parts[1].length !== 128
        ) {
          console.log(`      ⚠️  Format de hash suspect`);
          console.log(`      - Parties: ${parts.length} (devrait être 2)`);
          console.log(
            `      - Salt length: ${parts[0]?.length} (devrait être 32)`,
          );
          console.log(
            `      - Hash length: ${parts[1]?.length} (devrait être 128)`,
          );
        } else {
          console.log(`      ✅ Format de hash correct`);
        }
      }
    }

    // 5. Test de vérification de mot de passe avec mots de passe courants
    console.log("\n5️⃣ Test avec mots de passe courants...");

    const commonPasswords = [
      "password",
      "Password123",
      "password123",
      "123456",
      "test123",
      "motdepasse",
      "12345678",
      "admin",
      "user",
      "guest",
    ];

    for (const user of usersWithCredentials.slice(0, 1)) {
      // Test seulement le premier
      const credentialAccount = user.accounts.find(
        (acc) => acc.providerId === "credential" && acc.password,
      );

      if (!credentialAccount?.password) continue;

      console.log(`\n   🔐 Test pour ${user.email}:`);

      for (const testPassword of commonPasswords) {
        try {
          const isValid = await verifyPassword(
            testPassword,
            credentialAccount.password,
          );
          if (isValid) {
            console.log(`      🎉 ✅ Mot de passe trouvé: "${testPassword}"`);
            break;
          }
        } catch (error) {
          // Ignorer les erreurs silencieusement pour ce test
        }
      }
    }

    // 6. Vérifications de configuration additionnelles
    console.log("\n6️⃣ Vérifications de configuration...");

    // Vérifier que Better Auth est correctement configuré
    try {
      const authConfigPath = join(process.cwd(), "src", "lib", "auth.ts");
      const authConfig = readFileSync(authConfigPath, "utf-8");

      if (authConfig.includes("credential()")) {
        console.log("   ✅ Plugin credential configuré");
      } else {
        console.log("   ❌ Plugin credential non trouvé dans auth.ts");
      }

      if (authConfig.includes("prismaAdapter")) {
        console.log("   ✅ Adapter Prisma configuré");
      } else {
        console.log("   ❌ Adapter Prisma non trouvé dans auth.ts");
      }
    } catch (error) {
      console.log("   ⚠️  Impossible de lire le fichier auth.ts");
    }

    // 7. Recommandations finales
    console.log("\n7️⃣ Recommandations:");
    console.log("   📋 Actions recommandées:");
    console.log(
      "   1. Testez votre mot de passe avec: npx tsx scripts/test-user-login.ts",
    );
    console.log(
      "   2. Si le mot de passe est oublié, utilisez la réinitialisation",
    );
    console.log("   3. Vérifiez les logs du serveur lors de la connexion");
    console.log("   4. Assurez-vous que le serveur charge bien le .env.local");
    console.log(
      "   5. Essayez de vous connecter avec un nouveau compte de test",
    );

    console.log("\n✅ Diagnostic terminé!");
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour créer un utilisateur de test
export async function createTestUser() {
  console.log("🧪 Création d'un utilisateur de test...");

  const testEmail = "test@example.com";
  const testPassword = "Test123456";
  const testName = "Utilisateur Test";

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (existingUser) {
      console.log("⚠️  Utilisateur de test existe déjà");
      return existingUser.id;
    }

    // Créer le hash du mot de passe
    const hashedPassword = await hashPassword(testPassword);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: testName,
        emailVerified: new Date(), // Marquer comme vérifié pour éviter les blocages
        monthlyQuota: 5,
        quotaUsed: 0,
      },
    });

    // Créer le compte credential
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    console.log("✅ Utilisateur de test créé avec succès!");
    console.log(`   Email: ${testEmail}`);
    console.log(`   Mot de passe: ${testPassword}`);
    console.log(`   ID: ${user.id}`);

    return user.id;
  } catch (error) {
    console.error("❌ Erreur lors de la création:", error);
    throw error;
  }
}

// Exécuter le fix
if (require.main === module) {
  fixAuthIssue().catch(console.error);
}
