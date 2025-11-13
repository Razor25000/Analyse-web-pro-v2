#!/usr/bin/env tsx

/**
 * Migration Étape 2: Migrer les données existantes de Supabase vers PostgreSQL
 * Ce script synchronise les données des tables subscribers et profiles de Supabase
 * vers les nouvelles colonnes de la table user dans PostgreSQL
 */

import { supabaseAdmin } from "../src/lib/supabase";
import { prisma } from "../src/lib/prisma";

async function migrateDataFromSupabaseToUser() {
  console.log(
    "🚀 Migration Étape 2: Migration des données Supabase → PostgreSQL",
  );

  if (!supabaseAdmin) {
    throw new Error("❌ Supabase admin client non disponible");
  }

  try {
    // 1. Récupérer les données subscribers de Supabase
    console.log("📊 Récupération des données subscribers depuis Supabase...");
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from("subscribers")
      .select("*");

    if (
      subscribersError &&
      !subscribersError.message.includes("does not exist")
    ) {
      throw new Error(
        `Erreur lecture subscribers: ${subscribersError.message}`,
      );
    }

    console.log(`📋 Subscribers trouvés: ${subscribers?.length || 0}`);

    // 2. Récupérer les données profiles de Supabase
    console.log("📊 Récupération des données profiles depuis Supabase...");
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profilesError && !profilesError.message.includes("does not exist")) {
      throw new Error(`Erreur lecture profiles: ${profilesError.message}`);
    }

    console.log(`📋 Profiles trouvés: ${profiles?.length || 0}`);

    // 3. Récupérer tous les utilisateurs existants de Better Auth
    console.log("👥 Récupération des utilisateurs Better Auth...");
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        monthlyQuota: true,
        quotaUsed: true,
        subscriptionTier: true,
        company: true,
        subscribed: true,
      },
    });

    console.log(`👤 Utilisateurs Better Auth trouvés: ${existingUsers.length}`);

    // 4. Créer une map des données Supabase par email
    const subscribersByEmail = new Map();
    const profilesByEmail = new Map();
    const profilesByUserId = new Map();

    if (subscribers) {
      subscribers.forEach((sub) => {
        subscribersByEmail.set(sub.email, sub);
      });
    }

    if (profiles) {
      profiles.forEach((profile) => {
        profilesByEmail.set(profile.email, profile);
        if (profile.user_id) {
          profilesByUserId.set(profile.user_id, profile);
        }
      });
    }

    // 5. Migrer les données pour chaque utilisateur
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of existingUsers) {
      try {
        // Chercher les données correspondantes dans Supabase
        const subscriber = subscribersByEmail.get(user.email);
        const profile =
          profilesByEmail.get(user.email) || profilesByUserId.get(user.id);

        // Préparer les données de mise à jour
        const updateData: any = {};
        let hasUpdates = false;

        // Données des subscribers (quotas et abonnements)
        if (subscriber) {
          console.log(`🔄 Migration subscriber pour: ${user.email}`);

          if (
            subscriber.monthly_quota &&
            subscriber.monthly_quota !== user.monthlyQuota
          ) {
            updateData.monthlyQuota = subscriber.monthly_quota;
            hasUpdates = true;
          }

          if (
            subscriber.quota_used !== undefined &&
            subscriber.quota_used !== user.quotaUsed
          ) {
            updateData.quotaUsed = subscriber.quota_used;
            hasUpdates = true;
          }

          if (
            subscriber.subscription_tier &&
            subscriber.subscription_tier !== user.subscriptionTier
          ) {
            updateData.subscriptionTier = subscriber.subscription_tier;
            hasUpdates = true;
          }

          if (
            subscriber.subscribed !== undefined &&
            subscriber.subscribed !== user.subscribed
          ) {
            updateData.subscribed = subscriber.subscribed;
            hasUpdates = true;
          }

          if (subscriber.quota_reset_date) {
            updateData.quotaResetDate = new Date(subscriber.quota_reset_date);
            hasUpdates = true;
          }

          if (subscriber.subscription_end) {
            updateData.subscriptionEnd = new Date(subscriber.subscription_end);
            hasUpdates = true;
          }
        }

        // Données des profiles (informations personnelles)
        if (profile) {
          console.log(`🔄 Migration profile pour: ${user.email}`);

          if (profile.company && profile.company !== user.company) {
            updateData.company = profile.company;
            hasUpdates = true;
          }

          // Si le nom dans profile est différent et plus complet
          if (
            profile.full_name &&
            profile.full_name !== user.name &&
            profile.full_name.length > (user.name?.length || 0)
          ) {
            updateData.name = profile.full_name;
            hasUpdates = true;
          }
        }

        // Appliquer les mises à jour si nécessaire
        if (hasUpdates) {
          console.log(`📝 Mise à jour de l'utilisateur: ${user.email}`, {
            updates: Object.keys(updateData),
          });

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          updatedCount++;
        } else {
          console.log(`✅ Utilisateur déjà à jour: ${user.email}`);
        }
      } catch (error: any) {
        console.error(
          `❌ Erreur migration utilisateur ${user.email}:`,
          error.message,
        );
        errorCount++;
      }
    }

    // 6. Résumé de la migration
    console.log("\n📊 Résumé de la migration:");
    console.log(`👥 Utilisateurs traités: ${existingUsers.length}`);
    console.log(`📝 Utilisateurs mis à jour: ${updatedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📋 Subscribers dans Supabase: ${subscribers?.length || 0}`);
    console.log(`👤 Profiles dans Supabase: ${profiles?.length || 0}`);

    // 7. Vérification finale - afficher quelques utilisateurs migrés
    console.log("\n🔍 Vérification des données migrées:");
    const verificationUsers = await prisma.user.findMany({
      select: {
        email: true,
        monthlyQuota: true,
        quotaUsed: true,
        subscriptionTier: true,
        company: true,
        subscribed: true,
      },
      take: 3,
    });

    verificationUsers.forEach((user) => {
      console.log(`📋 ${user.email}:`, {
        quota: `${user.quotaUsed}/${user.monthlyQuota}`,
        tier: user.subscriptionTier,
        subscribed: user.subscribed,
        company: user.company || "N/A",
      });
    });

    console.log("✅ Migration Étape 2 terminée avec succès!");
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  migrateDataFromSupabaseToUser()
    .then(() => {
      console.log("🎉 Migration Étape 2 réussie");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration Étape 2 échouée:", error);
      process.exit(1);
    });
}

export { migrateDataFromSupabaseToUser };
