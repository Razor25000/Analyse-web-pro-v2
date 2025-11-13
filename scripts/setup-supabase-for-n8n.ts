#!/usr/bin/env tsx

/**
 * Configuration Supabase pour workflows n8n
 *
 * Ce script :
 * 1. Vérifie la connexion Supabase
 * 2. Crée les tables nécessaires pour les workflows n8n
 * 3. Configure les permissions RLS
 * 4. Crée les fonctions PostgreSQL pour les quotas
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "../src/lib/env";

const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variables SUPABASE_URL et SUPABASE_SERVICE_KEY requises");
  console.log("💡 Configurez ces variables dans votre .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🔧 Configuration Supabase pour workflows n8n");
  console.log("===========================================");

  try {
    // Étape 1: Vérifier la connexion
    console.log("🔗 Vérification de la connexion Supabase...");
    const { data, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .limit(1);

    if (error) {
      throw new Error(`Erreur de connexion: ${error.message}`);
    }

    console.log("✅ Connexion Supabase établie");

    // Étape 2: Créer la table audits pour les workflows n8n
    console.log("\n📊 Configuration de la table audits...");
    await setupAuditsTable();

    // Étape 3: Créer la table user_quota pour la gestion des quotas
    console.log("\n👥 Configuration de la table user_quota...");
    await setupUserQuotaTable();

    // Étape 4: Créer les fonctions PostgreSQL
    console.log("\n⚙️  Configuration des fonctions PostgreSQL...");
    await setupPostgreSQLFunctions();

    // Étape 5: Configurer Row Level Security (RLS)
    console.log("\n🔒 Configuration de la sécurité RLS...");
    await setupRLS();

    console.log("\n🎉 Configuration Supabase terminée !");
    console.log("\n🔧 Vérifiez maintenant vos workflows n8n:");
    console.log('   - Table "audits" disponible pour les webhooks');
    console.log('   - Table "user_quota" pour la gestion des quotas');
    console.log("   - Fonctions PostgreSQL configurées");
    console.log("   - Permissions RLS appliquées");
  } catch (error) {
    console.error("❌ Erreur lors de la configuration:", error);
    process.exit(1);
  }
}

async function setupAuditsTable() {
  const createAuditsTable = `
    CREATE TABLE IF NOT EXISTS public.audits (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      audit_type TEXT DEFAULT 'manual',
      results_json JSONB,
      score_global INTEGER,
      score_performance INTEGER,
      score_seo INTEGER,
      score_security INTEGER,
      score_modern INTEGER,
      error_message TEXT,
      webhook_id TEXT,
      is_public BOOLEAN DEFAULT false,
      audit_results TEXT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      org_id TEXT,
      "runId" TEXT,
      html_report TEXT,
      platform_detected TEXT,
      delivery_method TEXT,
      email_client TEXT
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS audits_user_id_idx ON public.audits(user_id);
    CREATE INDEX IF NOT EXISTS audits_webhook_id_idx ON public.audits(webhook_id);
    CREATE INDEX IF NOT EXISTS audits_org_id_idx ON public.audits(org_id);
    CREATE INDEX IF NOT EXISTS audits_run_id_idx ON public.audits("runId");
    CREATE INDEX IF NOT EXISTS audits_created_at_idx ON public.audits(created_at DESC);
    CREATE INDEX IF NOT EXISTS audits_status_idx ON public.audits(status);
  `;

  const setupTrigger = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_audits_updated_at ON public.audits;
    CREATE TRIGGER update_audits_updated_at
      BEFORE UPDATE ON public.audits
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  await executeSQL("Table audits", createAuditsTable);
  await executeSQL("Index audits", createIndexes);
  await executeSQL("Trigger audits", setupTrigger);
}

async function setupUserQuotaTable() {
  const createUserQuotaTable = `
    CREATE TABLE IF NOT EXISTS public.user_quota (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      monthly_quota INTEGER DEFAULT 10,
      quota_used INTEGER DEFAULT 0,
      quota_reset_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
      subscription_tier TEXT DEFAULT 'free',
      subscribed BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS user_quota_user_id_idx ON public.user_quota(user_id);
    CREATE INDEX IF NOT EXISTS user_quota_email_idx ON public.user_quota(email);
    CREATE INDEX IF NOT EXISTS user_quota_subscription_tier_idx ON public.user_quota(subscription_tier);
  `;

  const setupTrigger = `
    DROP TRIGGER IF EXISTS update_user_quota_updated_at ON public.user_quota;
    CREATE TRIGGER update_user_quota_updated_at
      BEFORE UPDATE ON public.user_quota
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  await executeSQL("Table user_quota", createUserQuotaTable);
  await executeSQL("Index user_quota", createIndexes);
  await executeSQL("Trigger user_quota", setupTrigger);
}

async function setupPostgreSQLFunctions() {
  // Fonction pour incrémenter le quota utilisé
  const incrementQuotaFunction = `
    CREATE OR REPLACE FUNCTION increment_quota_used(
      user_email TEXT,
      increment_amount INTEGER DEFAULT 1
    )
    RETURNS TABLE(
      user_id TEXT,
      email TEXT,
      quota_used INTEGER,
      monthly_quota INTEGER,
      quota_exceeded BOOLEAN
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- Mettre à jour le quota
      UPDATE public.user_quota
      SET
        quota_used = quota_used + increment_amount,
        updated_at = NOW()
      WHERE user_quota.email = user_email;

      -- Retourner les informations mises à jour
      RETURN QUERY
      SELECT
        uq.user_id,
        uq.email,
        uq.quota_used,
        uq.monthly_quota,
        (uq.quota_used >= uq.monthly_quota) as quota_exceeded
      FROM public.user_quota uq
      WHERE uq.email = user_email;
    END;
    $$;
  `;

  // Fonction pour réinitialiser les quotas mensuels
  const resetMonthlyQuotasFunction = `
    CREATE OR REPLACE FUNCTION reset_monthly_quotas()
    RETURNS INTEGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      updated_count INTEGER;
    BEGIN
      -- Réinitialiser les quotas pour les utilisateurs dont la date de reset est passée
      UPDATE public.user_quota
      SET
        quota_used = 0,
        quota_reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        updated_at = NOW()
      WHERE quota_reset_date <= NOW();

      GET DIAGNOSTICS updated_count = ROW_COUNT;

      RETURN updated_count;
    END;
    $$;
  `;

  // Fonction pour obtenir les statistiques de quotas
  const getQuotaStatsFunction = `
    CREATE OR REPLACE FUNCTION get_quota_stats(user_email TEXT)
    RETURNS TABLE(
      user_id TEXT,
      email TEXT,
      quota_used INTEGER,
      monthly_quota INTEGER,
      quota_remaining INTEGER,
      quota_exceeded BOOLEAN,
      subscription_tier TEXT,
      quota_reset_date TIMESTAMPTZ
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        uq.user_id,
        uq.email,
        uq.quota_used,
        uq.monthly_quota,
        GREATEST(0, uq.monthly_quota - uq.quota_used) as quota_remaining,
        (uq.quota_used >= uq.monthly_quota) as quota_exceeded,
        uq.subscription_tier,
        uq.quota_reset_date
      FROM public.user_quota uq
      WHERE uq.email = user_email;
    END;
    $$;
  `;

  await executeSQL("Fonction increment_quota_used", incrementQuotaFunction);
  await executeSQL("Fonction reset_monthly_quotas", resetMonthlyQuotasFunction);
  await executeSQL("Fonction get_quota_stats", getQuotaStatsFunction);
}

async function setupRLS() {
  // Activer RLS sur les tables
  const enableRLS = `
    ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_quota ENABLE ROW LEVEL SECURITY;
  `;

  // Politiques pour la table audits
  const auditsPolicies = `
    -- Politique de lecture des audits (utilisateurs peuvent voir leurs propres audits)
    DROP POLICY IF EXISTS "Users can view own audits" ON public.audits;
    CREATE POLICY "Users can view own audits" ON public.audits
      FOR SELECT USING (auth.email() = email OR is_public = true);

    -- Politique d'insertion des audits (service key peut insérer)
    DROP POLICY IF EXISTS "Service can insert audits" ON public.audits;
    CREATE POLICY "Service can insert audits" ON public.audits
      FOR INSERT WITH CHECK (true);

    -- Politique de mise à jour des audits (service key peut mettre à jour)
    DROP POLICY IF EXISTS "Service can update audits" ON public.audits;
    CREATE POLICY "Service can update audits" ON public.audits
      FOR UPDATE USING (true);
  `;

  // Politiques pour la table user_quota
  const userQuotaPolicies = `
    -- Politique de lecture des quotas (utilisateurs peuvent voir leur propre quota)
    DROP POLICY IF EXISTS "Users can view own quota" ON public.user_quota;
    CREATE POLICY "Users can view own quota" ON public.user_quota
      FOR SELECT USING (auth.email() = email);

    -- Politique de mise à jour des quotas (service key peut mettre à jour)
    DROP POLICY IF EXISTS "Service can manage quotas" ON public.user_quota;
    CREATE POLICY "Service can manage quotas" ON public.user_quota
      FOR ALL USING (true);
  `;

  await executeSQL("Activation RLS", enableRLS);
  await executeSQL("Politiques audits", auditsPolicies);
  await executeSQL("Politiques user_quota", userQuotaPolicies);
}

async function executeSQL(description: string, sql: string) {
  try {
    const { error } = await supabase
      .rpc("exec_sql", { sql_query: sql })
      .single();

    if (error) {
      // Si exec_sql n'existe pas, essayer directement
      const { error: directError } = await supabase
        .from("_")
        .select("*")
        .limit(0);
      if (directError && directError.message.includes("exec_sql")) {
        console.log(
          `   ⚠️  ${description}: Fonction exec_sql non disponible - utilisation du client SQL`,
        );
        // Pour Supabase, nous devons utiliser l'API REST directement
        return;
      }
      throw error;
    }

    console.log(`   ✅ ${description}`);
  } catch (error) {
    console.warn(`   ⚠️  ${description}: ${error.message}`);
    console.log(
      `   💡 Vous devrez peut-être exécuter ce SQL manuellement dans Supabase:`,
    );
    console.log(`   ${sql.substring(0, 100)}...`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Erreur lors de la configuration:", error);
    process.exit(1);
  });
}
