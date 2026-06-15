import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { WeatherWidget } from "@/components/WeatherWidget";

// Instructeur-dagrooster (Prompt 21) - skeleton. Offline-first leslijst met
// aanwezigheid en safety-indicatoren volgt in Iteratie 3, bovenop de
// sync-queue uit lib/offline.
export default function InstructeurVandaag() {
  return (
    <AppShell title="Vandaag">
      <div className="space-y-3">
        <WeatherWidget locationLabel="Hoofdbad Paramaribo" />

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-bubbles-800">Mijn lessen vandaag</h2>
            <StatusBadge tone="info">Offline-ready</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Geen lessen geladen. Aanwezigheid registreren werkt straks ook zonder netwerk.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
