#!/usr/bin/env tsx

/**
 * Script pour debugger le format de hash Better Auth
 */

import { prisma } from "../src/lib/prisma";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Fonction pour hasher un mot de passe avec scrypt (compatible Better Auth)
async function hashPasswordWithScrypt(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hashedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hashedBuffer.toString("hex")}`;
}

async function debugBetterAuthPassword() {
  console.log("🔍 Debug format de hash Better Auth...");

  try {
    // 1. Créer un hash avec notre fonction
    const testPassword = "SecurePassword123!";
    const ourHash = await hashPasswordWithScrypt(testPassword);

    console.log("Notre hash scrypt:", {
      password: testPassword,
      hash: ourHash,
      hashLength: ourHash.length,
      saltLength: ourHash.split(":")[0].length,
      hashPart: ourHash.split(":")[1].length,
    });

    // 2. Vérifier tous les comptes existants
    const accounts = await prisma.account.findMany({
      where: {
        providerId: "credential",
        password: { not: null },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    console.log("\n📊 Comptes existants avec mots de passe:");
    accounts.forEach((account, index) => {
      console.log(`\nCompte ${index + 1}:`);
      console.log(`  Email: ${account.user?.email}`);
      console.log(`  AccountId: ${account.accountId}`);
      console.log(`  ProviderId: ${account.providerId}`);
      console.log(`  Password hash: ${account.password?.substring(0, 50)}...`);
      console.log(`  Password length: ${account.password?.length}`);

      if (account.password?.includes(":")) {
        const parts = account.password.split(":");
        console.log(`  Salt length: ${parts[0].length}`);
        console.log(`  Hash part length: ${parts[1].length}`);
      }
    });

    // 3. Test de comparaison avec différents formats
    console.log("\n🧪 Test de différents formats:");

    // Test 1: Notre format actuel
    console.log("Format 1 (notre actuel):", ourHash);

    // Test 2: Essayer sans les deux points (concatené)
    const saltHex = randomBytes(16).toString("hex");
    const hashedBuffer2 = (await scryptAsync(
      testPassword,
      saltHex,
      64,
    )) as Buffer;
    const concatenatedFormat = saltHex + hashedBuffer2.toString("hex");
    console.log(
      "Format 2 (concatené):",
      concatenatedFormat,
      "Length:",
      concatenatedFormat.length,
    );

    // Test 3: Essayer avec base64
    const hashedBuffer3 = (await scryptAsync(
      testPassword,
      saltHex,
      64,
    )) as Buffer;
    const base64Format = Buffer.concat([
      Buffer.from(saltHex, "hex"),
      hashedBuffer3,
    ]).toString("base64");
    console.log(
      "Format 3 (base64):",
      base64Format,
      "Length:",
      base64Format.length,
    );
  } catch (error) {
    console.error("❌ Erreur lors du debug:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le debug
debugBetterAuthPassword().catch(console.error);
