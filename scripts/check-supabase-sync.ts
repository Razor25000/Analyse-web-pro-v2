#!/usr/bin/env tsx

/**
 * Script de diagnostic pour vérifier la synchronisation Supabase
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://muzzgghqpspummcrwxfa.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11enpnZ2hxcHNwdW1tY3J3eGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1Mjk0OSwiZXhwIjoyMDcyOTI4OTQ5fQ.XKlfT2omO1-27C2usQei_113_Lu8Hgj3YehuuyTCNms";

async function checkSupabaseSync() {
  console.log("🔍 Vérification de la synchronisation Supabase...");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Configuration Supabase manquante");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Vérifier la table profiles
    console.log("\n📊 Vérification table 'profiles':");
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .limit(10);

    if (profilesError) {
      console.error("❌ Erreur table profiles:", profilesError.message);
    } else {
      console.log(
        `✅ Table profiles: ${profiles?.length || 0} enregistrements`,
      );
      if (profiles && profiles.length > 0) {
        console.log("Derniers profils:");
        profiles.slice(0, 3).forEach((profile, i) => {
          console.log(`  ${i + 1}. ${profile.email} (${profile.user_id})`);
        });
      }
    }

    // Vérifier la table subscribers
    console.log("\n📊 Vérification table 'subscribers':");
    const { data: subscribers, error: subscribersError } = await supabase
      .from("subscribers")
      .select("*")
      .limit(10);

    if (subscribersError) {
      console.error("❌ Erreur table subscribers:", subscribersError.message);
    } else {
      console.log(
        `✅ Table subscribers: ${subscribers?.length || 0} enregistrements`,
      );
      if (subscribers && subscribers.length > 0) {
        console.log("Derniers abonnés:");
        subscribers.slice(0, 3).forEach((sub, i) => {
          console.log(
            `  ${i + 1}. ${sub.email} (${sub.subscription_tier || "free"})`,
          );
        });
      }
    }

    // Test d'insertion d'un profil
    console.log("\n🧪 Test d'insertion profil...");
    const testUserId = `test-${Date.now()}`;
    const testEmail = `test-${Date.now()}@example.com`;

    const { data: insertResult, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: testUserId,
        email: testEmail,
        full_name: "Test User",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erreur insertion test:", insertError.message);
    } else {
      console.log("✅ Insertion test réussie:", insertResult.email);

      // Nettoyer le test
      await supabase.from("profiles").delete().eq("user_id", testUserId);
      console.log("🧹 Profil test supprimé");
    }
  } catch (error: any) {
    console.error("❌ Erreur générale:", error.message);
  }
}

checkSupabaseSync()
  .then(() => {
    console.log("\n✅ Diagnostic terminé");
  })
  .catch(console.error);
