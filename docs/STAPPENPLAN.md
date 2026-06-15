# Stappenplan — van begin tot live (voor jou, stap voor stap)

Volg dit van boven naar beneden. Per stap staat het commando of de klik, plus
**✅ Gelukt als** (zo weet je dat het werkte) en soms **⚠️ Let op**.
Markeringen: 🧑 = jij doet dit · 🤖 = dit kan ik (Claude) voor je doen.

Alle terminal-commando's draai je in PowerShell, in de projectmap:
`…\Zwemschool Bubbles\zwemschool-bubbles`.

---

## DEEL 1 — Gereedschap installeren op je computer 🧑

**1. Node.js 20 (LTS)** — https://nodejs.org → download LTS → installeren.
✅ Gelukt als: `node -v` toont v20 of hoger.

**2. Git** — https://git-scm.com → installeren (standaardopties).
✅ Gelukt als: `git -v` toont een versie.

**3. Docker Desktop** — https://www.docker.com/products/docker-desktop →
installeren → **starten** (laat het draaien).
✅ Gelukt als: `docker info` geeft geen foutmelding.
⚠️ Docker moet draaien telkens als je lokaal met de database werkt.

**4. Supabase CLI** — in PowerShell: `npm install -g supabase`
✅ Gelukt als: `supabase -v` toont een versie.

**5. (Aanbevolen) VS Code** — https://code.visualstudio.com — handige editor.

---

## DEEL 2 — Het project lokaal aan de praat krijgen 🧑/🤖

**6. Pakketten installeren**
```powershell
npm install
```
✅ Gelukt als: er verschijnt een `node_modules`-map, geen rode errors.

**7. Lokale database starten** (Docker moet draaien)
```powershell
supabase start
```
✅ Gelukt als: je een lijst met URL's en keys ziet (API URL, anon key, service
role key, Studio URL, Inbucket URL).
⚠️ Kopieer deze uitvoer; je hebt de keys zo nodig. Opnieuw tonen: `supabase status`.

**8. Database vullen met het schema + voorbeelddata**
```powershell
npm run db:reset
```
✅ Gelukt als: het commando eindigt met "Finished" zonder errors (past migraties
0001–0007 + seed toe).

**9. Type-definities genereren** (vervangt de tijdelijke placeholder)
```powershell
npm run db:types
```
✅ Gelukt als: `types/database.ts` is bijgewerkt met veel tabel-types.

**10. Omgevingsbestand aanmaken**
```powershell
Copy-Item .env.example .env.local
```
Open `.env.local` en vul in met de waarden uit stap 7:
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
✅ Gelukt als: bestand opgeslagen. ⚠️ Deel deze keys met niemand.

**11. De app starten**
```powershell
npm run dev
```
Open http://localhost:3000.
✅ Gelukt als: je de Bubbles-startpagina met de drie portalen ziet.

**12. Inloggen testen (lokaal)**
- Klik "Ouder", dan kom je op login → vul een e-mailadres in → "Stuur inloglink".
- Open de lokale mailvanger **Inbucket** (URL uit stap 7, meestal
  http://localhost:54324) → open de mail → klik de link.
✅ Gelukt als: je doorgestuurd wordt naar het ouderdashboard.

**13. Intake testen**
- Op het dashboard: "Kind inschrijven" → doorloop de 4 stappen → versturen.
- Open **Studio** (URL uit stap 7, meestal http://localhost:54323) → Table editor →
  controleer dat er een rij staat in `students`, `safety_profiles`,
  `emergency_contacts` en `consent_records`.
✅ Gelukt als: alles in één keer is aangemaakt.

**14. Tests draaien**
```powershell
npm run test
```
✅ Gelukt als: "25 passed" (of meer).

> 🤖 Vastlopen bij 6–14? Stuur me de foutmelding; ik los het op.

---

## DEEL 3 — Online accounts aanmaken 🧑

**15. GitHub** — https://github.com → account → **New repository** → naam
`zwemschool-bubbles` → **leeg** laten (geen README) → Create. Bewaar de URL.

**16. Supabase (cloud)** — https://supabase.com → account aanmaken.

**17. Vercel** — https://vercel.com → account (log in met GitHub is het makkelijkst).

**18. E-mailprovider** (voor echte e-mails) — bv. https://resend.com → account.
(Betaalprovider en WhatsApp komen later, in Deel 8.)

---

## DEEL 4 — Code naar GitHub zetten 🧑/🤖

**19. Committen en pushen**
```powershell
git add -A
git commit -m "Zwemschool Bubbles - Iteratie 0-2 + risico-mitigaties"
git remote add origin https://github.com/<jouw-account>/zwemschool-bubbles.git
git push -u origin main
```
✅ Gelukt als: je code op GitHub ziet.
> 🤖 Ik kan dit voor je doen zodra de repo bestaat — geef me de URL.

**20. Automatische controles bekijken**
Ga op GitHub naar het tabblad **Actions**.
✅ Gelukt als: de workflows **CI** en **Database** allebei groen (✓) zijn. Dat is
het bewijs dat de database, beveiligingsregels (RLS) en triggers correct werken.

---

## DEEL 5 — Database in de cloud (eerst staging, daarna productie) 🧑/🤖

Doe Deel 5 t/m 7 eerst voor een **staging**-omgeving (om te testen), en herhaal
daarna voor **productie**.

**21. Supabase-project aanmaken** — dashboard → **New project** → naam
`bubbles-staging` → regio dicht bij Suriname → sterk DB-wachtwoord (bewaren!).

**22. Migraties naar de cloud zetten**
```powershell
supabase login
supabase link --project-ref <PROJECT_REF>   # ref staat in de project-URL
supabase db push
```
✅ Gelukt als: "Applied migrations" zonder errors.

**23. Authenticatie instellen** (dashboard → Authentication → URL Configuration / Providers)
- Redirect URLs: voeg `https://<jouw-domein>/auth/callback` toe.
- Email: magic link / OTP aanzetten.
- MFA: **TOTP** aanzetten (verplicht voor medewerkers).
✅ Gelukt als: instellingen opgeslagen.

**24. E-mail koppelen** (Authentication → Emails / SMTP) — vul de SMTP-gegevens van
je e-mailprovider (stap 18) in.
✅ Gelukt als: testmail komt aan.

**25. Edge Functions deployen + geheimen zetten**
```powershell
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy send-reminders
supabase secrets set PAYMENT_WEBHOOK_SECRET=<verzin-een-sterk-geheim>
```
✅ Gelukt als: beide functies staan onder Edge Functions in het dashboard.

**26. Herinneringen inplannen** — dashboard → Database → Cron → plan
`send-reminders` dagelijks (bv. 08:00).
✅ Gelukt als: de cron-regel staat in de lijst.

**27. Echte basisdata invullen** — Studio → vul je echte **locaties**
(met latitude/longitude voor het weer!), **niveaus** en **skills** in.
> 🤖 Ik kan een schoon `seed.prod.sql` voor je maken; jij vult de echte waarden in.

---

## DEEL 6 — De website live zetten (Hetzner, net als MensSana) 🧑/🤖

Hetzner + Caddy + managed Supabase, net als MensSana. **Verschil:** Bubbles is
Next.js (SSR) en draait als Node-service via systemd achter Caddy — niet als
statische map. Volg het uitgewerkte stappenplan in
[`docs/8-deploy-hetzner.md`](8-deploy-hetzner.md). Kort:

**28. Server + DNS** — Hetzner CX22 (Ubuntu 24.04), A-record
`bubbles.<domein> → <SERVER_IP>` (mag dezelfde server als MensSana zijn, eigen
subdomein). ✅ Gelukt als: je via SSH op de server kunt.

**29. Server inrichten** — firewall + hardening, **Node.js 20** installeren,
**Caddy** installeren en `deploy/Caddyfile` plaatsen (reverse proxy naar :3000).
✅ Gelukt als: `systemctl status caddy` actief is.

**30. App neerzetten & bouwen** — repo clonen in `/var/www/bubbles`,
`.env.production.local` invullen (zelfde vars als lokaal + prod-waarden),
`npm ci && npm run build`, daarna `deploy/bubbles.service` als systemd-service
starten. ✅ Gelukt als: `https://bubbles.<domein>` laadt met HTTPS.

**31. Updaten gaat met één commando** — vul je server-IP in `scripts/deploy.ps1`
en draai voortaan `.\scripts\deploy.ps1` (bouwt op de server + herstart de
service).

**32. PWA testen op je telefoon** — open de site → "Toevoegen aan beginscherm" /
"Installeren". ✅ Gelukt als: Bubbles als app opent en ook werkt zonder netwerk
(offline-melding verschijnt).
> ⚠️ De stap-nummers 32–34 hieronder (rollen/gebruikers) schuiven mee op; volg de
> kopjes, niet de losse nummers.

---

## DEEL 7 — Rollen en eerste gebruikers 🧑

**32. Jezelf systeembeheerder maken** — eerst inloggen op de live site (zodat je
auth-account bestaat), dan in Supabase → SQL Editor:
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"system_admin"}'
where email = 'jouw@email.sr';
```
✅ Gelukt als: na opnieuw inloggen kom je in het beheerportaal.

**33. Medewerkers toevoegen** — geef elke medewerker een rol (stap 32, met
`instructor`, `lead_instructor`, `admin` of `finance_admin`) én maak voor hen een
rij in `staff_profiles` met hun `user_id`.
✅ Gelukt als: een instructeur na inloggen zijn eigen lessen ziet.

**34. MFA testen** — log in als medewerker → je wordt naar de
tweestapsverificatie gestuurd → scan met een authenticator-app → code invoeren.
✅ Gelukt als: medewerker komt pas ná de code in het portaal.

---

## DEEL 8 — Inhoud en juridisch (vóór echte livegang) 🧑/🤖

**35. Curriculum** vastleggen (niveaus + skills) — besluit D-1.
**36. Tarieven en regels** (afmelden, make-up credits) in `system_settings` — D-4.
**37. Juridische teksten** (privacyverklaring, voorwaarden, waiver) laten
controleren door een lokale jurist — D-6. Daarna laat ik 🤖 `CONSENT_VERSION`
ophogen zodat de akkoordversie klopt.
**38. Betaalprovider kiezen** (SRD) — D-2. 🤖 Ik bouw daarna de echte koppeling
(nu nog een veilige stub) inclusief webhook-verificatie.
**39. WhatsApp** opt-in/templates regelen bij Meta — D-5. 🤖 Ik bouw de koppeling.

---

## DEEL 9 — De rest van de functionaliteit bouwen 🤖

Vraag mij om:
- **Iteratie 3** — aanwezigheid offline aftekenen + skill tree/voortgang (FR-6/7).
- **Iteratie 4** — communicatie, facturatie/betaaloverzicht, dashboards met echte
  cijfers, takenlijst en incidenten (FR-8/9/11/12).

---

## DEEL 10 — Laatste controle vóór je echt opengaat 🧑

- [ ] CI + Database op GitHub groen.
- [ ] Productie-Supabase: migraties toegepast, Auth + MFA + SMTP ingesteld.
- [ ] Edge Functions live, webhook-geheim gezet, reminders ingepland.
- [ ] Vercel productie met domein + HTTPS.
- [ ] Systeembeheerder + medewerkers aangemaakt, MFA getest.
- [ ] App installeerbaar op telefoon, offline werkt.
- [ ] Back-ups aan (Supabase) + een **herstel-test** gedaan.
- [ ] Juridische teksten goedgekeurd en zichtbaar in de app.
- [ ] Een paar echte testinschrijvingen doorlopen (smoke test).

Als alle vinkjes staan, ben je live. 🎉
