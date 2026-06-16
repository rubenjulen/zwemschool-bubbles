"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

function srd(cents: number): string {
  return "SRD " + (cents / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
}

interface InvoiceLine {
  description?: string;
  amount_cents?: number;
}
interface BillingRow {
  id: string;
  invoice_number: string;
  period: string | null;
  amount_cents: number;
  status: string;
  due_date: string | null;
  lines: InvoiceLine[];
  paid_cents: number;
}

export default function BetalingenPage() {
  const [invoices, setInvoices] = useState<BillingRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_family_billing").then(({ data, error }) => {
      if (error) setError(true);
      else setInvoices((data ?? []) as BillingRow[]);
    });
  }, []);

  const outstanding =
    invoices?.reduce(
      (sum, i) => sum + (i.status === "paid" ? 0 : i.amount_cents - i.paid_cents),
      0,
    ) ?? 0;

  return (
    <AppShell title="Facturen & betalingen">
      <Link href="/dashboard" className="mb-2 inline-block text-xs text-bubbles-700 underline">
        &larr; Terug naar mijn gezin
      </Link>

      {error ? (
        <Card><p className="text-sm text-rose-600">Kon de facturen niet laden.</p></Card>
      ) : invoices === null ? (
        <Card><p className="text-sm text-slate-400">Laden...</p></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-bubbles-800">Openstaand bedrag</span>
              <StatusBadge tone={outstanding > 0 ? "warning" : "success"}>
                {outstanding > 0 ? srd(outstanding) : "Niets open"}
              </StatusBadge>
            </div>
          </Card>

          {invoices.length === 0 ? (
            <Card className="mt-3"><p className="text-sm text-slate-500">Er zijn nog geen facturen.</p></Card>
          ) : (
            <div className="mt-3 space-y-2">
              {invoices.map((inv) => {
                const balance = inv.amount_cents - inv.paid_cents;
                return (
                  <Card key={inv.id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{inv.invoice_number}</p>
                        <p className="text-xs text-slate-500">
                          {inv.period ?? ""}
                          {inv.due_date && ` · vervalt ${inv.due_date}`}
                        </p>
                      </div>
                      <StatusBadge tone={inv.status === "paid" ? "success" : "warning"}>
                        {inv.status === "paid" ? "betaald" : srd(balance) + " open"}
                      </StatusBadge>
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {(inv.lines ?? []).map((l, idx) => (
                        <li key={idx} className="flex justify-between text-xs text-slate-600">
                          <span>{l.description ?? "—"}</span>
                          <span>{srd(l.amount_cents ?? 0)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1 flex justify-between border-t border-bubbles-100 pt-1 text-xs">
                      <span className="text-slate-500">Totaal</span>
                      <span className="font-medium text-slate-700">{srd(inv.amount_cents)}</span>
                    </div>
                    {inv.paid_cents > 0 && inv.status !== "paid" && (
                      <p className="mt-1 text-xs text-emerald-700">Betaald: {srd(inv.paid_cents)}</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-400">
            Betalingen worden door de zwemschool geregistreerd. Online betalen volgt later.
          </p>
        </>
      )}
    </AppShell>
  );
}
