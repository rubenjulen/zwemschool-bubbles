import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import {
  RosterManager,
  type PendingRow,
  type SeriesRow,
} from "./RosterManager";

// Beheer-rooster (FR-4): lesgroepen aanmaken/zien + proefplaatsingen bevestigen.
export default async function BeheerRoosterPage() {
  const supabase = createClient();

  const [locations, levels, instructors, series, pending] = await Promise.all([
    supabase.from("locations").select("id, name").eq("is_active", true),
    supabase.from("levels").select("id, name").order("sort_order"),
    supabase.from("staff_profiles").select("id, full_name").eq("is_active", true),
    supabase
      .from("class_availability")
      .select("class_series_id, name, level_name, location_name, weekday, start_time, booked, capacity"),
    supabase
      .from("enrollments")
      .select("id, students(first_name), class_series(name)")
      .eq("status", "trial"),
  ]);

  const instructorOptions = (instructors.data ?? []).map(
    (i: { id: string; full_name: string }) => ({ id: i.id, name: i.full_name }),
  );

  // Embedded to-one relaties komen als object terug; zonder gegenereerde types
  // typeert supabase-js ze als array, daarom de cast via unknown.
  const pendingRows: PendingRow[] = (
    (pending.data ?? []) as unknown as Array<{
      id: string;
      students: { first_name: string } | null;
      class_series: { name: string } | null;
    }>
  ).map((p) => ({
    id: p.id,
    studentName: p.students?.first_name ?? "Onbekend",
    seriesName: p.class_series?.name ?? "—",
  }));

  return (
    <AppShell title="Rooster & plaatsing">
      <RosterManager
        locations={(locations.data ?? []) as { id: string; name: string }[]}
        levels={(levels.data ?? []) as { id: string; name: string }[]}
        instructors={instructorOptions}
        series={(series.data ?? []) as SeriesRow[]}
        pending={pendingRows}
      />
    </AppShell>
  );
}
