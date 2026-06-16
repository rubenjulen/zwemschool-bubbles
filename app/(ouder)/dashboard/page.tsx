import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { WeatherWidget } from "@/components/WeatherWidget";

// Ouderdashboard (Prompt 16) - skeleton. Volgende les, kinderen + voortgang,
// openstaand bedrag, weer bij het bad en laatste bericht. Data-koppeling via
// Supabase (RLS) volgt in Iteratie 1+.
export default function OuderDashboard() {
  return (
    <AppShell title="Mijn gezin">
      <div className="space-y-3">
        <Card>
          <h2 className="text-sm font-semibold text-bubbles-800">Volgende les</h2>
          <p className="mt-1 text-sm text-slate-600">Nog geen lessen ingepland.</p>
        </Card>

        <WeatherWidget locationLabel="Hoofdbad Paramaribo" />

        <Link href="/betalingen" className="block">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-bubbles-800">Facturen & betalingen</h2>
              <span className="text-xs text-bubbles-700 underline">Bekijken</span>
            </div>
          </Card>
        </Link>

        <Card>
          <h2 className="text-sm font-semibold text-bubbles-800">Kinderen</h2>
          <p className="mt-1 text-sm text-slate-500">
            Voeg een kind toe via de inschrijving.
          </p>
          <Link
            href="/intake"
            className="tap-target mt-2 inline-flex rounded-lg bg-bubbles-500 px-4 py-2 text-sm font-medium text-white"
          >
            Kind inschrijven
          </Link>
        </Card>

        <Link
          href="/lessen"
          className="tap-target flex items-center justify-center rounded-xl border border-bubbles-100 bg-white p-3 text-sm font-medium text-bubbles-700 shadow-sm"
        >
          Lessen bekijken & inschrijven
        </Link>

        <Link
          href="/voortgang"
          className="tap-target flex items-center justify-center rounded-xl border border-bubbles-100 bg-white p-3 text-sm font-medium text-bubbles-700 shadow-sm"
        >
          Voortgang van mijn kind(eren)
        </Link>

        <Link href="/profiel" className="block text-center text-sm text-bubbles-700 underline">
          Mijn gegevens en berichtvoorkeuren
        </Link>
      </div>
    </AppShell>
  );
}
