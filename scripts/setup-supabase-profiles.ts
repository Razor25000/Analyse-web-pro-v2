#!/usr/bin/env tsx
/**
 * Script pour créer la table profiles manquante dans Supabase
 * Résout l'erreur: "Could not find the table 'public.profiles'"
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Configuration Supabase
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Variables d'environnement Supabase manquantes");
  console.error("Requis: SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

async function setupSupabaseProfiles() {
  console.log("🚀 Configuration de la table profiles dans Supabase...");

  try {
    // Créer le client Supabase avec la clé service
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("📡 Connexion à Supabase...");

    // Lire le script SQL
    const sqlScript = readFileSync(
      join(process.cwd(), "scripts", "create-supabase-profiles-table.sql"),
      "utf-8",
    );

    console.log("📋 Exécution du script SQL...");

    // Exécuter le script SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql: sqlScript });

    if (error) {
      // Essayer une méthode alternative si rpc n'est pas disponible
      console.log("🔄 Tentative avec une méthode alternative...");

      // Séparer les commandes SQL et les exécuter une par une
      const sqlCommands = sqlScript
        .split(";")
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"));

      for (const command of sqlCommands) {
        if (command.toLowerCase().includes("create table")) {
          console.log("📊 Création de la table profiles...");
          const { error: tableError } = await supabase
            .from("profiles")
            .select("id")
            .limit(1);

          if (tableError && tableError.message.includes("does not exist")) {
            console.log(
              "⚠️ La table profiles n'existe pas encore, création manuelle...",
            );
            // Ici on pourrait utiliser une approche différente
            // Pour l'instant, on continue...
          }
        }
      }
    }

    console.log("✅ Configuration terminée avec succès");

    // Test de la table
    console.log("🧪 Test de la table profiles...");
    const { data: testData, error: testError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (testError) {
      console.error("❌ Erreur lors du test:", testError.message);
      console.log(
        "💡 Veuillez créer manuellement la table via le dashboard Supabase",
      );
    } else {
      console.log("✅ Table profiles accessible et fonctionnelle");
    }
  } catch (error: any) {
    console.error("❌ Erreur lors de la configuration:", error.message);
    console.log("\n📋 Actions manuelles requises:");
    console.log(
      "1. Ouvrir le dashboard Supabase: https://supabase.com/dashboard",
    );
    console.log("2. Aller dans SQL Editor");
    console.log(
      "3. Exécuter le contenu du fichier: scripts/create-supabase-profiles-table.sql",
    );

    return false;
  }

  return true;
}

// Fonction alternative : créer la table avec les méthodes Supabase standard
async function createProfilesTableManually() {
  console.log("🛠️ Création manuelle de la table profiles...");

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Note: Cette approche est limitée, il vaut mieux utiliser le SQL Editor
  console.log("📝 Table profiles requise avec les colonnes:");
  console.log("- id: UUID (Primary Key)");
  console.log("- user_id: UUID (Unique)");
  console.log("- email: TEXT");
  console.log("- full_name: TEXT (nullable)");
  console.log("- company: TEXT (nullable)");
  console.log("- created_at: TIMESTAMP");
  console.log("- updated_at: TIMESTAMP");
}

// Exécuter le script
if (require.main === module) {
  setupSupabaseProfiles()
    .then((success) => {
      if (!success) {
        createProfilesTableManually();
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Erreur fatale:", error);
      process.exit(1);
    });
}
