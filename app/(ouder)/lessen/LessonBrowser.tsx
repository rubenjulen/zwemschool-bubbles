"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { joinWaitlist, requestEnrollment } from "./actions";

export interface ClassRow {
  class_series_id: string;
  name: string;
  level_id: string | null;
  level_name: string | null;
  location_name: string | null;
  weekday: number | null;
  start_time: string | null;
  spots_left: number;
  capacity: number;
}

export interface StudentRow {
  id: string;
  first_name: string;
}

const WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

export function LessonBrowser({
  students,
  classes,
}: {
  students: StudentRow[];
  classes: ClassRow[];
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onEnroll(cls: ClassRow) {
    if (!studentId) return;
    setBusyId(cls.class_series_id);
    setMessage(null);
    const res = await requestEnrollment(studentId, cls.class_series_id);
    setBusyId(null);
    setMessage(res.ok ? { text: "Proefplaatsing aangevraagd.", ok: true } : { text: res.error, ok: false });
  }

  async function onWaitlist(cls: ClassRow) {
    if (!studentId || !cls.level_id) return;
    setBusyId(cls.class_series_id);
    setMessage(null);
    const res = await joinWaitlist(studentId, cls.level_id);
    setBusyId(null);
    setMessage(res.ok ? { text: "Op de wachtlijst gezet.", ok: true } : { text: res.error, ok: false });
  }

  if (students.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          Schrijf eerst een kind in via de intake voordat je lessen kunt kiezen.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Voor welk kind?</span>
          <select
            className="tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
        >
          {message.text}
        </div>
      )}

      {classes.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Er zijn nog geen lesgroepen beschikbaar.</p>
        </Card>
      ) : (
        classes.map((cls) => {
          const full = cls.spots_left <= 0;
          return (
            <Card key={cls.class_series_id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-bubbles-800">{cls.name}</p>
                  <p className="text-xs text-slate-500">
                    {cls.level_name ?? "—"} · {cls.location_name ?? "—"}
                    {cls.weekday !== null && ` · ${WEEKDAYS[cls.weekday]}`}
                    {cls.start_time && ` ${cls.start_time.slice(0, 5)}`}
                  </p>
                </div>
                <StatusBadge tone={full ? "danger" : "success"}>
                  {full ? "Vol" : `${cls.spots_left} vrij`}
                </StatusBadge>
              </div>
              <div className="mt-3">
                {full ? (
                  <Button
                    variant="secondary"
                    disabled={busyId === cls.class_series_id || !cls.level_id}
                    onClick={() => onWaitlist(cls)}
                  >
                    Op wachtlijst
                  </Button>
                ) : (
                  <Button
                    disabled={busyId === cls.class_series_id}
                    onClick={() => onEnroll(cls)}
                  >
                    {busyId === cls.class_series_id ? "Bezig..." : "Proefles aanvragen"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
