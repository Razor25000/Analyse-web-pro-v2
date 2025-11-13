#!/usr/bin/env tsx
/* eslint-disable no-console */
import * as dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import { env } from "../src/lib/env";

console.log("🔧 Testing environment configuration...\n");

async function testEnv() {
  try {
    console.log("Environment variables loaded:");
    console.log(`- NODE_ENV: ${env.NODE_ENV}`);
    console.log(
      `- DATABASE_URL: ${env.DATABASE_URL ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(
      `- RESEND_API_KEY: ${env.RESEND_API_KEY ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(`- EMAIL_FROM: ${env.EMAIL_FROM}`);
    console.log(
      `- STRIPE_SECRET_KEY: ${env.STRIPE_SECRET_KEY ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(
      `- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(
      `- NEXT_PUBLIC_EMAIL_CONTACT: ${env.NEXT_PUBLIC_EMAIL_CONTACT}`,
    );
    console.log(`- SUPABASE_URL: ${env.SUPABASE_URL ?? "❌ Missing"}`);
    console.log(
      `- SUPABASE_ANON_KEY: ${env.SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(
      `- SUPABASE_SERVICE_KEY: ${env.SUPABASE_SERVICE_KEY ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(`- N8N_BASE_URL: ${env.N8N_BASE_URL ?? "❌ Missing"}`);
    console.log(
      `- N8N_WEBHOOK_SECRET: ${env.N8N_WEBHOOK_SECRET ? "✅ Set" : "❌ Missing"}`,
    );

    console.log("\n✅ Environment configuration loaded successfully!");
    return true;
  } catch (error) {
    console.log("❌ Environment configuration failed:", error);
    return false;
  }
}

testEnv().catch(console.error);
