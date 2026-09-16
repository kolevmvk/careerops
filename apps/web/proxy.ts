import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the session cookie and keeps unauthenticated callers out of the
 * cockpit. This is convenience, not security: row level security in Postgres
 * is what actually protects the data, and `anon` holds no table privileges in
 * the careerops schema at all (ADR-0016). A page that slipped past this check
 * would still read nothing.
 *
 * `proxy.ts` is the Next 16 name for what used to be `middleware.ts`.
 *
 * The list below is an allowlist and the default is deny. That direction is
 * deliberate. Getting it wrong in this direction makes a public page ask for a
 * login, which is visible within seconds. Getting it wrong the other way leaves
 * a private page open and nothing announces it.
 */
const PUBLIC_PREFIXES = [
  "/", // portfolio home, matched exactly below
  "/projects/",
  "/login",
  "/auth/",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/icon",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(prefix)),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url === undefined || key === undefined || url === "" || key === "") {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null && !isPublic(request.nextUrl.pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
