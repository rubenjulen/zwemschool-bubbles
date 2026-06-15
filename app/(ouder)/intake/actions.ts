"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION, intakeSchema, type IntakeInput } from "@/lib/validation/intake";

export type IntakeResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string };

// Verwerkt de digitale intake (FR-2) ATOMAIR via de submit_intake-RPC: alle
// inserts (gezin, leerling, safety-profiel, noodcontact, consents) gebeuren in
// één transactie, dus bij een fout halverwege blijft er niets half achter.
export async function submitIntake(input: IntakeInput): Promise<IntakeResult> {
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const d = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const payload = {
    family: d.family,
    student: {
      firstName: d.student.firstName,
      lastName: d.student.lastName ?? "",
      dateOfBirth: d.student.dateOfBirth ?? "",
    },
    safety: d.safety,
    emergency: d.emergency,
    consents: {
      terms: d.consents.terms,
      privacy: d.consents.privacy,
      incident_action: d.consents.incidentAction,
      photo_video: d.consents.photoVideo,
      whatsapp: d.consents.whatsapp,
      email: d.consents.email,
    },
    consentVersion: CONSENT_VERSION,
  };

  const { data: studentId, error } = await supabase.rpc("submit_intake", { p: payload });
  if (error || !studentId) {
    return { ok: false, error: "Inschrijving opslaan mislukt" };
  }

  revalidatePath("/dashboard");
  return { ok: true, studentId: studentId as string };
}
