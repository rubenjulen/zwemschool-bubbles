import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { defaultRouteForRole, roleFromClaims } from "@/lib/auth/roles";

// Verwerkt de inloglink en zet een sessie op, daarna doorsturen naar het juiste
// portaal op basis van rol (SEC-1). Twee varianten worden afgehandeld:
//  - PKCE: ?code=...            -> exchangeCodeForSession
//  - Magic link / OTP: ?token_hash=...&type=... -> verifyOtp
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const supabase = createClient();

  let authError: string | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authError = error?.message ?? null;
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  if (authError) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = roleFromClaims({ app_metadata: user?.app_metadata });
  const target = next ?? defaultRouteForRole(role);
  return NextResponse.redirect(`${origin}${target}`);
}
