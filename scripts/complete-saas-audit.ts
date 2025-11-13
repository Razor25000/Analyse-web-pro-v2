#!/usr/bin/env tsx

/**
 * Audit complet du SaaS - Analyse pages vs tables
 * Identifie les besoins en données, redondances et manques
 */

import fs from "fs";
import path from "path";

type PageAnalysis = {
  path: string;
  category: "auth" | "dashboard" | "billing" | "admin" | "marketing" | "api";
  dataNeeds: string[];
  currentTables: string[];
  missingTables: string[];
  redundantTables: string[];
};

type TableAnalysis = {
  name: string;
  location: "prisma" | "supabase";
  purpose: string;
  usedByPages: string[];
  redundancy: "none" | "partial" | "complete";
  recommendation: "keep" | "merge" | "remove" | "migrate";
  reason: string;
};

async function auditSaaS() {
  console.log("🔍 AUDIT COMPLET DU SAAS - ARCHITECTURE DONNÉES");
  console.log("=".repeat(60));

  // 1. Analyser toutes les pages
  const pages = await analyzeAllPages();

  // 2. Analyser toutes les tables
  const tables = await analyzeAllTables();

  // 3. Identifier les patterns et problèmes
  const issues = identifyIssues(pages, tables);

  // 4. Générer le plan d'optimisation
  const optimizationPlan = generateOptimizationPlan(issues);

  // 5. Afficher le rapport complet
  displayCompleteReport(pages, tables, issues, optimizationPlan);
}

async function analyzeAllPages(): Promise<PageAnalysis[]> {
  console.log("\n📊 ANALYSE DES PAGES ET FONCTIONNALITÉS");
  console.log("-".repeat(40));

  const pages: PageAnalysis[] = [
    // AUTH PAGES
    {
      path: "/auth/signin",
      category: "auth",
      dataNeeds: ["User", "Session", "Account (OAuth)"],
      currentTables: ["User", "Session", "Account"],
      missingTables: [],
      redundantTables: [],
    },
    {
      path: "/auth/signup",
      category: "auth",
      dataNeeds: ["User", "UserQuota init", "Supabase Profile"],
      currentTables: ["User", "UserQuota"],
      missingTables: ["profiles (Supabase)"],
      redundantTables: ["UserQuota"], // Redondant avec subscribers
    },
    {
      path: "/auth/reset-password",
      category: "auth",
      dataNeeds: ["User", "Verification"],
      currentTables: ["User", "Verification"],
      missingTables: [],
      redundantTables: [],
    },

    // DASHBOARD PAGES
    {
      path: "/dashboard",
      category: "dashboard",
      dataNeeds: [
        "User stats",
        "Recent audits",
        "Quota status",
        "Quick actions",
      ],
      currentTables: ["User", "Audit", "UserQuota"],
      missingTables: ["usage_analytics", "dashboard_widgets"],
      redundantTables: ["UserQuota"], // Devrait être dans Supabase
    },
    {
      path: "/dashboard/audits",
      category: "dashboard",
      dataNeeds: ["User audits list", "Filter/Search", "Status", "Results"],
      currentTables: ["Audit", "AuditUsageLog"],
      missingTables: ["audit_filters", "saved_searches"],
      redundantTables: ["AuditUsageLog"], // Redondant avec Audit
    },
    {
      path: "/dashboard/audits/new",
      category: "dashboard",
      dataNeeds: ["Quota check", "Audit creation", "URL validation"],
      currentTables: ["UserQuota", "Audit"],
      missingTables: ["url_validation_cache"],
      redundantTables: ["UserQuota"], // Devrait être subscribers
    },
    {
      path: "/dashboard/audits/batch",
      category: "dashboard",
      dataNeeds: ["Bulk audit", "CSV processing", "Progress tracking"],
      currentTables: ["Audit", "AuditUsageLog"],
      missingTables: ["batch_jobs", "csv_processing_log"],
      redundantTables: ["AuditUsageLog"],
    },
    {
      path: "/dashboard/billing",
      category: "billing",
      dataNeeds: ["Subscription status", "Usage", "Payment history", "Plans"],
      currentTables: ["User", "Subscription", "UserQuota"],
      missingTables: ["payment_history", "invoice_items"],
      redundantTables: ["User.subscriptionTier"], // Redondant avec Subscription
    },
    {
      path: "/dashboard/settings",
      category: "dashboard",
      dataNeeds: ["User profile", "Preferences", "Integrations"],
      currentTables: ["User"],
      missingTables: ["user_preferences", "integrations"],
      redundantTables: [],
    },

    // ACCOUNT PAGES
    {
      path: "/account",
      category: "dashboard",
      dataNeeds: ["Profile management", "Security settings"],
      currentTables: ["User", "Session"],
      missingTables: ["security_logs", "login_history"],
      redundantTables: [],
    },
    {
      path: "/account/change-email",
      category: "dashboard",
      dataNeeds: ["Email verification", "Change process"],
      currentTables: ["User", "Verification"],
      missingTables: ["email_change_log"],
      redundantTables: [],
    },

    // BILLING PAGES
    {
      path: "/pricing",
      category: "marketing",
      dataNeeds: ["Plans", "Features", "Pricing"],
      currentTables: ["Subscription"],
      missingTables: ["pricing_plans", "plan_features"],
      redundantTables: [],
    },
    {
      path: "/payment/success",
      category: "billing",
      dataNeeds: ["Payment confirmation", "Subscription activation"],
      currentTables: ["Subscription", "User"],
      missingTables: ["payment_confirmations"],
      redundantTables: [],
    },

    // API ROUTES (inférées)
    {
      path: "/api/audits/*",
      category: "api",
      dataNeeds: ["CRUD audits", "Quota validation", "n8n integration"],
      currentTables: ["Audit", "UserQuota", "AuditUsageLog"],
      missingTables: ["api_rate_limits", "webhook_logs"],
      redundantTables: ["AuditUsageLog", "UserQuota"],
    },
  ];

  pages.forEach((page, i) => {
    console.log(`${i + 1}. ${page.path} (${page.category})`);
    console.log(`   Data needs: ${page.dataNeeds.join(", ")}`);
    if (page.missingTables.length > 0) {
      console.log(`   ❌ Missing: ${page.missingTables.join(", ")}`);
    }
    if (page.redundantTables.length > 0) {
      console.log(`   🔄 Redundant: ${page.redundantTables.join(", ")}`);
    }
    console.log("");
  });

  return pages;
}

async function analyzeAllTables(): Promise<TableAnalysis[]> {
  console.log("\n📊 ANALYSE DÉTAILLÉE DES TABLES");
  console.log("-".repeat(40));

  const tables: TableAnalysis[] = [
    // PRISMA TABLES
    {
      name: "User",
      location: "prisma",
      purpose: "Better Auth + données utilisateur centralisées",
      usedByPages: ["/auth/*", "/dashboard", "/account", "/billing"],
      redundancy: "partial",
      recommendation: "keep",
      reason: "Table centrale nécessaire, mais nettoyer champs redondants",
    },
    {
      name: "Session",
      location: "prisma",
      purpose: "Sessions Better Auth",
      usedByPages: ["/auth/*", "toutes les pages authentifiées"],
      redundancy: "none",
      recommendation: "keep",
      reason: "Essentiel pour Better Auth",
    },
    {
      name: "Account",
      location: "prisma",
      purpose: "Comptes OAuth (Google, GitHub)",
      usedByPages: ["/auth/signin avec OAuth"],
      redundancy: "none",
      recommendation: "keep",
      reason: "Utile si OAuth activé, sinon peut être supprimé",
    },
    {
      name: "Verification",
      location: "prisma",
      purpose: "Tokens vérification email",
      usedByPages: ["/auth/verify", "/account/change-email"],
      redundancy: "none",
      recommendation: "keep",
      reason: "Nécessaire pour vérification email",
    },
    {
      name: "Subscription",
      location: "prisma",
      purpose: "Abonnements Stripe",
      usedByPages: ["/dashboard/billing", "/pricing", "/payment/*"],
      redundancy: "none",
      recommendation: "keep",
      reason: "Source de vérité pour Stripe",
    },
    {
      name: "UserQuota",
      location: "prisma",
      purpose: "Quotas utilisateur",
      usedByPages: ["/dashboard", "/dashboard/audits/*"],
      redundancy: "complete",
      recommendation: "remove",
      reason: "Totalement redondant avec User.monthlyQuota et subscribers",
    },
    {
      name: "AuditUsageLog",
      location: "prisma",
      purpose: "Log simple des audits",
      usedByPages: ["/dashboard/audits"],
      redundancy: "complete",
      recommendation: "remove",
      reason: "Redondant avec Audit table",
    },
    {
      name: "Audit",
      location: "prisma",
      purpose: "Données complètes des audits",
      usedByPages: ["/dashboard/audits/*", "/api/audits"],
      redundancy: "none",
      recommendation: "migrate",
      reason: "Migrer vers Supabase pour scalabilité",
    },
    {
      name: "Feedback",
      location: "prisma",
      purpose: "Feedback utilisateurs",
      usedByPages: ["Formulaires de feedback"],
      redundancy: "none",
      recommendation: "keep",
      reason: "Simple et utile",
    },

    // SUPABASE TABLES
    {
      name: "profiles",
      location: "supabase",
      purpose: "Profils utilisateurs sync",
      usedByPages: ["/account", "/dashboard"],
      redundancy: "none",
      recommendation: "keep",
      reason: "Nécessaire pour sync Better Auth",
    },
    {
      name: "subscribers",
      location: "supabase",
      purpose: "Abonnements et quotas",
      usedByPages: ["/dashboard", "/dashboard/billing"],
      redundancy: "none",
      recommendation: "keep",
      reason: "Source de vérité pour quotas",
    },
    {
      name: "audits",
      location: "supabase",
      purpose: "Données métier audits",
      usedByPages: ["/dashboard/audits/*"],
      redundancy: "partial",
      recommendation: "keep",
      reason: "Base données métier principale",
    },
  ];

  tables.forEach((table, i) => {
    const redundancyIcon =
      table.redundancy === "complete"
        ? "🔴"
        : table.redundancy === "partial"
          ? "🟡"
          : "🟢";
    const actionIcon =
      table.recommendation === "remove"
        ? "❌"
        : table.recommendation === "migrate"
          ? "🔄"
          : "✅";

    console.log(
      `${i + 1}. ${table.name} (${table.location}) ${redundancyIcon} ${actionIcon}`,
    );
    console.log(`   Purpose: ${table.purpose}`);
    console.log(`   Used by: ${table.usedByPages.join(", ")}`);
    console.log(
      `   Action: ${table.recommendation.toUpperCase()} - ${table.reason}`,
    );
    console.log("");
  });

  return tables;
}

function identifyIssues(pages: PageAnalysis[], tables: TableAnalysis[]) {
  console.log("\n🚨 PROBLÈMES IDENTIFIÉS");
  console.log("-".repeat(40));

  const issues = {
    redundantTables: tables.filter((t) => t.redundancy === "complete"),
    partialRedundancy: tables.filter((t) => t.redundancy === "partial"),
    missingFeatures: [] as string[],
    architectureProblems: [] as string[],
  };

  // Tables complètement redondantes
  console.log("\n🔴 TABLES COMPLÈTEMENT REDONDANTES:");
  issues.redundantTables.forEach((table) => {
    console.log(`  - ${table.name}: ${table.reason}`);
  });

  // Redondances partielles
  console.log("\n🟡 REDONDANCES PARTIELLES:");
  issues.partialRedundancy.forEach((table) => {
    console.log(`  - ${table.name}: ${table.reason}`);
  });

  // Fonctionnalités manquantes identifiées
  const allMissingTables = [...new Set(pages.flatMap((p) => p.missingTables))];
  console.log("\n❌ FONCTIONNALITÉS/TABLES MANQUANTES:");
  allMissingTables.forEach((missing) => {
    console.log(`  - ${missing}`);
  });

  // Problèmes d'architecture
  console.log("\n🏗️ PROBLÈMES D'ARCHITECTURE:");
  console.log("  - Triple stockage quotas (User + UserQuota + subscribers)");
  console.log(
    "  - Double stockage abonnements (User + Subscription + subscribers)",
  );
  console.log("  - Données métier dans Prisma au lieu de Supabase");
  console.log("  - Manque de séparation auth vs business logic");

  return issues;
}

function generateOptimizationPlan(issues: any) {
  console.log("\n🎯 PLAN D'OPTIMISATION RECOMMANDÉ");
  console.log("-".repeat(40));

  const plan = {
    immediate: [
      "Supprimer UserQuota table (redondante)",
      "Supprimer AuditUsageLog table (redondante)",
      "Nettoyer champs redondants dans User table",
    ],
    shortTerm: [
      "Migrer logique quotas vers Supabase subscribers",
      "Créer tables manquantes critiques (usage_analytics, batch_jobs)",
      "Ajouter tables support (support_tickets, notifications)",
    ],
    longTerm: [
      "Migrer Audit table vers Supabase",
      "Implémenter système de rapports partagés",
      "Ajouter analytics et métriques avancées",
    ],
    optional: [
      "Supprimer Account table si pas d'OAuth",
      "Ajouter API rate limiting",
      "Système de templates d'emails",
    ],
  };

  Object.entries(plan).forEach(([phase, actions]) => {
    console.log(`\n${phase.toUpperCase()}:`);
    actions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`);
    });
  });

  return plan;
}

function displayCompleteReport(
  pages: PageAnalysis[],
  tables: TableAnalysis[],
  issues: any,
  plan: any,
) {
  console.log("\n📊 RÉSUMÉ EXÉCUTIF");
  console.log("-".repeat(40));

  console.log(`
📈 STATISTIQUES:
  - Pages analysées: ${pages.length}
  - Tables actuelles: ${tables.length}
  - Tables redondantes: ${issues.redundantTables.length}
  - Tables à supprimer: ${tables.filter((t) => t.recommendation === "remove").length}
  - Tables à migrer: ${tables.filter((t) => t.recommendation === "migrate").length}

🎯 ACTIONS PRIORITAIRES:
  1. Supprimer UserQuota et AuditUsageLog (gain immédiat)
  2. Nettoyer User table (supprimer champs redondants)
  3. Migrer logique quotas vers Supabase
  4. Créer tables manquantes critiques

💰 BÉNÉFICES ATTENDUS:
  ✅ -2 tables redondantes = maintenance simplifiée
  ✅ Source unique de vérité pour quotas
  ✅ Meilleure séparation auth vs business
  ✅ Base solide pour nouvelles fonctionnalités

⚠️ RISQUES:
  - Migration des quotas nécessite tests
  - Changements dans les queries existantes
  - Downtime minimal requis
  `);
}

auditSaaS()
  .then(() => console.log("\n🎉 Audit terminé"))
  .catch(console.error);
