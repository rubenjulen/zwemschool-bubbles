import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Browser-client. Gebruikt uitsluitend de publieke anon key; alle autorisatie
// loopt via Supabase Auth + RLS (SEC-2). Nooit de service role key hier.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
