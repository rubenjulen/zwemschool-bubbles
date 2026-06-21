"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Installeerbare PWA (FR-13.1/13.2). Toont:
//  - een echte "Installeren"-knop wanneer de browser dat ondersteunt
//    (Android/Chrome, desktop Chrome/Edge) via het beforeinstallprompt-event;
//  - op iOS een handleiding (Apple staat programmatisch installeren niet toe);
//  - niets als de app al geïnstalleerd is.
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (installed) return null;

  return (
    <Card className="mt-6">
      <h2 className="text-sm font-semibold text-bubbles-800">App installeren</h2>
      {deferred ? (
        <>
          <p className="mt-1 text-xs text-slate-600">
            Installeer The Bubbles als app op dit apparaat — dan opent de app los van de browser, ook
            offline.
          </p>
          <Button onClick={install} className="mt-2 w-full">
            Installeren
          </Button>
        </>
      ) : isIOS ? (
        <p className="mt-1 text-xs text-slate-600">
          Op iPhone/iPad: tik onderin op het <span className="font-medium">Deel-icoon</span> en kies{" "}
          <span className="font-medium">&ldquo;Zet op beginscherm&rdquo;</span>. (Gebruik Safari.)
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-600">
          Open het browsermenu (⋮) en kies <span className="font-medium">&ldquo;App installeren&rdquo;</span>{" "}
          of <span className="font-medium">&ldquo;Toevoegen aan startscherm&rdquo;</span>. Verschijnt
          dat niet, ververs de pagina of gebruik Chrome.
        </p>
      )}
    </Card>
  );
}
