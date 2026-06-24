import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { InstallButton } from "@/components/InstallButton";
import { nl } from "@/lib/i18n/nl";

// Publieke ouder-startpagina (Optie A). Medewerkers loggen apart in via
// /medewerker (discrete link onderaan). Beveiliging zit in RLS + middleware.
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

      <p className="mt-4 text-center text-sm text-slate-600">
        Welkom! Log in of meld je kind aan voor zwemles.
      </p>

      <Link
        href="/login"
        className="tap-target mt-4 flex items-center justify-center rounded-xl bg-bubbles-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-bubbles-600"
      >
        Inloggen / aanmelden
      </Link>

      <InstallButton />
    </AppShell>
  );
}
