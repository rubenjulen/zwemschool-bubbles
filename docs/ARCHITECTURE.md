# Architectuur - Zwemschool Bubbles

## Uitgangspunten

Eén Next.js-app als installeerbare PWA + Supabase als backend. Geen
microservices, geen aparte native apps (past bij "lage onderhoudslast" en
"één TypeScript-stack", §3 requirements). Multi-locatie-ready via `location_id`,
niet multi-tenant-complex (Datamodelbesluit §9).

## Lagen

| Laag | Invulling | Bron |
|------|-----------|------|
| Frontend | Next.js App Router, React, Tailwind, mobile-first | §10 |
| Backend | Supabase/PostgreSQL + RLS, Edge Functions, Storage | §10 |
| Auth | Supabase Auth, e-mail/OTP voor ouders, MFA voor staff | SEC-1 |
| Offline | IndexedDB sync-queue voor aanwezigheid/voortgang | FR-13.3/4 |
| Communicatie | E-mail (MVP), WhatsApp (Fase 2), push | FR-8.2 |
| Payments | Facturatie + handmatige status (MVP); links/webhooks (Fase 2) | §10 |
| Hosting | Vercel (frontend) + Supabase; dev/staging/prod gescheiden | §10 |

## Autorisatiemodel

Rol staat in JWT `app_metadata` (niet wijzigbaar door de gebruiker) én wordt in
de database via RLS afgedwongen (defense-in-depth). Route-guards in
`middleware.ts` houden rollen uit elkaars portalen (ouder ≠ instructeur ≠ beheer).
Helpers in `lib/auth/roles.ts` en SQL-helpers (`jwt_role()`, `is_staff()`,
`current_family_ids()`, `instructor_sees_session()`).

## Offline-first sync

- Server is bron van waarheid voor het rooster.
- Offline mutaties (aanwezigheid, skill afvinken, lesnotitie) krijgen een
  idempotente `client_mutation_id` + timestamp + actor + lescontext.
- Statusmachine: `pending → syncing → synced | failed | conflict`.
- Conflicten worden gemarkeerd, niet stil overschreven, en aan
  beheer/instructeur getoond.
- Minimale offline dataset per instructeur; gevoelige medische data niet langer
  lokaal dan nodig (zie SECURITY.md / Prompt 15).

## Weer-integratie (openluchtbad)

`lib/integrations/weather` met `WeatherProvider`-interface. MVP gebruikt
Open-Meteo (gratis, geen key). WMO-codes worden vertaald naar onweer-/zware-regen-
vlaggen die lesbeslissingen ondersteunen. Coördinaten per `locations`-rij.

## Iteratieplanning

| Iteratie | Scope | Hoofd-FR's |
|----------|-------|-----------|
| 0 (deze) | Foundation: PWA-shell, auth/rollen, DB+RLS+audit, seed, CI, offline-laag, integratie-abstracties | FR-13, SEC-*, §9 |
| 1 | Gezinsaccount, intake, consent, safety-profiel | FR-1, FR-2 |
| 2 | Inschrijving/plaatsing, rooster/capaciteit | FR-3, FR-4 |
| 3 | Offline aanwezigheid, skill tree/voortgang | FR-6, FR-7 |
| 4 | Communicatie, facturatie/betaaloverzicht, dashboard/taken, incident light | FR-8, FR-9, FR-11, FR-12 |

Elke iteratie levert werkende flows + unit/e2e-tests + acceptatiecriteria uit de
FR-ID's en de Definition of Done (§12).
