import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

// Beheer-dashboard (Prompt 25) - skeleton. KPI's en operationele takenlijst
// (inschrijvingen, betalingen, incidenten, wachtlijst, dataverzoeken) volgen
// in Iteratie 4 met data via Supabase views/RPC's.
const KPIS = [
  { label: "Actieve leerlingen", value: "-" },
  { label: "Lessen deze week", value: "-" },
  { label: "Bezetting", value: "-" },
  { label: "Wachtlijst", value: "-" },
  { label: "Openstaand bedrag", value: "-" },
  { label: "Open incidenten", value: "-" },
];

export default function BeheerDashboard() {
  return (
    <AppShell title="Beheer">
      <div className="grid grid-cols-2 gap-3">
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-xl font-bold text-bubbles-700">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <Link
        href="/beheer/rooster"
        className="tap-target mt-3 flex items-center justify-center rounded-xl border border-bubbles-100 bg-white p-3 text-sm font-medium text-bubbles-700 shadow-sm"
      >
        Rooster & plaatsing beheren
      </Link>

      <Card className="mt-3">
        <h2 className="text-sm font-semibold text-bubbles-800">Takenlijst</h2>
        <p className="mt-1 text-sm text-slate-500">Nog geen openstaande taken.</p>
      </Card>
    </AppShell>
  );
}
