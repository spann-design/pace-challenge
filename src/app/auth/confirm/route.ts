import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// The link in the sign-in email lands here. We verify it, set the sign-in
// cookie, and continue to the app. (The 6-digit code in the same email works
// too, and is better for the iPhone home-screen app because links open in Safari.)
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const type = (params.get("type") ?? "email") as EmailOtpType;
  const nextParam = params.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const success = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => success.cookies.set(name, value, options)),
    },
  });

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return success;
  } else if (code) {
    // Default Supabase email template: works when the link opens in the same browser.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return success;
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
