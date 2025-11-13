#!/usr/bin/env tsx

/**
 * Analyse le contenu actuel des bases de données Prisma et Supabase
 * Compte les enregistrements et identifie les redondances
 * Usage: pnpm tsx scripts/analyze-database-content.ts
 */

import { config } from "dotenv";
import { prisma } from "../src/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// Charger les variables d'environnement
config({ path: ".env.local" });

type TableAnalysis = {
  name: string;
  count: number;
  sampleData?: any[];
  status: "active" | "empty" | "error" | "bypassed";
  notes?: string;
};

type DatabaseAnalysis = {
  database: "Prisma" | "Supabase";
  tables: TableAnalysis[];
  totalRecords: number;
  errors: string[];
};

async function analyzePrismaDatabase(): Promise<DatabaseAnalysis> {
  console.log("🔍 ANALYSE DE LA BASE PRISMA (SQLite)");
  console.log("=".repeat(50));

  const analysis: DatabaseAnalysis = {
    database: "Prisma",
    tables: [],
    totalRecords: 0,
    errors: [],
  };

  try {
    // 1. Table User
    console.log("📊 1. Table User...");
    try {
      const userCount = await prisma.user.count();
      const sampleUsers = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          email: true,
          subscriptionTier: true,
          monthlyQuota: true,
          quotaUsed: true,
          _count: {
            subscriptions: true,
            auditsCreated: true,
          },
        },
      });

      analysis.tables.push({
        name: "User",
        count: userCount,
        sampleData: sampleUsers,
        status: userCount > 0 ? "active" : "empty",
        notes: `Quotas: ${sampleUsers.map((u) => `${u.quotaUsed}/${u.monthlyQuota}`).join(", ")}`,
      });

      console.log(`   ✅ ${userCount} utilisateurs trouvés`);
    } catch (error) {
      analysis.errors.push(`User table error: ${error}`);
      console.log("   ❌ Erreur table User:", error);
    }

    // 2. Table Session
    console.log("📊 2. Table Session...");
    try {
      const sessionCount = await prisma.session.count();
      const recentSessions = await prisma.session.findMany({
        take: 3,
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          ipAddress: true,
        },
        orderBy: { createdAt: "desc" },
      });

      analysis.tables.push({
        name: "Session",
        count: sessionCount,
        sampleData: recentSessions,
        status: sessionCount > 0 ? "active" : "empty",
        notes: `Dernière session: ${recentSessions[0]?.expiresAt || "N/A"}`,
      });

      console.log(`   ✅ ${sessionCount} sessions actives`);
    } catch (error) {
      analysis.errors.push(`Session table error: ${error}`);
      console.log("   ❌ Erreur table Session:", error);
    }

    // 3. Table Account
    console.log("📊 3. Table Account...");
    try {
      const accountCount = await prisma.account.count();
      const accountTypes = await prisma.account.groupBy({
        by: ["providerId"],
        _count: { id: true },
      });

      analysis.tables.push({
        name: "Account",
        count: accountCount,
        sampleData: accountTypes,
        status: accountCount > 0 ? "active" : "empty",
        notes: `Providers: ${accountTypes.map((a) => `${a.providerId}(${a._count.id})`).join(", ")}`,
      });

      console.log(
        `   ✅ ${accountCount} comptes avec providers:`,
        accountTypes.map((a) => a.providerId).join(", "),
      );
    } catch (error) {
      analysis.errors.push(`Account table error: ${error}`);
      console.log("   ❌ Erreur table Account:", error);
    }

    // 4. Table Verification
    console.log("📊 4. Table Verification...");
    try {
      const verificationCount = await prisma.verification.count();
      const activeVerifications = await prisma.verification.count({
        where: { expiresAt: { gt: new Date() } },
      });

      analysis.tables.push({
        name: "Verification",
        count: verificationCount,
        status: verificationCount > 0 ? "active" : "empty",
        notes: `Actifs: ${activeVerifications}/${verificationCount}`,
      });

      console.log(
        `   ✅ ${verificationCount} codes dont ${activeVerifications} actifs`,
      );
    } catch (error) {
      analysis.errors.push(`Verification table error: ${error}`);
      console.log("   ❌ Erreur table Verification:", error);
    }

    // 5. Table Subscription
    console.log("📊 5. Table Subscription...");
    try {
      const subscriptionCount = await prisma.subscription.count();
      const subscriptionPlans = await prisma.subscription.groupBy({
        by: ["plan", "status"],
        _count: { id: true },
      });

      analysis.tables.push({
        name: "Subscription",
        count: subscriptionCount,
        sampleData: subscriptionPlans,
        status: subscriptionCount > 0 ? "active" : "empty",
        notes: `Plans: ${subscriptionPlans.map((s) => `${s.plan}/${s.status}(${s._count.id})`).join(", ")}`,
      });

      console.log(`   ✅ ${subscriptionCount} abonnements`);
      subscriptionPlans.forEach((plan) => {
        console.log(`      - ${plan.plan} (${plan.status}): ${plan._count.id}`);
      });
    } catch (error) {
      analysis.errors.push(`Subscription table error: ${error}`);
      console.log("   ❌ Erreur table Subscription:", error);
    }

    // 6. Table Feedback
    console.log("📊 6. Table Feedback...");
    try {
      const feedbackCount = await prisma.feedback.count();
      const avgReview = await prisma.feedback.aggregate({
        _avg: { review: true },
        _count: { id: true },
      });

      analysis.tables.push({
        name: "Feedback",
        count: feedbackCount,
        status: feedbackCount > 0 ? "active" : "empty",
        notes: `Note moyenne: ${avgReview._avg.review?.toFixed(1) || "N/A"}/5`,
      });

      console.log(
        `   ✅ ${feedbackCount} retours (moyenne: ${avgReview._avg.review?.toFixed(1) || "N/A"}/5)`,
      );
    } catch (error) {
      analysis.errors.push(`Feedback table error: ${error}`);
      console.log("   ❌ Erreur table Feedback:", error);
    }

    // 7. Table Audit (CRITIQUE - Redondance avec Supabase)
    console.log("📊 7. Table Audit (REDONDANCE SUPABASE ⚠️)...");
    try {
      const auditCount = await prisma.audit.count();
      const auditStats = await prisma.audit.groupBy({
        by: ["status", "auditType"],
        _count: { id: true },
      });

      const recentAudits = await prisma.audit.findMany({
        take: 3,
        select: {
          id: true,
          url: true,
          status: true,
          scoreGlobal: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      analysis.tables.push({
        name: "Audit",
        count: auditCount,
        sampleData: auditStats,
        status: auditCount > 0 ? "active" : "empty",
        notes: `⚠️ REDONDANCE avec Supabase.audits - ${auditStats.map((a) => `${a.status}(${a._count.id})`).join(", ")}`,
      });

      console.log(`   ⚠️  ${auditCount} audits Prisma (REDONDANCE SUPABASE)`);
      console.log(
        "      Répartition:",
        auditStats.map((a) => `${a.status}(${a._count.id})`).join(", "),
      );
      if (recentAudits.length > 0) {
        console.log(
          "      Derniers audits:",
          recentAudits.map((a) => `${a.url} (${a.status})`).join(", "),
        );
      }
    } catch (error) {
      analysis.errors.push(`Audit table error: ${error}`);
      console.log("   ❌ Erreur table Audit:", error);
    }

    // Calculer total
    analysis.totalRecords = analysis.tables.reduce(
      (sum, table) => sum + table.count,
      0,
    );

    console.log(
      `\n📊 RÉSUMÉ PRISMA: ${analysis.totalRecords} enregistrements total`,
    );
    return analysis;
  } catch (error) {
    console.error("❌ Erreur générale analyse Prisma:", error);
    analysis.errors.push(`General Prisma error: ${error}`);
    return analysis;
  }
}

async function analyzeSupabaseDatabase(): Promise<DatabaseAnalysis> {
  console.log("\n🔍 ANALYSE DE LA BASE SUPABASE (PostgreSQL)");
  console.log("=".repeat(50));

  const analysis: DatabaseAnalysis = {
    database: "Supabase",
    tables: [],
    totalRecords: 0,
    errors: [],
  };

  // Vérifier si Supabase est configuré
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log("❌ Configuration Supabase manquante - Skip analyse");
    analysis.errors.push("Supabase not configured");
    return analysis;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );

    // 1. Table profiles (EN BYPASS)
    console.log("📊 1. Table profiles (MODE BYPASS ⚠️)...");
    try {
      const { count: profileCount, error: profileError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (profileError) {
        analysis.tables.push({
          name: "profiles",
          count: 0,
          status: "error",
          notes: `❌ Table inexistante: ${profileError.message}`,
        });
        console.log("   ❌ Table profiles introuvable:", profileError.message);
      } else {
        analysis.tables.push({
          name: "profiles",
          count: profileCount || 0,
          status: "bypassed",
          notes: `🚫 MODE BYPASS PERMANENT dans SupabaseBridge.ts`,
        });
        console.log(
          `   ⚠️  ${profileCount || 0} profils (MODE BYPASS PERMANENT)`,
        );
      }
    } catch (error) {
      analysis.errors.push(`Profiles table error: ${error}`);
      console.log("   ❌ Erreur table profiles:", error);
    }

    // 2. Table subscribers (OBSOLÈTE)
    console.log("📊 2. Table subscribers (OBSOLÈTE ❌)...");
    try {
      const { count: subscriberCount, error: subscriberError } = await supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true });

      if (subscriberError) {
        analysis.tables.push({
          name: "subscribers",
          count: 0,
          status: "error",
          notes: `❌ Table inexistante: ${subscriberError.message}`,
        });
        console.log(
          "   ❌ Table subscribers introuvable:",
          subscriberError.message,
        );
      } else {
        // Récupérer échantillon des données pour analyse
        const { data: sampleSubscribers, error: sampleError } = await supabase
          .from("subscribers")
          .select("email, subscription_tier, monthly_quota, quota_used")
          .limit(3);

        analysis.tables.push({
          name: "subscribers",
          count: subscriberCount || 0,
          sampleData: sampleSubscribers || [],
          status: subscriberCount && subscriberCount > 0 ? "active" : "empty",
          notes: `❌ OBSOLÈTE - Remplacée par User.monthlyQuota dans Prisma`,
        });

        console.log(
          `   ❌ ${subscriberCount || 0} abonnés (TABLE OBSOLÈTE - remplacée par Prisma)`,
        );
        if (sampleSubscribers && sampleSubscribers.length > 0) {
          console.log(
            "      Échantillon:",
            sampleSubscribers
              .map((s) => `${s.email}(${s.subscription_tier})`)
              .join(", "),
          );
        }
      }
    } catch (error) {
      analysis.errors.push(`Subscribers table error: ${error}`);
      console.log("   ❌ Erreur table subscribers:", error);
    }

    // 3. Table audits (REDONDANCE CRITIQUE)
    console.log("📊 3. Table audits (REDONDANCE PRISMA ⚠️)...");
    try {
      const { count: auditCount, error: auditCountError } = await supabase
        .from("audits")
        .select("id", { count: "exact", head: true });

      if (auditCountError) {
        analysis.tables.push({
          name: "audits",
          count: 0,
          status: "error",
          notes: `❌ Table inexistante: ${auditCountError.message}`,
        });
        console.log("   ❌ Table audits introuvable:", auditCountError.message);
      } else {
        // Récupérer statistiques des audits
        const { data: auditStats, error: statsError } = await supabase
          .from("audits")
          .select("status, audit_type, url, score_global, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        analysis.tables.push({
          name: "audits",
          count: auditCount || 0,
          sampleData: auditStats || [],
          status: auditCount && auditCount > 0 ? "active" : "empty",
          notes: `⚠️ REDONDANCE CRITIQUE avec Prisma.Audit`,
        });

        console.log(
          `   ⚠️  ${auditCount || 0} audits Supabase (REDONDANCE PRISMA)`,
        );
        if (auditStats && auditStats.length > 0) {
          const statusCount: Record<string, number> = {};
          auditStats.forEach((audit) => {
            statusCount[audit.status] = (statusCount[audit.status] || 0) + 1;
          });
          console.log(
            "      États:",
            Object.entries(statusCount)
              .map(([status, count]) => `${status}(${count})`)
              .join(", "),
          );
          console.log(
            "      Derniers:",
            auditStats
              .slice(0, 3)
              .map((a) => `${a.url}(${a.status})`)
              .join(", "),
          );
        }
      }
    } catch (error) {
      analysis.errors.push(`Audits table error: ${error}`);
      console.log("   ❌ Erreur table audits:", error);
    }

    // Calculer total
    analysis.totalRecords = analysis.tables.reduce(
      (sum, table) => sum + table.count,
      0,
    );

    console.log(
      `\n📊 RÉSUMÉ SUPABASE: ${analysis.totalRecords} enregistrements total`,
    );
    return analysis;
  } catch (error) {
    console.error("❌ Erreur générale analyse Supabase:", error);
    analysis.errors.push(`General Supabase error: ${error}`);
    return analysis;
  }
}

function generateAnalysisReport(
  prismaAnalysis: DatabaseAnalysis,
  supabaseAnalysis: DatabaseAnalysis,
) {
  console.log(`\n${  "=".repeat(80)}`);
  console.log("🎯 RAPPORT D'ANALYSE COMPARATIVE");
  console.log("=".repeat(80));

  console.log(`\n📊 RÉSUMÉ GLOBAL:`);
  console.log(
    `   • Prisma (SQLite):    ${prismaAnalysis.totalRecords} enregistrements`,
  );
  console.log(
    `   • Supabase (PostgreSQL): ${supabaseAnalysis.totalRecords} enregistrements`,
  );
  console.log(
    `   • Total général:      ${prismaAnalysis.totalRecords + supabaseAnalysis.totalRecords} enregistrements`,
  );

  // Analyser les redondances
  console.log(`\n🚨 REDONDANCES DÉTECTÉES:`);

  const prismaAudits =
    prismaAnalysis.tables.find((t) => t.name === "Audit")?.count || 0;
  const supabaseAudits =
    supabaseAnalysis.tables.find((t) => t.name === "audits")?.count || 0;

  if (prismaAudits > 0 && supabaseAudits > 0) {
    console.log(`   ❌ AUDITS DUPLIQUÉS:`);
    console.log(`      - Prisma.Audit:    ${prismaAudits} enregistrements`);
    console.log(`      - Supabase.audits: ${supabaseAudits} enregistrements`);
    console.log(
      `      → Redondance potentielle de ${Math.min(prismaAudits, supabaseAudits)} audits`,
    );
  }

  const subscribersCount =
    supabaseAnalysis.tables.find((t) => t.name === "subscribers")?.count || 0;
  const usersWithQuotas =
    prismaAnalysis.tables.find((t) => t.name === "User")?.count || 0;

  if (subscribersCount > 0 && usersWithQuotas > 0) {
    console.log(`   ❌ QUOTAS DUPLIQUÉS:`);
    console.log(
      `      - Prisma User.monthlyQuota: ${usersWithQuotas} utilisateurs`,
    );
    console.log(
      `      - Supabase subscribers:     ${subscribersCount} abonnés`,
    );
    console.log(`      → Table subscribers OBSOLÈTE à supprimer`);
  }

  // Tables problématiques
  console.log(`\n⚠️  TABLES PROBLÉMATIQUES:`);

  const profilesTable = supabaseAnalysis.tables.find(
    (t) => t.name === "profiles",
  );
  if (profilesTable && profilesTable.status === "bypassed") {
    console.log(`   🚫 profiles: MODE BYPASS permanent depuis des mois`);
  }

  const subscribersTable = supabaseAnalysis.tables.find(
    (t) => t.name === "subscribers",
  );
  if (subscribersTable && subscribersTable.count > 0) {
    console.log(
      `   ❌ subscribers: ${subscribersTable.count} enregistrements mais TABLE OBSOLÈTE`,
    );
  }

  // Recommandations
  console.log(`\n🎯 RECOMMANDATIONS PRIORITAIRES:`);
  console.log(
    `   1. 🔥 URGENT: Supprimer redondance audits (${Math.max(prismaAudits, supabaseAudits)} audits à unifier)`,
  );
  console.log(
    `   2. 🧹 NETTOYAGE: Supprimer table subscribers obsolète (${subscribersCount} enregistrements)`,
  );
  console.log(`   3. 🚫 BYPASS: Supprimer code profiles bypass permanent`);
  console.log(
    `   4. ⚡ SIMPLIFICATION: Migration vers Prisma-only recommandée`,
  );

  // Erreurs rencontrées
  if (prismaAnalysis.errors.length > 0 || supabaseAnalysis.errors.length > 0) {
    console.log(`\n❌ ERREURS RENCONTRÉES:`);
    [...prismaAnalysis.errors, ...supabaseAnalysis.errors].forEach((error) => {
      console.log(`   • ${error}`);
    });
  }

  console.log(
    `\n✅ ANALYSE TERMINÉE - Voir DATABASE_AUDIT_REPORT.md pour recommandations détaillées`,
  );
}

async function main() {
  try {
    console.log("🚀 ANALYSE COMPLÈTE DES BASES DE DONNÉES");
    console.log(`🕐 ${  new Date().toLocaleString("fr-FR")}`);
    console.log("=".repeat(80));

    const prismaAnalysis = await analyzePrismaDatabase();
    const supabaseAnalysis = await analyzeSupabaseDatabase();

    generateAnalysisReport(prismaAnalysis, supabaseAnalysis);

    // Sauvegarder le rapport détaillé
    const reportData = {
      timestamp: new Date().toISOString(),
      prisma: prismaAnalysis,
      supabase: supabaseAnalysis,
      summary: {
        totalPrismaRecords: prismaAnalysis.totalRecords,
        totalSupabaseRecords: supabaseAnalysis.totalRecords,
        totalGlobalRecords:
          prismaAnalysis.totalRecords + supabaseAnalysis.totalRecords,
        redundantAudits: Math.min(
          prismaAnalysis.tables.find((t) => t.name === "Audit")?.count || 0,
          supabaseAnalysis.tables.find((t) => t.name === "audits")?.count || 0,
        ),
        obsoleteTables: supabaseAnalysis.tables.filter(
          (t) => t.status === "bypassed" || t.notes?.includes("OBSOLÈTE"),
        ).length,
      },
    };

    await import("fs").then((fs) =>
      fs.writeFileSync(
        "./database-analysis-report.json",
        JSON.stringify(reportData, null, 2),
      ),
    );

    console.log(
      `\n💾 Rapport détaillé sauvegardé: database-analysis-report.json`,
    );
  } catch (error) {
    console.error("❌ Erreur durant l'analyse:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
