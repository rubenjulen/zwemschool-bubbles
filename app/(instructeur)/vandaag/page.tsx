"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { WeatherWidget } from "@/components/WeatherWidget";

interface TodaySession {
  session_id: string;
  name: string;
  level_name: string | null;
  location_name: string | null;
  start_time: string | null;
  student_count: number;
}

export default function InstructeurVandaag() {
  const [lessons, setLessons] = useState<TodaySession[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("get_instructor_today")
      .then(({ data, error }) => {
        if (error) setError(true);
        else setLessons((data ?? []) as TodaySession[]);
      });
  }, []);

  return (
    <AppShell title="Vandaag">
      <div className="space-y-3">
        <WeatherWidget locationLabel="Hoofdbad Paramaribo" />

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-bubbles-800">Mijn lessen vandaag</h2>
            <StatusBadge tone="info">Offline-ready</StatusBadge>
          </div>

          {error ? (
            <p className="mt-2 text-sm text-rose-600">Kon de lessen niet laden.</p>
          ) : lessons === null ? (
            <p className="mt-2 text-sm text-slate-400">Laden...</p>
          ) : lessons.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Je hebt vandaag geen lessen ingepland.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {lessons.map((l) => (
                <li key={l.session_id}>
                  <Link
                    href={`/vandaag/${l.session_id}`}
                    className="tap-target flex items-center justify-between rounded-lg border border-bubbles-100 bg-white px-3 py-2 transition hover:border-bubbles-300"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{l.name}</p>
                      <p className="text-xs text-slate-500">
                        {l.start_time ? l.start_time.slice(0, 5) : "—"}
                        {l.level_name && ` · ${l.level_name}`}
                        {l.location_name && ` · ${l.location_name}`}
                      </p>
                    </div>
                    <StatusBadge tone="neutral">{l.student_count} 🧒</StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
