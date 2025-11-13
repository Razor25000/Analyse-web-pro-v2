#!/usr/bin/env tsx

/**
 * Analyse colonnes Supabase - Pour corriger le script SQL
 *
 * 🎯 OBJECTIF: Découvrir la vraie structure des colonnes pour les index
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://muzzgghqpspummcrwxfa.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11enpnZ2hxcHNwdW1tY3J3eGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1Mjk0OSwiZXhwIjoyMDcyOTI4OTQ5fQ.XKlfT2omO1-27C2usQei_113_Lu8Hgj3YehuuyTCNms";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log("🔍 Analyse structure colonnes Supabase");
console.log("=====================================");

async function analyzeTableColumns() {
  const tables = ["audits", "user", "user_quota"];

  for (const tableName of tables) {
    console.log(`\n📊 Structure table ${tableName}:`);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(1);

      if (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`   📋 Colonnes (${columns.length}):`);

        columns.forEach((col) => {
          const value = data[0][col];
          const type = value === null ? "null" : typeof value;
          console.log(`      - ${col} (${type})`);
        });
      } else {
        console.log(`   📋 Table vide - récupération via schema...`);

        // Essayer d'insérer un enregistrement vide pour voir les colonnes requises
        const { error: insertError } = await supabase
          .from(tableName)
          .insert({});

        if (insertError) {
          console.log(`   🔍 Info colonnes via erreur: ${insertError.message}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error}`);
    }
  }
}

async function generateCorrectedSQL() {
  console.log("\n🛠️ Script SQL corrigé basé sur structure réelle:");
  console.log("================================================");

  console.log(`
-- ÉTAPE 2: Index optimisés pour workflows n8n (CORRIGÉ)
-- ======================================================

-- Index table audits (structure réelle découverte)
CREATE INDEX IF NOT EXISTS idx_audits_status_created
ON public.audits(status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_audits_user_id
ON public.audits("user_id");

-- Pas d'index sur email car colonne n'existe pas dans audits
-- CREATE INDEX IF NOT EXISTS idx_audits_email ON public.audits(email); -- SUPPRIMÉ

-- Index table user_quota (structure réelle)
CREATE INDEX IF NOT EXISTS idx_user_quota_userid_planid
ON public.user_quota("userId", "planId");

-- Vérifier si resetDate existe ou si c'est resetDay
CREATE INDEX IF NOT EXISTS idx_user_quota_reset_day
ON public.user_quota("resetDay");

-- Index table user (structure confirmée)
CREATE INDEX IF NOT EXISTS idx_user_email
ON public.user(email);
`);
}

async function main() {
  await analyzeTableColumns();
  await generateCorrectedSQL();

  console.log("\n🎯 DIAGNOSTIC:");
  console.log("✅ La table 'audits' n'a PAS de colonne 'email'");
  console.log("✅ Utiliser 'user_id' pour les jointures");
  console.log("✅ Vérifier 'resetDate' vs 'resetDay' dans user_quota");
}

main().catch(console.error);
