"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { enqueue, processMutation } from "@/lib/offline/syncQueue";
import type { ProgressSkillPayload, QueuedMutation } from "@/lib/offline/types";

interface SkillRow {
  skill_id: string;
  name: string;
  is_exam: boolean;
  achieved: boolean;
  note: string | null;
}
type SaveState = "idle" | "saving" | "saved" | "pending" | "error";

export default function StudentSkillsPage({
  params,
}: {
  params: { sessionId: string; studentId: string };
}) {
  const { sessionId, studentId } = params;
  const supabase = createClient();
  const [skills, setSkills] = useState<SkillRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actorId, setActorId] = useState("");
  const [states, setStates] = useState<Record<string, SaveState>>({});

  const send = useCallback(
    async (m: QueuedMutation) => {
      const p = m.payload as ProgressSkillPayload;
      const { error } = await supabase.from("progress_records").upsert(
        {
          student_id: p.studentId,
          skill_id: p.skillId,
          achieved: p.achieved,
          note: p.note ?? null,
          is_parent_visible: true,
          client_mutation_id: m.id,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "student_id,skill_id" },
      );
      return error ? { ok: false as const, error: error.message } : { ok: true as const };
    },
    [supabase],
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setActorId(data.user?.id ?? ""));
    supabase
      .rpc("get_student_skills", { p_student_id: studentId, p_session_id: sessionId })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setSkills((data ?? []) as SkillRow[]);
      });
  }, [supabase, sessionId, studentId]);

  async function save(skill: SkillRow, achieved: boolean, note: string | null) {
    setSkills((rows) =>
      rows ? rows.map((r) => (r.skill_id === skill.skill_id ? { ...r, achieved, note } : r)) : rows,
    );
    setStates((s) => ({ ...s, [skill.skill_id]: "saving" }));
    const mutation = await enqueue<ProgressSkillPayload>({
      type: "progress.skill.set",
      payload: { studentId, skillId: skill.skill_id, achieved, note: note ?? undefined },
      actorId,
      lessonSessionId: sessionId,
    });
    const result = await processMutation(mutation, send);
    setStates((s) => ({
      ...s,
      [skill.skill_id]:
        result.status === "synced" ? "saved" : result.status === "pending" ? "pending" : "error",
    }));
  }

  const achievedCount = skills?.filter((s) => s.achieved).length ?? 0;
  const total = skills?.length ?? 0;

  return (
    <AppShell title="Skills">
      <Link
        href={`/vandaag/${sessionId}`}
        className="mb-2 inline-block text-xs text-bubbles-700 underline"
      >
        &larr; Terug naar de les
      </Link>

      {error ? (
        <Card>
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      ) : skills === null ? (
        <Card>
          <p className="text-sm text-slate-400">Skills laden...</p>
        </Card>
      ) : skills.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Geen skills gevonden voor dit niveau.</p>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {achievedCount} van {total} afgevinkt
          </p>
          <div className="space-y-2">
            {skills.map((sk) => (
              <Card key={sk.skill_id}>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 rounded border-bubbles-300"
                    checked={sk.achieved}
                    onChange={(e) => save(sk, e.target.checked, sk.note)}
                  />
                  <span className="flex-1 text-sm text-slate-700">
                    {sk.name}
                    {sk.is_exam && (
                      <span className="ml-1 text-[10px] font-medium text-amber-600">exameneis</span>
                    )}
                  </span>
                  <SaveIndicator state={states[sk.skill_id] ?? "idle"} />
                </label>
                <input
                  type="text"
                  defaultValue={sk.note ?? ""}
                  placeholder="Notitie (zichtbaar voor ouder)"
                  onBlur={(e) => {
                    if (e.target.value !== (sk.note ?? "")) save(sk, sk.achieved, e.target.value || null);
                  }}
                  className="mt-2 w-full rounded-lg border border-bubbles-100 px-2 py-1 text-xs"
                />
              </Card>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Een diploma wordt nooit automatisch definitief; doorstroom/diploma keurt de
            hoofdinstructeur of beheer goed.
          </p>
        </>
      )}
    </AppShell>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="text-xs text-slate-400">opslaan…</span>;
  if (state === "saved") return <span className="text-xs text-emerald-600">✓</span>;
  if (state === "pending") return <span className="text-xs text-amber-600">offline</span>;
  if (state === "error") return <span className="text-xs text-rose-600">fout</span>;
  return null;
}
