#!/usr/bin/env tsx

/**
 * Script de nettoyage des mots de passe non sécurisés
 *
 * Ce script identifie et nettoie les mots de passe stockés en clair :
 * - Pré-inscriptions avec mots de passe en clair
 * - Comptes avec mots de passe en clair (cas d'urgence)
 * - Supprime les données expirées non sécurisées
 * - Hache les données valides non sécurisées
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashPassword, isPasswordHashed } from "@/lib/auth/password-utils";

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function cleanupInsecurePasswords() {
  console.log("🧹 Nettoyage des mots de passe non sécurisés\n");

  try {
    let cleanupCount = 0;
    let hashedCount = 0;
    let deletedCount = 0;

    // ========================================
    // 1. Audit initial
    // ========================================
    console.log("1️⃣ Audit initial des données non sécurisées...");

    const insecurePreRegistrations = await prisma.preRegistration.findMany({
      where: {
        password: {
          not: {
            contains: ":",
          },
        },
      },
    });

    const insecureAccounts = await prisma.account.findMany({
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
      `   🔍 Pré-inscriptions avec mots de passe en clair: ${insecurePreRegistrations.length}`,
    );
    console.log(
      `   🔍 Comptes avec mots de passe en clair: ${insecureAccounts.length}`,
    );
    console.log("");

    if (
      insecurePreRegistrations.length === 0 &&
      insecureAccounts.length === 0
    ) {
      console.log(
        "✅ Aucune donnée non sécurisée trouvée - La base est propre !",
      );
      return;
    }

    // ========================================
    // 2. Nettoyage des pré-inscriptions
    // ========================================
    console.log("2️⃣ Nettoyage des pré-inscriptions...");

    for (const preReg of insecurePreRegistrations) {
      const now = new Date();

      // Si expirée ou en status failed/cancelled, supprimer
      if (
        preReg.expiresAt < now ||
        preReg.status === "expired" ||
        preReg.status === "cancelled"
      ) {
        console.log(
          `   🗑️  Suppression pré-inscription expirée/annulée: ${preReg.email}`,
        );
        await prisma.preRegistration.delete({
          where: { id: preReg.id },
        });
        deletedCount++;
        cleanupCount++;
      }
      // Si status completed, l'utilisateur existe probablement déjà
      else if (preReg.status === "completed") {
        console.log(
          `   🗑️  Suppression pré-inscription complétée: ${preReg.email}`,
        );
        await prisma.preRegistration.delete({
          where: { id: preReg.id },
        });
        deletedCount++;
        cleanupCount++;
      }
      // Si pending et valide, hacher le mot de passe
      else if (preReg.status === "pending") {
        console.log(`   🔒 Hachage mot de passe pour: ${preReg.email}`);

        try {
          const hashedPassword = await hashPassword(preReg.password);
          await prisma.preRegistration.update({
            where: { id: preReg.id },
            data: { password: hashedPassword },
          });

          console.log(`   ✅ Mot de passe haché pour: ${preReg.email}`);
          hashedCount++;
          cleanupCount++;
        } catch (error) {
          console.error(`   ❌ Erreur hachage pour ${preReg.email}:`, error);
        }
      }
    }

    // ========================================
    // 3. Nettoyage des comptes (cas d'urgence)
    // ========================================
    console.log("\n3️⃣ Vérification des comptes...");

    for (const account of insecureAccounts) {
      console.log(
        `   ⚠️  ALERTE: Compte avec mot de passe en clair trouvé: ${account.userId}`,
      );

      // Récupérer l'utilisateur pour plus d'infos
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
      });

      if (user) {
        console.log(`     📧 Email utilisateur: ${user.email}`);

        // En cas d'urgence, on peut hacher le mot de passe
        // ATTENTION: Cela pourrait empêcher l'utilisateur de se connecter
        // si le mot de passe n'est pas exactement celui attendu
        const shouldHashAccountPassword = false; // À activer manuellement si nécessaire

        if (shouldHashAccountPassword && account.password) {
          console.log(`     🔒 Hachage d'urgence du mot de passe compte...`);

          try {
            const hashedPassword = await hashPassword(account.password);
            await prisma.account.update({
              where: { id: account.id },
              data: { password: hashedPassword },
            });

            console.log(`     ✅ Mot de passe compte haché`);
            hashedCount++;
            cleanupCount++;
          } catch (error) {
            console.error(`     ❌ Erreur hachage compte:`, error);
          }
        } else {
          console.log(
            `     ⚠️  Mot de passe compte NON haché (activation manuelle requise)`,
          );
        }
      }
    }

    // ========================================
    // 4. Audit final
    // ========================================
    console.log("\n4️⃣ Audit final...");

    const remainingInsecurePreRegs = await prisma.preRegistration.findMany({
      where: {
        password: {
          not: {
            contains: ":",
          },
        },
      },
    });

    const remainingInsecureAccounts = await prisma.account.findMany({
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
      `   🔍 Pré-inscriptions non sécurisées restantes: ${remainingInsecurePreRegs.length}`,
    );
    console.log(
      `   🔍 Comptes non sécurisés restants: ${remainingInsecureAccounts.length}`,
    );

    // ========================================
    // 5. Rapport final
    // ========================================
    console.log("\n📊 RAPPORT DE NETTOYAGE:");
    console.log(`   🗑️  Enregistrements supprimés: ${deletedCount}`);
    console.log(`   🔒 Mots de passe hachés: ${hashedCount}`);
    console.log(`   📈 Total traité: ${cleanupCount}`);
    console.log("");

    if (
      remainingInsecurePreRegs.length === 0 &&
      remainingInsecureAccounts.length === 0
    ) {
      console.log("🎉 NETTOYAGE TERMINÉ - BASE DE DONNÉES SÉCURISÉE !");
    } else {
      console.log(
        "⚠️  Attention: Des données non sécurisées restent à traiter manuellement",
      );

      if (remainingInsecureAccounts.length > 0) {
        console.log("\n🚨 COMPTES AVEC MOTS DE PASSE EN CLAIR:");
        for (const account of remainingInsecureAccounts) {
          const user = await prisma.user.findUnique({
            where: { id: account.userId },
          });
          console.log(
            `   - ${user?.email || account.userId} (ID: ${account.id})`,
          );
        }
        console.log(
          "\nACTION REQUISE: Contactez les utilisateurs pour réinitialiser leurs mots de passe",
        );
      }
    }
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanupInsecurePasswords();
}

export { cleanupInsecurePasswords };
