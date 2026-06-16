"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { IncidentForm } from "@/components/IncidentForm";

interface IncidentRow {
  id: string;
  category: string;
  severity: string | null;
  description: string;
  status: string;
  parent_informed: boolean;
  occurred_at: string;
  students: { first_name: string } | null;
}

const SEVERITY_TONE: Record<string, "neutral" | "warning" | "danger"> = {
  laag: "neutral",
  midden: "warning",
  hoog: "danger",
};

export default function BeheerIncidenten() {
  const supabase = createClient();
  const [incidents, setIncidents] = useState<IncidentRow[] | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("incident_reports")
      .select("id, category, severity, description, status, parent_informed, occurred_at, students(first_name)")
      .order("occurred_at", { ascending: false });
    setIncidents((data ?? []) as unknown as IncidentRow[]);
  }, [supabase]);

  useEffect(() => {
    void load();
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .is("deleted_at", null)
      .then(({ data }) => {
        setStudents(
          (data ?? []).map((s: { id: string; first_name: string; last_name: string | null }) => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name ?? ""}`.trim(),
          })),
        );
      });
  }, [supabase, load]);

  async function markDone(id: string) {
    await supabase.from("incident_reports").update({ status: "done" }).eq("id", id);
    void load();
  }

  return (
    <AppShell title="Incidenten">
      <Link href="/beheer/dashboard" className="mb-2 inline-block text-xs text-bubbles-700 underline">
        &larr; Terug naar beheer
      </Link>

      <IncidentForm students={students} onCreated={load} />

      <h2 className="mb-2 mt-4 text-sm font-semibold text-bubbles-800">Geregistreerde incidenten</h2>
      {incidents === null ? (
        <Card>
          <p className="text-sm text-slate-400">Laden...</p>
        </Card>
      ) : incidents.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Nog geen incidenten geregistreerd.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidents.map((i) => (
            <Card key={i.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-700">{i.category}</span>
                    {i.severity && (
                      <StatusBadge tone={SEVERITY_TONE[i.severity] ?? "neutral"}>
                        {i.severity}
                      </StatusBadge>
                    )}
                    <StatusBadge tone={i.status === "done" ? "success" : "info"}>
                      {i.status === "done" ? "afgehandeld" : "open"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{i.description}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {i.students?.first_name ? `${i.students.first_name} · ` : ""}
                    {new Date(i.occurred_at).toLocaleString("nl-NL")}
                    {i.parent_informed ? " · ouder geïnformeerd" : ""}
                  </p>
                </div>
                {i.status !== "done" && (
                  <button
                    onClick={() => markDone(i.id)}
                    className="tap-target shrink-0 rounded-lg bg-bubbles-50 px-2 py-1 text-xs font-medium text-bubbles-700 hover:bg-bubbles-100"
                  >
                    Afhandelen
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
