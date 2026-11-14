import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every page request (Next 16 calls middleware "proxy").
// 1. Keeps the Supabase sign-in cookie fresh.
// 2. Sends signed-out visitors to /login (except public pages like invite links).
// Real data protection is in the database (row-level security); this only
// decides which screen to show.

const PUBLIC_PATHS = ["/login", "/auth", "/i/"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Not configured yet: let the login page explain what's missing.
  if (!url || !key) {
    return request.nextUrl.pathname.startsWith("/login")
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims verifies the token (and refreshes it when needed).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!signedIn && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirectWithCookies(to, response);
  }
  if (signedIn && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = safeNext(request.nextUrl.searchParams.get("next"));
    to.search = "";
    return redirectWithCookies(to, response);
  }
  return response;
}

function redirectWithCookies(to: URL, from: NextResponse) {
  const res = NextResponse.redirect(to);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

/** Only allow redirects to paths on this site. */
function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export const config = {
  // Skip Next internals, static files and the PWA files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-icon|icon|sw.js|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
