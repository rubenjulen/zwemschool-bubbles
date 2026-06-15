# Zwemschool Bubbles

Installeerbare, mobile-first **PWA** voor Zwemschool Bubbles (Paramaribo, Suriname):
ouderportaal, instructeurapp en beheerportaal in één TypeScript-stack. Offline-first
aan de badrand, privacy/security-by-design voor kinddata, en weer-info voor het
openluchtbad.

> Status: **Iteratie 0 - foundation** (projectsetup + database/RLS/auditlog + PWA-shell
> + offline sync-laag + integratie-abstracties). Features volgen per iteratie.

## Stack

- **Next.js 14 (App Router) + React + TypeScript + Tailwind CSS**
- **Supabase**: PostgreSQL, Auth, Storage, Edge Functions, Row Level Security
- **PWA**: web app manifest + service worker + offline fallback
- **IndexedDB** (via `idb`) voor de offline sync-queue
- **Vitest** (unit) + **Playwright** (e2e)

## Snel starten

```bash
# 1. Dependencies
npm install

# 2. Omgeving
cp .env.example .env.local   # vul Supabase-gegevens in

# 3. Database (lokaal, vereist Supabase CLI + Docker)
supabase start
supabase db reset            # draait migrations + seed
npm run db:types             # genereert types/database.ts

# 4. App
npm run dev                  # http://localhost:3000
```

## Scripts

| Script | Doel |
|--------|------|
| `npm run dev` | Dev-server |
| `npm run build` / `start` | Productiebuild / start |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run test` / `test:e2e` | Vitest unit / Playwright e2e |
| `npm run db:reset` / `db:types` | Migraties+seed / types genereren |

## Mappenstructuur

```
app/            App Router: (auth), (ouder), (instructeur), (beheer), manifest
components/     UI library (AppShell, Card, Button, WeatherWidget, OfflineBanner)
lib/
  supabase/     browser/server clients + middleware (sessie + route-guards)
  auth/         rolmodel (least privilege)
  offline/      IndexedDB + sync-queue (pending→syncing→synced→failed→conflict)
  integrations/ weather (Open-Meteo, werkend) · email/whatsapp/payments (stubs)
  i18n/         centrale NL-teksten
supabase/
  migrations/   0001 schema · 0002 RLS · 0003 auditlog
  functions/    payment-webhook · send-reminders (Edge Functions, Deno)
  seed.sql      curriculum/locatie placeholder
tests/          unit (sync, weer) + e2e (smoke)
docs/           ARCHITECTURE.md · SECURITY.md
```

## Veiligheid & privacy (kort)

- **RLS-first**: elke tabel heeft beleid; deny-by-default. Zie `docs/SECURITY.md`.
- **Geen secrets in code**; service role key alleen server-side/Edge Functions.
- **Geen kaartdata**: betalingen bewaren enkel een providerreferentie.
- **Auditlog**: append-only triggers op financiële/consent/safety/incident-mutaties.

Zie `docs/ARCHITECTURE.md` voor architectuurkeuzes en de iteratieplanning.
