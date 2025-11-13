#!/usr/bin/env tsx

/**
 * Migration Étape 1: Ajouter les champs métier au modèle User
 * Ce script ajoute les colonnes manquantes à la table user dans PostgreSQL
 */

import { prisma } from "../src/lib/prisma";

async function addUserBusinessFields() {
  console.log("🚀 Migration Étape 1: Ajout des champs métier au modèle User");

  try {
    // Vérifier si les colonnes existent déjà
    const userTableInfo = (await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' AND table_schema = 'public';
    `) as { column_name: string }[];

    const existingColumns = userTableInfo.map((col) => col.column_name);
    console.log("📋 Colonnes existantes dans la table user:", existingColumns);

    const columnsToAdd = [
      "monthly_quota",
      "quota_used",
      "quota_reset_date",
      "subscription_tier",
      "company",
      "subscribed",
      "subscription_end",
    ];

    const missingColumns = columnsToAdd.filter(
      (col) => !existingColumns.includes(col),
    );

    if (missingColumns.length === 0) {
      console.log(
        "✅ Toutes les colonnes métier existent déjà dans la table user",
      );
      return;
    }

    console.log("➕ Colonnes à ajouter:", missingColumns);

    // Ajouter les colonnes manquantes une par une
    for (const column of missingColumns) {
      try {
        switch (column) {
          case "monthly_quota":
            await prisma.$executeRaw`
              ALTER TABLE "user" 
              ADD COLUMN "monthly_quota" INTEGER DEFAULT 10 NOT NULL;
            `;
            console.log("✅ Colonne monthly_quota ajoutée");
            break;

          case "quota_used":
            await prisma.$executeRaw`
              ALTER TABLE "user" 
              ADD COLUMN "quota_used" INTEGER DEFAULT 0 NOT NULL;
            `;
            console.log("✅ Colonne quota_used ajoutée");
            break;

          case "quota_reset_date":
            await prisma.$executeRaw`
              ALTER TABLE "user" 
              ADD COLUMN "quota_reset_date" TIMESTAMP(3) 
              DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month') NOT NULL;
            `;
            console.log("✅ Colonne quota_reset_date ajoutée");
            break;

          case "subscription_tier":
            await prisma.$executeRaw`
              ALTER TABLE "user" 
              ADD COLUMN "subscription_tier" TEXT DEFAULT 'free' NOT NULL;
            `;
            console.log("✅ Colonne subscription_tier ajoutée");
            break;

          case "company":
            await prisma.$executeRaw`
              ALTER TABLE "user" 
              ADD COLUMN "company" TEXT;
            `;
            console.log("✅ Colonne company ajoutée");
            break;

          case "subscribed":
            await prisma.$executeRaw`
              ALTER TABLE "user" 
              ADD COLUMN "subscribed" BOOLEAN DEFAULT false NOT NULL;
            `;
            console.log("✅ Colonne subscribed ajoutée");
            break;

          case "subscription_end":
            await prisma.$executeRaw`
              ALTER TABLE "user" 
              ADD COLUMN "subscription_end" TIMESTAMP(3);
            `;
            console.log("✅ Colonne subscription_end ajoutée");
            break;
        }
      } catch (error: any) {
        if (error.message?.includes("already exists")) {
          console.log(`⚠️  Colonne ${column} existe déjà, continue...`);
        } else {
          throw error;
        }
      }
    }

    // Ajouter la relation vers subscription
    try {
      await prisma.$executeRaw`
        ALTER TABLE "subscription" 
        ADD COLUMN "user_id" TEXT;
      `;
      console.log("✅ Colonne user_id ajoutée à la table subscription");
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log("⚠️  Colonne user_id existe déjà dans subscription");
      } else {
        console.warn("⚠️  Erreur ajout user_id à subscription:", error.message);
      }
    }

    // Vérifier le résultat final
    const finalColumns = (await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' AND table_schema = 'public'
      ORDER BY column_name;
    `) as { column_name: string }[];

    console.log(
      "📊 Colonnes finales dans la table user:",
      finalColumns.map((c) => c.column_name),
    );
    console.log("✅ Migration Étape 1 terminée avec succès!");
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  addUserBusinessFields()
    .then(() => {
      console.log("🎉 Migration Étape 1 réussie");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration Étape 1 échouée:", error);
      process.exit(1);
    });
}

export { addUserBusinessFields };
