#!/usr/bin/env tsx

/**
 * Test script pour vérifier la correction du quota dans les audits simples
 */

import { upfetch } from "@src/lib/up-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testSingleAuditQuotaFix() {
  console.log("🧪 Test de la correction du quota pour les audits simples");

  try {
    // 1. Test de l'endpoint status pour obtenir le quota actuel
    console.log("1. Récupération du quota actuel...");
    const quotaResponse = await fetch("http://localhost:3001/api/audits/status", {
      headers: {
        "Cookie": "better-auth.session_token=test", // Simulation
      },
    });

    if (!quotaResponse.ok) {
      console.error("❌ Impossible de récupérer le quota actuel");
      return;
    }

    const quotaData = await quotaResponse.json();
    console.log("✅ Quota actuel:", quotaData.quota);

    // 2. Simulation d'une requête d'audit simple
    console.log("2. Test de création d'audit simple...");
    const auditData = {
      url: "https://example.com",
      email: "test@example.com",
    };

    const auditResponse = await fetch("http://localhost:3001/api/audits/single", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "better-auth.session_token=test", // Simulation
      },
      body: JSON.stringify(auditData),
    });

    if (auditResponse.status === 401) {
      console.log("ℹ️ ️ 401 Non authentifié - Normal pour le test");
      console.log("💡 Pour tester réellement, connectez-vous via l'interface");
      return;
    }

    if (!auditResponse.ok) {
      const errorData = await auditResponse.json();
      console.error("❌ Erreur lors de la création d'audit:", errorData);
      return;
    }

    const auditResult = await auditResponse.json();
    console.log("✅ Réponse audit:", auditResult);

    // 3. Vérification que le quota a été décrémenté
    console.log("3. Vérification du quota après création...");
    const newQuotaResponse = await fetch("http://localhost:3001/api/audits/status", {
      headers: {
        "Cookie": "better-auth.session_token=test", // Simulation
      },
    });

    if (newQuotaResponse.ok) {
      const newQuotaData = await newQuotaResponse.json();
      console.log("✅ Nouveau quota:", newQuotaData.quota);

      if (newQuotaData.quota && quotaData.quota) {
        const quotaUsed = newQuotaData.quota.used;
        const previousUsed = quotaData.quota.used;
        const hasDecremented = quotaUsed > previousUsed;

        if (hasDecremented) {
          console.log("🎉 SUCCÈS: Le quota a été décrémenté!");
          console.log(`   Avant: ${previousUsed}`);
          console.log(`   Après: ${quotaUsed}`);
        } else {
          console.log("⚠️  Le quota n'a pas changé (possible erreur d'authentification)");
        }
      }
    }

    // 4. Test direct de la base de données si possible
    console.log("4. Vérification en base de données...");
    try {
      const dbUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          quotaUsed: true,
          quotaLimit: true,
          planId: true,
        },
        take: 1,
      });

      if (dbUsers.length > 0) {
        const user = dbUsers[0];
        console.log(`✅ Utilisateur trouvé: ${user.email}`);
        console.log(`   Quota en base: ${user.quotaUsed}/${user.quotaLimit}`);
        console.log(`   Plan: ${user.planId}`);
      } else {
        console.log("ℹ️  Aucun utilisateur trouvé en base");
      }
    } catch (dbError) {
      console.error("❌ Erreur base de données:", dbError);
    }

  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleAuditQuotaFix();