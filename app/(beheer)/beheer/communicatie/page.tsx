"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { sendAnnouncement } from "./actions";

const inputClass = "tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm";

export default function BeheerCommunicatie() {
  const supabase = createClient();
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [levelId, setLevelId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    supabase
      .from("levels")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setLevels((data ?? []) as { id: string; name: string }[]));
  }, [supabase]);

  async function send() {
    setBusy(true);
    setMsg(null);
    const res = await sendAnnouncement({ levelId: levelId || null, subject, body });
    setBusy(false);
    if (!res.ok) {
      setMsg({ text: res.error, ok: false });
      return;
    }
    setMsg({
      text: `Verzonden naar ${res.sent} ontvanger(s)${res.failed > 0 ? `, ${res.failed} mislukt` : ""}.`,
      ok: true,
    });
    setSubject("");
    setBody("");
  }

  return (
    <AppShell title="Communicatie">
      <Link href="/beheer/dashboard" className="mb-2 inline-block text-xs text-bubbles-700 underline">
        &larr; Terug naar beheer
      </Link>

      <Card>
        <h2 className="text-sm font-semibold text-bubbles-800">Aankondiging versturen</h2>
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-slate-500">
            Ontvangers
            <select className={inputClass} value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Alle ouders</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  Ouders van niveau {l.name}
                </option>
              ))}
            </select>
          </label>
          <input
            className={inputClass}
            placeholder="Onderwerp"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className={inputClass}
            rows={6}
            placeholder="Bericht aan de ouders…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}
          <Button onClick={send} disabled={busy || !subject || !body} className="w-full">
            {busy ? "Versturen..." : "Versturen"}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          E-mail wordt verstuurd vanaf noreply@bubbles.koniq.app. Ouders die aankondigingen hebben
          uitgezet, worden overgeslagen. Elke verzending wordt gelogd.
        </p>
      </Card>
    </AppShell>
  );
}
