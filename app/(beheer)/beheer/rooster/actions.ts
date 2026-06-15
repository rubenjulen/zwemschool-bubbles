"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { detectConflicts, type SeriesSlot, type Weekday } from "@/lib/scheduling/conflicts";

const seriesSchema = z.object({
  name: z.string().trim().min(2).max(120),
  levelId: z.string().uuid().optional().or(z.literal("")),
  locationId: z.string().uuid(),
  laneOrAreaId: z.string().uuid().optional().or(z.literal("")),
  instructorId: z.string().uuid().optional().or(z.literal("")),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(1).max(50),
});

export type SeriesInput = z.infer<typeof seriesSchema>;
export type SeriesResult = { ok: true } | { ok: false; error: string };

// Maakt een lesgroep aan (FR-4.1/4.3) en voorkomt conflicten in instructeur/
// baan/tijd (FR-4.4). De conflictdetectie is pure, geteste logica.
export async function createClassSeries(input: SeriesInput): Promise<SeriesResult> {
  const parsed = seriesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const d = parsed.data;

  if (d.endTime <= d.startTime) {
    return { ok: false, error: "Eindtijd moet na de starttijd liggen" };
  }

  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("class_series")
    .select("id, weekday, start_time, end_time, location_id, lane_or_area_id, instructor_id")
    .eq("is_active", true);
  if (fetchError) return { ok: false, error: "Roosters ophalen mislukt" };

  const candidate: SeriesSlot = {
    weekday: d.weekday as Weekday,
    startTime: d.startTime,
    endTime: d.endTime,
    locationId: d.locationId,
    laneOrAreaId: d.laneOrAreaId || null,
    instructorId: d.instructorId || null,
  };
  const slots: SeriesSlot[] = (existing ?? []).map(
    (s: {
      id: string;
      weekday: number;
      start_time: string | null;
      end_time: string | null;
      location_id: string;
      lane_or_area_id: string | null;
      instructor_id: string | null;
    }) => ({
      id: s.id,
      weekday: s.weekday as Weekday,
      startTime: (s.start_time ?? "00:00").slice(0, 5),
      endTime: (s.end_time ?? "00:00").slice(0, 5),
      locationId: s.location_id,
      laneOrAreaId: s.lane_or_area_id,
      instructorId: s.instructor_id,
    }),
  );

  const conflicts = detectConflicts(candidate, slots);
  if (conflicts.length > 0) {
    const reason = conflicts[0]!.reason === "instructor" ? "instructeur" : "baan";
    return { ok: false, error: `Conflict: deze ${reason} is op dat tijdslot al bezet` };
  }

  const { error } = await supabase.from("class_series").insert({
    name: d.name,
    level_id: d.levelId || null,
    location_id: d.locationId,
    lane_or_area_id: d.laneOrAreaId || null,
    instructor_id: d.instructorId || null,
    weekday: d.weekday,
    start_time: d.startTime,
    end_time: d.endTime,
    capacity: d.capacity,
  });
  if (error) return { ok: false, error: "Opslaan lesgroep mislukt" };

  revalidatePath("/beheer/rooster");
  return { ok: true };
}

// Beheer bevestigt een proefplaatsing als definitieve plaatsing (FR-3.3).
export async function confirmPlacement(enrollmentId: string): Promise<SeriesResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ status: "active" })
    .eq("id", enrollmentId);
  if (error) return { ok: false, error: "Bevestigen mislukt" };
  revalidatePath("/beheer/rooster");
  return { ok: true };
}
