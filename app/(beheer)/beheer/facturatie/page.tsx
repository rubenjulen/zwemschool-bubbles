"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

const inputClass = "tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm";

function srd(cents: number): string {
  return "SRD " + (cents / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  family_name: string;
  amount_cents: number;
  paid_cents: number;
  status: string;
  due_date: string | null;
}

export default function BeheerFacturatie() {
  const supabase = createClient();
  const [families, setFamilies] = useState<{ id: string; name: string }[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);

  // Factuurformulier
  const [familyId, setFamilyId] = useState("");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("Lesgeld");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadInvoices = useCallback(async () => {
    const { data } = await supabase.rpc("get_billing_overview");
    setInvoices((data ?? []) as InvoiceRow[]);
  }, [supabase]);

  useEffect(() => {
    supabase
      .from("family_accounts")
      .select("id, name")
      .is("deleted_at", null)
      .then(({ data }) => {
        const f = (data ?? []) as { id: string; name: string }[];
        setFamilies(f);
        if (f[0]) setFamilyId(f[0].id);
      });
    void loadInvoices();
  }, [supabase, loadInvoices]);

  async function createInvoice() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!familyId || !Number.isFinite(cents) || cents <= 0) {
      setMsg({ text: "Kies een gezin en vul een geldig bedrag in.", ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("create_invoice", {
      p_family_id: familyId,
      p_period: period || null,
      p_lines: [{ description, amount_cents: cents }],
      p_due_date: dueDate || null,
    });
    setBusy(false);
    if (error) {
      setMsg({ text: "Aanmaken mislukt: " + error.message, ok: false });
      return;
    }
    setMsg({ text: "Factuur aangemaakt.", ok: true });
    setAmount("");
    void loadInvoices();
  }

  return (
    <AppShell title="Facturatie">
      <Link href="/beheer/dashboard" className="mb-2 inline-block text-xs text-bubbles-700 underline">
        &larr; Terug naar beheer
      </Link>

      <Card>
        <h2 className="text-sm font-semibold text-bubbles-800">Nieuwe factuur</h2>
        <div className="mt-2 space-y-2">
          <select className={inputClass} value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <input className={inputClass} placeholder="Omschrijving (bv. Lesgeld juni)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} placeholder="Periode (bv. 2026-06)" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <input className={inputClass} inputMode="decimal" placeholder="Bedrag in SRD" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <label className="block text-xs text-slate-500">
            Vervaldatum
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}
          <Button onClick={createInvoice} disabled={busy} className="w-full">
            {busy ? "Bezig..." : "Factuur aanmaken"}
          </Button>
        </div>
      </Card>

      <h2 className="mb-2 mt-4 text-sm font-semibold text-bubbles-800">Facturen</h2>
      {invoices === null ? (
        <Card><p className="text-sm text-slate-400">Laden...</p></Card>
      ) : invoices.length === 0 ? (
        <Card><p className="text-sm text-slate-500">Nog geen facturen.</p></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <InvoiceCard key={inv.id} inv={inv} onPaid={loadInvoices} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function InvoiceCard({ inv, onPaid }: { inv: InvoiceRow; onPaid: () => void }) {
  const supabase = createClient();
  const balance = inv.amount_cents - inv.paid_cents;
  const [amount, setAmount] = useState((balance / 100).toFixed(2));
  const [method, setMethod] = useState("bank");
  const [busy, setBusy] = useState(false);

  async function pay() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    setBusy(true);
    await supabase.rpc("register_payment", {
      p_invoice_id: inv.id,
      p_amount_cents: cents,
      p_method: method,
    });
    setBusy(false);
    onPaid();
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">{inv.family_name}</p>
          <p className="text-xs text-slate-500">
            {inv.invoice_number} · {srd(inv.amount_cents)}
            {inv.due_date && ` · vervalt ${inv.due_date}`}
          </p>
        </div>
        <StatusBadge tone={inv.status === "paid" ? "success" : balance > 0 ? "warning" : "neutral"}>
          {inv.status === "paid" ? "betaald" : `open ${srd(balance)}`}
        </StatusBadge>
      </div>
      {inv.status !== "paid" && (
        <div className="mt-2 flex items-end gap-2">
          <input
            className="tap-target w-24 rounded-lg border border-bubbles-200 px-2 py-1 text-sm"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="tap-target rounded-lg border border-bubbles-200 px-2 py-1 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="bank">Bank</option>
            <option value="cash">Contant</option>
          </select>
          <Button variant="secondary" onClick={pay} disabled={busy}>
            {busy ? "..." : "Betaling"}
          </Button>
        </div>
      )}
    </Card>
  );
}
