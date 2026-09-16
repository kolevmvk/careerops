import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types.ts";

/**
 * Request-scoped client bound to the caller's session.
 *
 * Every query made through it passes row level security as that user, so a
 * missing `where user_id = ...` is a bug in the query, not a data leak. The
 * service-role key is never used here (SPECIFICATION §10.2).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      // CareerOps owns one schema in a database it shares with another project
      // (ADR-0016). Without this every query would silently target `public`.
      db: { schema: "careerops" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
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
