# Bubbles — Live op Hetzner (VPS + Caddy + Next.js)

Stappenplan om de app live te zetten op een Hetzner Cloud-server, in dezelfde
stijl als MensSana. **Verschil met MensSana:** MensSana is een statische SPA die
Caddy rechtstreeks serveert. Bubbles is een **Next.js-app (SSR + middleware +
server actions)** en draait daarom als **Node-proces via systemd**, met Caddy als
HTTPS reverse proxy ervoor. Database/auth blijven in **managed Supabase** (cloud).

Vervang overal `bubbles.koniq.app` door je eigen domein en `<SERVER_IP>` door je
server-IP. Klaarliggende bestanden in dit project: `deploy/Caddyfile`,
`deploy/bubbles.service`, `scripts/deploy.ps1`, `scripts/deploy.sh`.

---

## 0. Wat je nodig hebt
- Hetzner Cloud-account; een (sub)domein waarvan je DNS kunt aanpassen.
- Het **productie** Supabase-project (managed): URL + anon-key + service-role-key.
- Een GitHub-repo met deze code (zie STAPPENPLAN Deel 4).

## 1. Server aanmaken
Hetzner Console → **New Server** → Ubuntu 24.04 → **CX22** (2 vCPU / 4 GB; genoeg
om Next.js te bouwen) → SSH-key toevoegen → IPv4 noteren (`<SERVER_IP>`).
(Je mag dezelfde server als MensSana gebruiken; gebruik dan een apart subdomein.)

## 2. DNS
A-record: `bubbles.koniq.app  →  <SERVER_IP>`. Wacht tot dit actief is (Caddy
heeft het nodig voor het certificaat).

## 3. Server klaarmaken (zelfde hardening als MensSana)
```bash
ssh root@<SERVER_IP>
apt update && apt -y upgrade
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
apt -y install unattended-upgrades fail2ban git
systemctl enable --now fail2ban
```

## 4. Node.js 20 installeren (op de server)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs
node -v   # v20.x
```

## 5. Caddy installeren (automatische HTTPS)
```bash
apt -y install debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy
```
Zet de inhoud van `deploy/Caddyfile` (uit deze repo) in `/etc/caddy/Caddyfile`
(pas het domein aan), daarna:
```bash
systemctl reload caddy
```
Caddy proxy't nu naar de app op poort 3000 en regelt HTTPS zodra DNS klopt.

## 6. De app op de server zetten
```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/<jouw-account>/zwemschool-bubbles.git bubbles
cd bubbles
```
> Privé-repo? Gebruik een **deploy key**: `ssh-keygen -t ed25519 -f ~/.ssh/bubbles_deploy`,
> de publieke sleutel als read-only Deploy Key in GitHub zetten, en clonen via SSH-URL.

Maak het env-bestand (wordt automatisch door Next.js geladen, bij build én runtime):
```bash
nano /var/www/bubbles/.env.production.local
```
Vul in (productiewaarden uit Supabase → Project Settings → API):
```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROD-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PROD-ANON-KEY>
SUPABASE_SERVICE_ROLE_KEY=<PROD-SERVICE-ROLE-KEY>
PAYMENT_WEBHOOK_SECRET=<sterk-geheim>
NEXT_PUBLIC_APP_NAME=Zwemschool Bubbles
NEXT_PUBLIC_DEFAULT_TIMEZONE=America/Paramaribo
```
Bouwen en rechten zetten:
```bash
npm ci
npm run build
chown -R www-data:www-data /var/www/bubbles
```

## 7. De app als service draaien (systemd)
Kopieer `deploy/bubbles.service` naar `/etc/systemd/system/bubbles.service`, dan:
```bash
systemctl daemon-reload
systemctl enable --now bubbles
systemctl status bubbles        # moet 'active (running)' tonen
```
Open **https://bubbles.koniq.app** — de app draait live met HTTPS.
Logs volgen: `journalctl -u bubbles -f`.

## 8. Supabase afstemmen op het productiedomein
Productie-Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://bubbles.koniq.app`
- **Redirect URLs:** `https://bubbles.koniq.app/auth/callback`
- MFA (TOTP) aanzetten; SMTP/e-mailprovider koppelen.

## 9. Edge Functions & reminders
Eenmalig vanaf je computer (zie ook RUNBOOK Fase C):
```bash
supabase link --project-ref <PROD-REF>
supabase db push
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy send-reminders
supabase secrets set PAYMENT_WEBHOOK_SECRET=<zelfde-geheim-als-in-.env>
```
Plan `send-reminders` als dagelijkse cron in het Supabase-dashboard.

## 10. Updaten (nieuwe versie uitrollen)
Eenmalig je server-IP invullen in `scripts/deploy.ps1` / `scripts/deploy.sh`.
Daarna vanaf je computer:
- **Windows:** `.\scripts\deploy.ps1`
- **WSL/Mac/Linux:** `./scripts/deploy.sh`

Het script doet op de server: `git pull` → `npm ci` → `npm run build` →
`systemctl restart bubbles`. De PWA werkt zichzelf daarna bij in de browser.

## 11. Onderhoud & checks
- **Certificaat:** Caddy vernieuwt automatisch.
- **App-status:** `systemctl status bubbles`, logs via `journalctl -u bubbles -f`.
- **Server-updates:** af en toe `apt update && apt -y upgrade`.
- **Back-ups:** de data zit in managed Supabase (backups + restore-test daar
  regelen). De server bevat alleen de app en is altijd opnieuw te bouwen;
  eventueel Hetzner-snapshots aanzetten.

---

## Alternatief: Coolify
Wil je de "Vercel-ervaring" met git-push deploys + auto-HTTPS op je eigen Hetzner,
dan is **Coolify** een prima optie voor Next.js (detecteert Next automatisch,
beheert build + container + certificaat). Meer opzet, maar fijner als je vaak
deployt. De systemd+Caddy-route hierboven is lichter en sluit aan op MensSana.
