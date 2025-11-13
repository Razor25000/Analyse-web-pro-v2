#!/usr/bin/env tsx

/**
 * Créer les tables manquantes dans Supabase
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🔧 Création des tables manquantes dans Supabase");
  console.log("===============================================");

  try {
    // Créer la table profiles
    console.log("\n📋 Création de la table profiles...");
    await createProfilesTable();

    // Créer la table subscribers
    console.log("\n📋 Création de la table subscribers...");
    await createSubscribersTable();

    // Créer les autres tables nécessaires
    console.log("\n📋 Création des tables support...");
    await createSupportTables();

    console.log("\n🎉 Tables créées avec succès !");
    console.log("\n🔄 Maintenant testez Prisma:");
    console.log("   npx prisma generate");
    console.log("   npx tsx scripts/test-database-connections.ts");
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

async function createProfilesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.profiles (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      full_name TEXT,
      company TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
    CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
  `;

  try {
    await supabase.rpc("exec_sql", { sql_query: sql });
    console.log("   ✅ Table profiles créée");
  } catch (error) {
    console.log("   ⚠️ Création manuelle nécessaire:", error.message);
    console.log("   💡 Exécutez ce SQL dans votre dashboard Supabase:");
    console.log(sql);
  }
}

async function createSubscribersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.subscribers (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      stripe_customer_id TEXT,
      subscribed BOOLEAN DEFAULT false,
      subscription_tier TEXT DEFAULT 'free',
      subscription_end TIMESTAMPTZ,
      monthly_quota INTEGER DEFAULT 10,
      quota_used INTEGER DEFAULT 0,
      quota_reset_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS subscribers_user_id_idx ON public.subscribers(user_id);
    CREATE INDEX IF NOT EXISTS subscribers_email_idx ON public.subscribers(email);
    CREATE INDEX IF NOT EXISTS subscribers_stripe_customer_id_idx ON public.subscribers(stripe_customer_id);
  `;

  try {
    await supabase.rpc("exec_sql", { sql_query: sql });
    console.log("   ✅ Table subscribers créée");
  } catch (error) {
    console.log("   ⚠️ Création manuelle nécessaire:", error.message);
    console.log("   💡 Exécutez ce SQL dans votre dashboard Supabase:");
    console.log(sql);
  }
}

async function createSupportTables() {
  // Créer les autres tables nécessaires selon le schéma Prisma
  const tables = [
    {
      name: "users",
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name TEXT,
          email TEXT NOT NULL UNIQUE,
          email_verified TIMESTAMPTZ,
          image TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          monthly_quota INTEGER DEFAULT 10,
          quota_used INTEGER DEFAULT 0,
          quota_reset_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
          subscription_tier TEXT DEFAULT 'free'
        );

        CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
        CREATE INDEX IF NOT EXISTS users_subscription_tier_idx ON public.users(subscription_tier);
      `,
    },
    {
      name: "pre_registrations",
      sql: `
        CREATE TABLE IF NOT EXISTS public.pre_registrations (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          email TEXT NOT NULL UNIQUE,
          plan_id TEXT NOT NULL,
          stripe_session_id TEXT,
          verification_token TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS pre_registrations_email_idx ON public.pre_registrations(email);
        CREATE INDEX IF NOT EXISTS pre_registrations_stripe_session_id_idx ON public.pre_registrations(stripe_session_id);
      `,
    },
  ];

  for (const table of tables) {
    try {
      await supabase.rpc("exec_sql", { sql_query: table.sql });
      console.log(`   ✅ Table ${table.name} créée`);
    } catch (error) {
      console.log(`   ⚠️ Table ${table.name}: ${error.message}`);
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
}
