# Runbook — Zwemschool Bubbles in productie brengen

Dit is het volledige stappenplan van de huidige codebase (Iteratie 0–2 + risico-
mitigaties) naar een werkend, veilig en gedeployd systeem zoals ontworpen.
Legenda: ⚙️ = commando/automatiseerbaar · 👤 = handmatige actie (account, secret,
jurist) · ✅ = al aanwezig in de repo.

---

## Fase A — Lokaal werkend krijgen

**A1. Vereisten installeren** 👤
- Node.js 20+, Git
- Docker Desktop (nodig voor de lokale Supabase-stack)
- Supabase CLI: `npm i -g supabase` (of `scoop install supabase`)

**A2. Dependencies** ⚙️
```powershell
cd "…\Zwemschool Bubbles\zwemschool-bubbles"
npm install
```

**A3. Lokale database opzetten** ⚙️ (config.toml + migraties zijn ✅ aanwezig)
```powershell
supabase start            # start Postgres, Auth, Studio, Inbucket (mail)
npm run db:reset          # past 0001–0007 toe + seed.sql
npm run db:types          # vervangt de any-placeholder door echte types
```
`supabase status` toont de lokale URL's en keys (API URL, anon key, service role
key, Studio op :54323, mailvanger Inbucket op :54324).

**A4. Omgevingsvariabelen** 👤 (waarden uit `supabase status`)
```powershell
Copy-Item .env.example .env.local
# vul in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY
```

**A5. App draaien & controleren** ⚙️
```powershell
npm run dev               # http://localhost:3000
```
- Login: vul e-mail in → de magic link verschijnt in Inbucket (:54324) → klik →
  je belandt via `/auth/callback` in het juiste portaal.
- Doe de intake als ouder; controleer in Studio dat gezin/leerling/safety/consents
  in één keer zijn aangemaakt (atomair).

**A6. Tests draaien** ⚙️
```powershell
npm run test              # unit (25 tests)
npm run test:e2e          # Playwright smoke (start zelf de dev-server)
```

**A7. DB-/RLS-tests lokaal (optioneel)** ⚙️ — draaien automatisch in CI, maar kan ook lokaal:
```powershell
$db = (supabase status --output json | ConvertFrom-Json).DB_URL
psql $db -v ON_ERROR_STOP=1 -f supabase/tests/rls_negative.sql
psql $db -v ON_ERROR_STOP=1 -f supabase/tests/scheduling.sql
```

---

## Fase B — Git & CI

**B1. Repo pushen** 👤/⚙️ (git is al geïnit)
```powershell
git add -A
git commit -m "Iteratie 0-2 + risico-mitigaties"
# maak een lege GitHub-repo aan, dan:
git remote add origin https://github.com/<org>/zwemschool-bubbles.git
git push -u origin main
```

**B2. CI verifiëren** ✅/👤 — twee workflows draaien automatisch:
- `CI` (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build.
- `Database` (`.github/workflows/db.yml`): past migraties toe op echte Postgres +
  draait de negatieve RLS- en conflict-trigger-tests.
Controleer dat beide groen zijn op het PR/commit-overzicht.

---

## Fase C — Supabase cloud (staging → productie)

Doe dit twee keer: één project `bubbles-staging`, één `bubbles-prod`. 👤 = dashboard.

**C1. Projecten aanmaken** 👤 — supabase.com → New project (regio dichtbij, sterk
DB-wachtwoord bewaren in een wachtwoordkluis).

**C2. Migraties naar de cloud** ⚙️
```powershell
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push          # past 0001–0007 toe op het cloud-project
```

**C3. Auth configureren** 👤 (Authentication → settings)
- Site URL + Redirect URLs: voeg `https://<domein>/auth/callback` toe.
- E-mail: zet "Enable email confirmations" + magic link aan.
- MFA: zet **TOTP** aan (staff-MFA wordt door de middleware afgedwongen).
- SMTP: koppel een echte e-mailprovider (anders throttelt de standaard-SMTP).

**C4. Edge Functions deployen** ⚙️ + secrets 👤
```powershell
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy send-reminders
supabase secrets set PAYMENT_WEBHOOK_SECRET=<sterk-geheim>
# SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn binnen functions automatisch beschikbaar
```

**C5. Reminders inplannen** 👤 — Database → Cron (pg_cron) of de dashboard-scheduler:
plan `send-reminders` dagelijks (bv. 08:00 America/Paramaribo).

**C6. Productie-seed** 👤/⚙️ — `seed.sql` bevat testdata; maak voor prod een schone
variant met alleen echte locaties (incl. **latitude/longitude** voor de weer-
integratie), niveaus en skills. Draai die eenmalig via Studio of `psql`.

---

## Fase D — Frontend deploy (Vercel)

**D1. Project importeren** 👤 — vercel.com → Import Git repo. Gescheiden
omgevingen: Preview (= staging-Supabase) en Production (= prod-Supabase).

**D2. Env-vars per omgeving** 👤 — `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`PAYMENT_WEBHOOK_SECRET`, e-mail/whatsapp/payment-vars (zie `.env.example`).
**Nooit** de service role key als `NEXT_PUBLIC_*`.

**D3. Domein & HTTPS** 👤 — koppel het domein; Vercel regelt TLS automatisch
(vereist voor PWA-installatie).

**D4. PWA verifiëren** 👤 — open op een telefoon, controleer "installeren",
manifest, service worker en offline-fallback (Lighthouse PWA-audit).

---

## Fase E — Rollen, staff & eerste admin

**E1. Rol toekennen** 👤 — rollen staan in JWT `app_metadata.role`. Zet die met de
service role (Admin API of SQL in Studio):
```sql
-- voorbeeld: maak een gebruiker systeembeheerder
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"system_admin"}'
where email = 'beheer@bubbles.sr';
```
Geldige rollen: `guardian` (standaard), `instructor`, `lead_instructor`, `admin`,
`finance_admin`, `system_admin`.

**E2. Staff-profiel koppelen** 👤 — voor instructeur-RLS (eigen lessen zien) moet er
een `staff_profiles`-rij bestaan met `user_id` = de auth-user. Maak die aan via
beheer/Studio. Daarna dwingt de middleware **MFA-enrollment** af bij eerste login.

---

## Fase F — Fase 0 inhoud (openstaande besluiten D-1…D-8)

Deze zijn nu placeholders en moeten vóór livegang definitief worden gemaakt: 👤
- **D-1** Curriculum (Zeepaardje + Zwem-ABC of eigen model) → vul `levels`/`skills`.
- **D-2** Betaalprovider (SRD) → vervang de payments-stub
  (`lib/integrations/payments`) + implementeer webhook-handtekening.
- **D-3** Verplichte vs optionele intakevelden → pas `intakeSchema` aan.
- **D-4** Afmeld-/make-up-regels → `system_settings` (al voorbereid).
- **D-5** Kanalen MVP → e-mail werkend; WhatsApp-stub vervangen na opt-in/templates.
- **D-6** Privacyverklaring, voorwaarden, waivers → **juridische review**, daarna
  `CONSENT_VERSION` bumpen in `lib/validation/intake.ts`.
- **D-7** Toegang tot medische/safety-data + bewaartermijn → bevestigen (RLS staat).
- **D-8** Directierapportages → definiëren (Iteratie 4).

---

## Fase G — Go-live checklist (Prompt 39)

- [ ] CI (`CI` + `Database`) groen op `main`.
- [ ] Migraties op prod toegepast; RLS aan op alle tabellen (geverifieerd in CI).
- [ ] Auth redirect-URLs + MFA + SMTP geconfigureerd.
- [ ] Edge Functions gedeployd; webhook-secret gezet; reminders ingepland.
- [ ] Vercel prod-deploy met juiste env-vars en domein/HTTPS.
- [ ] Eerste `system_admin` + staff-profielen aangemaakt; MFA getest.
- [ ] PWA installeerbaar; offline-fallback werkt.
- [ ] Backups aan (Supabase) + **restore-test** uitgevoerd; RPO/RTO genoteerd.
- [ ] Monitoring/error-logging actief; auditlog gecontroleerd.
- [ ] Juridische teksten goedgekeurd en gepubliceerd; DPIA-light afgerond.
- [ ] Smoke tests groen op prod; rollback-plan + release notes klaar.

---

## Wat al klaarstaat in de repo ✅
PWA-shell + manifest + service worker · auth (OTP + callback + route-guards +
staff-MFA-afdwinging) · datamodel (29 tabellen) + RLS + auditlog · onboarding +
atomaire intake + consent + safety · profiel/berichtvoorkeuren · inschrijving/
wachtlijst + beschikbaarheid · beheer-rooster + conflicttrigger · offline sync-
laag · integratie-abstracties (weer werkend; e-mail/WhatsApp/payments als stub) ·
CI voor app én database · negatieve RLS- en conflict-tests.

## Volgende bouwiteraties (na livegang van de basis)
- **Iteratie 3** — offline aanwezigheid + skill tree/voortgang (FR-6/7).
- **Iteratie 4** — communicatie, facturatie/betaaloverzicht, dashboards/taken,
  incidenten (FR-8/9/11/12).
