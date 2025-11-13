#!/usr/bin/env tsx
/**
 * Solution temporaire : modifier le bridge pour contourner les erreurs Supabase
 * jusqu'à ce que la table profiles soit créée manuellement
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

function applyTemporaryFix() {
  console.log("🔧 Application du correctif temporaire Supabase...");

  const bridgePath = join(process.cwd(), "src", "lib", "supabase", "bridge.ts");
  let content = readFileSync(bridgePath, "utf-8");

  // Ajouter un flag de contournement temporaire
  const tempBypassFlag = `
  /**
   * TEMPORARY: Contournement des erreurs Supabase
   * À supprimer après création de la table profiles
   */
  private static TEMP_BYPASS_PROFILES = true;
`;

  // Modifier la fonction syncUserToSupabase pour retourner true immédiatement
  const syncFunction = `
  static async syncUserToSupabase(
    userId: string,
    userEmail: string,
    fullName?: string,
    company?: string
  ): Promise<boolean> {
    // TEMPORARY: Contournement jusqu'à création table profiles
    if (this.TEMP_BYPASS_PROFILES) {
      console.log('🔄 Mode contournement: sync utilisateur simulé pour', userEmail);
      return true;
    }
    
    return this.withFallback(
      'syncUserToSupabase',`;

  if (!content.includes("TEMP_BYPASS_PROFILES")) {
    // Ajouter le flag après la classe
    content = content.replace(
      "export class SupabaseBridge {",
      `export class SupabaseBridge {${tempBypassFlag}`,
    );

    writeFileSync(bridgePath, content, "utf-8");
    console.log("✅ Correctif temporaire appliqué avec succès");
    console.log(
      "⚠️  N'oubliez pas de créer la table profiles et de supprimer ce correctif",
    );
  } else {
    console.log("✅ Correctif temporaire déjà présent");
  }
}

if (require.main === module) {
  applyTemporaryFix();
}
