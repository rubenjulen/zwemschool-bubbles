# Implementatiestatus — The Bubbles (juni 2026)

Overzicht van wat is uitgevoerd en wat nog moet gebeuren voor een volledige
implementatie. Legenda: ✅ klaar · ◻ open · 🔺 aandachtspunt.

---

## 1. Reeds uitgevoerd ✅

### Fundament & infrastructuur
- ✅ Installeerbare **PWA** (manifest, service worker, offline-fallback, werkende installeer-knop).
- ✅ **Datamodel** (29 tabellen) + **RLS** (deny-by-default, per rol) + **auditlog** (triggers).
- ✅ **Offline sync-laag** (IndexedDB queue) voor instructeurfuncties.
- ✅ **Auth**: ouder wachtwoordloos (e-maillink), medewerker e-mail+wachtwoord, proxy-bewuste callback, route-guards per rol.
- ✅ Integratie-abstracties: **weer** (Open-Meteo, werkend), **e-mail** (Resend, werkend); WhatsApp/betalingen als stub.
- ✅ **CI** voor app (lint/types/tests/build) én database (migraties + negatieve RLS/conflict-tests).

### Functionaliteit (gebouwd)
- ✅ Gezinsaccount + **atomaire intake** + consent + safety-profiel.
- ✅ Ouderprofiel + berichtvoorkeuren.
- ✅ **Inschrijving/proefplaatsing + wachtlijst** + real-time beschikbaarheid.
- ✅ **Beheer-rooster**: lesgroepen aanmaken + conflictbewaking (app + DB-trigger).
- ✅ **Instructeur**: dagrooster, **offline aanwezigheid**, **skills afvinken**.
- ✅ **Ouder-voortgang** (skills/percentage per niveau).
- ✅ **Beheer-dashboard** met echte cijfers (leerlingen, lessen, bezetting, wachtlijst, openstaand, incidenten).
- ✅ **Incidentregistratie** (beheer + instructeur) + afhandelen.
- ✅ **Facturatie**: factuur maken, betaling registreren, **ouder-betaaloverzicht**.
- ✅ **Gerichte aankondigingen** via e-mail (alle ouders / per niveau, met opt-out).
- ✅ **Weer**: 24-uurs verwachting per uur met onweer/regen-waarschuwing.

### Live / configuratie (gedaan)
- ✅ **Cloud-Supabase** project; migraties 0001–0012 toegepast.
- ✅ **GitHub-repo** + CI groen; vaste cloud-only workflow.
- ✅ **Hetzner-server** (Ubuntu, Node, Caddy, systemd) — app **live op https://thebubbles.koniq.app**.
- ✅ **Domeinwissel** naar thebubbles.koniq.app (oud domein → redirect).
- ✅ **Resend**-domein geverifieerd; SMTP gekoppeld in Supabase.
- ✅ **Branding** → "The Bubbles" in app-teksten/manifest/e-mailafzender.

---

## 2. Nog te doen — configuratie / operationeel (vóór echte livegang)
- 🔺 **`RESEND_API_KEY`** op de server definitief correct (transactionele mail/aankondigingen).
- ◻ **Echte basisdata**: echte locaties (+ coördinaten), niveaus, skills, tarieven, lesgroepen, instructeurs (i.p.v. placeholder/test).
- ◻ **Staff-accounts** + rollen + staff_profiles aanmaken.
- 🔺 **Staff-MFA écht afdwingen** (nu fail-open) + TOTP end-to-end testen.
- ◻ `types/database.ts` → echte types (`npm run db:types`).
- ◻ **Dependency-hardening** (`npm audit`: Next-patch + devDeps).
- ◻ **Back-ups aan + restore-test** (Supabase) — RPO/RTO vastleggen.
- ◻ **Monitoring** (uptime + foutmeldingen/error-logging).
- ◻ Eigen **iconen/huisstijl** (nu generieke bel-iconen).
- ◻ (Optioneel) SSH-sleutel werkend voor één-commando-deploys.

---

## 3. Nog te bouwen — functioneel

### Hoog (Must / grootste admin-winst)
- ◻ **Afmelden + make-up credits + zelf inhalen** (FR-5).
- ◻ **Weer-gestuurde lesuitval + automatische ouder-notificatie** (FR-4.7).
- ◻ **Geplande lesherinneringen + betalingsherinneringen** (send-reminders + cron).
- ◻ **Diploma-goedkeuring + digitaal certificaat** (nummer/QR) (FR-7.4–7.6) + hoofdinstructeur-review (FR-7.5).
- ◻ **Instellingen-beheer-UI** (niveaus, skills, tarieven, regels, templates, rollen) (FR-12.4).
- ◻ **Rapportages + CSV-export** (inschrijvingen, aanwezigheid, no-shows, omzet, bezetting) (FR-12.3).
- ◻ **Beheer-takenlijst** (FR-12.2).
- ◻ **No-show automatisch markeren** (FR-6.4).
- ◻ **Per-locatie** dashboards/filters (2 locaties).

### Later (Should/Could — Fase 2/3)
- ◻ WhatsApp Business-koppeling (FR-8.2).
- ◻ Online betalen via lokale provider + webhook (FR-9.4).
- ◻ Boekhoud-export (FR-9.6).
- ◻ Mede-verzorger uitnodigen (FR-1.2).
- ◻ Foto/video-consent-overzicht voor staff (vóór social posts).
- ◻ Publieke inschrijflink (Facebook-funnel).
- ◻ Inbox/FAQ/tweerichtingscommunicatie (FR-8.6/8.7).
- ◻ Staff-certificeringen met vervaldatum (FR-10.2).
- ◻ AI-assistenten onder governance (FR-15).

---

## 4. Nog te doen — privacy / compliance (vóór echte kinddata)
- ◻ **Juridische teksten** (privacyverklaring, voorwaarden, waiver) → review → `CONSENT_VERSION` bijwerken.
- ◻ **Dataretentie** + verwijder-/dataverzoekproces (PR-5/PR-6).
- ◻ **DPIA-light** vóór livegang (PR-9).
- ◻ **Verwerkersafspraken** (Supabase, Resend, later payment/WhatsApp).

---

## 5. Nog te doen — kwaliteit
- ◻ **E2E-tests (Playwright)** uitbreiden naar de kernflows (inschrijven, afmelden, aanwezigheid, betaling).
- ◻ Negatieve **RLS-tests** uitbreiden voor de nieuwe RPC's/tabellen.

---

## Aanbevolen route naar "volledig geïmplementeerd"
1. **Config afronden** (RESEND-key, echte data, staff-accounts, MFA, db:types, dependency-hardening, backups, monitoring).
2. **Functioneel hoog** in volgorde: afmelden/make-up/inhalen → weer-gestuurde lesuitval → geplande reminders → diploma/certificaat → instellingen-UI → rapportages → takenlijst.
3. **Privacy/compliance** parallel (met juridische input).
4. **Fase 2/3** (WhatsApp, online betalen, etc.) na stabiele operatie.
