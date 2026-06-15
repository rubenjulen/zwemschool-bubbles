"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClassSeries, confirmPlacement, type SeriesInput } from "./actions";

interface Option {
  id: string;
  name: string;
}
export interface SeriesRow {
  class_series_id: string;
  name: string;
  level_name: string | null;
  location_name: string | null;
  weekday: number | null;
  start_time: string | null;
  booked: number;
  capacity: number;
}
export interface PendingRow {
  id: string;
  studentName: string;
  seriesName: string;
}

const WEEKDAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const inputClass = "tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm";

const emptyForm: SeriesInput = {
  name: "",
  levelId: "",
  locationId: "",
  laneOrAreaId: "",
  instructorId: "",
  weekday: 3,
  startTime: "16:00",
  endTime: "16:45",
  capacity: 8,
};

export function RosterManager({
  locations,
  levels,
  instructors,
  series,
  pending,
}: {
  locations: Option[];
  levels: Option[];
  instructors: Option[];
  series: SeriesRow[];
  pending: PendingRow[];
}) {
  const [form, setForm] = useState<SeriesInput>({
    ...emptyForm,
    locationId: locations[0]?.id ?? "",
  });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof SeriesInput>(key: K, value: SeriesInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    const res = await createClassSeries(form);
    setBusy(false);
    setMsg(res.ok ? { text: "Lesgroep aangemaakt.", ok: true } : { text: res.error, ok: false });
  }

  async function confirm(id: string) {
    const res = await confirmPlacement(id);
    if (!res.ok) setMsg({ text: res.error, ok: false });
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-sm font-semibold text-bubbles-800">Nieuwe lesgroep</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className={`${inputClass} col-span-2`}
            placeholder="Naam (bv. Zeepaardje wo 16:00)"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <select className={inputClass} value={form.levelId} onChange={(e) => set("levelId", e.target.value)}>
            <option value="">Niveau…</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={form.locationId}
            onChange={(e) => set("locationId", e.target.value)}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={form.instructorId}
            onChange={(e) => set("instructorId", e.target.value)}
          >
            <option value="">Instructeur…</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={form.weekday}
            onChange={(e) => set("weekday", Number(e.target.value))}
          >
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input type="time" className={inputClass} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          <input type="time" className={inputClass} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
          <input
            type="number"
            min={1}
            className={`${inputClass} col-span-2`}
            placeholder="Capaciteit"
            value={form.capacity}
            onChange={(e) => set("capacity", Number(e.target.value))}
          />
        </div>
        {msg && (
          <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>
        )}
        <Button className="mt-3 w-full" onClick={submit} disabled={busy || !form.name || !form.locationId}>
          {busy ? "Bezig..." : "Lesgroep aanmaken"}
        </Button>
      </Card>

      {pending.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-bubbles-800">Te bevestigen plaatsingen</h2>
          <ul className="mt-2 space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {p.studentName} <span className="text-slate-400">→ {p.seriesName}</span>
                </span>
                <Button variant="secondary" onClick={() => confirm(p.id)}>
                  Bevestigen
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-bubbles-800">Lesgroepen</h2>
        {series.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">Nog geen lesgroepen.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {series.map((s) => {
              const full = s.booked >= s.capacity;
              return (
                <li key={s.class_series_id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {s.level_name ?? "—"} · {s.location_name ?? "—"}
                      {s.weekday !== null && ` · ${WEEKDAYS[s.weekday]}`}
                      {s.start_time && ` ${s.start_time.slice(0, 5)}`}
                    </p>
                  </div>
                  <StatusBadge tone={full ? "danger" : "info"}>
                    {s.booked}/{s.capacity}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
