"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EnrollResult = { ok: true } | { ok: false; error: string };

// Ouder vraagt een proefplaatsing aan (FR-3.1). De capaciteitscheck en
// familiecontrole zitten in de SECURITY DEFINER-RPC request_enrollment.
export async function requestEnrollment(
  studentId: string,
  classSeriesId: string,
): Promise<EnrollResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("request_enrollment", {
    p_student_id: studentId,
    p_class_series_id: classSeriesId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/lessen");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Ouder zet het eigen kind op de wachtlijst (FR-3.1/3.5).
export async function joinWaitlist(studentId: string, levelId: string): Promise<EnrollResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("waitlist_entries")
    .insert({ student_id: studentId, level_id: levelId, status: "waiting" });
  if (error) return { ok: false, error: "Op wachtlijst zetten mislukt" };
  revalidatePath("/lessen");
  return { ok: true };
}
