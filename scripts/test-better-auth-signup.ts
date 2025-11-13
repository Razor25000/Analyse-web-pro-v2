#!/usr/bin/env tsx

/**
 * Script pour tester l'inscription normale via Better Auth
 */

import { upfetch } from "../src/lib/up-fetch";
import { prisma } from "../src/lib/prisma";

const TEST_USER = {
  name: "Normal User",
  email: "normal.test@example.com",
  password: "SecurePassword123!",
};

async function testNormalSignup() {
  console.log("📝 Test inscription normale via Better Auth...");

  try {
    // 1. Nettoyer les données existantes
    await prisma.user.deleteMany({
      where: { email: TEST_USER.email },
    });

    // 2. Créer un compte via l'API Better Auth normale
    console.log("🔐 Création compte via Better Auth...");
    const signupResponse = await upfetch(
      "http://localhost:3000/api/auth/sign-up/email",
      {
        method: "POST",
        body: {
          name: TEST_USER.name,
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      },
    );

    console.log("Réponse inscription:", signupResponse);

    // 3. Vérifier l'utilisateur créé
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: {
        accounts: true,
      },
    });

    if (!user) {
      throw new Error("Utilisateur non créé");
    }

    console.log("✅ Utilisateur créé via Better Auth:", {
      id: user.id,
      email: user.email,
      accounts: user.accounts.length,
    });

    const account = user.accounts[0];
    if (account) {
      console.log("✅ Hash Better Auth:", {
        providerId: account.providerId,
        passwordLength: account.password?.length,
        passwordFormat: `${account.password?.substring(0, 50)  }...`,
        hasSeparator: account.password?.includes(":"),
      });

      if (account.password?.includes(":")) {
        const parts = account.password.split(":");
        console.log("📊 Structure hash Better Auth:", {
          saltLength: parts[0].length,
          hashLength: parts[1].length,
          saltHex: parts[0],
          hashStart: `${parts[1].substring(0, 20)  }...`,
        });
      }
    }

    // 4. Tester la connexion
    console.log("🔐 Test connexion avec le compte Better Auth...");
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

    console.log("✅ Connexion réussie avec Better Auth:", loginResponse);
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testNormalSignup().catch(console.error);
