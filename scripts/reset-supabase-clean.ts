#!/usr/bin/env tsx

/**
 * Script pour nettoyer spécifiquement Supabase
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Charger les variables d'environnement
config({ path: ".env.local" });

async function resetSupabaseClean() {
  try {
    console.log("🗑️  NETTOYAGE SUPABASE SPÉCIFIQUE\n");

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.log("❌ Configuration Supabase manquante");
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    // 1. Nettoyer la table audits
    console.log("🔍 1. Nettoyage table 'audits'...");
    try {
      const { data: auditsData, error: auditsSelectError } = await supabase
        .from("audits")
        .select("id");

      if (auditsSelectError) {
        console.log(
          "   ℹ️  Table 'audits' n'existe pas ou erreur:",
          auditsSelectError.message,
        );
      } else if (auditsData && auditsData.length > 0) {
        const { error: auditsDeleteError } = await supabase
          .from("audits")
          .delete()
          .in(
            "id",
            auditsData.map((row) => row.id),
          );

        if (auditsDeleteError) {
          console.log(
            "   ❌ Erreur suppression audits:",
            auditsDeleteError.message,
          );
        } else {
          console.log(`   ✅ ${auditsData.length} audits supprimés`);
        }
      } else {
        console.log("   ℹ️  Table 'audits' déjà vide");
      }
    } catch (error) {
      console.log("   ⚠️  Erreur table audits:", error);
    }

    // 2. Nettoyer la table subscriptions
    console.log("🔍 2. Nettoyage table 'subscriptions'...");
    try {
      const { data: subsData, error: subsSelectError } = await supabase
        .from("subscriptions")
        .select("id");

      if (subsSelectError) {
        console.log(
          "   ℹ️  Table 'subscriptions' n'existe pas ou erreur:",
          subsSelectError.message,
        );
      } else if (subsData && subsData.length > 0) {
        const { error: subsDeleteError } = await supabase
          .from("subscriptions")
          .delete()
          .in(
            "id",
            subsData.map((row) => row.id),
          );

        if (subsDeleteError) {
          console.log(
            "   ❌ Erreur suppression subscriptions:",
            subsDeleteError.message,
          );
        } else {
          console.log(`   ✅ ${subsData.length} abonnements supprimés`);
        }
      } else {
        console.log("   ℹ️  Table 'subscriptions' déjà vide");
      }
    } catch (error) {
      console.log("   ⚠️  Erreur table subscriptions:", error);
    }

    // 3. Nettoyer la table profiles
    console.log("🔍 3. Nettoyage table 'profiles'...");
    try {
      const { data: profilesData, error: profilesSelectError } = await supabase
        .from("profiles")
        .select("id");

      if (profilesSelectError) {
        console.log(
          "   ℹ️  Table 'profiles' n'existe pas ou erreur:",
          profilesSelectError.message,
        );
      } else if (profilesData && profilesData.length > 0) {
        const { error: profilesDeleteError } = await supabase
          .from("profiles")
          .delete()
          .in(
            "id",
            profilesData.map((row) => row.id),
          );

        if (profilesDeleteError) {
          console.log(
            "   ❌ Erreur suppression profiles:",
            profilesDeleteError.message,
          );
        } else {
          console.log(`   ✅ ${profilesData.length} profils supprimés`);
        }
      } else {
        console.log("   ℹ️  Table 'profiles' déjà vide");
      }
    } catch (error) {
      console.log("   ⚠️  Erreur table profiles:", error);
    }

    console.log("\n✅ Nettoyage Supabase terminé !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage Supabase:", error);
  }
}

if (require.main === module) {
  resetSupabaseClean();
}
