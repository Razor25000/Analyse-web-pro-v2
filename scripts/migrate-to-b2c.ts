/**
 * Script pour migrer vers une architecture B2C
 * Supprime les tables d'organisation et simplifie l'architecture
 */

import { config } from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@/generated/prisma";

async function migrateToB2C() {
  const prisma = new PrismaClient();

  try {
    console.log("🚀 Migration vers architecture B2C...\n");

    // Étape 1: Sauvegarder les données importantes
    console.log("💾 Sauvegarde des données importantes...");

    const users = await prisma.user.findMany();
    console.log(`   ✅ ${users.length} utilisateur(s) sauvegardé(s)`);

    // Étape 2: Nettoyer les sessions avec activeOrganizationId
    console.log("\n🧹 Nettoyage des sessions...");

    const updatedSessions = await prisma.session.updateMany({
      where: { activeOrganizationId: { not: null } },
      data: { activeOrganizationId: null },
    });
    console.log(`   ✅ ${updatedSessions.count} session(s) nettoyée(s)`);

    // Étape 3: Supprimer les tables d'organisation (dans l'ordre des dépendances)
    console.log("\n🗑️ Suppression des tables d'organisation...");

    // 3a. Supprimer les invitations (pas de dépendances)
    await prisma.$executeRaw`DROP TABLE IF EXISTS invitation CASCADE;`;
    console.log("   ✅ Table invitation supprimée");

    // 3b. Supprimer les membres (dépend de user et organization)
    await prisma.$executeRaw`DROP TABLE IF EXISTS member CASCADE;`;
    console.log("   ✅ Table member supprimée");

    // 3c. Supprimer les organisations (plus de dépendances)
    await prisma.$executeRaw`DROP TABLE IF EXISTS organization CASCADE;`;
    console.log("   ✅ Table organization supprimée");

    // Étape 4: Nettoyer les autres tables optionnelles
    console.log("\n🧽 Nettoyage optionnel...");

    try {
      // Supprimer audit_logs si elle existe et n'est pas utilisée
      await prisma.$executeRaw`DROP TABLE IF EXISTS audit_logs CASCADE;`;
      console.log("   ✅ Table audit_logs supprimée");
    } catch (error) {
      console.log("   ⚠️ Table audit_logs non trouvée (normal)");
    }

    try {
      // Supprimer supabase_syncs si elle existe
      await prisma.$executeRaw`DROP TABLE IF EXISTS supabase_syncs CASCADE;`;
      console.log("   ✅ Table supabase_syncs supprimée");
    } catch (error) {
      console.log("   ⚠️ Table supabase_syncs non trouvée (normal)");
    }

    // Étape 5: Vérifier l'état final
    console.log("\n🔍 Vérification finale...");

    const remainingTables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log("📋 Tables restantes :");
    remainingTables.forEach((table) => {
      console.log(`   - ${table.table_name}`);
    });

    // Étape 6: Vérifier les utilisateurs
    const finalUsers = await prisma.user.count();
    const finalQuotas = await prisma.user_quota.count();
    const finalSubs = await prisma.subscription.count();

    console.log("\n📊 État final :");
    console.log(`   ✅ ${finalUsers} utilisateur(s)`);
    console.log(`   ✅ ${finalQuotas} quota(s) utilisateur`);
    console.log(`   ✅ ${finalSubs} abonnement(s)`);

    console.log("\n🎉 Migration B2C terminée avec succès !");
    console.log("\n📋 Prochaines étapes :");
    console.log("   1. Mettre à jour le schéma Prisma (supprimer les modèles)");
    console.log("   2. Migrer les routes /orgs/[orgSlug] vers /dashboard");
    console.log("   3. Nettoyer le middleware.ts");
    console.log("   4. Tester l'application");
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateToB2C()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
