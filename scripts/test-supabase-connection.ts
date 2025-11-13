import * as dotenv from "dotenv";
dotenv.config();

import { supabase, supabaseAdmin } from "../src/lib/supabase";

async function testSupabaseConnection() {
  console.log("🔍 Testing Supabase connection...");

  // Test anon connection
  if (supabase) {
    console.log("✅ Supabase anon client created successfully");
    try {
      const { error } = await supabase.from("audits").select("id").limit(1);
      if (error) {
        console.log("❌ Supabase anon query failed:", error.message);
      } else {
        console.log("✅ Supabase anon query successful");
      }
    } catch (err) {
      console.log("❌ Supabase anon connection error:", err);
    }
  } else {
    console.log("❌ Failed to create Supabase anon client");
  }

  // Test admin connection
  if (supabaseAdmin) {
    console.log("✅ Supabase admin client created successfully");
    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .limit(1);
      if (error) {
        console.log("❌ Supabase admin query failed:", error.message);
      } else {
        console.log("✅ Supabase admin query successful");
      }
    } catch (err) {
      console.log("❌ Supabase admin connection error:", err);
    }
  } else {
    console.log("❌ Failed to create Supabase admin client");
  }
}

testSupabaseConnection().catch(console.error);
