#!/usr/bin/env tsx

/**
 * Investigation de l'état réel des bases de données
 * Prisma vs Supabase - Comparaison complète
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

console.log("🔍 INVESTIGATION DE L'ÉTAT RÉEL DES BASES DE DONNÉES");
console.log("=".repeat(60));

config({ path: ".env.local" });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function inspectPrismaDatabase() {
  console.log("\n📊 1. ÉTAT DE LA BASE PRISMA (SQLite)");
  console.log("-".repeat(40));

  try {
    // Compter les données dans chaque table
    const userCount = await prisma.user.count();
    const auditCount = await prisma.audit.count();
    const sessionCount = await prisma.session.count();
    const subscriptionCount = await prisma.subscription.count();
    const feedbackCount = await prisma.feedback.count();
    const preRegistrationCount = await prisma.preRegistration.count();

    console.log(`👥 Users: ${userCount}`);
    console.log(`📋 Audits: ${auditCount}`);
    console.log(`🔐 Sessions: ${sessionCount}`);
    console.log(`💳 Subscriptions: ${subscriptionCount}`);
    console.log(`💬 Feedbacks: ${feedbackCount}`);
    console.log(`📝 PreRegistrations: ${preRegistrationCount}`);

    // Afficher quelques exemples d'utilisateurs récents
    if (userCount > 0) {
      const recentUsers = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log(`\n👤 Utilisateurs récents:`);
      for (const user of recentUsers) {
        console.log(
          `   • ${user.email} (${user.name}) - Créé: ${user.createdAt.toISOString()}`,
        );
      }
    }

    // Afficher quelques exemples d'audits récents
    if (auditCount > 0) {
      const recentAudits = await prisma.audit.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          email: true,
          url: true,
          status: true,
          createdAt: true,
          scoreGlobal: true,
        },
      });

      console.log(`\n📋 Audits récents:`);
      for (const audit of recentAudits) {
        console.log(
          `   • ${audit.url} (${audit.email}) - Status: ${audit.status} - Score: ${audit.scoreGlobal || "N/A"}`,
        );
      }
    }

    return {
      userCount,
      auditCount,
      sessionCount,
      subscriptionCount,
      feedbackCount,
      preRegistrationCount,
    };
  } catch (error) {
    console.log(`❌ Erreur inspection Prisma: ${error.message}`);
    return null;
  }
}

async function inspectSupabaseDatabase() {
  console.log("\n📊 2. ÉTAT DE LA BASE SUPABASE");
  console.log("-".repeat(40));

  try {
    // Vérifier les tables disponibles et leur contenu
    const tables = ["audits", "profiles", "users"];
    const tableData: any = {};

    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.log(`❌ Table ${tableName}: ${error.message}`);
          tableData[tableName] = { count: 0, error: error.message };
        } else {
          console.log(`📊 Table ${tableName}: ${count} entrées`);
          tableData[tableName] = { count: count || 0 };

          // Récupérer quelques exemples si la table a des données
          if (count && count > 0) {
            const { data: sampleData, error: sampleError } = await supabase
              .from(tableName)
              .select("*")
              .limit(3);

            if (!sampleError && sampleData && sampleData.length > 0) {
              console.log(
                `   Colonnes disponibles: ${Object.keys(sampleData[0]).join(", ")}`,
              );

              if (tableName === "audits") {
                console.log(`   Exemples d'audits:`);
                for (const audit of sampleData) {
                  console.log(
                    `     • ${audit.url || "N/A"} - Status: ${audit.status || "N/A"} - Score: ${audit.score_global || "N/A"}`,
                  );
                }
              }
            }
          }
        }
      } catch (e) {
        console.log(`⚠️ Table ${tableName}: Non accessible`);
        tableData[tableName] = { count: 0, error: "Non accessible" };
      }
    }

    return tableData;
  } catch (error) {
    console.log(`❌ Erreur inspection Supabase: ${error.message}`);
    return null;
  }
}

async function analyzeDataDiscrepancies(prismaData: any, supabaseData: any) {
  console.log("\n🔍 3. ANALYSE DES DIFFÉRENCES");
  console.log("-".repeat(40));

  if (!prismaData || !supabaseData) {
    console.log("❌ Impossible d'analyser - données manquantes");
    return;
  }

  console.log("📊 Comparaison des données:\n");

  // Comparer les audits
  const prismaAudits = prismaData.auditCount;
  const supabaseAudits = supabaseData.audits?.count || 0;

  console.log(`📋 Audits:`);
  console.log(`   • Prisma: ${prismaAudits}`);
  console.log(`   • Supabase: ${supabaseAudits}`);
  console.log(`   • Différence: ${Math.abs(prismaAudits - supabaseAudits)}`);

  if (prismaAudits > 0 && supabaseAudits === 0) {
    console.log(
      `   ❌ PROBLÈME: Audits existent dans Prisma mais pas dans Supabase`,
    );
    console.log(`   🔧 Cause probable: Synchronisation non fonctionnelle`);
  } else if (prismaAudits === supabaseAudits && prismaAudits > 0) {
    console.log(`   ✅ Données synchronisées`);
  } else if (prismaAudits === 0 && supabaseAudits === 0) {
    console.log(`   ⚠️ Aucune donnée dans les deux bases`);
  }

  // Comparer les utilisateurs
  const prismaUsers = prismaData.userCount;
  const supabaseUsers = supabaseData.users?.count || 0;

  console.log(`\n👥 Utilisateurs:`);
  console.log(`   • Prisma: ${prismaUsers}`);
  console.log(`   • Supabase: ${supabaseUsers}`);
  console.log(`   • Différence: ${Math.abs(prismaUsers - supabaseUsers)}`);
}

async function checkSyncMechanisms() {
  console.log("\n🔧 4. VÉRIFICATION DES MÉCANISMES DE SYNC");
  console.log("-".repeat(40));

  // Vérifier si le bridge existe et est utilisé
  const bridgeFiles = [
    "src/lib/supabase/bridge.ts",
    "src/lib/supabase/bridge-simple.ts",
    "src/lib/supabase/bridge-v2.ts",
  ];

  console.log("📁 Fichiers de synchronisation:");
  for (const file of bridgeFiles) {
    try {
      const fs = require("fs");
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file} existe`);
      } else {
        console.log(`   ❌ ${file} manquant`);
      }
    } catch (e) {
      console.log(`   ❓ ${file} - erreur de vérification`);
    }
  }

  // Vérifier les hooks dans le code
  console.log("\n🔗 Recherche des points d'intégration:");
  console.log("   🔍 Chercher 'SupabaseBridge' dans le code...");
  console.log("   🔍 Chercher les hooks de création d'audit...");
  console.log("   🔍 Vérifier si la sync est appelée automatiquement...");
}

async function suggestSolutions() {
  console.log("\n💡 5. SOLUTIONS PROPOSÉES");
  console.log("-".repeat(40));

  console.log("🎯 Options pour corriger la synchronisation:\n");

  console.log("Option A - PostgreSQL Direct (recommandée):");
  console.log("   • Configurer Prisma avec PostgreSQL Supabase");
  console.log("   • Une seule base de données partagée");
  console.log("   • Synchronisation native automatique");
  console.log("   • Meilleure performance et cohérence");

  console.log("\nOption B - Dual Database avec Sync Automatique:");
  console.log("   • Garder SQLite pour Prisma");
  console.log("   • Ajouter des hooks automatiques de synchronisation");
  console.log("   • Sync en temps réel lors des opérations CRUD");

  console.log("\nOption C - Migration Complete:");
  console.log("   • Migrer toutes les données de SQLite vers PostgreSQL");
  console.log("   • Unifier sur une seule base Supabase");
  console.log("   • Éliminer la complexité de la dual-database");
}

async function main() {
  try {
    const prismaData = await inspectPrismaDatabase();
    const supabaseData = await inspectSupabaseDatabase();

    await analyzeDataDiscrepancies(prismaData, supabaseData);
    await checkSyncMechanisms();
    await suggestSolutions();

    console.log(`\n${  "=".repeat(60)}`);
    console.log("🎯 DIAGNOSTIC TERMINÉ");
    console.log("\nProchaine étape: Choisir une solution et l'implémenter");
  } catch (error) {
    console.error("💥 Erreur investigation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
