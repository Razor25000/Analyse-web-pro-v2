#!/usr/bin/env tsx

/**
 * Script de test pour vérifier la synchronisation Supabase
 */

import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/prisma";
import { env } from "../src/lib/env";
import { logger } from "../src/lib/logger";

const supabase = createClient(
  env.SUPABASE_URL || "",
  env.SUPABASE_SERVICE_KEY || "",
  { auth: { persistSession: false } },
);

async function testSupabaseConnection() {
  console.log("🔍 Test de connexion à Supabase...\n");

  try {
    // Tester les tables
    const tables = ["profiles", "subscribers", "audits"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("count")
        .limit(1);

      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: accessible`);
      }
    }

    console.log("\n✅ Test de connexion terminé\n");
  } catch (error) {
    console.error("❌ Erreur de connexion:", error);
  }
}

async function testUserSync() {
  console.log("🔄 Test de synchronisation utilisateur...\n");

  try {
    // Créer un utilisateur de test
    const testUser = {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
    };

    // Simuler les données utilisateur
    const userData = {
      stripeCustomerId: "cus_test123",
      subscriptionTier: "free",
      monthlyQuota: 10,
      quotaUsed: 0,
      subscribed: false,
      subscriptionEnd: null,
    };

    console.log(`👤 Test avec utilisateur: ${testUser.email}`);

    // Tester la synchronisation
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: testUser.id,
        email: testUser.email,
        full_name: testUser.name,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (profileError) {
      console.log(`❌ Erreur profil: ${profileError.message}`);
    } else {
      console.log("✅ Profil synchronisé");
    }

    const { error: subscriberError } = await supabase
      .from("subscribers")
      .upsert(
        {
          user_id: testUser.id,
          email: testUser.email,
          stripe_customer_id: userData.stripeCustomerId,
          subscribed: userData.subscribed,
          subscription_tier: userData.subscriptionTier,
          subscription_end: userData.subscriptionEnd?.toISOString(),
          monthly_quota: userData.monthlyQuota,
          quota_used: userData.quotaUsed,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

    if (subscriberError) {
      console.log(`❌ Erreur abonnement: ${subscriberError.message}`);
    } else {
      console.log("✅ Abonnement synchronisé");
    }

    console.log("\n✅ Test de synchronisation terminé\n");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  }
}

async function main() {
  console.log("🚀 Test de synchronisation Supabase ↔ Prisma\n");
  console.log("=".repeat(50));

  // Vérifier la configuration
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.error("❌ Variables d'environnement Supabase manquantes");
    process.exit(1);
  }

  await testSupabaseConnection();
  await testUserSync();

  console.log("🎉 Tests terminés!");
}

if (require.main === module) {
  main().catch(console.error);
}
