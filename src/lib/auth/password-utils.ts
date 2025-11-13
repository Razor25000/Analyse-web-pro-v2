import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Utilitaires de hachage de mots de passe compatibles avec Better Auth
 *
 * Better Auth utilise scrypt avec les paramètres par défaut de Node.js :
 * - N: 16384 (CPU cost parameter)
 * - r: 8 (Memory cost parameter)
 * - p: 1 (Parallelization parameter)
 * - keylen: 64 (Derived key length)
 *
 * Format de stockage : "salt:hash" (hex-encoded)
 */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hashedBuffer = (await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  })) as Buffer;

  return `${salt.toString("hex")}:${hashedBuffer.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    const [saltHex, hashHex] = hash.split(":");

    if (!saltHex || !hashHex) {
      throw new Error("Format de hash invalide");
    }

    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(hashHex, "hex");

    const hashedBuffer = (await scryptAsync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    })) as Buffer;

    return timingSafeEqual(storedHash, hashedBuffer);
  } catch {
    return false;
  }
}

export function isPasswordHashed(password: string): boolean {
  return password.includes(":") && password.split(":").length === 2;
}
