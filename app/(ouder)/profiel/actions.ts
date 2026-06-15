"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const contactSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

// Ouder onderhoudt eigen contactgegevens (FR-1.3). RLS (guardians_update_self)
// staat alleen de eigen rij toe.
export async function updateContact(input: z.infer<typeof contactSchema>): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { error } = await supabase
    .from("guardians")
    .update({ full_name: parsed.data.fullName, phone_e164: parsed.data.phone || null })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Opslaan mislukt" };

  revalidatePath("/profiel");
  return { ok: true };
}

const prefSchema = z.object({
  channel: z.enum(["email", "whatsapp", "push"]),
  category: z.string().min(1).max(60),
  optedIn: z.boolean(),
});

// Kanaal-/categorievoorkeuren beheren (FR-8.3, opt-in/opt-out per categorie).
export async function setNotificationPreference(
  input: z.infer<typeof prefSchema>,
): Promise<ActionResult> {
  const parsed = prefSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { data: guardian } = await supabase
    .from("guardians")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!guardian) return { ok: false, error: "Geen profiel gevonden" };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      guardian_id: (guardian as { id: string }).id,
      channel: parsed.data.channel,
      category: parsed.data.category,
      opted_in: parsed.data.optedIn,
    },
    { onConflict: "guardian_id,channel,category" },
  );
  if (error) return { ok: false, error: "Opslaan voorkeur mislukt" };

  revalidatePath("/profiel");
  return { ok: true };
}
