#!/usr/bin/env tsx

/**
 * Script de raccourci pour nettoyer complètement et rapidement
 * Usage: pnpm clean:all
 */

import { config } from "dotenv";
import { execSync } from "child_process";

// Charger les variables d'environnement
config({ path: ".env.local" });

async function cleanEverything() {
  try {
    console.log("🧹 NETTOYAGE COMPLET - REMISE À ZÉRO\n");
    console.log(
      "⚡ Mode rapide : suppression de la base SQLite + nettoyage Supabase",
    );
    console.log("=".repeat(60));

    // 1. Supprimer directement le fichier SQLite
    console.log("🗑️  1. Suppression de la base SQLite...");
    try {
      const fs = require("fs");
      const dbPath = "./prisma/dev.db";

      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log("   ✅ Base SQLite supprimée");
      } else {
        console.log("   ℹ️  Base SQLite n'existait pas");
      }
    } catch (error) {
      console.log("   ⚠️  Erreur suppression SQLite:", error);
    }

    // 2. Recréer la base avec Prisma
    console.log("🔧 2. Recréation de la base Prisma...");
    try {
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
      console.log("   ✅ Base Prisma recréée");
    } catch (error) {
      console.log("   ❌ Erreur recréation Prisma");
    }

    // 3. Nettoyer Supabase
    console.log("🗑️  3. Nettoyage Supabase...");
    try {
      execSync("npx tsx scripts/reset-supabase-clean.ts", { stdio: "inherit" });
      console.log("   ✅ Supabase nettoyé");
    } catch (error) {
      console.log("   ⚠️  Erreur nettoyage Supabase");
    }

    console.log(`\n${  "=".repeat(60)}`);
    console.log("✅ NETTOYAGE TERMINÉ ! Bases de données remises à zéro");
    console.log("\n🚀 ÉTAPES SUIVANTES :");
    console.log("1. Relancez le serveur : pnpm dev");
    console.log("2. Allez sur http://localhost:3000");
    console.log("3. Créez un nouveau compte");
    console.log("4. Testez les abonnements depuis une base propre !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage complet:", error);
  }
}

if (require.main === module) {
  cleanEverything();
}
