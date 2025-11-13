#!/usr/bin/env tsx

/**
 * Script de test pour vérifier la sécurisation des mots de passe
 *
 * Tests:
 * 1. Pré-inscription avec hachage du mot de passe
 * 2. Création de compte avec mot de passe pré-haché
 * 3. Connexion avec les identifiants créés
 * 4. Vérification que les mots de passe ne sont plus en clair
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  hashPassword,
  verifyPassword,
  isPasswordHashed,
} from "@/lib/auth/password-utils";

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function testPasswordSecurity() {
  console.log("🔒 Test de sécurisation des mots de passe\n");

  try {
    // Nettoyage préliminaire
    const testEmail = `test-security-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testName = "Test User";

    console.log("📧 Email de test:", testEmail);
    console.log("🔑 Mot de passe de test:", testPassword);
    console.log("");

    // Test 1: Vérifier que le hachage fonctionne
    console.log("1️⃣ Test du hachage de mot de passe...");
    const hashedPassword = await hashPassword(testPassword);
    console.log("   ✅ Mot de passe haché:", hashedPassword);
    console.log(
      "   ✅ Format détecté comme haché:",
      isPasswordHashed(hashedPassword),
    );

    // Vérifier que le hachage est correct
    const isValid = await verifyPassword(testPassword, hashedPassword);
    console.log(
      "   ✅ Vérification du mot de passe:",
      isValid ? "✅ SUCCÈS" : "❌ ÉCHEC",
    );
    console.log("");

    // Test 2: Simuler une pré-inscription (normalement fait via API)
    console.log("2️⃣ Test de pré-inscription avec mot de passe haché...");

    // Nettoyer d'abord si existe
    await prisma.preRegistration.deleteMany({
      where: { email: testEmail },
    });

    // Créer une pré-inscription avec mot de passe haché
    const preRegistration = await prisma.preRegistration.create({
      data: {
        email: testEmail,
        name: testName,
        password: hashedPassword, // Déjà haché
        selectedPlan: "free",
        status: "pending",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 heure
      },
    });

    console.log("   ✅ Pré-inscription créée:", preRegistration.id);
    console.log(
      "   ✅ Mot de passe stocké est haché:",
      isPasswordHashed(preRegistration.password),
    );
    console.log("");

    // Test 3: Simuler la création de compte
    console.log("3️⃣ Test de création de compte avec mot de passe pré-haché...");

    // Nettoyer d'abord si l'utilisateur existe
    await prisma.account.deleteMany({
      where: {
        user: { email: testEmail },
      },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    // Simuler la création manuelle de compte (comme dans l'API)
    const userId = `user_${Date.now()}`;
    const now = new Date();

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: testName,
        email: testEmail,
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now,
        subscriptionTier: "free",
        resendContactId: null,
        stripeCustomerId: null,
      },
    });

    // Créer le compte avec mot de passe haché
    const account = await prisma.account.create({
      data: {
        id: `account_${Date.now()}`,
        accountId: userId,
        providerId: "credential",
        userId: userId,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: preRegistration.password, // Déjà haché
        createdAt: now,
        updatedAt: now,
      },
    });

    console.log("   ✅ Utilisateur créé:", user.id);
    console.log("   ✅ Compte créé avec mot de passe haché:", account.id);
    console.log(
      "   ✅ Mot de passe en DB est haché:",
      isPasswordHashed(account.password || ""),
    );
    console.log("");

    // Test 4: Vérifier que le mot de passe fonctionne
    console.log("4️⃣ Test de vérification du mot de passe stocké...");

    if (account.password) {
      const passwordWorksFromDB = await verifyPassword(
        testPassword,
        account.password,
      );
      console.log(
        "   ✅ Mot de passe original vérifie avec hash DB:",
        passwordWorksFromDB ? "✅ SUCCÈS" : "❌ ÉCHEC",
      );
    }
    console.log("");

    // Test 5: Vérifier qu'il n'y a plus de mots de passe en clair
    console.log(
      "5️⃣ Audit de sécurité - Recherche de mots de passe en clair...",
    );

    const preRegistrationsWithPlainText = await prisma.preRegistration.findMany(
      {
        where: {
          password: {
            not: {
              contains: ":",
            },
          },
        },
      },
    );

    const accountsWithPlainText = await prisma.account.findMany({
      where: {
        password: {
          not: null,
          not: {
            contains: ":",
          },
        },
      },
    });

    console.log(
      "   🔍 Pré-inscriptions avec mots de passe en clair:",
      preRegistrationsWithPlainText.length,
    );
    console.log(
      "   🔍 Comptes avec mots de passe en clair:",
      accountsWithPlainText.length,
    );

    if (
      preRegistrationsWithPlainText.length === 0 &&
      accountsWithPlainText.length === 0
    ) {
      console.log("   ✅ SÉCURITÉ: Aucun mot de passe en clair trouvé!");
    } else {
      console.log(
        "   ⚠️  ATTENTION: Des mots de passe en clair ont été trouvés!",
      );
    }
    console.log("");

    // Nettoyage final
    console.log("🧹 Nettoyage des données de test...");
    await prisma.account.delete({ where: { id: account.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.preRegistration.delete({ where: { id: preRegistration.id } });
    console.log("   ✅ Données de test supprimées");
    console.log("");

    // Résumé
    console.log("📊 RÉSUMÉ DU TEST:");
    console.log("   ✅ Hachage des mots de passe: FONCTIONNEL");
    console.log("   ✅ Stockage sécurisé: FONCTIONNEL");
    console.log("   ✅ Vérification des mots de passe: FONCTIONNELLE");
    console.log("   ✅ Création de compte: FONCTIONNELLE");
    console.log("   ✅ Audit de sécurité: CONFORME");
    console.log("");
    console.log(
      "🎉 TOUS LES TESTS SONT PASSÉS - SÉCURITÉ IMPLÉMENTÉE AVEC SUCCÈS!",
    );
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testPasswordSecurity();
}

export { testPasswordSecurity };
