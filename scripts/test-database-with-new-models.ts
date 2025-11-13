import { PrismaClient } from "@prisma/client";

async function testPrismaConnection() {
  console.log("🔧 Test de connexion Prisma avec nouveaux modèles...\n");

  const prisma = new PrismaClient({
    log: ["info", "warn", "error"],
  });

  try {
    console.log("⏳ Connexion à la base de données...");
    await prisma.$connect();
    console.log("✅ Connexion réussie!\n");

    // Test des tables existantes (Better Auth)
    console.log("📋 Test des tables Better Auth:");
    try {
      const userCount = await prisma.user.count();
      console.log(`   ✅ users: ${userCount} utilisateurs`);
    } catch (err: any) {
      console.log(`   ❌ users: ${err.message}`);
    }

    try {
      const sessionCount = await prisma.session.count();
      console.log(`   ✅ sessions: ${sessionCount} sessions`);
    } catch (err: any) {
      console.log(`   ❌ sessions: ${err.message}`);
    }

    // Test des nouvelles tables Supabase
    console.log("\n📋 Test des nouvelles tables Supabase:");

    // Test profiles
    try {
      // Test de la table via une requête raw d'abord
      const profilesExist = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'profiles'
        ) as exists
      `;
      console.log("   📊 Table profiles existe:", profilesExist);

      if (profilesExist) {
        const profileCount = await prisma.profile.count();
        console.log(`   ✅ profiles: ${profileCount} profils`);
      }
    } catch (err: any) {
      console.log(`   ❌ profiles: ${err.message}`);
    }

    // Test audits
    try {
      const auditsExist = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'audits'
        ) as exists
      `;
      console.log("   📊 Table audits existe:", auditsExist);

      if (auditsExist) {
        const auditCount = await prisma.audit.count();
        console.log(`   ✅ audits: ${auditCount} audits`);
      }
    } catch (err: any) {
      console.log(`   ❌ audits: ${err.message}`);
    }

    // Test subscribers
    try {
      const subscribersExist = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'subscribers'
        ) as exists
      `;
      console.log("   📊 Table subscribers existe:", subscribersExist);

      if (subscribersExist) {
        const subscriberCount = await prisma.subscriber.count();
        console.log(`   ✅ subscribers: ${subscriberCount} abonnés`);
      }
    } catch (err: any) {
      console.log(`   ❌ subscribers: ${err.message}`);
    }

    // Lister toutes les tables disponibles
    console.log("\n📋 Tables disponibles dans la base:");
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    tables.forEach((table: any) => {
      console.log(`   - ${table.table_name}`);
    });

    console.log("\n✅ Test de connexion terminé!");
  } catch (error) {
    console.error("❌ Erreur de connexion Prisma:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("🚀 Test de l'intégration Prisma + Supabase\n");
  console.log(`${"=".repeat(50)}\n`);

  await testPrismaConnection();

  console.log("\n📋 Prochaines étapes si les tables manquent:");
  console.log("1. Exécuter: npx prisma db push --accept-data-loss");
  console.log("2. Régénérer le client: npx prisma generate");
  console.log("3. Re-tester cette connexion");
}

if (require.main === module) {
  main().catch(console.error);
}
