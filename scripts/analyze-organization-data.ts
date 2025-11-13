/**
 * Script pour analyser les données d'organisation avant suppression
 */

import { config } from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@/generated/prisma";

async function analyzeOrganizationData() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Analyse des données d'organisation...\n");

    // 1. Utilisateurs
    const users = await prisma.user.findMany();
    console.log(`👤 Utilisateurs : ${users.length}`);
    users.forEach((user) => {
      console.log(`   - ${user.name} (${user.email}) - ID: ${user.id}`);
    });

    // 2. Organisations
    const orgs = await prisma.organization.findMany();
    console.log(`\n🏢 Organisations : ${orgs.length}`);
    orgs.forEach((org) => {
      console.log(`   - ${org.name} (${org.slug}) - ID: ${org.id}`);
    });

    // 3. Membres (liens user ↔ org)
    const members = await prisma.member.findMany({
      include: {
        user: { select: { name: true, email: true } },
        organization: { select: { name: true, slug: true } },
      },
    });
    console.log(`\n👥 Membres : ${members.length}`);
    members.forEach((member) => {
      console.log(
        `   - ${member.user?.name} → ${member.organization?.name} (${member.role})`,
      );
    });

    // 4. Invitations
    const invitations = await prisma.invitation.findMany();
    console.log(`\n✉️ Invitations : ${invitations.length}`);
    invitations.forEach((inv) => {
      console.log(`   - ${inv.email} → ${inv.status}`);
    });

    // 5. Données importantes à migrer
    console.log("\n📊 Analyse pour migration :");

    // Audit logs liés aux organisations (si la table existe)
    try {
      const auditLogs = await prisma.$queryRaw<
        any[]
      >`SELECT COUNT(*) as count FROM audit_logs`;
      console.log(`   - Audit logs : ${auditLogs[0]?.count || 0}`);
    } catch (error) {
      console.log(`   - Audit logs : table non accessible`);
    }

    // Sessions avec organisations actives
    const sessionsWithOrg = await prisma.session.findMany({
      where: { activeOrganizationId: { not: null } },
    });
    console.log(`   - Sessions avec org active : ${sessionsWithOrg.length}`);

    console.log("\n💡 Recommandations :");

    if (users.length === 1 && orgs.length === 1 && members.length === 1) {
      console.log("✅ Configuration simple : 1 utilisateur, 1 organisation");
      console.log(
        "✅ Migration sécurisée : pas de données complexes à préserver",
      );
      console.log("✅ Peut supprimer les tables d'organisation");
    } else {
      console.log("⚠️ Configuration complexe détectée");
      console.log("⚠️ Vérifier les données avant migration");
    }

    // Plan de migration
    console.log("\n📋 Plan de migration suggéré :");
    console.log("1. Migrer les audit_logs vers audit_usage_log");
    console.log("2. Supprimer les sessions avec activeOrganizationId");
    console.log("3. Supprimer les tables : invitation, member, organization");
    console.log("4. Mettre à jour les routes pour éliminer orgSlug");
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  analyzeOrganizationData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
