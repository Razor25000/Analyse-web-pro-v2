#!/usr/bin/env tsx

/**
 * Analyse complète du schéma de base de données Prisma vs Supabase
 * Identifie les redondances, manques, et optimisations possibles
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://muzzgghqpspummcrwxfa.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11enpnZ2hxcHNwdW1tY3J3eGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1Mjk0OSwiZXhwIjoyMDcyOTI4OTQ5fQ.XKlfT2omO1-27C2usQei_113_Lu8Hgj3YehuuyTCNms";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function analyzeDatabaseSchema() {
  console.log("🔍 ANALYSE COMPLÈTE DU SCHÉMA DE BASE DE DONNÉES");
  console.log("=".repeat(60));

  // 1. Analyser les tables Prisma (depuis le schéma défini)
  console.log("\n📊 TABLES PRISMA (Better Auth + App Logic)");
  console.log("-".repeat(40));

  const prismaModels = [
    {
      name: "User",
      purpose: "Utilisateurs Better Auth + données métier",
      fields: [
        "id, email, name, emailVerified, image",
        "monthlyQuota, quotaUsed, subscriptionTier, company",
        "stripeCustomerId, subscribed, subscriptionEnd",
        "resendContactId",
      ],
      usage: "AUTH + BILLING + QUOTAS",
    },
    {
      name: "Session",
      purpose: "Sessions utilisateur Better Auth",
      fields: ["id, token, expiresAt, userId, ipAddress, userAgent"],
      usage: "AUTH",
    },
    {
      name: "Account",
      purpose: "Comptes sociaux Better Auth",
      fields: ["id, providerId, accessToken, refreshToken, userId"],
      usage: "AUTH",
    },
    {
      name: "Verification",
      purpose: "Tokens de vérification email Better Auth",
      fields: ["id, identifier, value, expiresAt"],
      usage: "AUTH",
    },
    {
      name: "Subscription",
      purpose: "Abonnements Stripe",
      fields: ["id, plan, stripeSubscriptionId, status, periodStart/End"],
      usage: "BILLING",
    },
    {
      name: "UserQuota",
      purpose: "Quotas utilisateur mensuels",
      fields: ["userId, auditsUsed, auditsLimit, currentPeriod*"],
      usage: "QUOTAS",
    },
    {
      name: "AuditUsageLog",
      purpose: "Log des audits effectués",
      fields: ["userId, auditType, url, status, runId"],
      usage: "AUDIT_TRACKING",
    },
    {
      name: "Audit",
      purpose: "Données complètes des audits",
      fields: ["url, status, scores*, results, webhookId, runId"],
      usage: "BUSINESS_DATA",
    },
    {
      name: "Feedback",
      purpose: "Feedback utilisateurs",
      fields: ["review, message, email, userId"],
      usage: "SUPPORT",
    },
  ];

  prismaModels.forEach((model, i) => {
    console.log(`${i + 1}. ${model.name} (${model.usage})`);
    console.log(`   Purpose: ${model.purpose}`);
    console.log(`   Fields: ${model.fields.join(" | ")}`);
    console.log("");
  });

  // 2. Analyser les tables Supabase existantes
  console.log("\n📊 TABLES SUPABASE EXISTANTES");
  console.log("-".repeat(40));

  try {
    // Lister les tables dans le schéma public
    const { data: tables, error } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `,
    });

    if (error) {
      console.log(
        "❌ Impossible de lister les tables Supabase:",
        error.message,
      );
      console.log("📝 Tables attendues selon la doc:");
      console.log("   - profiles (manquante - à créer)");
      console.log("   - subscribers (manquante - à créer)");
      console.log("   - audits (manquante - à créer)");
    } else {
      console.log("✅ Tables trouvées:");
      tables.forEach((table: any) => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
    }

    // Tenter d'analyser les colonnes des tables existantes
    const tablesToCheck = ["profiles", "subscribers", "audits"];

    for (const tableName of tablesToCheck) {
      console.log(`\n🔍 Structure de '${tableName}':`);
      try {
        const { data: columns, error: colError } = await supabase.rpc(
          "exec_sql",
          {
            sql: `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = '${tableName}' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
          `,
          },
        );

        if (colError || !columns || columns.length === 0) {
          console.log(`   ❌ Table '${tableName}' n'existe pas`);
        } else {
          columns.forEach((col: any) => {
            console.log(
              `   - ${col.column_name}: ${col.data_type} ${col.is_nullable === "NO" ? "NOT NULL" : "NULL"}`,
            );
          });
        }
      } catch (e) {
        console.log(`   ❌ Erreur analyse '${tableName}'`);
      }
    }
  } catch (error: any) {
    console.log("❌ Erreur analyse Supabase:", error.message);
  }

  // 3. Analyse des redondances et recommandations
  console.log("\n🎯 ANALYSE ET RECOMMANDATIONS");
  console.log("-".repeat(40));

  console.log(`
📋 REDONDANCES IDENTIFIÉES:

1. 🔄 USER DATA (Triple stockage!)
   - User.monthlyQuota/quotaUsed (Prisma)
   - UserQuota.auditsLimit/auditsUsed (Prisma) 
   - subscribers.monthly_quota/quota_used (Supabase)
   → RECOMMANDATION: Choisir UNE source de vérité pour les quotas

2. 🔄 SUBSCRIPTION DATA (Double stockage!)
   - User.subscriptionTier/subscribed/subscriptionEnd (Prisma)
   - Subscription table (Prisma Stripe)
   - subscribers.subscription_tier/subscribed (Supabase)
   → RECOMMANDATION: Utiliser Subscription + sync vers Supabase

3. 🔄 AUDIT TRACKING (Double log!)
   - AuditUsageLog (Prisma - log simple)
   - Audit (Prisma - données complètes)  
   - audits (Supabase - données complètes)
   → RECOMMANDATION: Supprimer AuditUsageLog, garder Audit→Supabase

❌ TABLES POTENTIELLEMENT INUTILES:

1. UserQuota → Redondant avec User.monthlyQuota + subscribers
2. AuditUsageLog → Redondant avec Audit
3. Account → Utile seulement si vous utilisez OAuth (GitHub/Google)
4. Verification → Utile pour Better Auth email verification

✅ TABLES MANQUANTES POUR UN SAAS COMPLET:

1. 📧 email_templates (templates d'emails marketing/transactionnels)
2. 🎫 support_tickets (système de support client)
3. 📈 usage_analytics (métriques d'utilisation détaillées)
4. 🏷️ feature_flags (activation/désactivation de fonctionnalités)
5. 💳 payment_history (historique des paiements Stripe)
6. 📱 api_keys (si vous proposez une API)
7. 🔔 notifications (notifications in-app)
8. 📊 reports (rapports d'audit sauvegardés/partagés)

🎯 ARCHITECTURE RECOMMANDÉE:

PRISMA (Better Auth + App Logic):
├── User (données de base + références)
├── Session/Account/Verification (Better Auth)
├── Subscription (Stripe, source de vérité billing)
└── Feedback (simple)

SUPABASE (Business Data):
├── profiles (sync depuis User)
├── subscribers (sync depuis User+Subscription) 
├── audits (données métier principales)
├── reports (rapports sauvegardés)
└── usage_analytics (métriques détaillées)

🔧 ACTIONS RECOMMANDÉES:

1. Créer les tables Supabase manquantes (profiles, subscribers, audits)
2. Supprimer UserQuota et AuditUsageLog de Prisma (redondantes)
3. Migrer la logique quota vers subscribers (Supabase)
4. Ajouter tables métier manquantes selon vos besoins
5. Configurer la sync Better Auth → Supabase automatique
  `);

  // 4. Compter les enregistrements existants
  console.log("\n📊 DONNÉES EXISTANTES");
  console.log("-".repeat(40));

  try {
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();
    const subscriptionCount = await prisma.subscription.count();
    const auditCount = await prisma.audit.count();
    const quotaCount = await prisma.userQuota.count();

    console.log(`Prisma SQLite (dev.db):`);
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Sessions: ${sessionCount}`);
    console.log(`  - Subscriptions: ${subscriptionCount}`);
    console.log(`  - Audits: ${auditCount}`);
    console.log(`  - UserQuotas: ${quotaCount}`);

    // Essayer de compter dans Supabase
    try {
      const { count: profilesCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      console.log(`\nSupabase:`);
      console.log(`  - Profiles: ${profilesCount || 0}`);
    } catch (e) {
      console.log(`\nSupabase: Tables non créées encore`);
    }
  } catch (error: any) {
    console.log("❌ Erreur comptage:", error.message);
  }
}

analyzeDatabaseSchema()
  .then(() => console.log("\n🎉 Analyse terminée"))
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
