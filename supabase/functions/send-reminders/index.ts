// Supabase Edge Function (Deno) - lesherinneringen (FR-8.1).
// STUB voor de scheduled job: selecteert lessen van morgen en zou per
// opt-in-kanaal een herinnering versturen. Respecteert notification_preferences
// (opt-in/opt-out). E-mail is het MVP-kanaal; WhatsApp/push later.
//
// Tijdzone: dag-grenzen op America/Paramaribo (UTC-3).

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Lessen van "morgen" in Suriname-tijd.
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000 - 3 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: sessions, error } = await supabase
    .from("lesson_sessions")
    .select("id, session_date, is_cancelled")
    .eq("session_date", tomorrow)
    .eq("is_cancelled", false);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // TODO: per ingeschreven leerling de opt-in guardian(s) bepalen en via de
  // gekozen e-mail/WhatsApp-provider een herinnering sturen + loggen in messages.
  return new Response(
    JSON.stringify({ date: tomorrow, sessions: sessions?.length ?? 0, sent: 0 }),
    { headers: { "content-type": "application/json" } },
  );
});
