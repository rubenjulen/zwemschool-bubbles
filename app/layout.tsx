import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OfflineBanner } from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "Zwemschool Bubbles",
  description: "Veilig en eenvoudig zwemles regelen - voor ouders, instructeurs en beheer.",
  applicationName: "Zwemschool Bubbles",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bubbles",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#02a6f0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen text-slate-800 antialiased">
        <OfflineBanner />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
