import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types.ts";

/**
 * Session-free client for the public portfolio.
 *
 * It holds the anon key and nothing else, and `anon` can read exactly two
 * views in this schema - `public_facts` and `public_profiles` - and no table
 * (ADR-0016). Public pages are statically generated, so binding them to
 * request cookies would be wrong as well as unnecessary.
 *
 * If a public page ever queries something it should not, the database answers
 * 42501 rather than returning private rows. That is the safety net under the
 * route allowlist in proxy.ts, not a replacement for it.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url === undefined || url === "" || key === undefined || key === "") {
    return null;
  }

  return createSupabaseClient<Database, { PostgrestVersion: "12" }>(url, key, {
    db: { schema: "careerops" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Runs a public read and returns `fallback` if the database cannot answer.
 *
 * A build must not fail because a database is unreachable. CI builds without
 * Supabase, and a deploy that cannot happen while Supabase is briefly down is
 * a worse property than a page that fills in on its next revalidation.
 *
 * The failure is logged rather than swallowed: an empty portfolio in
 * production means something is wrong, and it should be visible in the logs
 * rather than inferred from the page looking bare.
 */
export async function readPublic<T>(
  operation: string,
  read: (client: NonNullable<ReturnType<typeof createPublicClient>>) => Promise<T>,
  fallback: T,
): Promise<T> {
  const client = createPublicClient();

  if (client === null) {
    console.warn(`[public] ${operation}: Supabase is not configured; serving empty content.`);
    return fallback;
  }

  try {
    return await read(client);
  } catch (error) {
    console.error(`[public] ${operation} failed:`, error);
    return fallback;
  }
}
