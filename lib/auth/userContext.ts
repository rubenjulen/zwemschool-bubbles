import { createClient } from "@/lib/supabase/server";
import { roleFromClaims, type Role } from "@/lib/auth/roles";

export interface UserContext {
  userId: string;
  email: string | null;
  role: Role | undefined;
  /** Gezins-id van de ingelogde ouder, of null als nog niet ge-onboard. */
  familyId: string | null;
}

// Centrale serverhelper: wie is ingelogd, welke rol, en (voor ouders) welk
// gezin. Gebruikt door RSC-pagina's en server actions. RLS blijft leidend;
// dit is een gemak, geen autorisatiebron.
export async function getUserContext(): Promise<UserContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = roleFromClaims({ app_metadata: user.app_metadata });

  let familyId: string | null = null;
  const { data: guardian } = await supabase
    .from("guardians")
    .select("family_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (guardian) familyId = (guardian as { family_id: string }).family_id;

  return { userId: user.id, email: user.email ?? null, role, familyId };
}
