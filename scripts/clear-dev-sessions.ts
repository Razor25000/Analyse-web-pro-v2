#!/usr/bin/env tsx

/**
 * Script pour nettoyer toutes les sessions actives au démarrage du serveur de dev.
 * Utile pour s'assurer que la page home reste publique et que les développeurs
 * repartent toujours à zéro.
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function clearSessions() {
  try {
    console.log("🧹 Nettoyage des sessions en cours...");

    // Compter les sessions avant suppression
    const sessionCount = await prisma.session.count();
    console.log(`📊 Sessions trouvées: ${sessionCount}`);

    if (sessionCount === 0) {
      console.log("✅ Aucune session à nettoyer");
      return;
    }

    // Supprimer toutes les sessions
    const result = await prisma.session.deleteMany();

    console.log(`✅ ${result.count} sessions supprimées avec succès`);
    console.log("🏠 La page home sera maintenant publique");
  } catch (error) {
    console.warn(
      "⚠️ Problème de connexion à la base de données:",
      error.message,
    );

    if (error.message.includes("Authentication failed")) {
      console.log("💡 Solutions possibles:");
      console.log("   1. Vérifier les identifiants Supabase dans .env.local");
      console.log("   2. Régénérer le mot de passe de la base dans Supabase");
      console.log("   3. Vérifier que le projet Supabase n'est pas en pause");
      console.log("");
      console.log(
        "🚀 Le serveur de développement va démarrer sans nettoyage des sessions",
      );
      console.log("   (vous pouvez corriger la DB plus tard)");
    } else {
      console.error("❌ Erreur inattendue:", error);
    }

    // Ne pas faire échouer le processus - permettre au dev server de démarrer
    console.log("🎯 Démarrage du serveur de dev en cours...");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  clearSessions();
}

export { clearSessions };
