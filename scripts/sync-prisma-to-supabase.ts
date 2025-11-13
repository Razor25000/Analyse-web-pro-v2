#!/usr/bin/env tsx

/**
 * Script de synchronisation Prisma → Supabase
 * Utilise l'architecture dual-database v2.0
 */

import { PrismaClient } from "@prisma/client";
import { SupabaseBridge } from "../src/lib/supabase/bridge";

const prisma = new PrismaClient();
const supabaseBridge = new SupabaseBridge();

async function syncUserToSupabase(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { auditsCreated: true },
    });

    if (!user) return;

    // Sync audits to Supabase for n8n workflows
    for (const audit of user.auditsCreated) {
      await supabaseBridge.createAudit({
        id: audit.id,
        userId: audit.userId,
        email: audit.email,
        url: audit.url,
        status: audit.status,
        webhookId: audit.webhookId,
      });
    }

    console.log(`✅ User ${user.email} synced to Supabase`);
  } catch (error) {
    console.error("❌ Sync error:", error);
  }
}

export { syncUserToSupabase };

if (require.main === module) {
  console.log("🔄 Synchronisation Prisma → Supabase");
  // Sync logic here
}
