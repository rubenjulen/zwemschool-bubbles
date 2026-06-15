import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { nl } from "@/lib/i18n/nl";

// Publieke landingspagina + rolingangen. In een latere iteratie stuurt de
// middleware een ingelogde gebruiker direct door naar het juiste portaal.
export default function Home() {
  return (
    <AppShell title={nl.app.name}>
      <section className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-bubbles-800">{nl.app.name}</h1>
        <p className="text-sm text-slate-600">{nl.app.tagline}</p>
      </section>

      <nav className="mt-6 grid gap-3" aria-label="Kies je portaal">
        <PortalLink href="/dashboard" title="Ouder / verzorger" desc="Rooster, afmelden, voortgang en betalingen" />
        <PortalLink href="/vandaag" title="Instructeur" desc="Leslijst, aanwezigheid en skills - werkt offline" />
        <PortalLink href="/beheer/dashboard" title="Beheer / kantoor" desc="Planning, taken, facturatie en dashboards" />
      </nav>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-bubbles-800">App installeren</h2>
        <p className="mt-1 text-xs text-slate-600">
          Tik in je browser op <span className="font-medium">Delen &rarr; Zet op beginscherm</span> (iOS) of
          op <span className="font-medium">Installeren</span> (Android) om Bubbles als app te gebruiken.
        </p>
      </Card>
    </AppShell>
  );
}

function PortalLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="tap-target flex flex-col rounded-xl border border-bubbles-100 bg-white p-4 shadow-sm transition hover:border-bubbles-300 hover:shadow"
    >
      <span className="font-semibold text-bubbles-800">{title}</span>
      <span className="text-xs text-slate-500">{desc}</span>
    </Link>
  );
}
