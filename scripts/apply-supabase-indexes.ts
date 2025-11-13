#!/usr/bin/env tsx

/**
 * Application Index Optimisés Supabase
 * Architecture Dual Database v2.0
 *
 * 🎯 OBJECTIF: Appliquer les index pour performances workflows n8n
 */

import { supabaseAdmin } from "@/lib/supabase";

console.log("🔧 Application Index Optimisés Supabase");
console.log("======================================");

const indexes = [
  {
    name: "idx_audits_prisma_id",
    sql: "CREATE INDEX IF NOT EXISTS idx_audits_prisma_id ON public.audits(prisma_id);",
  },
  {
    name: "idx_audits_status_created",
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_status_created ON public.audits(status, "createdAt" DESC);',
  },
  {
    name: "idx_audits_user_created",
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_user_created ON public.audits(user_id, "createdAt" DESC);',
  },
  {
    name: "idx_audits_org_created",
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_org_created ON public.audits(org_id, "createdAt" DESC) WHERE org_id IS NOT NULL;',
  },
  {
    name: "idx_audits_url_hash",
    sql: "CREATE INDEX IF NOT EXISTS idx_audits_url_hash ON public.audits USING HASH(url);",
  },
  {
    name: "idx_audits_type_created",
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_type_created ON public.audits(audit_type, "createdAt" DESC);',
  },
  {
    name: "idx_audits_completed",
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_completed ON public.audits("completedAt" DESC) WHERE "completedAt" IS NOT NULL;',
  },
  {
    name: "idx_audits_scores",
    sql: "CREATE INDEX IF NOT EXISTS idx_audits_scores ON public.audits(score_global, score_performance, score_seo);",
  },
];

async function applyIndexes() {
  console.log("\n🏗️ Application des index optimisés...");

  let success = 0;
  let errors = 0;

  for (const index of indexes) {
    try {
      console.log(`📊 Création index: ${index.name}`);

      const { error } = await supabaseAdmin!.rpc("exec_sql", {
        sql: index.sql,
      });

      if (error) {
        console.error(`❌ Erreur ${index.name}:`, error.message);
        errors++;
      } else {
        console.log(`✅ Index ${index.name} créé`);
        success++;
      }
    } catch (error) {
      console.error(`❌ Exception ${index.name}:`, error);
      errors++;
    }
  }

  console.log(`\n📊 Résumé: ${success} index créés, ${errors} erreurs`);
  return { success, errors };
}

async function verifyIndexes() {
  console.log("\n🔍 Vérification des index...");

  try {
    const { data, error } = await supabaseAdmin!
      .from("pg_indexes")
      .select("indexname, indexdef")
      .eq("tablename", "audits")
      .eq("schemaname", "public");

    if (error) {
      console.error("❌ Erreur vérification:", error);
      return false;
    }

    console.log("✅ Index actifs sur table audits:");
    data?.forEach((index) => {
      console.log(`   📊 ${index.indexname}`);
    });

    return true;
  } catch (error) {
    console.error("❌ Exception vérification:", error);
    return false;
  }
}

async function main() {
  console.log("🎯 Optimisation finale Supabase");
  console.log("Architecture Dual Database v2.0\n");

  // Appliquer les index
  const result = await applyIndexes();

  // Vérifier les index
  const verified = await verifyIndexes();

  // Résumé
  console.log(`\n${  "=".repeat(50)}`);
  console.log("📊 RÉSUMÉ OPTIMISATION");
  console.log("=".repeat(50));

  console.log(`✅ Index appliqués: ${result.success}`);
  console.log(`❌ Erreurs: ${result.errors}`);
  console.log(`🔍 Vérification: ${verified ? "✅" : "❌"}`);

  if (result.success > 0 && result.errors === 0) {
    console.log("\n🎯 Architecture Dual v2.0 - Optimisation complète!");
    console.log("🚀 Supabase prêt pour workflows n8n haute performance");
  } else {
    console.log("\n⚠️ Optimisation partielle - vérifier les erreurs");
  }
}

main().catch((error) => {
  console.error("💥 Erreur fatale:", error);
  process.exit(1);
});
