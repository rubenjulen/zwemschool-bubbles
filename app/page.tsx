import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { InstallButton } from "@/components/InstallButton";
import { nl } from "@/lib/i18n/nl";

// Publieke landingspagina + rolingangen. In een latere iteratie stuurt de
// middleware een ingelogde gebruiker direct door naar het juiste portaal.
export default function Home() {
  return (
    <AppShell title={nl.app.name}>
      <section className="text-center">
        <Image
          src="/brand/logo.png"
          alt={nl.app.name}
          width={560}
          height={326}
          className="mx-auto h-auto w-full max-w-[260px]"
          unoptimized
          priority
        />
      </section>

      <nav className="mt-6 grid gap-3" aria-label="Kies je portaal">
        <PortalLink href="/dashboard" title="Ouder / verzorger" desc="Rooster, afmelden, voortgang en betalingen" />
        <PortalLink href="/vandaag" title="Instructeur" desc="Leslijst, aanwezigheid en skills - werkt offline" />
        <PortalLink href="/beheer/dashboard" title="Beheer / kantoor" desc="Planning, taken, facturatie en dashboards" />
      </nav>

      <InstallButton />
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
