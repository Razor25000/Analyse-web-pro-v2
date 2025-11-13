// src/lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Déclare ici TOUTES les variables d'environnement utilisées par l'app.
 * - Met en "server" celles qui ne doivent jamais être envoyées au navigateur
 * - Met en "client" celles qui commencent par NEXT_PUBLIC_
 *
 * Si une clé n'est pas toujours présente en local, marque-la .optional()
 * pour éviter de bloquer le dev.
 */
export const env = createEnv({
  // =======================
  // Vars disponibles côté serveur uniquement
  // =======================
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Base de données
    DATABASE_URL: z.string().min(1),
    DATABASE_URL_UNPOOLED: z.string().min(1).optional(), // ex: DIRECT_URL pour Prisma non poolé
    DIRECT_URL: z.string().min(1).optional(), // si tu l'utilises

    // Auth (exemples courants – laisse en optional si non utilisés)
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    // Emailing (exemples – garde optional si non utilisés)
    RESEND_API_KEY: z.string().min(1).optional(),
    SENDGRID_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),

    // Stripe (REQUIS pour les paiements)
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().min(1),
    STRIPE_STARTER_YEARLY_PRICE_ID: z.string().min(1),
    STRIPE_PRO_MONTHLY_PRICE_ID: z.string().min(1),
    STRIPE_PRO_YEARLY_PRICE_ID: z.string().min(1),
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: z.string().min(1),
    STRIPE_PREMIUM_YEARLY_PRICE_ID: z.string().min(1),

    // n8n (REQUIS)
    N8N_WEBHOOK_BASE_URL: z.string().url(),
    // Doivent commencer par "/" (ex: "/webhook/formulaire-offre-gratuite")
    N8N_SINGLE_AUDIT_PATH: z.string().regex(/^\/.*/, "Doit commencer par '/'"),
    N8N_BATCH_AUDIT_PATH: z
      .string()
      .regex(/^\/.*/, "Doit commencer par '/'")
      .optional(),
    N8N_WEBHOOK_SECRET: z.string().min(1),
  },

  // =======================
  // Vars exposées au navigateur (doivent commencer par NEXT_PUBLIC_)
  // =======================
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_NAME: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  },

  // =======================
  // Mappage runtime -> process.env
  // =======================
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,

    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    DIRECT_URL: process.env.DIRECT_URL,

    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_STARTER_MONTHLY_PRICE_ID:
      process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    STRIPE_STARTER_YEARLY_PRICE_ID: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    STRIPE_PREMIUM_MONTHLY_PRICE_ID:
      process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    STRIPE_PREMIUM_YEARLY_PRICE_ID: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,

    N8N_WEBHOOK_BASE_URL: process.env.N8N_WEBHOOK_BASE_URL,
    N8N_SINGLE_AUDIT_PATH: process.env.N8N_SINGLE_AUDIT_PATH,
    N8N_BATCH_AUDIT_PATH: process.env.N8N_BATCH_AUDIT_PATH,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,

    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },

  // Utile si vous voulez tolérer les variables manquantes en dev (décommentez si besoin)
  // skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  // Interpréter les chaînes vides comme "undefined"
  // emptyStringAsUndefined: true,
});
