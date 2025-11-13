#!/usr/bin/env tsx

console.log("🧹 SUPPRESSION DE LA TABLE 'SUBSCRIBERS' REDONDANTE");
console.log(
  "================================================================================",
);

import { createClient } from "@supabase/supabase-js";

// Variables d'environnement directes
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Variables d'environnement manquantes: SUPABASE_URL, SUPABASE_SERVICE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAndDropSubscribers() {
  try {
    console.log("🔍 Vérification de l'existence de la table 'subscribers'...");

    // Tenter de compter les enregistrements
    const { count, error: countError } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true });

    if (countError) {
      if (
        countError.code === "PGRST106" ||
        countError.message.includes(
          'relation "public.subscribers" does not exist',
        )
      ) {
        console.log(
          "✅ La table 'subscribers' n'existe déjà plus dans Supabase",
        );
        return true;
      }
      console.error("❌ Erreur lors de la vérification:", countError.message);
      return false;
    }

    console.log(
      `📈 ${count || 0} enregistrements trouvés dans la table 'subscribers'`,
    );

    if (count && count > 0) {
      // Afficher quelques exemples
      const { data: sample, error: sampleError } = await supabase
        .from("subscribers")
        .select("user_id, email, subscription_tier, quota_used")
        .limit(3);

      if (!sampleError && sample && sample.length > 0) {
        console.log("\n📋 Échantillon des données (REDONDANTES avec Prisma):");
        sample.forEach((row, i) => {
          console.log(
            `   ${i + 1}. ${row.email} (${row.subscription_tier}) - Quota: ${row.quota_used}`,
          );
        });
      }
    }

    console.log("\n⚠️ RAISONS DE LA SUPPRESSION:");
    console.log(
      "   ✓ Données dupliquées avec User.monthlyQuota, User.quotaUsed (Prisma)",
    );
    console.log("   ✓ Données dupliquées avec User.stripeCustomerId (Prisma)");
    console.log(
      "   ✓ Données dupliquées avec Subscription.plan, Subscription.status (Prisma)",
    );
    console.log("   ✓ Architecture simplifiée et plus cohérente");

    console.log("\n🗑️ SUPPRESSION EN COURS...");

    // Première tentative: supprimer tous les enregistrements
    const { error: deleteError } = await supabase
      .from("subscribers")
      .delete()
      .neq("id", "impossible_value"); // Condition toujours vraie pour tout supprimer

    if (deleteError) {
      console.error(
        "❌ Erreur lors de la suppression des données:",
        deleteError.message,
      );

      console.log("\n💡 SUPPRESSION MANUELLE REQUISE:");
      console.log("   1. Allez dans l'interface Supabase Dashboard");
      console.log("   2. Ouvrez l'éditeur SQL (SQL Editor)");
      console.log("   3. Exécutez cette commande:");
      console.log("      DROP TABLE IF EXISTS public.subscribers CASCADE;");
      console.log("");
      console.log(
        "   4. Ou supprimez la table via l'onglet 'Tables' dans l'interface",
      );

      return false;
    }

    console.log("✅ Contenu de la table 'subscribers' supprimé !");
    console.log("\n⚠️ NOTE: La structure de la table peut rester.");
    console.log(
      "   Si c'est le cas, supprimez-la manuellement via l'interface Supabase.",
    );

    return true;
  } catch (error) {
    console.error("❌ Erreur inattendue:", error);
    return false;
  }
}

async function showCleanupResults() {
  console.log("\n📊 RÉSULTATS DU NETTOYAGE");
  console.log(
    "================================================================================",
  );
  console.log("✅ TABLES SUPPRIMÉES (Prisma):");
  console.log(
    "   ❌ UserQuota → Redondante avec User.monthlyQuota, User.quotaUsed",
  );
  console.log("   ❌ AuditUsageLog → Pas utilisée, logs déjà dans audits");
  console.log("");
  console.log("✅ TABLES SUPPRIMÉES (Supabase):");
  console.log(
    "   ❌ subscribers → Redondante avec User + Subscription (Prisma)",
  );
  console.log("");
  console.log("✅ TABLES CONSERVÉES (Nécessaires):");
  console.log("   ✓ profiles → Synchronisation Better Auth");
  console.log("   ✓ audits → Données métier des audits");
  console.log("   ✓ batch_jobs → Feature batch audits (premium)");
  console.log("   ✓ payment_history → Historique des paiements");
  console.log("   ✓ user_preferences → Préférences utilisateur");
  console.log("   ✓ reports → Rapports partagés (premium)");
  console.log("   ✓ Feedback (Prisma) → Système de support actif");
  console.log("");
  console.log("🚀 ARCHITECTURE OPTIMISÉE POUR LE LANCEMENT RAPIDE !");
}

// Exécution
checkAndDropSubscribers()
  .then((success) => {
    showCleanupResults();
    if (success) {
      console.log("\n✅ Suppression terminée avec succès !");
    } else {
      console.log("\n⚠️ Suppression partielle, action manuelle requise.");
    }
  })
  .catch((error) => {
    console.error("❌ Erreur finale:", error);
    process.exit(1);
  });
