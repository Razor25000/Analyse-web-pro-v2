import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

async function createTables() {
  console.log("🔧 Création des tables Supabase...\n");

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const sqlCommands = [
    // Extension UUID
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

    // Enum subscription_tier
    `CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');`,

    // Table profiles
    `CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        company VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    // Index pour profiles
    `CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);`,

    // Table audits
    `CREATE TABLE IF NOT EXISTS public.audits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        email VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        audit_type VARCHAR(20) DEFAULT 'manual' CHECK (audit_type IN ('manual', 'bulk', 'discovery')),
        results_json JSONB,
        score_global INTEGER,
        score_performance INTEGER,
        score_seo INTEGER,
        score_security INTEGER,
        score_modern INTEGER,
        error_message TEXT,
        webhook_id VARCHAR(255),
        is_public BOOLEAN DEFAULT false,
        audit_results TEXT,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        org_id VARCHAR(255)
    );`,

    // Index pour audits
    `CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.audits(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audits_webhook_id ON public.audits(webhook_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audits_org_id ON public.audits(org_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_audits_status ON public.audits(status);`,

    // Table subscribers
    `CREATE TABLE IF NOT EXISTS public.subscribers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        email VARCHAR(255) NOT NULL UNIQUE,
        stripe_customer_id VARCHAR(255),
        subscribed BOOLEAN DEFAULT false,
        subscription_tier subscription_tier DEFAULT 'free',
        subscription_end TIMESTAMP WITH TIME ZONE,
        monthly_quota INTEGER DEFAULT 10,
        quota_used INTEGER DEFAULT 0,
        quota_reset_date DATE DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    // Index pour subscribers
    `CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);`,
    `CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_customer_id ON public.subscribers(stripe_customer_id);`,
  ];

  let created = 0;
  let errors = 0;

  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i].trim();
    if (!sql) continue;

    try {
      console.log(
        `⏳ [${i + 1}/${sqlCommands.length}] ${sql.split(" ")[0]} ${sql.split(" ")[1]}...`,
      );

      const { error } = await supabase.rpc("exec_sql", { sql });

      if (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("duplicate key")
        ) {
          console.log(`   ⚠️  Déjà existe (normal)`);
          created++;
        } else {
          console.log(`   ❌ Erreur: ${error.message}`);
          errors++;
        }
      } else {
        console.log(`   ✅ Créé avec succès`);
        created++;
      }
    } catch (err: any) {
      console.log(`   ❌ Exception: ${err.message}`);
      errors++;
    }

    // Petit délai entre les commandes
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Résultats:`);
  console.log(`   ✅ Succès: ${created}`);
  console.log(`   ❌ Erreurs: ${errors}`);

  return { created, errors };
}

async function verifyTables() {
  console.log("\n🔍 Vérification des tables créées...");

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const expectedTables = ["profiles", "audits", "subscribers"];
  const results: Record<string, boolean> = {};

  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(1);

      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
        results[tableName] = false;
      } else {
        console.log(`   ✅ ${tableName}: Table accessible`);
        results[tableName] = true;
      }
    } catch (err: any) {
      console.log(`   ❌ ${tableName}: ${err.message}`);
      results[tableName] = false;
    }
  }

  return results;
}

async function main() {
  console.log("🚀 Configuration simple des tables Supabase\n");
  console.log(`${"=".repeat(50)}\n`);

  console.log(`🔗 URL: ${supabaseUrl}`);
  console.log(
    `🔑 Service Key: ${supabaseServiceKey ? `***${supabaseServiceKey.slice(-6)}` : "Non définie"}\n`,
  );

  // Créer les tables
  const createResult = await createTables();

  if (createResult.errors === 0) {
    console.log("\n✅ Toutes les tables ont été configurées!");
  } else {
    console.log(`\n⚠️  ${createResult.errors} erreurs détectées`);
  }

  // Vérifier les tables
  const verifyResult = await verifyTables();

  const allTablesOk = Object.values(verifyResult).every((ok) => ok);

  if (allTablesOk) {
    console.log("\n🎉 Configuration Supabase terminée avec succès!");
    console.log("\n📋 Prochaines étapes:");
    console.log("1. npx prisma db push --accept-data-loss");
    console.log("2. npx prisma generate");
    console.log("3. Tester l'intégration Prisma + Supabase");
  } else {
    console.log("\n❌ Certaines tables ne sont pas accessibles");
    console.log("Vérifiez les permissions et la configuration Supabase");
  }
}

if (require.main === module) {
  main().catch(console.error);
}
