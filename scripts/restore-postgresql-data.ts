#!/usr/bin/env tsx

/**
 * Script de restauration des données vers PostgreSQL
 *
 * Ce script restaure les données sauvegardées depuis SQLite
 * vers votre nouvelle base PostgreSQL (locale ou Supabase)
 */

import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";

const backupDir = path.join(process.cwd(), "backup");

async function main() {
  console.log("🔄 Restauration des données vers PostgreSQL");
  console.log("==========================================");

  // Étape 1: Trouver le fichier de sauvegarde le plus récent
  const backupFiles = await glob("migration-backup-*.json", { cwd: backupDir });
  if (backupFiles.length === 0) {
    console.log("❌ Aucune sauvegarde trouvée dans", backupDir);
    console.log(
      "💡 Lancez d'abord: npx tsx scripts/migrate-sqlite-to-postgresql.ts",
    );
    return;
  }

  const latestBackup = backupFiles.sort().reverse()[0];
  const backupPath = path.join(backupDir, latestBackup);

  console.log("📄 Utilisation de la sauvegarde:", latestBackup);

  // Étape 2: Charger les données
  const backupData = JSON.parse(await fs.readFile(backupPath, "utf-8"));

  // Étape 3: Se connecter à PostgreSQL
  const prisma = new PrismaClient();

  try {
    // Vérifier la connexion
    await prisma.$connect();
    console.log("✅ Connexion PostgreSQL établie");

    // Étape 4: Restaurer les données dans l'ordre des dépendances
    await restoreData(prisma, backupData);

    console.log("\n🎉 Migration terminée avec succès !");
    console.log("\n🔧 Prochaines étapes:");
    console.log("   1. Vérifiez vos données dans la nouvelle base");
    console.log("   2. Testez l'application: npm run dev");
    console.log("   3. Configurez Supabase pour vos workflows n8n");
    console.log(
      "   4. Une fois validé, vous pouvez supprimer l'ancienne base SQLite",
    );
  } catch (error) {
    console.error("❌ Erreur lors de la restauration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function restoreData(prisma: PrismaClient, data: any) {
  console.log("\n📊 Restauration des données...");

  // 1. Utilisateurs (priorité haute - pas de dépendances)
  if (data.users?.length > 0) {
    console.log(`   👥 Restauration ${data.users.length} utilisateurs...`);
    for (const user of data.users) {
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
            resendContactId: user.resendContactId,
            stripeCustomerId: user.stripeCustomerId,
            monthlyQuota: user.monthlyQuota || 10,
            quotaUsed: user.quotaUsed || 0,
            quotaResetDate: user.quotaResetDate
              ? new Date(user.quotaResetDate)
              : new Date(),
            company: user.company,
            subscriptionTier: user.subscriptionTier || "free",
          },
          create: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
            resendContactId: user.resendContactId,
            stripeCustomerId: user.stripeCustomerId,
            monthlyQuota: user.monthlyQuota || 10,
            quotaUsed: user.quotaUsed || 0,
            quotaResetDate: user.quotaResetDate
              ? new Date(user.quotaResetDate)
              : new Date(),
            company: user.company,
            subscriptionTier: user.subscriptionTier || "free",
          },
        });
      } catch (error) {
        console.warn(
          `     ⚠️  Erreur utilisateur ${user.email}:`,
          error.message,
        );
      }
    }
  }

  // 2. Sessions (dépend des utilisateurs)
  if (data.sessions?.length > 0) {
    console.log(`   🔑 Restauration ${data.sessions.length} sessions...`);
    for (const session of data.sessions) {
      try {
        await prisma.session.create({
          data: {
            id: session.id,
            expiresAt: new Date(session.expiresAt),
            token: session.token,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            userId: session.userId,
          },
        });
      } catch (error) {
        console.warn(`     ⚠️  Erreur session ${session.id}:`, error.message);
      }
    }
  }

  // 3. Comptes (dépend des utilisateurs)
  if (data.accounts?.length > 0) {
    console.log(`   🔐 Restauration ${data.accounts.length} comptes...`);
    for (const account of data.accounts) {
      try {
        await prisma.account.create({
          data: {
            id: account.id,
            accountId: account.accountId,
            providerId: account.providerId,
            userId: account.userId,
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            idToken: account.idToken,
            accessTokenExpiresAt: account.accessTokenExpiresAt
              ? new Date(account.accessTokenExpiresAt)
              : null,
            refreshTokenExpiresAt: account.refreshTokenExpiresAt
              ? new Date(account.refreshTokenExpiresAt)
              : null,
            scope: account.scope,
            password: account.password,
            createdAt: new Date(account.createdAt),
            updatedAt: new Date(account.updatedAt),
          },
        });
      } catch (error) {
        console.warn(`     ⚠️  Erreur compte ${account.id}:`, error.message);
      }
    }
  }

  // 4. Abonnements (dépend des utilisateurs)
  if (data.subscriptions?.length > 0) {
    console.log(
      `   💳 Restauration ${data.subscriptions.length} abonnements...`,
    );
    for (const subscription of data.subscriptions) {
      try {
        await prisma.subscription.create({
          data: {
            id: subscription.id,
            plan: subscription.plan,
            referenceId: subscription.referenceId,
            stripeCustomerId: subscription.stripeCustomerId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            status: subscription.status,
            periodStart: subscription.periodStart
              ? new Date(subscription.periodStart)
              : null,
            periodEnd: subscription.periodEnd
              ? new Date(subscription.periodEnd)
              : null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            seats: subscription.seats,
            userId: subscription.userId,
          },
        });
      } catch (error) {
        console.warn(
          `     ⚠️  Erreur abonnement ${subscription.id}:`,
          error.message,
        );
      }
    }
  }

  // 5. Audits (dépend des utilisateurs)
  if (data.audits?.length > 0) {
    console.log(`   🔍 Restauration ${data.audits.length} audits...`);
    for (const audit of data.audits) {
      try {
        await prisma.audit.create({
          data: {
            id: audit.id,
            userId: audit.userId,
            email: audit.email,
            url: audit.url,
            status: audit.status || "pending",
            auditType: audit.auditType || "manual",
            resultsJson: audit.resultsJson,
            scoreGlobal: audit.scoreGlobal,
            scorePerformance: audit.scorePerformance,
            scoreSeo: audit.scoreSeo,
            scoreSecurity: audit.scoreSecurity,
            scoreModern: audit.scoreModern,
            errorMessage: audit.errorMessage,
            webhookId: audit.webhookId,
            isPublic: audit.isPublic || false,
            auditResults: audit.auditResults,
            completedAt: audit.completedAt ? new Date(audit.completedAt) : null,
            createdAt: new Date(audit.createdAt),
            updatedAt: new Date(audit.updatedAt),
            orgId: audit.orgId,
            runId: audit.runId,
            htmlReport: audit.htmlReport,
            platformDetected: audit.platformDetected,
            deliveryMethod: audit.deliveryMethod,
            emailClient: audit.emailClient,
          },
        });
      } catch (error) {
        console.warn(`     ⚠️  Erreur audit ${audit.id}:`, error.message);
      }
    }
  }

  // 6. Feedback (dépend des utilisateurs)
  if (data.feedback?.length > 0) {
    console.log(`   💬 Restauration ${data.feedback.length} feedback...`);
    for (const feedback of data.feedback) {
      try {
        await prisma.feedback.create({
          data: {
            id: feedback.id,
            review: feedback.review,
            message: feedback.message,
            email: feedback.email,
            userId: feedback.userId,
            createdAt: new Date(feedback.createdAt),
            updatedAt: new Date(feedback.updatedAt),
          },
        });
      } catch (error) {
        console.warn(`     ⚠️  Erreur feedback ${feedback.id}:`, error.message);
      }
    }
  }

  // 7. Pré-inscriptions (indépendant)
  if (data.preRegistrations?.length > 0) {
    console.log(
      `   📝 Restauration ${data.preRegistrations.length} pré-inscriptions...`,
    );
    for (const preReg of data.preRegistrations) {
      try {
        await prisma.preRegistration.create({
          data: {
            id: preReg.id,
            email: preReg.email,
            name: preReg.name,
            password: preReg.password,
            selectedPlan: preReg.selectedPlan,
            stripeSessionId: preReg.stripeSessionId,
            status: preReg.status || "pending",
            expiresAt: new Date(preReg.expiresAt),
            createdAt: new Date(preReg.createdAt),
            updatedAt: new Date(preReg.updatedAt),
          },
        });
      } catch (error) {
        console.warn(
          `     ⚠️  Erreur pré-inscription ${preReg.id}:`,
          error.message,
        );
      }
    }
  }

  console.log("✅ Restauration terminée");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Erreur lors de la restauration:", error);
    process.exit(1);
  });
}
