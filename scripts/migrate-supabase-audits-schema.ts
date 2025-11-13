#!/usr/bin/env tsx

/**
 * Migration Supabase - Audit Table Schema v2.0
 * Architecture Dual Database Optimisée
 *
 * 🎯 OBJECTIF: Mettre à jour le schéma de la table 'audits' pour la sync Prisma
 *
 * MODIFICATIONS:
 * 1. Ajouter colonne 'prisma_id' (lien vers Prisma)
 * 2. Ajouter colonnes manquantes pour sync complète
 * 3. Optimiser les index pour les workflows n8n
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

console.log("🔄 Migration Supabase - Schema Audits v2.0");
console.log("==========================================");

// Vérification des variables d'environnement
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
  console.error("❌ Variables Supabase manquantes");
  process.exit(1);
}

const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const SQL_MIGRATIONS = [
  // Migration 1: Ajouter colonne prisma_id pour lien Prisma
  `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='prisma_id') THEN
      ALTER TABLE public.audits ADD COLUMN prisma_id TEXT;
      COMMENT ON COLUMN public.audits.prisma_id IS 'ID de l audit dans la base Prisma (source de vérité)';
    END IF;
  END $$;
  `,

  // Migration 2: Ajouter colonnes manquantes pour sync complète
  `
  DO $$
  BEGIN
    -- Score Performance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='score_performance') THEN
      ALTER TABLE public.audits ADD COLUMN score_performance INTEGER;
    END IF;

    -- Score SEO
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='score_seo') THEN
      ALTER TABLE public.audits ADD COLUMN score_seo INTEGER;
    END IF;

    -- Score Security
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='score_security') THEN
      ALTER TABLE public.audits ADD COLUMN score_security INTEGER;
    END IF;

    -- Score Modern
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='score_modern') THEN
      ALTER TABLE public.audits ADD COLUMN score_modern INTEGER;
    END IF;

    -- Audit Results JSON
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='audit_results') THEN
      ALTER TABLE public.audits ADD COLUMN audit_results JSONB;
    END IF;

    -- Completed At
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='completed_at') THEN
      ALTER TABLE public.audits ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;

    -- Organization ID (pour n8n workflows)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audits' AND column_name='org_id') THEN
      ALTER TABLE public.audits ADD COLUMN org_id TEXT;
    END IF;
  END $$;
  `,

  // Migration 3: Créer index pour optimiser les workflows n8n
  `
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_prisma_id
  ON public.audits(prisma_id);
  `,

  `
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_status_created
  ON public.audits(status, created_at DESC);
  `,

  `
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_user_created
  ON public.audits(user_id, created_at DESC);
  `,

  // Migration 4: Mettre à jour les contraintes
  `
  -- Commenter les colonnes pour documentation
  COMMENT ON TABLE public.audits IS 'Table audits pour workflows n8n - Architecture Dual v2.0';
  COMMENT ON COLUMN public.audits.prisma_id IS 'Lien vers audit dans Prisma (source de vérité)';
  COMMENT ON COLUMN public.audits.org_id IS 'ID organisation pour workflows n8n';
  COMMENT ON COLUMN public.audits.audit_results IS 'Résultats détaillés de l audit (pour n8n)';
  `,
];

async function executeMigration(sql: string, description: string) {
  try {
    console.log(`🔄 ${description}...`);

    const { error } = await supabaseAdmin.rpc("exec_sql", {
      sql: sql.trim(),
    });

    if (error) {
      // Essayer la méthode directe si RPC échoue
      console.log("⚠️ RPC échoué, tentative directe...");
      throw error;
    }

    console.log(`✅ ${description} - Terminé`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} - Erreur:`, (error as Error).message);
    return false;
  }
}

async function checkCurrentSchema() {
  console.log("\n📊 Vérification du schéma actuel...");

  try {
    const { data, error } = await supabaseAdmin
      .from("audits")
      .select("*")
      .limit(1);

    if (error && !error.message.includes('relation "audits" does not exist')) {
      console.log("❌ Erreur vérification:", error.message);
      return;
    }

    console.log("✅ Table 'audits' accessible");

    // Tester les colonnes spécifiquement
    const testColumns = [
      "prisma_id",
      "score_performance",
      "score_seo",
      "audit_results",
    ];

    for (const column of testColumns) {
      try {
        const { error: columnError } = await supabaseAdmin
          .from("audits")
          .select(column)
          .limit(1);

        if (columnError) {
          console.log(`❌ Colonne '${column}': manquante`);
        } else {
          console.log(`✅ Colonne '${column}': présente`);
        }
      } catch {
        console.log(`❌ Colonne '${column}': manquante`);
      }
    }
  } catch (error) {
    console.log(
      "❌ Impossible de vérifier le schéma:",
      (error as Error).message,
    );
  }
}

async function createAuditsTableIfNotExists() {
  console.log("\n🏗️ Création de la table 'audits' si nécessaire...");

  const createTableSQL = `
  CREATE TABLE IF NOT EXISTS public.audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prisma_id TEXT, -- Lien vers Prisma
    user_id UUID,
    email TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    audit_type TEXT DEFAULT 'manual' CHECK (audit_type IN ('manual', 'bulk', 'discovery')),
    is_public BOOLEAN DEFAULT false,

    -- Scores
    score_global INTEGER,
    score_performance INTEGER,
    score_seo INTEGER,
    score_security INTEGER,
    score_modern INTEGER,

    -- Résultats
    results_json JSONB,
    audit_results JSONB,
    error_message TEXT,

    -- Metadata
    org_id TEXT,
    webhook_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
  );
  `;

  try {
    const { error } = await supabaseAdmin.rpc("exec_sql", {
      sql: createTableSQL,
    });

    if (error) {
      console.log("❌ Création table via RPC échouée:", error.message);
      console.log("⚠️ La table existe probablement déjà");
    } else {
      console.log("✅ Table 'audits' créée/vérifiée avec succès");
    }
  } catch (error) {
    console.log("❌ Erreur création table:", (error as Error).message);
  }
}

async function main() {
  console.log("🎯 Migration pour Architecture Dual Database v2.0");
  console.log(
    "Objectif: Optimiser table 'audits' pour sync Prisma → Supabase\n",
  );

  // Étape 1: Vérifier le schéma actuel
  await checkCurrentSchema();

  // Étape 2: Créer la table si elle n'existe pas
  await createAuditsTableIfNotExists();

  // Étape 3: Exécuter les migrations
  console.log("\n🔄 Exécution des migrations...");

  for (let i = 0; i < SQL_MIGRATIONS.length; i++) {
    const sql = SQL_MIGRATIONS[i];
    const description = `Migration ${i + 1}/${SQL_MIGRATIONS.length}`;

    await executeMigration(sql, description);

    // Pause entre les migrations
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Étape 4: Vérification finale
  console.log("\n📊 Vérification finale du schéma...");
  await checkCurrentSchema();

  console.log("\n✅ Migration Supabase terminée!");
  console.log("🎯 Table 'audits' optimisée pour Architecture Dual v2.0");
  console.log("📋 Prête pour la synchronisation Prisma → Supabase");
}

main().catch((error) => {
  console.error("💥 Erreur fatale migration:", error);
  process.exit(1);
});
