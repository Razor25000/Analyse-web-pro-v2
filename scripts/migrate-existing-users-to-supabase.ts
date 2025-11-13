#!/usr/bin/env tsx

/**
 * Script pour migrer les utilisateurs existants de SQLite vers Supabase
 */

import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/prisma";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function migrateExistingUsersToSupabase() {
  console.log("🚀 Migration des utilisateurs existants vers Supabase\n");

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
        company: true,
        createdAt: true,
      },
    });

    console.log(`👥 ${users.length} utilisateur(s) trouvé(s) dans SQLite\n`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`🔄 Migration de: ${user.email}`);

        // 1. Migrer le profil
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            email: user.email,
            full_name: user.name,
            company: user.company,
            created_at: user.createdAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

        if (profileError) {
          console.error(`❌ Erreur profil pour ${user.email}:`, profileError);
          errorCount++;
          continue;
        }

        // 2. Migrer les informations d'abonnement
        const { error: subscriberError } = await supabase
          .from("subscribers")
          .upsert(
            {
              user_id: user.id,
              email: user.email,
              stripe_customer_id: user.stripeCustomerId,
              subscribed: user.subscribed,
              subscription_tier: user.subscriptionTier,
              subscription_end: user.subscriptionEnd?.toISOString(),
              monthly_quota: user.monthlyQuota,
              quota_used: user.quotaUsed,
              created_at: user.createdAt.toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            },
          );

        if (subscriberError) {
          console.error(
            `❌ Erreur abonnement pour ${user.email}:`,
            subscriberError,
          );
          errorCount++;
          continue;
        }

        console.log(`✅ Utilisateur migré: ${user.email}`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Erreur générale pour ${user.email}:`, error);
        errorCount++;
      }
    }

    // Vérification finale
    console.log("\n📊 Résumé de la migration:");
    console.log(`✅ Migrés: ${migratedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📋 Total: ${users.length}`);

    if (migratedCount > 0) {
      console.log("\n🔍 Vérification des données migrées:");

      const { data: profiles, error: checkError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .limit(5);

      if (!checkError && profiles) {
        profiles.forEach((profile) => {
          console.log(`   👤 ${profile.email} (${profile.full_name || "N/A"})`);
        });
      }
    }

    console.log("\n✅ Migration terminée!");
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("🔄 Migration SQLite → Supabase\n");
  console.log("=".repeat(50));

  // Vérifier la configuration
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Variables d'environnement Supabase manquantes:");
    console.error(`   SUPABASE_URL: ${supabaseUrl ? "✅" : "❌"}`);
    console.error(
      `   SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? "✅" : "❌"}`,
    );
    process.exit(1);
  }

  // Tester la connexion Supabase
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    if (error && !error.message.includes("does not exist")) {
      console.error("❌ Erreur de connexion Supabase:", error);
      console.log("\n💡 Assurez-vous d'avoir créé les tables Supabase:");
      console.log("   1. Exécutez le fichier supabase-setup.sql dans Supabase");
      console.log(
        "   2. Ou créez les tables manuellement dans l'interface Supabase",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Impossible de se connecter à Supabase:", error);
    process.exit(1);
  }

  await migrateExistingUsersToSupabase();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}
