import { config } from "dotenv";
import path from "node:path";
import type { PrismaConfig } from "prisma";

// Charge explicitement les variables d'environnement dans l'ordre de priorité
config({ path: path.join(process.cwd(), ".env.local"), override: true });
config({ path: path.join(process.cwd(), ".env"), override: false });

export default {
  schema: path.join("prisma"),
} satisfies PrismaConfig;
