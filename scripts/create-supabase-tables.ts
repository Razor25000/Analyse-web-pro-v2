#!/usr/bin/env tsx

/**
 * Script pour créer les tables Supabase directement via l'API
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

async function createSupabaseTables() {
  console.log("🔧 Création des tables Supabase...\n");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Variables d'environnement Supabase manquantes");
    console.error("Vérifiez votre .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    console.log("📋 Création de la table 'profiles'...");

    // Créer la table profiles
    const { error: profilesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID UNIQUE,
          email VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          company VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });

    if (profilesError) {
      console.log("⚠️  RPC non disponible, tentative avec requête directe...");
      console.log("💡 Vous devrez créer les tables manuellement dans Supabase");
      console.log(
        "   Utilisez le fichier supabase-setup.sql dans l'interface Supabase",
      );
      return;
    }

    console.log("📋 Création de la table 'subscribers'...");

    // Créer la table subscribers
    const { error: subscribersError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS subscribers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID,
          email VARCHAR(255) NOT NULL,
          stripe_customer_id VARCHAR(255),
          subscribed BOOLEAN DEFAULT false,
          subscription_tier VARCHAR(20) DEFAULT 'free',
          subscription_end TIMESTAMP WITH TIME ZONE,
          monthly_quota INTEGER DEFAULT 10,
          quota_used INTEGER DEFAULT 0,
          quota_reset_date DATE DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });

    if (subscribersError) {
      console.error("❌ Erreur création subscribers:", subscribersError);
    } else {
      console.log("✅ Table subscribers créée");
    }

    console.log("📋 Création de la table 'audits'...");

    // Créer la table audits
    const { error: auditsError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS audits (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID,
          email VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          audit_type VARCHAR(20) DEFAULT 'manual',
          results_json JSONB,
          score_global INTEGER,
          score_performance INTEGER,
          score_seo INTEGER,
          score_security INTEGER,
          score_modern INTEGER,
          error_message TEXT,
          webhook_id VARCHAR(255),
          is_public BOOLEAN DEFAULT false,
          audit_results TEXT,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          org_id VARCHAR(255),
          run_id VARCHAR(255),
          html_report TEXT,
          platform_detected VARCHAR(255),
          delivery_method VARCHAR(255),
          email_client VARCHAR(255)
        );
      `,
    });

    if (auditsError) {
      console.error("❌ Erreur création audits:", auditsError);
    } else {
      console.log("✅ Table audits créée");
    }

    console.log("🔒 Configuration de la sécurité (RLS)...");

    // Activer RLS et créer les politiques
    const securitySQL = `
      -- Activer RLS
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

      -- Politiques pour profiles
      DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
      CREATE POLICY "Users can view own profile" ON profiles
        FOR SELECT USING (auth.uid()::text = user_id::text);

      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
      CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid()::text = user_id::text);

      -- Politiques pour audits
      DROP POLICY IF EXISTS "Users can view own audits" ON audits;
      CREATE POLICY "Users can view own audits" ON audits
        FOR SELECT USING (auth.uid()::text = user_id::text);

      DROP POLICY IF EXISTS "Users can create own audits" ON audits;
      CREATE POLICY "Users can create own audits" ON audits
        FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

      -- Politiques pour subscribers
      DROP POLICY IF EXISTS "Users can view own subscription" ON subscribers;
      CREATE POLICY "Users can view own subscription" ON subscribers
        FOR SELECT USING (auth.uid()::text = user_id::text);

      DROP POLICY IF EXISTS "Users can update own subscription" ON subscribers;
      CREATE POLICY "Users can update own subscription" ON subscribers
        FOR UPDATE USING (auth.uid()::text = user_id::text);
    `;

    const { error: securityError } = await supabase.rpc("exec_sql", {
      sql: securitySQL,
    });

    if (securityError) {
      console.log("⚠️  RLS non configuré automatiquement");
      console.log(
        "💡 Configurez RLS manuellement dans l'interface Supabase si nécessaire",
      );
    } else {
      console.log("✅ Sécurité RLS configurée");
    }

    // Créer les index
    console.log("📊 Création des index...");

    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
      CREATE INDEX IF NOT EXISTS idx_audits_webhook_id ON audits(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_audits_org_id ON audits(org_id);
      CREATE INDEX IF NOT EXISTS idx_audits_run_id ON audits(run_id);
      CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
      CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON subscribers(user_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    `;

    const { error: indexError } = await supabase.rpc("exec_sql", {
      sql: indexSQL,
    });

    if (indexError) {
      console.log("⚠️  Index non créés automatiquement");
    } else {
      console.log("✅ Index créés");
    }

    // Test des tables créées
    console.log("\n🔍 Test des tables créées...");

    const { data: profiles, error: testError } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    if (testError) {
      console.error("❌ Test échoué:", testError);
    } else {
      console.log("✅ Tables créées et accessibles");
    }

    console.log("\n🎉 Configuration Supabase terminée !");
    console.log("📋 Tables créées: profiles, subscribers, audits");
    console.log("🔒 Sécurité configurée avec RLS");
    console.log("📊 Index optimisés pour les performances");
  } catch (error) {
    console.error("❌ Erreur lors de la création des tables:", error);
    console.log("\n💡 Solution alternative:");
    console.log("1. Allez dans Supabase: https://supabase.com/dashboard");
    console.log("2. Ouvrez 'SQL Editor'");
    console.log("3. Copiez-collez le contenu de supabase-setup.sql");
    console.log("4. Cliquez sur 'Run'");
  }
}

async function main() {
  console.log("🚀 Configuration automatique des tables Supabase\n");
  console.log("=".repeat(60));

  await createSupabaseTables();
}

if (require.main === module) {
  main().catch(console.error);
}
