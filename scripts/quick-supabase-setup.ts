#!/usr/bin/env tsx

/**
 * Configuration rapide de Supabase - approche simplifiée
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

async function quickSupabaseSetup() {
  console.log("🚀 Configuration rapide Supabase\n");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Variables Supabase manquantes dans .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    console.log("📋 Test de connexion...");
    const { error: testError } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    if (!testError) {
      console.log("✅ Tables déjà créées !");
      return;
    }

    console.log("📝 Tables non trouvées. Voici les instructions :\n");

    console.log("🔧 INSTRUCTIONS MANUELLES :\n");

    console.log("1️⃣ Allez sur : https://supabase.com/dashboard");
    console.log("2️⃣ Sélectionnez votre projet");
    console.log("3️⃣ Cliquez sur 'SQL Editor' dans le menu gauche");
    console.log("4️⃣ Copiez-collez ce script SQL :\n");

    const sqlScript = `
-- Tables pour l'analyseur web
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  company VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subscribers (
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

CREATE TABLE audits (
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

-- Index pour les performances
CREATE INDEX idx_audits_user_id ON audits(user_id);
CREATE INDEX idx_subscribers_user_id ON subscribers(user_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Sécurité RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own audits" ON audits
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own audits" ON audits
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own subscription" ON subscribers
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own subscription" ON subscribers
  FOR UPDATE USING (auth.uid()::text = user_id::text);
`;

    console.log("```sql");
    console.log(sqlScript);
    console.log("```");

    console.log("\n5️⃣ Cliquez sur 'Run' pour exécuter le script");
    console.log("6️⃣ Vérifiez que les tables apparaissent dans 'Table Editor'");
    console.log("\n✅ Une fois fait, revenez ici et exécutez :");
    console.log("   npx tsx scripts/migrate-existing-users-to-supabase.ts");
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

if (require.main === module) {
  quickSupabaseSetup().catch(console.error);
}
