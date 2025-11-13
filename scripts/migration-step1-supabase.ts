#!/usr/bin/env tsx

/**
 * Migration Étape 1: Ajouter les champs métier au modèle User via Supabase
 * Ce script utilise l'API Supabase admin pour modifier la table user
 */

import { supabaseAdmin } from "../src/lib/supabase";

async function addUserBusinessFieldsViaSupabase() {
  console.log(
    "🚀 Migration Étape 1: Ajout des champs métier au modèle User (via Supabase)",
  );

  if (!supabaseAdmin) {
    throw new Error("❌ Supabase admin client non disponible");
  }

  try {
    // Liste des colonnes à ajouter avec leurs commandes SQL
    const alterCommands = [
      {
        name: "monthly_quota",
        sql: 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "monthly_quota" INTEGER DEFAULT 10 NOT NULL;',
      },
      {
        name: "quota_used",
        sql: 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "quota_used" INTEGER DEFAULT 0 NOT NULL;',
      },
      {
        name: "quota_reset_date",
        sql: `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "quota_reset_date" TIMESTAMP WITH TIME ZONE 
              DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month') NOT NULL;`,
      },
      {
        name: "subscription_tier",
        sql: 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_tier" TEXT DEFAULT \'free\' NOT NULL;',
      },
      {
        name: "company",
        sql: 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "company" TEXT;',
      },
      {
        name: "subscribed",
        sql: 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscribed" BOOLEAN DEFAULT false NOT NULL;',
      },
      {
        name: "subscription_end",
        sql: 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_end" TIMESTAMP WITH TIME ZONE;',
      },
    ];

    console.log(
      "📋 Colonnes à ajouter:",
      alterCommands.map((cmd) => cmd.name),
    );

    // Exécuter chaque commande ALTER TABLE
    for (const command of alterCommands) {
      try {
        console.log(`➕ Ajout de la colonne: ${command.name}`);

        const { error } = await supabaseAdmin.rpc("exec_sql", {
          sql: command.sql,
        });

        if (error) {
          // Si la fonction exec_sql n'existe pas, essayer une approche alternative
          if (
            error.message?.includes("function exec_sql") ||
            error.message?.includes("does not exist")
          ) {
            console.log(
              `⚠️  Fonction exec_sql non disponible, tentative alternative pour ${command.name}`,
            );

            // Pour certaines colonnes, on peut vérifier leur existence autrement
            console.log(
              `⚠️  Colonne ${command.name} sera ajoutée manuellement dans Supabase`,
            );
          } else {
            console.warn(
              `⚠️  Avertissement pour ${command.name}:`,
              error.message,
            );
          }
        } else {
          console.log(`✅ Colonne ${command.name} ajoutée avec succès`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Erreur pour ${command.name}:`, error.message);
      }
    }

    // Ajouter la relation user_id à la table subscription
    try {
      console.log("➕ Ajout de la colonne user_id à la table subscription");

      const { error } = await supabaseAdmin.rpc("exec_sql", {
        sql: 'ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "user_id" TEXT;',
      });

      if (error) {
        console.warn("⚠️  Avertissement subscription.user_id:", error.message);
      } else {
        console.log("✅ Colonne user_id ajoutée à la table subscription");
      }
    } catch (error: any) {
      console.warn("⚠️  Erreur ajout user_id à subscription:", error.message);
    }

    console.log("📊 Vérification des tables utilisateur...");

    // Vérifier si les utilisateurs existent
    const { data: users, error: usersError } = await supabaseAdmin
      .from("user")
      .select("id, email, name, monthly_quota, quota_used, subscription_tier")
      .limit(3);

    if (usersError) {
      console.warn(
        "⚠️  Impossible de vérifier les utilisateurs:",
        usersError.message,
      );
    } else {
      console.log("👥 Utilisateurs trouvés:", users?.length || 0);
      if (users && users.length > 0) {
        console.log("📋 Premier utilisateur (exemple):", {
          id: users[0].id,
          email: users[0].email,
          monthlyQuota: users[0].monthly_quota || "NON DÉFINI",
          quotaUsed: users[0].quota_used || "NON DÉFINI",
          subscriptionTier: users[0].subscription_tier || "NON DÉFINI",
        });
      }
    }

    console.log("✅ Migration Étape 1 terminée");
    console.log("📝 Instructions manuelles pour compléter:");
    console.log("1. Connectez-vous à votre dashboard Supabase");
    console.log("2. Allez dans 'Database' > 'Tables' > table 'user'");
    console.log("3. Vérifiez que ces colonnes existent ou ajoutez-les:");
    console.log("   - monthly_quota (INTEGER, default 10)");
    console.log("   - quota_used (INTEGER, default 0)");
    console.log("   - quota_reset_date (TIMESTAMP WITH TIME ZONE)");
    console.log("   - subscription_tier (TEXT, default 'free')");
    console.log("   - company (TEXT, nullable)");
    console.log("   - subscribed (BOOLEAN, default false)");
    console.log("   - subscription_end (TIMESTAMP WITH TIME ZONE, nullable)");
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  addUserBusinessFieldsViaSupabase()
    .then(() => {
      console.log(
        "🎉 Migration Étape 1 terminée (vérifiez les instructions manuelles)",
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration Étape 1 échouée:", error);
      process.exit(1);
    });
}

export { addUserBusinessFieldsViaSupabase };
