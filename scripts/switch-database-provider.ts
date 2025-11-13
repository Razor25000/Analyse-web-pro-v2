#!/usr/bin/env tsx

/**
 * Script pour basculer entre PostgreSQL et SQLite dans le schéma Prisma
 * Utile pour le développement local ou la résolution de problèmes de connexion
 */

import { readFileSync, writeFileSync } from "fs";
import { config } from "dotenv";

// Charger les variables d'environnement
config({ path: ".env.local" });

const SCHEMA_PATH = "prisma/schema.prisma";

function detectTargetProvider(): "postgresql" | "sqlite" {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (databaseUrl.startsWith("file:")) {
    return "sqlite";
  } else if (
    databaseUrl.startsWith("postgresql://") ||
    databaseUrl.startsWith("postgres://")
  ) {
    return "postgresql";
  }

  // Fallback vers SQLite si incertain
  return "sqlite";
}

function updateSchemaProvider(targetProvider: "postgresql" | "sqlite") {
  console.log(`🔄 Basculement vers ${targetProvider.toUpperCase()}...`);

  let schema = readFileSync(SCHEMA_PATH, "utf-8");

  if (targetProvider === "sqlite") {
    // Basculer vers SQLite
    schema = schema.replace(/provider = "postgresql"/g, 'provider = "sqlite"');

    // Supprimer les spécificités PostgreSQL
    schema = schema.replace(/@db\.JsonB/g, "");
    schema = schema.replace(/@map\("([^"]+)"\)/g, (match, mapName) => {
      // Garder les @map mais s'assurer qu'ils sont compatibles SQLite
      return match;
    });

    console.log("   ✅ Schéma adapté pour SQLite");
  } else {
    // Basculer vers PostgreSQL
    schema = schema.replace(/provider = "sqlite"/g, 'provider = "postgresql"');

    // Ajouter les spécificités PostgreSQL si nécessaires
    if (schema.includes("resultsJson") && !schema.includes("@db.JsonB")) {
      schema = schema.replace(
        /resultsJson\s+Json\?/g,
        "resultsJson      Json?     @db.JsonB",
      );
    }

    console.log("   ✅ Schéma adapté pour PostgreSQL");
  }

  writeFileSync(SCHEMA_PATH, schema);
}

function showCurrentConfig() {
  const databaseUrl = process.env.DATABASE_URL || "Non configuré";
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  const currentProvider = schema.match(/provider = "(\w+)"/)?.[1] || "inconnu";

  console.log("📋 Configuration actuelle:");
  console.log(`   DATABASE_URL: ${databaseUrl}`);
  console.log(`   Schéma provider: ${currentProvider}`);

  return currentProvider;
}

async function main() {
  console.log("🔀 SWITCH DATABASE PROVIDER");
  console.log("=".repeat(40));

  const currentProvider = showCurrentConfig();
  const targetProvider = detectTargetProvider();

  console.log(`\n🎯 Provider cible détecté: ${targetProvider.toUpperCase()}`);

  if (currentProvider === targetProvider) {
    console.log("✅ Le schéma est déjà configuré correctement");
  } else {
    updateSchemaProvider(targetProvider);
    console.log("\n📝 Prochaines étapes:");
    console.log("   1. pnpm prisma db push");
    console.log("   2. pnpm prisma generate");
  }

  console.log("\n💡 Pour basculer manuellement:");
  console.log(
    "   PostgreSQL: pnpm tsx scripts/switch-database-provider.ts postgresql",
  );
  console.log(
    "   SQLite:     pnpm tsx scripts/switch-database-provider.ts sqlite",
  );
}

// Permettre de forcer un provider spécifique
if (process.argv[2]) {
  const forcedProvider = process.argv[2] as "postgresql" | "sqlite";
  if (["postgresql", "sqlite"].includes(forcedProvider)) {
    console.log(`🎯 Forçage vers ${forcedProvider.toUpperCase()}`);
    showCurrentConfig();
    updateSchemaProvider(forcedProvider);
  } else {
    console.log("❌ Provider invalide. Utilisez 'postgresql' ou 'sqlite'");
  }
} else {
  main();
}
