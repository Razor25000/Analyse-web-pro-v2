#!/usr/bin/env tsx

/**
 * Script pour configurer automatiquement les tables Supabase
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "../src/lib/env";
import fs from "fs";
import path from "path";

async function setupSupabaseTables() {
  console.log("🚀 Configuration des tables Supabase...\n");

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.error("❌ Variables d'environnement Supabase manquantes");
    process.exit(1);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, "..", "supabase-setup.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    console.log("📄 Contenu du fichier SQL chargé");
    console.log("🔄 Exécution du script SQL...\n");

    // Diviser le SQL en statements individuels
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`⚡ Exécution: ${statement.substring(0, 50)}...`);

        try {
          const { error } = await supabase.rpc("exec_sql", {
            sql: `${statement};`,
          });

          if (error) {
            console.log(`⚠️  Possible erreur (ignorée): ${error.message}`);
          } else {
            console.log("✅ Statement exécuté");
          }
        } catch (err) {
          console.log(
            `⚠️  Erreur lors de l'exécution (peut être normal): ${err.message}`,
          );
        }
      }
    }

    console.log("\n✅ Configuration terminée!");
    console.log("\n🔍 Vérification des tables créées...");

    // Vérifier que les tables existent
    const tables = ["profiles", "subscribers", "audits"];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("count")
          .limit(1);

        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: créée avec succès`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: erreur de vérification`);
      }
    }
  } catch (error) {
    console.error("❌ Erreur lors de la configuration:", error);
    console.log(
      "\n💡 Alternative: Exécutez manuellement le fichier supabase-setup.sql dans Supabase SQL Editor",
    );
  }
}

async function main() {
  console.log("🔧 Configuration automatique des tables Supabase\n");
  console.log("=".repeat(50));

  await setupSupabaseTables();
}

if (require.main === module) {
  main().catch(console.error);
}
