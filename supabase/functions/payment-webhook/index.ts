// Supabase Edge Function (Deno) - betaalprovider webhook.
// HARDE EISEN: handtekening valideren, idempotent verwerken op provider_event_id
// (FR-14.2/SEC-9), nooit kaartdata opslaan. Dit is een veilige STUB: zonder
// geldige PAYMENT_WEBHOOK_SECRET en provider-implementatie weigert hij.
//
// Deploy: supabase functions deploy payment-webhook --no-verify-jwt
// (de webhook authenticeert via handtekening, niet via Supabase JWT).

import { createClient } from "jsr:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("PAYMENT_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("x-provider-signature") ?? "";
  const rawBody = await req.text();

  // TODO: vervang door echte HMAC-verificatie van de gekozen provider.
  const valid = WEBHOOK_SECRET.length > 0 && signature === WEBHOOK_SECRET;
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { id?: string; type?: string };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!event.id) {
    return new Response("Missing event id", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // alleen server-side
  );

  // Idempotentie: unieke (provider, provider_event_id). Dubbele events -> 200.
  const { error } = await supabase
    .from("payment_webhook_events")
    .insert({ provider: "stub", provider_event_id: event.id, payload: event });

  if (error) {
    if (error.code === "23505") {
      return new Response("Already processed", { status: 200 });
    }
    return new Response("Storage error", { status: 500 });
  }

  // TODO: payment-status mappen en bijbehorende invoice bijwerken.
  return new Response("OK", { status: 200 });
});
