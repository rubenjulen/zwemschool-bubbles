import type { MetadataRoute } from "next";

// Web App Manifest via Next metadata route (FR-13.1/13.2).
// Beschikbaar op /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zwemschool Bubbles",
    short_name: "Bubbles",
    description:
      "Ouderportaal, instructeurapp en beheer voor Zwemschool Bubbles - installeerbaar en offline-first.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6fbff",
    theme_color: "#02a6f0",
    lang: "nl",
    categories: ["education", "sports", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
