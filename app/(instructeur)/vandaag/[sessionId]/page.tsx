"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { enqueue, processMutation, syncAll, countPending } from "@/lib/offline/syncQueue";
import type { AttendancePayload, QueuedMutation } from "@/lib/offline/types";

type Status = AttendancePayload["status"];
type SaveState = "idle" | "saving" | "saved" | "pending" | "error";

interface RosterRow {
  student_id: string;
  first_name: string;
  last_name: string | null;
  status: Status | null;
  has_safety_note: boolean;
}

const STATUS_BUTTONS: { value: Status; label: string; tone: "success" | "warning" | "neutral" | "danger" }[] = [
  { value: "present", label: "Aanwezig", tone: "success" },
  { value: "late", label: "Te laat", tone: "warning" },
  { value: "absent", label: "Afwezig", tone: "neutral" },
  { value: "no_show", label: "No-show", tone: "danger" },
];

export default function AttendancePage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const supabase = createClient();
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string>("");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [pending, setPending] = useState(0);

  // Verstuurt één mutatie naar de cloud (RLS staat instructeur toe voor eigen les).
  const send = useCallback(
    async (m: QueuedMutation) => {
      const p = m.payload as AttendancePayload;
      const { error } = await supabase.from("attendance").upsert(
        {
          lesson_session_id: m.lessonSessionId,
          student_id: p.studentId,
          status: p.status,
          client_mutation_id: m.id,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "lesson_session_id,student_id" },
      );
      return error ? { ok: false as const, error: error.message } : { ok: true as const };
    },
    [supabase],
  );

  const refreshPending = useCallback(async () => {
    try {
      setPending(await countPending());
    } catch {
      /* IndexedDB niet beschikbaar - negeren */
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setActorId(data.user?.id ?? ""));
    supabase
      .rpc("get_lesson_roster", { p_session_id: sessionId })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRoster((data ?? []) as RosterRow[]);
      });
    void refreshPending();

    // Bij terugkomst online: openstaande mutaties alsnog synchroniseren.
    const onOnline = () => {
      void syncAll(send).then(refreshPending);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sessionId, supabase, send, refreshPending]);

  async function mark(studentId: string, status: Status) {
    // Optimistische UI.
    setRoster((rows) =>
      rows ? rows.map((r) => (r.student_id === studentId ? { ...r, status } : r)) : rows,
    );
    setSaveStates((s) => ({ ...s, [studentId]: "saving" }));

    const mutation = await enqueue<AttendancePayload>({
      type: "attendance.set",
      payload: { studentId, status },
      actorId,
      lessonSessionId: sessionId,
    });
    const result = await processMutation(mutation, send);
    setSaveStates((s) => ({
      ...s,
      [studentId]:
        result.status === "synced" ? "saved" : result.status === "pending" ? "pending" : "error",
    }));
    void refreshPending();
  }

  return (
    <AppShell title="Aanwezigheid">
      <Link href="/vandaag" className="mb-2 inline-block text-xs text-bubbles-700 underline">
        &larr; Terug naar vandaag
      </Link>

      {pending > 0 && (
        <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {pending} wijziging(en) wachten op synchronisatie. Dit gebeurt automatisch zodra je weer
          online bent.
        </div>
      )}

      {error ? (
        <Card>
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      ) : roster === null ? (
        <Card>
          <p className="text-sm text-slate-400">Leerlingen laden...</p>
        </Card>
      ) : roster.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Geen ingeschreven leerlingen in deze les.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {roster.map((r) => (
            <Card key={r.student_id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    {r.first_name} {r.last_name ?? ""}
                  </span>
                  {r.has_safety_note && <StatusBadge tone="warning">⚠ safety</StatusBadge>}
                </div>
                <SaveIndicator state={saveStates[r.student_id] ?? "idle"} />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {STATUS_BUTTONS.map((b) => {
                  const active = r.status === b.value;
                  return (
                    <button
                      key={b.value}
                      onClick={() => mark(r.student_id, b.value)}
                      className={`tap-target rounded-lg px-1 py-2 text-xs font-medium transition ${
                        active
                          ? "bg-bubbles-500 text-white"
                          : "bg-bubbles-50 text-slate-600 hover:bg-bubbles-100"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="text-xs text-slate-400">opslaan…</span>;
  if (state === "saved") return <span className="text-xs text-emerald-600">✓ bewaard</span>;
  if (state === "pending") return <span className="text-xs text-amber-600">offline</span>;
  if (state === "error") return <span className="text-xs text-rose-600">fout</span>;
  return null;
}
