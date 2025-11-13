#!/usr/bin/env tsx

/**
 * Script pour tester l'intégration Stripe et diagnostiquer les abonnements
 */

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

async function testStripeIntegration() {
  console.log("🔧 TEST INTÉGRATION STRIPE\n");
  console.log("=".repeat(60));

  try {
    // 1. Tester la connexion Stripe
    console.log("🔌 Test connexion Stripe...");
    const account = await stripe.account.retrieve();
    console.log(`✅ Connecté à Stripe - Account ID: ${account.id}`);
    console.log(
      `   - Business name: ${account.business_profile?.name || "Non défini"}`,
    );
    console.log(`   - Country: ${account.country}`);
    console.log(`   - Currency: ${account.default_currency}`);

    // 2. Récupérer les customers Stripe de nos utilisateurs
    console.log("\n👥 Vérification des customers Stripe...");
    const users = await prisma.user.findMany({
      where: {
        stripeCustomerId: {
          not: null,
        },
      },
    });

    for (const user of users) {
      if (user.stripeCustomerId) {
        console.log(`\n🔍 Customer ${user.name} (${user.email})`);
        try {
          const customer = await stripe.customers.retrieve(
            user.stripeCustomerId,
          );
          if (typeof customer !== "string" && !customer.deleted) {
            console.log(`   ✅ Customer Stripe trouvé: ${customer.id}`);
            console.log(`   - Email: ${customer.email}`);
            console.log(
              `   - Créé le: ${new Date(customer.created * 1000).toLocaleString()}`,
            );

            // Vérifier les abonnements de ce customer
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              limit: 10,
            });

            console.log(
              `   - Abonnements actifs: ${subscriptions.data.length}`,
            );

            for (const subscription of subscriptions.data) {
              console.log(`     📋 Abonnement: ${subscription.id}`);
              console.log(`        - Status: ${subscription.status}`);
              console.log(
                `        - Plan: ${subscription.items.data[0]?.price.id || "Non défini"}`,
              );
              console.log(
                `        - Période: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} -> ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`,
              );
              console.log(
                `        - Montant: ${subscription.items.data[0]?.price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : "N/A"}${subscription.items.data[0]?.price.currency || ""}`,
              );

              // Vérifier si cet abonnement existe dans notre base
              const localSubscription = await prisma.subscription.findFirst({
                where: {
                  stripeSubscriptionId: subscription.id,
                },
              });

              if (localSubscription) {
                console.log(
                  `        ✅ Synchronisé en local: ${localSubscription.plan}`,
                );
              } else {
                console.log(`        ❌ NON synchronisé en local!`);
              }
            }
          }
        } catch (error: any) {
          console.log(`   ❌ Erreur customer Stripe: ${error.message}`);
        }
      }
    }

    // 3. Lister les produits Stripe disponibles
    console.log("\n🛍️ Produits Stripe disponibles...");
    const products = await stripe.products.list({ active: true });
    console.log(`📦 ${products.data.length} produits trouvés:`);

    for (const product of products.data) {
      console.log(`\n   📦 ${product.name}`);
      console.log(`      - ID: ${product.id}`);
      console.log(`      - Description: ${product.description || "N/A"}`);

      // Récupérer les prix pour ce produit
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      for (const price of prices.data) {
        console.log(`      💰 Prix: ${price.id}`);
        console.log(
          `         - Montant: ${price.unit_amount ? price.unit_amount / 100 : "N/A"}${price.currency}`,
        );
        console.log(
          `         - Récurrent: ${price.recurring ? `${price.recurring.interval}ly` : "Non"}`,
        );
      }
    }

    // 4. Tester les webhooks (configuration)
    console.log("\n🔗 Configuration webhooks...");
    const webhooks = await stripe.webhookEndpoints.list();
    console.log(`📡 ${webhooks.data.length} webhooks configurés:`);

    for (const webhook of webhooks.data) {
      console.log(`   🔗 ${webhook.url}`);
      console.log(`      - Status: ${webhook.status}`);
      console.log(`      - Events: ${webhook.enabled_events.join(", ")}`);
    }

    return true;
  } catch (error: any) {
    console.error("❌ Erreur lors du test Stripe:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const success = await testStripeIntegration();

  if (success) {
    console.log("\n🎉 Test Stripe terminé avec succès!");
    console.log("\n📋 Actions recommandées:");
    console.log("1. Vérifier les webhooks Stripe pour la synchronisation");
    console.log("2. Tester manuellement un abonnement en développement");
    console.log("3. Vérifier les logs des webhooks Stripe");
  }

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}
