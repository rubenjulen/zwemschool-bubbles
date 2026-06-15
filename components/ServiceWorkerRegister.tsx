"use client";

import { useEffect } from "react";

// Registreert de service worker voor installeerbaarheid en offline app-shell
// (FR-13.1/13.2). Alleen in productie zodat HMR in dev niet wordt gecachet.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        // Niet fataal: app werkt ook zonder SW, alleen zonder offline-cache.
        console.error("Service worker registratie mislukt", err);
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
