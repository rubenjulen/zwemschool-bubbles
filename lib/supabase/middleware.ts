import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultRouteForRole, isStaff, roleFromClaims, type Role } from "@/lib/auth/roles";
import type { Database } from "@/types/database";

// Rolprefix -> toegestane rollen. Server-side autorisatie (least privilege):
// een ouder komt nooit in /beheer, een instructeur nooit in de financien.
const ROUTE_GUARDS: { prefix: string; allow: Role[] }[] = [
  { prefix: "/beheer", allow: ["admin", "finance_admin", "system_admin"] },
  { prefix: "/vandaag", allow: ["instructor", "lead_instructor"] },
  { prefix: "/dashboard", allow: ["guardian"] },
];

const PUBLIC_PATHS = ["/", "/login", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Belangrijk: getUser() (niet getSession) verifieert het token server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = roleFromClaims({ app_metadata: user.app_metadata });
    const guard = ROUTE_GUARDS.find((g) => path.startsWith(g.prefix));
    if (guard && (!role || !guard.allow.includes(role))) {
      const url = request.nextUrl.clone();
      url.pathname = defaultRouteForRole(role);
      return NextResponse.redirect(url);
    }

    // Staff-MFA afdwingen (SEC-1): staff moet aal2 hebben op niet-publieke
    // routes. Zonder geverifieerde factor wordt de enrollment/verify-pagina
    // afgedwongen. Fail-open bij een fout zodat staff niet uitgesloten raakt.
    if (isStaff(role) && !isPublic && path !== "/auth/mfa") {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.currentLevel !== "aal2") {
          const url = request.nextUrl.clone();
          url.pathname = "/auth/mfa";
          return NextResponse.redirect(url);
        }
      } catch {
        // niet blokkeren bij een onverwachte fout
      }
    }
  }

  return response;
}
