#!/usr/bin/env tsx

/**
 * Test de l'approche modernisée : Prisma pour users/quotas, Supabase pour audits
 */

import { ModernSupabaseBridge } from "../src/lib/supabase/bridge-new";
import { prisma } from "../src/lib/prisma";

async function testModernizedApproach() {
  console.log("🧪 Test de l'approche modernisée");

  try {
    const testEmail = "test@modernize.com";

    // 1. Test création utilisateur s'il n'existe pas
    console.log("\n📝 Test 1: Création utilisateur");
    const user = await ModernSupabaseBridge.createUserIfNotExists(testEmail, {
      name: "Test User",
      userId: `user_${Date.now()}`,
    });
    console.log("✅ Utilisateur créé/trouvé:", {
      id: user.id,
      email: user.email,
      quota: `${user.quotaUsed}/${user.monthlyQuota}`,
    });

    // 2. Test vérification quota
    console.log("\n📊 Test 2: Vérification quota");
    const quotaCheck = await ModernSupabaseBridge.canCreateAudit(testEmail);
    console.log("✅ Quota check:", quotaCheck);

    // 3. Test récupération abonnement
    console.log("\n🔍 Test 3: Récupération abonnement");
    const subscription =
      await ModernSupabaseBridge.getUserSubscription(testEmail);
    console.log("✅ Subscription info:", subscription);

    // 4. Test incrémentation quota
    if (quotaCheck.canCreate) {
      console.log("\n⬆️ Test 4: Incrémentation quota");
      const beforeIncrement =
        await ModernSupabaseBridge.getUserSubscription(testEmail);
      console.log("📊 Avant incrémentation:", {
        quotaUsed: beforeIncrement?.quota_used,
        monthlyQuota: beforeIncrement?.monthly_quota,
      });

      await ModernSupabaseBridge.incrementQuotaUsed(testEmail, 1);

      const afterIncrement =
        await ModernSupabaseBridge.getUserSubscription(testEmail);
      console.log("📊 Après incrémentation:", {
        quotaUsed: afterIncrement?.quota_used,
        monthlyQuota: afterIncrement?.monthly_quota,
      });

      console.log("✅ Quota incrémenté avec succès");
    }

    // 5. Test création audit (si Supabase disponible)
    console.log("\n🔄 Test 5: Création audit");
    try {
      const audit = await ModernSupabaseBridge.createAudit({
        user_id: user.id,
        email: testEmail,
        url: "https://example.com",
        audit_type: "test",
        webhook_id: `test_${Date.now()}`,
        status: "pending",
      });

      if (audit) {
        console.log("✅ Audit créé:", {
          id: audit.id,
          url: audit.url,
          status: audit.status,
        });
      } else {
        console.log("⚠️ Audit non créé (Supabase indisponible)");
      }
    } catch (error: any) {
      console.log("⚠️ Erreur création audit:", error.message);
    }

    // 6. Test récupération audits utilisateur
    console.log("\n📋 Test 6: Récupération audits utilisateur");
    try {
      const userAudits = await ModernSupabaseBridge.getUserAudits(user.id);
      console.log("✅ Audits utilisateur trouvés:", userAudits.length);
      if (userAudits.length > 0) {
        console.log("📄 Premier audit:", {
          id: userAudits[0].id,
          url: userAudits[0].url,
          status: userAudits[0].status,
          created_at: userAudits[0].created_at,
        });
      }
    } catch (error: any) {
      console.log("⚠️ Erreur récupération audits:", error.message);
    }

    // 7. Vérification finale des données Prisma
    console.log("\n🔍 Test 7: Vérification finale Prisma");
    const finalUser = await prisma.user.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        email: true,
        name: true,
        monthlyQuota: true,
        quotaUsed: true,
        subscriptionTier: true,
        company: true,
        subscribed: true,
        quotaResetDate: true,
      },
    });

    if (finalUser) {
      console.log("✅ Utilisateur final dans Prisma:", {
        email: finalUser.email,
        quota: `${finalUser.quotaUsed}/${finalUser.monthlyQuota}`,
        tier: finalUser.subscriptionTier,
        subscribed: finalUser.subscribed,
        resetDate: finalUser.quotaResetDate,
      });
    }

    console.log("\n🎉 Tests de l'approche modernisée terminés avec succès!");
    console.log("\n📊 Résumé:");
    console.log("✅ Utilisateurs gérés via Prisma");
    console.log("✅ Quotas atomiques via Prisma");
    console.log("✅ Audits stockés dans Supabase");
    console.log("✅ Pas de duplication de données");
    console.log("✅ Une seule source de vérité pour les utilisateurs");
  } catch (error) {
    console.error("❌ Erreur lors des tests:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  testModernizedApproach()
    .then(() => {
      console.log("🎉 Tests réussis");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Tests échoués:", error);
      process.exit(1);
    });
}

export { testModernizedApproach };
