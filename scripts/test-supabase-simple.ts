#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";

console.log("🔧 Testing Supabase integration...\n");

// Test import
try {
  console.log("✅ @supabase/supabase-js imported successfully");

  // Test client creation
  const testClient = createClient("https://test.supabase.co", "test-key");
  console.log("✅ Supabase client creation works");

  // Test methods availability
  const methods = ["from", "auth", "storage", "functions"];
  methods.forEach((method) => {
    if (testClient[method as keyof typeof testClient]) {
      console.log(`✅ ${method} method available`);
    } else {
      console.log(`❌ ${method} method missing`);
    }
  });

  console.log("\n🎉 Supabase integration ready!");
} catch (error) {
  console.log("❌ Supabase integration failed:", error);
}
