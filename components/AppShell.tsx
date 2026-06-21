import { type ReactNode } from "react";
import Image from "next/image";

// Mobile-first app shell met telefoonbreedte als basis. Caching van deze
// shell gebeurt in de service worker (FR-13.2).
export function AppShell({
  title,
  children,
  bottomNav,
}: {
  title: string;
  children: ReactNode;
  bottomNav?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-bubbles-100 bg-white/90 px-4 py-3 backdrop-blur">
        <Image
          src="/brand/starfish.png"
          alt=""
          width={162}
          height={104}
          className="h-6 w-auto"
          unoptimized
          priority
        />
        <h1 className="text-base font-semibold text-bubbles-800">{title}</h1>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
      {bottomNav ? (
        <nav className="sticky bottom-0 border-t border-bubbles-100 bg-white px-2 py-1">{bottomNav}</nav>
      ) : null}
    </div>
  );
}
