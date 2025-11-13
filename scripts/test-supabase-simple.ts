#!/usr/bin/env tsx

import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log("🔍 Testing Supabase connection...");
console.log("================================");

async function testSupabaseConnection() {
  // Check environment variables
  console.log("\n1. Configuration check:");
  console.log(`   SUPABASE_URL: ${SUPABASE_URL || "❌ Non configuré"}`);
  console.log(
    `   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "✅ Configuré" : "❌ Non configuré"}`,
  );
  console.log(
    `   SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? "✅ Configuré" : "❌ Non configuré"}`,
  );

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log(
      "\n❌ Configuration incomplète. Vérifiez vos variables d'environnement.",
    );
    return;
  }

  // Test anon connection
  console.log("\n2. Test connexion anonyme:");
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from("audits").select("id").limit(1);

    if (error) {
      console.log("   ❌ Requête échouée:", error.message);
      console.log("   Details:", error);
    } else {
      console.log("   ✅ Connexion anonyme réussie");
    }
  } catch (err) {
    console.log("   ❌ Erreur de connexion:", err);
  }

  // Test admin connection
  console.log("\n3. Test connexion admin:");
  if (SUPABASE_SERVICE_KEY) {
    try {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        console.log("   ❌ Requête admin échouée:", error.message);
      } else {
        console.log("   ✅ Connexion admin réussie");
      }
    } catch (err) {
      console.log("   ❌ Erreur de connexion admin:", err);
    }
  } else {
    console.log("   ⚠️ Service key non configurée");
  }

  // Test structure des tables
  console.log("\n4. Test structure des tables:");
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test table audits
    console.log("   📊 Table audits:");
    const { data: auditData, error: auditError } = await supabase
      .from("audits")
      .select("*")
      .limit(3);

    if (auditError) {
      console.log(`      ❌ Erreur: ${auditError.message}`);
    } else {
      console.log(`      ✅ ${auditData?.length || 0} enregistrements trouvés`);
    }

    // Test table profiles
    console.log("   👥 Table profiles:");
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .limit(3);

    if (profileError) {
      console.log(`      ❌ Erreur: ${profileError.message}`);
    } else {
      console.log(
        `      ✅ ${profileData?.length || 0} enregistrements trouvés`,
      );
    }

    // Test table subscribers
    console.log("   💳 Table subscribers:");
    const { data: subscriberData, error: subscriberError } = await supabase
      .from("subscribers")
      .select("*")
      .limit(3);

    if (subscriberError) {
      console.log(`      ❌ Erreur: ${subscriberError.message}`);
    } else {
      console.log(
        `      ✅ ${subscriberData?.length || 0} enregistrements trouvés`,
      );
    }
  } catch (err) {
    console.log("   ❌ Erreur lors du test des tables:", err);
  }

  console.log("\n✅ Test de connexion Supabase terminé!");
}

testSupabaseConnection().catch(console.error);
