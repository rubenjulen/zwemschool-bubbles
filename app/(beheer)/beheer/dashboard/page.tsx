import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

interface DashboardKpis {
  active_students: number;
  lessons_this_week: number;
  occupancy_pct: number;
  waitlist: number;
  outstanding_cents: number;
  open_incidents: number;
  trial_requests: number;
}

function srd(cents: number): string {
  return "SRD " + (cents / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
}

export default async function BeheerDashboard() {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_admin_dashboard");
  const kpi = (Array.isArray(data) ? data[0] : data) as DashboardKpis | undefined;

  const cards = [
    { label: "Actieve leerlingen", value: kpi?.active_students ?? 0 },
    { label: "Lessen deze week", value: kpi?.lessons_this_week ?? 0 },
    { label: "Bezetting", value: `${kpi?.occupancy_pct ?? 0}%` },
    { label: "Wachtlijst", value: kpi?.waitlist ?? 0 },
    { label: "Proefaanvragen", value: kpi?.trial_requests ?? 0 },
    { label: "Openstaand bedrag", value: srd(kpi?.outstanding_cents ?? 0) },
  ];

  return (
    <AppShell title="Beheer">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-bubbles-700">{c.value}</p>
          </Card>
        ))}
      </div>

      <Link
        href="/beheer/rooster"
        className="tap-target mt-3 flex items-center justify-center rounded-xl border border-bubbles-100 bg-white p-3 text-sm font-medium text-bubbles-700 shadow-sm"
      >
        Rooster & plaatsing beheren
      </Link>

      <Link
        href="/beheer/facturatie"
        className="tap-target mt-3 flex items-center justify-between rounded-xl border border-bubbles-100 bg-white p-3 text-sm font-medium text-bubbles-700 shadow-sm"
      >
        <span>Facturatie & betalingen</span>
        {kpi && kpi.outstanding_cents > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {srd(kpi.outstanding_cents)} open
          </span>
        )}
      </Link>

      <Link
        href="/beheer/incidenten"
        className="tap-target mt-3 flex items-center justify-between rounded-xl border border-bubbles-100 bg-white p-3 text-sm font-medium text-bubbles-700 shadow-sm"
      >
        <span>Incidenten</span>
        {kpi && kpi.open_incidents > 0 && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
            {kpi.open_incidents} open
          </span>
        )}
      </Link>

      <Link
        href="/beheer/communicatie"
        className="tap-target mt-3 flex items-center justify-center rounded-xl border border-bubbles-100 bg-white p-3 text-sm font-medium text-bubbles-700 shadow-sm"
      >
        Aankondiging versturen
      </Link>
    </AppShell>
  );
}
