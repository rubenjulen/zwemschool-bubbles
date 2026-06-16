"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { IncidentForm } from "@/components/IncidentForm";

export default function InstructeurIncident({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const supabase = createClient();
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .rpc("get_lesson_roster", { p_session_id: sessionId })
      .then(({ data }) => {
        setStudents(
          ((data ?? []) as { student_id: string; first_name: string; last_name: string | null }[]).map(
            (r) => ({ id: r.student_id, name: `${r.first_name} ${r.last_name ?? ""}`.trim() }),
          ),
        );
      });
  }, [supabase, sessionId]);

  return (
    <AppShell title="Incident melden">
      <Link
        href={`/vandaag/${sessionId}`}
        className="mb-2 inline-block text-xs text-bubbles-700 underline"
      >
        &larr; Terug naar de les
      </Link>
      <IncidentForm lessonSessionId={sessionId} students={students} />
    </AppShell>
  );
}
