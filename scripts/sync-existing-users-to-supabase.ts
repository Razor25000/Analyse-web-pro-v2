#!/usr/bin/env tsx

/**
 * Synchronise les utilisateurs existants de Prisma vers Supabase
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://muzzgghqpspummcrwxfa.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11enpnZ2hxcHNwdW1tY3J3eGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1Mjk0OSwiZXhwIjoyMDcyOTI4OTQ5fQ.XKlfT2omO1-27C2usQei_113_Lu8Hgj3YehuuyTCNms";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function syncExistingUsers() {
  console.log("🔄 Synchronisation des utilisateurs existants vers Supabase...");

  try {
    // Récupérer tous les utilisateurs de Prisma
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        subscriptionTier: true,
        monthlyQuota: true,
        quotaUsed: true,
        subscribed: true,
        subscriptionEnd: true,
        createdAt: true,
      },
    });

    console.log(`📊 ${users.length} utilisateurs trouvés dans Prisma`);

    let syncedProfiles = 0;
    let syncedSubscribers = 0;
    let errors = 0;

    for (const user of users) {
      console.log(`\n👤 Synchronisation: ${user.email} (${user.id})`);

      try {
        // 1. Synchroniser le profil
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            email: user.email,
            full_name: user.name || null,
            created_at: user.createdAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

        if (profileError) {
          console.error("❌ Erreur profil:", profileError.message);
          errors++;
          continue;
        }

        syncedProfiles++;
        console.log("✅ Profil synchronisé");

        // 2. Synchroniser l'abonnement
        const { error: subscriberError } = await supabase
          .from("subscribers")
          .upsert(
            {
              user_id: user.id,
              email: user.email,
              stripe_customer_id: user.stripeCustomerId || null,
              subscribed: user.subscribed || false,
              subscription_tier: user.subscriptionTier || "free",
              subscription_end: user.subscriptionEnd?.toISOString() || null,
              monthly_quota: user.monthlyQuota || 5,
              quota_used: user.quotaUsed || 0,
              quota_reset_date: null, // À calculer selon vos règles métier
              created_at: user.createdAt.toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            },
          );

        if (subscriberError) {
          console.error("❌ Erreur abonnement:", subscriberError.message);
          errors++;
          continue;
        }

        syncedSubscribers++;
        console.log("✅ Abonnement synchronisé");
      } catch (error: any) {
        console.error(`❌ Erreur utilisateur ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Résultats de la synchronisation:`);
    console.log(`✅ Profils synchronisés: ${syncedProfiles}/${users.length}`);
    console.log(
      `✅ Abonnements synchronisés: ${syncedSubscribers}/${users.length}`,
    );
    console.log(`❌ Erreurs: ${errors}`);

    // Vérification finale
    const { count: profilesCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: subscribersCount } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true });

    console.log(`\n🔍 Vérification Supabase:`);
    console.log(`📊 Profils dans Supabase: ${profilesCount}`);
    console.log(`📊 Abonnés dans Supabase: ${subscribersCount}`);
  } catch (error: any) {
    console.error("❌ Erreur générale:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncExistingUsers()
  .then(() => console.log("\n🎉 Synchronisation terminée"))
  .catch(console.error);
