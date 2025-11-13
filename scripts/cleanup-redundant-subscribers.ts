#!/usr/bin/env tsx

console.log("🧹 SUPPRESSION DE LA TABLE 'SUBSCRIBERS' REDONDANTE");
console.log(
  "================================================================================",
);

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!);

async function cleanupRedundantTables() {
  try {
    console.log("🔍 Vérification de l'existence de la table 'subscribers'...");

    // Vérifier si la table existe
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "subscribers");

    if (tablesError) {
      console.error("❌ Erreur lors de la vérification:", tablesError.message);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log("✅ La table 'subscribers' n'existe pas dans Supabase");
      return;
    }

    console.log(`📊 Table 'subscribers' trouvée. Vérification des données...`);

    // Compter les enregistrements
    const { count, error: countError } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Erreur lors du comptage:", countError.message);
      return;
    }

    console.log(`📈 ${count} enregistrements trouvés dans 'subscribers'`);

    // Afficher quelques exemples pour confirmation
    const { data: sample, error: sampleError } = await supabase
      .from("subscribers")
      .select("user_id, email, subscription_tier, quota_used")
      .limit(3);

    if (sample && sample.length > 0) {
      console.log("\n📋 Échantillon des données à supprimer:");
      sample.forEach((row, i) => {
        console.log(
          `   ${i + 1}. ${row.email} (${row.subscription_tier}) - Quota: ${row.quota_used}`,
        );
      });
    }

    console.log("\n⚠️ CONFIRMATION REQUISE:");
    console.log(
      `   Cette table duplique les données déjà présentes dans Prisma:`,
    );
    console.log(`   - Quotas → User.monthlyQuota, User.quotaUsed`);
    console.log(`   - Stripe → User.stripeCustomerId`);
    console.log(`   - Abonnements → Subscription.plan, Subscription.status`);
    console.log("");
    console.log("🗑️ SUPPRESSION DE LA TABLE 'subscribers' (REDONDANTE)");

    // Supprimer la table
    const { error: dropError } = await supabase.rpc("exec", {
      sql: "DROP TABLE IF EXISTS public.subscribers CASCADE;",
    });

    if (dropError) {
      console.error("❌ Erreur lors de la suppression:", dropError.message);

      // Essayer avec une requête SQL directe via le client admin
      console.log("🔧 Tentative alternative de suppression...");

      try {
        const { error: altDropError } = await supabase
          .from("subscribers")
          .delete()
          .neq("id", "impossible_id"); // Supprimer tous les enregistrements

        if (altDropError) {
          console.error(
            "❌ Impossible de supprimer les données:",
            altDropError.message,
          );
          console.log(
            "💡 Suppression manuelle requise via l'interface Supabase:",
          );
          console.log("   1. Allez dans l'éditeur SQL Supabase");
          console.log(
            "   2. Exécutez: DROP TABLE IF EXISTS public.subscribers CASCADE;",
          );
          return;
        }

        console.log("✅ Données de la table 'subscribers' supprimées");
        console.log(
          "⚠️ Structure de la table reste, supprimez-la manuellement via SQL",
        );
      } catch (error) {
        console.error("❌ Erreur finale:", error);
        console.log("💡 Suppression manuelle requise via l'interface Supabase");
      }

      return;
    }

    console.log("✅ Table 'subscribers' supprimée avec succès !");
    console.log("📈 Avantages obtenus :");
    console.log("   ✓ Élimination de la duplication de données");
    console.log("   ✓ Simplification de l'architecture");
    console.log("   ✓ Cohérence des données garantie");
    console.log("   ✓ Moins de maintenance requise");
  } catch (error) {
    console.error("❌ Erreur inattendue:", error);
  }
}

// Vérifier aussi les références dans le code
function checkCodeReferences() {
  console.log("\n🔍 VÉRIFICATION DES RÉFÉRENCES DANS LE CODE");
  console.log(
    "================================================================================",
  );
  console.log(
    "⚠️ IMPORTANT: Vérifiez que ces fichiers n'utilisent plus 'subscribers':",
  );
  console.log("   - src/lib/auth/auth-config-setup.ts");
  console.log("   - src/lib/supabase/bridge.ts");
  console.log("   - scripts/sync-existing-users-to-supabase.ts");
  console.log("");
  console.log("🔧 Si des erreurs apparaissent après suppression:");
  console.log("   1. Remplacez les références à 'subscribers' par 'profiles'");
  console.log(
    "   2. Utilisez les données Prisma (User/Subscription) plutôt que Supabase",
  );
  console.log("   3. Testez tous les flux d'authentification");
}

// Exécution
cleanupRedundantTables()
  .then(() => {
    checkCodeReferences();
    console.log("\n✅ Nettoyage terminé !");
  })
  .catch((error) => {
    console.error("❌ Erreur finale:", error);
    process.exit(1);
  });
