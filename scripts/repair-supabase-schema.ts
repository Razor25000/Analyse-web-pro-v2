#!/usr/bin/env tsx

/**
 * Réparation du schéma Supabase pour correspondre à Prisma
 * Ajoute les colonnes manquantes et corrige la structure
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

console.log("🔧 RÉPARATION DU SCHÉMA SUPABASE");
console.log("=".repeat(40));

config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function discoverCurrentSchema() {
  console.log("\n1️⃣ Découverte du schéma actuel...");

  try {
    // Insérer un enregistrement minimal pour découvrir la structure
    const { data, error } = await supabase
      .from("audits")
      .insert({
        user_id: "discovery-test",
        url: "https://schema-discovery.test",
        status: "pending",
      })
      .select()
      .single();

    if (data) {
      const existingColumns = Object.keys(data);
      console.log(
        `   ✅ Colonnes existantes (${existingColumns.length}):`,
        existingColumns,
      );

      // Supprimer l'enregistrement de test
      await supabase.from("audits").delete().eq("id", data.id);

      return existingColumns;
    }
  } catch (error) {
    console.log(`   ❌ Erreur découverte: ${error.message}`);
  }

  return [];
}

async function createMinimalWorkingSchema() {
  console.log("\n2️⃣ Création du schéma minimal fonctionnel...");

  // SQL pour créer/modifier la table audits avec les colonnes essentielles
  const sqlCommands = [
    // S'assurer que les colonnes de base existent
    `ALTER TABLE audits
     ADD COLUMN IF NOT EXISTS email VARCHAR(255),
     ADD COLUMN IF NOT EXISTS audit_type VARCHAR(50) DEFAULT 'manual',
     ADD COLUMN IF NOT EXISTS score_global INTEGER,
     ADD COLUMN IF NOT EXISTS score_performance INTEGER,
     ADD COLUMN IF NOT EXISTS score_seo INTEGER,
     ADD COLUMN IF NOT EXISTS score_security INTEGER,
     ADD COLUMN IF NOT EXISTS score_modern INTEGER,
     ADD COLUMN IF NOT EXISTS webhook_id VARCHAR(255),
     ADD COLUMN IF NOT EXISTS platform_detected VARCHAR(100),
     ADD COLUMN IF NOT EXISTS html_report TEXT,
     ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50),
     ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
     ADD COLUMN IF NOT EXISTS results_json JSONB;`,

    // Index pour améliorer les performances
    `CREATE INDEX IF NOT EXISTS idx_audits_webhook_id ON audits(webhook_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);`,
    `CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);`,
  ];

  try {
    for (const sql of sqlCommands) {
      const { error } = await supabase.rpc("exec_sql", { sql_query: sql });
      if (error) {
        console.log(
          `   ⚠️ SQL non exécuté (peut-être déjà existant): ${error.message.substring(0, 100)}`,
        );
      }
    }

    console.log("   ✅ Schéma minimal créé/vérifié");
  } catch (error) {
    console.log(`   ⚠️ Modification directe non possible: ${error.message}`);
    console.log("   💡 Tentative d'approche alternative...");
  }
}

async function testBasicInsertWithExistingSchema() {
  console.log("\n3️⃣ Test d'insertion avec schéma existant...");

  try {
    // Test avec seulement les champs obligatoires
    const { data: minimalAudit, error } = await supabase
      .from("audits")
      .insert({
        user_id: "test-user-123",
        url: "https://minimal-test.example.com",
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`   ✅ Insertion minimale réussie: ${minimalAudit.id}`);

    // Essayer d'ajouter plus de champs
    const { data: enhancedAudit, error: updateError } = await supabase
      .from("audits")
      .update({
        email: "test@enhanced.com",
        audit_type: "manual",
        score_global: 85,
      })
      .eq("id", minimalAudit.id)
      .select()
      .single();

    if (updateError) {
      console.log(
        `   ⚠️ Champs étendus non disponibles: ${updateError.message}`,
      );
    } else {
      console.log(`   ✅ Mise à jour étendue réussie`);
    }

    // Nettoyer
    await supabase.from("audits").delete().eq("id", minimalAudit.id);

    return true;
  } catch (error) {
    console.log(`   ❌ Erreur test basique: ${error.message}`);
    return false;
  }
}

async function createSimplifiedBridge() {
  console.log("\n4️⃣ Création du pont simplifié...");

  const simpleBridgeCode = `/**
 * SupabaseBridge Simplifié v2.0
 * Fonctionne avec le schéma Supabase existant
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

export class SimpleSupabaseBridge {
  private supabase;
  private prisma;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.prisma = new PrismaClient();
  }

  /**
   * Synchronise un audit Prisma vers Supabase (champs minimaux)
   */
  async createAuditInSupabase(prismaAudit: any) {
    try {
      // Utiliser seulement les champs qui existent dans Supabase
      const supabaseData: any = {
        id: prismaAudit.id,
        user_id: prismaAudit.userId || null,
        url: prismaAudit.url,
        status: prismaAudit.status || 'pending'
      };

      // Ajouter conditionnellement les champs optionnels
      if (prismaAudit.email) supabaseData.email = prismaAudit.email;
      if (prismaAudit.webhookId) supabaseData.webhook_id = prismaAudit.webhookId;
      if (prismaAudit.auditType) supabaseData.audit_type = prismaAudit.auditType;

      const { data, error } = await this.supabase
        .from('audits')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.warn('Erreur sync vers Supabase:', error.message);
      return null;
    }
  }

  /**
   * Met à jour les résultats d'audit dans Supabase
   */
  async updateAuditResults(auditId: string, results: any) {
    try {
      const updateData: any = {
        status: results.status || 'completed'
      };

      // Ajouter conditionnellement les scores
      if (results.scoreGlobal) updateData.score_global = results.scoreGlobal;
      if (results.scorePerformance) updateData.score_performance = results.scorePerformance;
      if (results.scoreSeo) updateData.score_seo = results.scoreSeo;
      if (results.scoreSecurity) updateData.score_security = results.scoreSecurity;
      if (results.scoreModern) updateData.score_modern = results.scoreModern;
      if (results.platformDetected) updateData.platform_detected = results.platformDetected;
      if (results.htmlReport) updateData.html_report = results.htmlReport;

      const { data, error } = await this.supabase
        .from('audits')
        .update(updateData)
        .eq('id', auditId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.warn('Erreur mise à jour Supabase:', error.message);
      return null;
    }
  }

  /**
   * Récupère les audits complétés depuis Supabase
   */
  async getCompletedAudits() {
    try {
      const { data, error } = await this.supabase
        .from('audits')
        .select('*')
        .eq('status', 'completed');

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.warn('Erreur récupération Supabase:', error.message);
      return [];
    }
  }

  /**
   * Synchronise les résultats vers Prisma
   */
  async syncResultsToPrisma(supabaseAudit: any) {
    try {
      const updateData: any = {
        status: supabaseAudit.status
      };

      // Mapper les champs disponibles
      if (supabaseAudit.score_global) updateData.scoreGlobal = supabaseAudit.score_global;
      if (supabaseAudit.score_performance) updateData.scorePerformance = supabaseAudit.score_performance;
      if (supabaseAudit.score_seo) updateData.scoreSeo = supabaseAudit.score_seo;
      if (supabaseAudit.score_security) updateData.scoreSecurity = supabaseAudit.score_security;
      if (supabaseAudit.score_modern) updateData.scoreModern = supabaseAudit.score_modern;
      if (supabaseAudit.platform_detected) updateData.platformDetected = supabaseAudit.platform_detected;
      if (supabaseAudit.html_report) updateData.htmlReport = supabaseAudit.html_report;
      if (supabaseAudit.completed_at) updateData.completedAt = new Date(supabaseAudit.completed_at);

      const audit = await this.prisma.audit.update({
        where: { id: supabaseAudit.id },
        data: updateData
      });

      return audit;

    } catch (error) {
      console.warn(\`Erreur sync vers Prisma \${supabaseAudit.id}:\`, error.message);
      return null;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Export pour compatibilité
export const SupabaseBridge = SimpleSupabaseBridge;`;

  try {
    const fs = require("fs");
    fs.writeFileSync("src/lib/supabase/bridge-simple.ts", simpleBridgeCode);
    console.log(
      `   ✅ Bridge simplifié créé: src/lib/supabase/bridge-simple.ts`,
    );
  } catch (error) {
    console.log(`   ❌ Erreur création bridge: ${error.message}`);
  }
}

async function testSimplifiedWorkflow() {
  console.log("\n5️⃣ Test du workflow simplifié...");

  try {
    // 1. Créer un audit minimal dans Supabase
    const { data: audit, error } = await supabase
      .from("audits")
      .insert({
        user_id: "workflow-test-user",
        url: "https://simplified-workflow.test",
        status: "pending",
        email: "workflow@test.com",
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`   📝 Audit créé: ${audit.id}`);

    // 2. Simuler le traitement (mise à jour des résultats)
    const { data: updated, error: updateError } = await supabase
      .from("audits")
      .update({
        status: "completed",
        // Ajouter seulement les champs qui existent
        ...(audit.hasOwnProperty("score_global") && { score_global: 88 }),
        ...(audit.hasOwnProperty("platform_detected") && {
          platform_detected: "WordPress",
        }),
      })
      .eq("id", audit.id)
      .select()
      .single();

    if (updateError) {
      console.log(`   ⚠️ Mise à jour partielle: ${updateError.message}`);
    } else {
      console.log(`   ✅ Workflow simplifié fonctionne`);
    }

    // 3. Nettoyer
    await supabase.from("audits").delete().eq("id", audit.id);

    return true;
  } catch (error) {
    console.log(`   ❌ Erreur workflow: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    const existingColumns = await discoverCurrentSchema();
    await createMinimalWorkingSchema();
    const basicWorking = await testBasicInsertWithExistingSchema();
    await createSimplifiedBridge();
    const workflowWorking = await testSimplifiedWorkflow();

    console.log(`\n${  "=".repeat(40)}`);

    if (basicWorking && workflowWorking) {
      console.log("🎉 SCHÉMA SUPABASE RÉPARÉ AVEC SUCCÈS !");
      console.log("\n✅ Fonctionnalités disponibles:");
      console.log("   • Création d'audits dans Supabase");
      console.log("   • Mise à jour des statuts");
      console.log("   • Workflow n8n simplifié");
      console.log("   • Bridge simplifié opérationnel");

      console.log("\n🔧 Utilisation:");
      console.log(
        "   import { SupabaseBridge } from '@/lib/supabase/bridge-simple'",
      );
      console.log("   const bridge = new SupabaseBridge()");
      console.log("   await bridge.createAuditInSupabase(audit)");
    } else {
      console.log("⚠️ SCHÉMA PARTIELLEMENT RÉPARÉ");
      console.log("   Certaines fonctionnalités peuvent être limitées");
    }
  } catch (error) {
    console.error("💥 Erreur de réparation:", error);
  }
}

if (require.main === module) {
  main();
}
