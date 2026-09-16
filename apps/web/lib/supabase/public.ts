import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types.ts";

/**
 * Session-free client for the public portfolio.
 *
 * It holds the anon key and nothing else, and `anon` can read exactly two
 * views in this schema — `public_facts` and `public_profiles` — and no table
 * (ADR-0016). Public pages are statically generated, so binding them to
 * request cookies would be wrong as well as unnecessary.
 *
 * If a public page ever queries something it should not, the database answers
 * 42501 rather than returning private rows. That is the safety net under the
 * route allowlist in proxy.ts, not a replacement for it.
 */
export function createPublicClient() {
  return createSupabaseClient<Database, { PostgrestVersion: "12" }>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      db: { schema: "careerops" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }

  return value;
}
