#!/usr/bin/env tsx

/**
 * Script pour configurer automatiquement les webhooks Stripe
 */

import { stripe } from "@/lib/stripe";

async function setupStripeWebhook() {
  console.log("🔧 CONFIGURATION WEBHOOK STRIPE\n");
  console.log("=".repeat(60));

  const ngrokUrl = "https://19c1cb1b6e5e.ngrok-free.app";
  const webhookUrl = `${ngrokUrl}/api/stripe/webhooks`;

  try {
    // 1. Lister les webhooks existants
    console.log("📡 Vérification des webhooks existants...");
    const existingWebhooks = await stripe.webhookEndpoints.list();

    // Supprimer les anciens webhooks de développement (optionnel)
    for (const webhook of existingWebhooks.data) {
      if (webhook.url.includes("ngrok") || webhook.url.includes("localhost")) {
        console.log(`🗑️ Suppression ancien webhook: ${webhook.url}`);
        await stripe.webhookEndpoints.del(webhook.id);
      }
    }

    // 2. Créer le nouveau webhook
    console.log(`\n🚀 Création du webhook pour: ${webhookUrl}`);

    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        // Événements essentiels pour la synchronisation des abonnements
        "checkout.session.completed", // ✅ Paiement initial réussi
        "invoice.payment_succeeded", // 💰 Renouvellement réussi
        "invoice.payment_failed", // ❌ Échec de paiement
        "customer.subscription.created", // 🆕 Nouvel abonnement
        "customer.subscription.updated", // 📝 Modification d'abonnement
        "customer.subscription.deleted", // 🚫 Annulation d'abonnement
        "customer.subscription.trial_will_end", // ⏰ Fin de période d'essai
      ],
      description:
        "Webhook de développement pour synchronisation des abonnements",
    });

    console.log(`✅ Webhook créé avec succès !`);
    console.log(`   - ID: ${webhook.id}`);
    console.log(`   - URL: ${webhook.url}`);
    console.log(`   - Secret: ${webhook.secret}`);
    console.log(`   - Status: ${webhook.status}`);

    // 3. Afficher les instructions pour la configuration
    console.log("\n📋 INSTRUCTIONS DE CONFIGURATION:");
    console.log("=".repeat(60));
    console.log("1. Copiez ce secret webhook dans votre .env.local:");
    console.log(`   STRIPE_WEBHOOK_SECRET="${webhook.secret}"`);
    console.log("");
    console.log("2. Redémarrez votre serveur de développement");
    console.log("");
    console.log("3. Testez un abonnement via votre application");

    // 4. Tester la connectivité (optionnel)
    console.log("\n🔍 Test de connectivité...");
    try {
      const response = await fetch(webhookUrl, {
        method: "GET",
        headers: { "User-Agent": "Stripe-Webhook-Setup" },
      });

      if (response.status === 405) {
        console.log("✅ Endpoint webhook accessible (méthode POST attendue)");
      } else {
        console.log(`⚠️ Réponse inattendue: ${response.status}`);
      }
    } catch (error: any) {
      console.log(`❌ Erreur de connectivité: ${error.message}`);
    }

    return webhook;
  } catch (error: any) {
    console.error("❌ Erreur lors de la configuration:", error.message);
    return null;
  }
}

async function main() {
  const webhook = await setupStripeWebhook();

  if (webhook) {
    console.log("\n🎉 Configuration Stripe terminée avec succès !");
    console.log("\n🔄 Prochaines étapes:");
    console.log("1. Mettre à jour STRIPE_WEBHOOK_SECRET dans .env.local");
    console.log("2. Redémarrer le serveur");
    console.log("3. Tester un abonnement");
  } else {
    console.log("\n❌ Échec de la configuration Stripe");
  }

  process.exit(webhook ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}
