"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface ProgressRow {
  student_id: string;
  student_name: string;
  level_name: string;
  skill_id: string;
  skill_name: string;
  is_exam: boolean;
  achieved: boolean;
  note: string | null;
}

interface ChildProgress {
  studentId: string;
  name: string;
  level: string;
  skills: ProgressRow[];
}

function groupByChild(rows: ProgressRow[]): ChildProgress[] {
  const map = new Map<string, ChildProgress>();
  for (const r of rows) {
    let c = map.get(r.student_id);
    if (!c) {
      c = { studentId: r.student_id, name: r.student_name, level: r.level_name, skills: [] };
      map.set(r.student_id, c);
    }
    c.skills.push(r);
  }
  return [...map.values()];
}

export default function VoortgangPage() {
  const [children, setChildren] = useState<ChildProgress[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_family_progress").then(({ data, error }) => {
      if (error) setError(true);
      else setChildren(groupByChild((data ?? []) as ProgressRow[]));
    });
  }, []);

  return (
    <AppShell title="Voortgang">
      <Link href="/dashboard" className="mb-2 inline-block text-xs text-bubbles-700 underline">
        &larr; Terug naar mijn gezin
      </Link>

      {error ? (
        <Card>
          <p className="text-sm text-rose-600">Kon de voortgang niet laden.</p>
        </Card>
      ) : children === null ? (
        <Card>
          <p className="text-sm text-slate-400">Laden...</p>
        </Card>
      ) : children.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            Nog geen voortgang om te tonen. Zodra je kind op een niveau is geplaatst en de
            instructeur skills aftekent, verschijnt het hier.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {children.map((c) => {
            const done = c.skills.filter((s) => s.achieved).length;
            const total = c.skills.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Card key={c.studentId}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-bubbles-800">{c.name}</p>
                    <p className="text-xs text-slate-500">Niveau: {c.level}</p>
                  </div>
                  <StatusBadge tone={pct === 100 ? "success" : "info"}>{pct}%</StatusBadge>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bubbles-100">
                  <div className="h-full bg-bubbles-500" style={{ width: `${pct}%` }} />
                </div>

                <ul className="mt-3 space-y-1.5">
                  {c.skills.map((s) => (
                    <li key={s.skill_id} className="text-sm">
                      <span className={s.achieved ? "text-slate-700" : "text-slate-400"}>
                        {s.achieved ? "✓" : "○"} {s.skill_name}
                        {s.is_exam && (
                          <span className="ml-1 text-[10px] text-amber-600">exameneis</span>
                        )}
                      </span>
                      {s.note && <p className="ml-4 text-xs text-slate-500">{s.note}</p>}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  {done} van {total} vaardigheden behaald.
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
