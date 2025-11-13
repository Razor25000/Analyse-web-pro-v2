#!/usr/bin/env tsx

/**
 * Création simple des tables Supabase via API REST
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

async function createTablesSimple() {
  console.log("🔧 Création simplifiée des tables Supabase...\n");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Variables Supabase manquantes");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Test de connexion basique
    console.log("🔌 Test de connexion...");
    const { error: testError } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    if (!testError) {
      console.log("✅ Tables déjà créées !");
      return;
    }

    console.log("📋 Tentative de création des tables...\n");

    // Instructions claires pour l'utilisateur
    console.log("🚨 TABLES SUPABASE NON CRÉÉES !\n");
    console.log("📋 SUIVEZ CES ÉTAPES PRÉCISES :\n");

    console.log("1️⃣ OUVREZ : https://supabase.com/dashboard");
    console.log("2️⃣ CLIQUEZ sur votre projet : muzzgghqpspummcrwxfa");
    console.log("3️⃣ DANS LE MENU GAUCHE : cliquez sur 'SQL Editor'");
    console.log("4️⃣ COLLEZ CE SCRIPT dans la zone de texte :\n");

    const sql = `-- CRÉER LES TABLES POUR L'ANALYSEUR WEB
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  email VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEX POUR PERFORMANCES
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_subscribers_user_id ON subscribers(user_id);
CREATE INDEX idx_audits_user_id ON audits(user_id);

-- SÉCURITÉ
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;`;

    console.log("```sql");
    console.log(sql);
    console.log("```\n");

    console.log("5️⃣ CLIQUEZ sur le bouton 'Run' (en haut à droite)");
    console.log("6️⃣ VOUS DEVRIEZ VOIR : 'Success. No rows returned.'\n");

    console.log(
      "7️⃣ VÉRIFIEZ : Allez dans 'Table Editor' pour voir les 3 tables\n",
    );

    console.log("8️⃣ UNE FOIS FAIT : Revenez ici et tapez 'yes'\n");

    console.log(
      "⏳ EN ATTENDANT : Les nouveaux utilisateurs restent dans SQLite",
    );
    console.log(
      "   Ils seront migrés vers Supabase une fois les tables créées.\n",
    );
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

if (require.main === module) {
  createTablesSimple().catch(console.error);
}
