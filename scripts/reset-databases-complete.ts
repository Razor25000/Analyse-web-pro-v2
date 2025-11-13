#!/usr/bin/env tsx

/**
 * Script pour remettre à zéro complètement les bases de données
 * - Nettoie Prisma (SQLite)
 * - Nettoie Supabase
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Charger les variables d'environnement
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function resetDatabases() {
  try {
    console.log("🗑️  RESET COMPLET DES BASES DE DONNÉES");
    console.log("=====================================\n");

    // 1. NETTOYAGE PRISMA (SQLite)
    console.log("🔍 1. Nettoyage de la base Prisma (SQLite)...");

    const tables = [
      "Audit",
      "Subscription",
      "Feedback",
      "Session",
      "Account",
      "Verification",
      "User",
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      try {
        const result = await (prisma as any)[table.toLowerCase()].deleteMany();
        console.log(
          `   ✅ Table ${table}: ${result.count} enregistrements supprimés`,
        );
        totalDeleted += result.count;
      } catch (error) {
        console.log(`   ⚠️  Table ${table}: pas de données ou erreur`);
      }
    }

    console.log(
      `   🎯 Total Prisma: ${totalDeleted} enregistrements supprimés\n`,
    );

    // 2. NETTOYAGE SUPABASE
    console.log("🔍 2. Nettoyage de la base Supabase...");

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
      );

      const supabaseTables = [
        "audits",
        "subscriptions",
        "profiles", // Table des profils utilisateurs Supabase
      ];

      let supabaseDeleted = 0;

      for (const table of supabaseTables) {
        try {
          // D'abord compter les enregistrements
          const { count } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });

          if (count && count > 0) {
            // Supprimer tous les enregistrements
            const { error } = await supabase.from(table).delete().neq("id", ""); // Condition qui match tout

            if (error) {
              console.log(`   ❌ Erreur table ${table}:`, error.message);
            } else {
              console.log(
                `   ✅ Table ${table}: ${count} enregistrements supprimés`,
              );
              supabaseDeleted += count;
            }
          } else {
            console.log(`   ℹ️  Table ${table}: déjà vide`);
          }
        } catch (error) {
          console.log(`   ⚠️  Table ${table}: erreur ou n'existe pas`);
        }
      }

      console.log(
        `   🎯 Total Supabase: ${supabaseDeleted} enregistrements supprimés\n`,
      );
    } else {
      console.log("   ⚠️  Configuration Supabase manquante, ignoré\n");
    }

    // 3. VÉRIFICATION
    console.log("🔍 3. Vérification du nettoyage...");

    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();
    const subscriptionCount = await prisma.subscription.count();

    console.log(`   📊 Utilisateurs restants: ${userCount}`);
    console.log(`   📊 Sessions restantes: ${sessionCount}`);
    console.log(`   📊 Abonnements restants: ${subscriptionCount}`);

    if (userCount === 0 && sessionCount === 0 && subscriptionCount === 0) {
      console.log("\n✅ SUCCÈS ! Toutes les bases sont maintenant vides !");
      console.log("🚀 Prêt pour des tests propres !");
    } else {
      console.log(
        "\n⚠️  Certaines données persistent. Vérifiez les contraintes de clés étrangères.",
      );
    }

    // 4. CONSEILS POUR LA SUITE
    console.log("\n📋 ÉTAPES SUIVANTES :");
    console.log("1. Relancez le serveur : pnpm dev");
    console.log("2. Créez un nouveau compte utilisateur");
    console.log("3. Testez les abonnements depuis une base propre");
  } catch (error) {
    console.error("❌ Erreur lors du reset:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  resetDatabases();
}
