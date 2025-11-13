#!/usr/bin/env tsx

/**
 * Script simple pour tester Stripe sans le système env complexe
 */

import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

// Configuration directe Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

const prisma = new PrismaClient();

async function testStripeSimple() {
  console.log("🔧 TEST STRIPE SIMPLE\n");
  console.log("=".repeat(60));

  try {
    // 1. Test connexion Stripe
    console.log("🔌 Test connexion Stripe...");
    const account = await stripe.account.retrieve();
    console.log(`✅ Connecté à Stripe - Account ID: ${account.id}`);
    console.log(
      `   - Business: ${account.business_profile?.name || "Non défini"}`,
    );
    console.log(`   - Country: ${account.country}`);
    console.log(`   - Currency: ${account.default_currency}`);

    // 2. Lister les produits
    console.log("\n🛍️ Produits Stripe...");
    const products = await stripe.products.list({ active: true, limit: 5 });
    console.log(`📦 ${products.data.length} produits trouvés`);

    for (const product of products.data) {
      console.log(`   • ${product.name} (${product.id})`);
    }

    // 3. Vérifier les webhooks
    console.log("\n🔗 Webhooks configurés...");
    const webhooks = await stripe.webhookEndpoints.list();
    console.log(`📡 ${webhooks.data.length} webhooks`);

    for (const webhook of webhooks.data) {
      console.log(`   • ${webhook.url}`);
      console.log(`     Status: ${webhook.status}`);
    }

    // 4. Test connexion database
    console.log("\n💾 Test database...");
    const userCount = await prisma.user.count();
    console.log(`👥 ${userCount} utilisateurs en base`);

    const subscriptionCount = await prisma.subscription.count();
    console.log(`💳 ${subscriptionCount} abonnements en base`);

    return true;
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack.split("\n").slice(0, 5).join("\n"));
    }
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const success = await testStripeSimple();

  if (success) {
    console.log("\n🎉 Test Stripe réussi!");
  } else {
    console.log("\n💥 Test Stripe échoué!");
  }

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}
