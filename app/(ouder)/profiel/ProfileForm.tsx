"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { setNotificationPreference, updateContact } from "./actions";

interface Props {
  fullName: string;
  phone: string;
  email: string;
  prefs: { channel: "email" | "whatsapp" | "push"; category: string; optedIn: boolean }[];
}

const CATEGORIES = [
  { key: "reminders", label: "Lesherinneringen" },
  { key: "billing", label: "Betalingen" },
  { key: "announcements", label: "Aankondigingen" },
];
const CHANNELS: { key: "email" | "whatsapp" | "push"; label: string }[] = [
  { key: "email", label: "E-mail" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "push", label: "Push" },
];

export function ProfileForm({ fullName, phone, email, prefs }: Props) {
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isOptedIn(channel: string, category: string) {
    return prefs.some((p) => p.channel === channel && p.category === category && p.optedIn);
  }

  async function saveContact() {
    setError(null);
    setSaved(false);
    const res = await updateContact({ fullName: name, phone: tel });
    if (res.ok) setSaved(true);
    else setError(res.error);
  }

  return (
    <div className="space-y-3">
      <Card>
        <h2 className="text-sm font-semibold text-bubbles-800">Mijn gegevens</h2>
        <div className="mt-2 space-y-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Naam</span>
            <input
              className="tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Telefoon</span>
            <input
              className="tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
            />
          </label>
          <p className="text-xs text-slate-400">E-mail: {email}</p>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex items-center gap-2">
            <Button onClick={saveContact}>Opslaan</Button>
            {saved && <StatusBadge tone="success">Opgeslagen</StatusBadge>}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-bubbles-800">Berichtvoorkeuren</h2>
        <p className="mt-1 text-xs text-slate-500">Per kanaal en categorie aan- of uitzetten.</p>
        <div className="mt-2 space-y-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <p className="text-sm font-medium text-slate-700">{cat.label}</p>
              <div className="mt-1 flex flex-wrap gap-3">
                {CHANNELS.map((ch) => (
                  <TogglePref
                    key={ch.key}
                    label={ch.label}
                    channel={ch.key}
                    category={cat.key}
                    initial={isOptedIn(ch.key, cat.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TogglePref({
  label,
  channel,
  category,
  initial,
}: {
  label: string;
  channel: "email" | "whatsapp" | "push";
  category: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    const res = await setNotificationPreference({ channel, category, optedIn: next });
    setBusy(false);
    if (!res.ok) setOn(!next); // rollback bij fout
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-700">
      <input type="checkbox" checked={on} disabled={busy} onChange={toggle} className="h-4 w-4" />
      {label}
    </label>
  );
}
