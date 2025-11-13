#!/usr/bin/env tsx

/**
 * Script pour nettoyer les pré-inscriptions en attente ou expirées
 */

import { prisma } from "../src/lib/prisma";

async function cleanPreRegistrations() {
  console.log("🧹 Nettoyage des pré-inscriptions...");

  try {
    // Supprimer les utilisateurs de test
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["test.secure@example.com", "regis.laffond@yahoo.fr"],
        },
      },
    });

    // Supprimer toutes les pré-inscriptions expirées et complétées
    const expiredResult = await prisma.preRegistration.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } }, // Expirées
          { status: { in: ["expired", "cancelled", "completed"] } }, // Statuts terminaux
        ],
      },
    });

    console.log(
      `📊 ${expiredResult.count} pré-inscriptions expirées supprimées`,
    );

    // Lister les pré-inscriptions restantes
    const remaining = await prisma.preRegistration.findMany({
      select: {
        id: true,
        email: true,
        status: true,
        selectedPlan: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`📋 ${remaining.length} pré-inscriptions restantes :`);
    remaining.forEach((pre) => {
      const expired = pre.expiresAt < new Date() ? "⏰ EXPIRÉ" : "✅ Valide";
      console.log(
        `  • ${pre.email} | ${pre.status} | ${pre.selectedPlan} | ${expired}`,
      );
    });

    if (remaining.length === 0) {
      console.log("✨ Aucune pré-inscription restante");
    }
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
cleanPreRegistrations().catch(console.error);
