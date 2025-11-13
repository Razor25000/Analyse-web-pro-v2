#!/usr/bin/env tsx

/**
 * Script de nettoyage des données orphelines dans Supabase
 * Architecture Dual Database v2.0 - Optimisation
 *
 * 🎯 OBJECTIF: Nettoyer les tables Supabase obsolètes et orphelines
 *
 * ACTIONS:
 * 1. Vérifier et nettoyer la table 'audits' (orphelins sans prisma_id)
 * 2. Supprimer entièrement la table 'profiles' (obsolète depuis v2.0)
 * 3. Supprimer entièrement la table 'subscribers' (obsolète depuis v2.0)
 * 4. Afficher statistiques avant/après
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

console.log("🧹 Nettoyage des données orphelines Supabase...");
console.log("=================================================");

// Vérification des variables d'environnement
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
  console.error("❌ Variables Supabase manquantes");
  console.log("SUPABASE_URL:", env.SUPABASE_URL ? "✅" : "❌");
  console.log("SUPABASE_SERVICE_KEY:", env.SUPABASE_SERVICE_KEY ? "✅" : "❌");
  process.exit(1);
}

const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function getTableStats() {
  console.log("\n📊 Statistiques actuelles des tables Supabase:");

  // Audits
  try {
    const { count: auditsCount, error: auditsError } = await supabaseAdmin
      .from("audits")
      .select("*", { count: "exact", head: true });

    if (auditsError) {
      console.log("   📋 Table audits: ❌ Erreur -", auditsError.message);
    } else {
      console.log(`   📋 Table audits: ${auditsCount} enregistrements`);
    }
  } catch (error) {
    console.log("   📋 Table audits: ❌ Erreur -", (error as Error).message);
  }

  // Profiles
  try {
    const { count: profilesCount, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (profilesError) {
      console.log("   👥 Table profiles: ❌ Erreur -", profilesError.message);
    } else {
      console.log(`   👥 Table profiles: ${profilesCount} enregistrements`);
    }
  } catch (error) {
    console.log("   👥 Table profiles: ❌ Erreur -", (error as Error).message);
  }

  // Subscribers
  try {
    const { count: subscribersCount, error: subscribersError } =
      await supabaseAdmin
        .from("subscribers")
        .select("*", { count: "exact", head: true });

    if (subscribersError) {
      console.log(
        "   💳 Table subscribers: ❌ Erreur -",
        subscribersError.message,
      );
    } else {
      console.log(
        `   💳 Table subscribers: ${subscribersCount} enregistrements`,
      );
    }
  } catch (error) {
    console.log(
      "   💳 Table subscribers: ❌ Erreur -",
      (error as Error).message,
    );
  }
}

async function cleanupOrphanedAudits() {
  console.log("\n🔍 Nettoyage des audits orphelins...");

  try {
    // Récupérer tous les audits Supabase
    const { data: supabaseAudits, error: fetchError } = await supabaseAdmin
      .from("audits")
      .select("id, prisma_id");

    if (fetchError) {
      console.log("❌ Erreur récupération audits:", fetchError.message);
      return { deleted: 0, errors: 1 };
    }

    if (!supabaseAudits || supabaseAudits.length === 0) {
      console.log("✅ Aucun audit trouvé dans Supabase");
      return { deleted: 0, errors: 0 };
    }

    console.log(`📊 ${supabaseAudits.length} audits trouvés dans Supabase`);

    let deleted = 0;
    let errors = 0;
    let checked = 0;

    for (const audit of supabaseAudits) {
      checked++;

      if (!audit.prisma_id) {
        // Audit sans lien Prisma = orphelin direct
        try {
          const { error: deleteError } = await supabaseAdmin
            .from("audits")
            .delete()
            .eq("id", audit.id);

          if (deleteError) {
            console.log(
              `❌ Erreur suppression audit ${audit.id}:`,
              deleteError.message,
            );
            errors++;
          } else {
            console.log(`✅ Audit orphelin supprimé: ${audit.id}`);
            deleted++;
          }
        } catch (error) {
          console.log(
            `❌ Erreur suppression audit ${audit.id}:`,
            (error as Error).message,
          );
          errors++;
        }
      } else {
        // Vérifier si l'audit existe encore dans Prisma
        try {
          const prismaAudit = await prisma.audit.findUnique({
            where: { id: audit.prisma_id },
          });

          if (!prismaAudit) {
            // Audit supprimé de Prisma = orphelin
            try {
              const { error: deleteError } = await supabaseAdmin
                .from("audits")
                .delete()
                .eq("id", audit.id);

              if (deleteError) {
                console.log(
                  `❌ Erreur suppression audit orphelin ${audit.id}:`,
                  deleteError.message,
                );
                errors++;
              } else {
                console.log(
                  `✅ Audit orphelin supprimé (Prisma inexistant): ${audit.id}`,
                );
                deleted++;
              }
            } catch (error) {
              console.log(
                `❌ Erreur suppression audit ${audit.id}:`,
                (error as Error).message,
              );
              errors++;
            }
          }
        } catch (error) {
          console.log(
            `❌ Erreur vérification Prisma pour audit ${audit.prisma_id}:`,
            (error as Error).message,
          );
          errors++;
        }
      }

      // Affichage du progrès
      if (checked % 10 === 0) {
        console.log(`📊 Progrès: ${checked}/${supabaseAudits.length} vérifiés`);
      }
    }

    console.log(`\n✅ Nettoyage audits terminé:`);
    console.log(`   📊 Audits vérifiés: ${checked}`);
    console.log(`   🗑️ Audits orphelins supprimés: ${deleted}`);
    console.log(`   ❌ Erreurs: ${errors}`);

    return { deleted, errors };
  } catch (error) {
    console.error(
      "❌ Erreur générale nettoyage audits:",
      (error as Error).message,
    );
    return { deleted: 0, errors: 1 };
  }
}

async function cleanupObsoleteTables() {
  console.log("\n🗑️ Suppression des tables obsolètes...");

  // Note: Supabase ne permet pas de DROP des tables via l'API
  // Il faut le faire manuellement dans le dashboard ou via SQL

  console.log(
    "⚠️ IMPORTANT: Les tables 'profiles' et 'subscribers' doivent être",
  );
  console.log("   supprimées manuellement depuis le dashboard Supabase:");
  console.log(
    "   1. Aller sur https://supabase.com/dashboard/project/.../editor",
  );
  console.log("   2. Exécuter: DROP TABLE IF EXISTS public.profiles CASCADE;");
  console.log(
    "   3. Exécuter: DROP TABLE IF EXISTS public.subscribers CASCADE;",
  );

  // Tentative de vider les tables au lieu de les supprimer
  try {
    const { error: profilesError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (profilesError && !profilesError.message.includes("does not exist")) {
      console.log("❌ Erreur vidage table profiles:", profilesError.message);
    } else {
      console.log("✅ Table profiles vidée");
    }
  } catch (error) {
    console.log("⚠️ Table profiles probablement déjà supprimée");
  }

  try {
    const { error: subscribersError } = await supabaseAdmin
      .from("subscribers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (
      subscribersError &&
      !subscribersError.message.includes("does not exist")
    ) {
      console.log(
        "❌ Erreur vidage table subscribers:",
        subscribersError.message,
      );
    } else {
      console.log("✅ Table subscribers vidée");
    }
  } catch (error) {
    console.log("⚠️ Table subscribers probablement déjà supprimée");
  }
}

async function main() {
  console.log("🎯 Architecture Dual Database v2.0 - Nettoyage Supabase");
  console.log(
    "Objectif: Ne garder que la table 'audits' pour les workflows n8n\n",
  );

  // Statistiques avant nettoyage
  await getTableStats();

  // Nettoyer les audits orphelins
  const auditCleanup = await cleanupOrphanedAudits();

  // Nettoyer les tables obsolètes
  await cleanupObsoleteTables();

  // Statistiques après nettoyage
  console.log(`\n${  "=".repeat(50)}`);
  console.log("📊 STATISTIQUES FINALES");
  console.log("=".repeat(50));
  await getTableStats();

  console.log("\n✅ Nettoyage Supabase terminé!");
  console.log(`📊 Résumé: ${auditCleanup.deleted} audits orphelins supprimés`);
  console.log(
    "🎯 Architecture Dual v2.0: Supabase optimisé pour workflows n8n uniquement",
  );
}

main().catch((error) => {
  console.error("💥 Erreur fatale:", error);
  process.exit(1);
});
