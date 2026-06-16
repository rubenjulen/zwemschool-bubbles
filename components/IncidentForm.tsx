"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass = "tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm";

const CATEGORIES = [
  { value: "ehbo", label: "EHBO" },
  { value: "gedrag", label: "Gedrag" },
  { value: "safety", label: "Safety-observatie" },
  { value: "bijna-incident", label: "Bijna-incident" },
];
const SEVERITIES = [
  { value: "laag", label: "Laag" },
  { value: "midden", label: "Midden" },
  { value: "hoog", label: "Hoog" },
];

export function IncidentForm({
  lessonSessionId,
  students = [],
  onCreated,
}: {
  lessonSessionId?: string;
  students?: { id: string; name: string }[];
  onCreated?: () => void;
}) {
  const supabase = createClient();
  const [category, setCategory] = useState("ehbo");
  const [severity, setSeverity] = useState("laag");
  const [studentId, setStudentId] = useState("");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [parentInformed, setParentInformed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit() {
    if (description.trim().length === 0) {
      setMsg({ text: "Beschrijving is verplicht.", ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("report_incident", {
      p_category: category,
      p_severity: severity,
      p_description: description.trim(),
      p_student_id: studentId || null,
      p_lesson_session_id: lessonSessionId ?? null,
      p_action_taken: actionTaken.trim() || null,
      p_parent_informed: parentInformed,
    });
    setBusy(false);
    if (error) {
      setMsg({ text: "Opslaan mislukt: " + error.message, ok: false });
      return;
    }
    setMsg({ text: "Incident geregistreerd.", ok: true });
    setDescription("");
    setActionTaken("");
    setParentInformed(false);
    onCreated?.();
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-bubbles-800">Incident melden</h2>
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select className={inputClass} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                Ernst: {s.label}
              </option>
            ))}
          </select>
        </div>

        {students.length > 0 && (
          <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Geen specifieke leerling</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <textarea
          className={inputClass}
          rows={3}
          placeholder="Wat is er gebeurd? (verplicht)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <textarea
          className={inputClass}
          rows={2}
          placeholder="Genomen actie / opvolging"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={parentInformed}
            onChange={(e) => setParentInformed(e.target.checked)}
          />
          Ouder geïnformeerd
        </label>

        {msg && (
          <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>
        )}
        <Button onClick={submit} disabled={busy} className="w-full">
          {busy ? "Bezig..." : "Incident registreren"}
        </Button>
      </div>
    </Card>
  );
}
