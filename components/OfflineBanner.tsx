"use client";

import { useEffect, useState } from "react";
import { nl } from "@/lib/i18n/nl";

// Toont een duidelijke offline-melding (FR-13.5, NFR-7). Ouders en instructeurs
// weten zo dat data lokaal wordt bewaard en later synchroniseert.
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-white"
    >
      {nl.status.offline}
    </div>
  );
}
