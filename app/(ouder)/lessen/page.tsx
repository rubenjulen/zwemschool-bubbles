import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { LessonBrowser, type ClassRow, type StudentRow } from "./LessonBrowser";

// Lessen bekijken en inschrijven (FR-3.1/3.2). Beschikbaarheid komt uit de
// class_availability-view; de leerlingen van het gezin via RLS.
export default async function LessenPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase.from("students").select("id, first_name").is("deleted_at", null),
    supabase
      .from("class_availability")
      .select(
        "class_series_id, name, level_id, level_name, location_name, weekday, start_time, spots_left, capacity",
      )
      .order("level_name", { ascending: true }),
  ]);

  return (
    <AppShell title="Lessen & inschrijven">
      <LessonBrowser
        students={(students ?? []) as StudentRow[]}
        classes={(classes ?? []) as ClassRow[]}
      />
    </AppShell>
  );
}
