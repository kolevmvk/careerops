"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types.ts";

/** Browser client. Anon key only, so row level security is the boundary. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    // See the server client: the careerops schema, not public (ADR-0016).
    { db: { schema: "careerops" } },
  );
}
