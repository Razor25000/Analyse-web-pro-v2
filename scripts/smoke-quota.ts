/* eslint-disable linebreak-style */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // charge .env.local s’il existe
dotenv.config(); // puis .env
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY; // au cas où tu l’as nommée différemment

if (!supabaseUrl)
  throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  const email = "test@example.com";

  // upsert user test (tier existant: manual/pro/enterprise)
  await supabase.from("subscribers").upsert(
    {
      email,
      monthly_quota: 100,
      quota_used: 0,
      subscription_tier: "manual",
      subscribed: true,
    },
    { onConflict: "email" },
  );

  const { error } = await supabase.rpc("increment_quota_used", {
    user_email: email,
    increment_by: 1,
  });
  if (error) throw error;

  const { data, error: e2 } = await supabase
    .from("subscribers")
    .select("email, quota_used, monthly_quota")
    .eq("email", email)
    .single();
  if (e2) throw e2;

  console.log("OK:", data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
