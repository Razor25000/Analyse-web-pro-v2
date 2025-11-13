#!/usr/bin/env tsx

/**
 * Création des tables manquantes dans Supabase
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://muzzgghqpspummcrwxfa.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11enpnZ2hxcHNwdW1tY3J3eGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1Mjk0OSwiZXhwIjoyMDcyOTI4OTQ5fQ.XKlfT2omO1-27C2usQei_113_Lu8Hgj3YehuuyTCNms";

async function createSupabaseTables() {
  console.log("🔧 Création des tables manquantes dans Supabase...");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Table profiles
    console.log("📝 Création table 'profiles'...");
    const { error: profilesError } = await supabase.rpc("query", {
      query: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          full_name TEXT,
          company TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Index pour performance
        CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
        
        -- RLS (Row Level Security)
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Policy : les utilisateurs peuvent voir/modifier leur propre profil
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        CREATE POLICY "Users can view own profile" ON public.profiles
          FOR SELECT USING (auth.uid()::text = user_id);
          
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (auth.uid()::text = user_id);
      `,
    });

    if (profilesError) {
      console.error("❌ Erreur création table profiles:", profilesError);
    } else {
      console.log("✅ Table 'profiles' créée avec succès");
    }

    // Table subscribers
    console.log("📝 Création table 'subscribers'...");
    const { error: subscribersError } = await supabase.rpc("query", {
      query: `
        CREATE TABLE IF NOT EXISTS public.subscribers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          stripe_customer_id TEXT,
          subscribed BOOLEAN DEFAULT false,
          subscription_tier TEXT DEFAULT 'free',
          subscription_end TIMESTAMPTZ,
          monthly_quota INTEGER DEFAULT 5,
          quota_used INTEGER DEFAULT 0,
          quota_reset_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Index pour performance
        CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);
        CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
        CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_id ON public.subscribers(stripe_customer_id);
        
        -- RLS
        ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
        
        -- Policy : utilisateurs peuvent voir leur propre abonnement
        DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;
        CREATE POLICY "Users can view own subscription" ON public.subscribers
          FOR SELECT USING (auth.uid()::text = user_id);
          
        DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscribers;
        CREATE POLICY "Users can update own subscription" ON public.subscribers
          FOR UPDATE USING (auth.uid()::text = user_id);
      `,
    });

    if (subscribersError) {
      console.error("❌ Erreur création table subscribers:", subscribersError);
    } else {
      console.log("✅ Table 'subscribers' créée avec succès");
    }

    // Table audits (optionnelle pour les données métier)
    console.log("📝 Création table 'audits'...");
    const { error: auditsError } = await supabase.rpc("query", {
      query: `
        CREATE TABLE IF NOT EXISTS public.audits (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          url TEXT NOT NULL,
          audit_type TEXT DEFAULT 'manual' CHECK (audit_type IN ('manual', 'bulk', 'discovery')),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          webhook_id TEXT,
          is_public BOOLEAN DEFAULT false,
          score_global INTEGER,
          score_performance INTEGER,
          score_seo INTEGER,
          score_security INTEGER,
          score_modern INTEGER,
          results_json JSONB,
          audit_results TEXT,
          error_message TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          completed_at TIMESTAMPTZ
        );
        
        -- Index pour performance
        CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.audits(user_id);
        CREATE INDEX IF NOT EXISTS idx_audits_status ON public.audits(status);
        CREATE INDEX IF NOT EXISTS idx_audits_webhook_id ON public.audits(webhook_id);
        CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);
        
        -- RLS
        ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
        
        -- Policy : utilisateurs peuvent voir leurs propres audits + audits publics
        DROP POLICY IF EXISTS "Users can view own audits" ON public.audits;
        CREATE POLICY "Users can view own audits" ON public.audits
          FOR SELECT USING (auth.uid()::text = user_id OR is_public = true);
          
        DROP POLICY IF EXISTS "Users can update own audits" ON public.audits;
        CREATE POLICY "Users can update own audits" ON public.audits
          FOR UPDATE USING (auth.uid()::text = user_id);
      `,
    });

    if (auditsError) {
      console.error("❌ Erreur création table audits:", auditsError);
    } else {
      console.log("✅ Table 'audits' créée avec succès");
    }
  } catch (error: any) {
    console.error("❌ Erreur générale:", error.message);
  }
}

// Alternative : utilisation directe SQL si RPC ne marche pas
async function createTablesDirectSQL() {
  console.log("🔧 Création tables via SQL direct...");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const sqlQueries = [
    // Profiles table
    `CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      company TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`,

    // Subscribers table
    `CREATE TABLE IF NOT EXISTS public.subscribers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT,
      subscribed BOOLEAN DEFAULT false,
      subscription_tier TEXT DEFAULT 'free',
      subscription_end TIMESTAMPTZ,
      monthly_quota INTEGER DEFAULT 5,
      quota_used INTEGER DEFAULT 0,
      quota_reset_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`,

    // Audits table
    `CREATE TABLE IF NOT EXISTS public.audits (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      url TEXT NOT NULL,
      audit_type TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'pending',
      webhook_id TEXT,
      is_public BOOLEAN DEFAULT false,
      score_global INTEGER,
      results_json JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`,
  ];

  for (const [index, query] of sqlQueries.entries()) {
    try {
      console.log(`Exécution requête ${index + 1}...`);
      const { error } = await supabase.rpc("exec_sql", { sql: query });
      if (error) {
        console.error(`❌ Erreur requête ${index + 1}:`, error);
      } else {
        console.log(`✅ Requête ${index + 1} exécutée`);
      }
    } catch (error: any) {
      console.error(`❌ Exception requête ${index + 1}:`, error.message);
    }
  }
}

createSupabaseTables()
  .then(() => console.log("\n🎉 Création des tables terminée"))
  .catch(async (error) => {
    console.error("❌ Échec création des tables:", error);
    console.log("🔄 Tentative avec méthode alternative...");
    return createTablesDirectSQL();
  });
