# Cloud-only werkwijze — Zwemschool Bubbles

Eén omgeving, geen lokale Supabase, geen localhost. Dit voorkomt de dubbele-keys-
en localhost-redirect-verwarring.

## De enige omgeving
- **App:** Hetzner-server `62.238.44.32`, bereikbaar op **https://bubbles.koniq.app**
  (Caddy → Next.js via systemd-service `bubbles`).
- **Database/Auth/Storage:** **cloud-Supabase** project `lpoyodtvynbxatsswwns`.
- **E-mail:** Resend (domein `bubbles.koniq.app`, afzender `noreply@bubbles.koniq.app`).

> We draaien **geen** lokale Supabase (`supabase start`) en **geen** lokale dev-server
> meer. Alle auth/redirect-instellingen leven in het Supabase-dashboard, niet in
> `supabase/config.toml` (dat bestand is alleen relevant als je ooit lokaal zou draaien).

## Een wijziging doorvoeren (de vaste cyclus)
1. Code aanpassen (lokaal in de editor — alleen **bewerken**, niet draaien).
2. Commit + push naar GitHub:
   ```
   git add -A
   git commit -m "..."
   git push
   ```
3. Uitrollen naar de server (in de Hetzner web-console óf via ssh), regel voor regel:
   ```
   cd /var/www/bubbles
   git pull
   npm run build
   systemctl restart bubbles
   ```
4. Testen op **https://bubbles.koniq.app**.

## Vaste instellingen (bronwaarheid in het Supabase-dashboard)
- **Authentication → URL Configuration**
  - Site URL: `https://bubbles.koniq.app`
  - Redirect URLs: `https://bubbles.koniq.app/**`
- **Authentication → SMTP Settings:** Resend (host `smtp.resend.com`, user `resend`,
  password = Resend API-key, sender `noreply@bubbles.koniq.app`).
- **Authentication → Rate Limits:** e-mails per uur op een ruime waarde (bv. 100).

## Gebruikers
- **Ouders:** wachtwoordloos via e-maillink (rol = `guardian`, automatisch).
- **Medewerkers:** e-mail + wachtwoord; rol zetten via SQL:
  ```sql
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"role":"system_admin"}'
  where email = 'medewerker@...';
  ```
  Rollen: guardian, instructor, lead_instructor, admin, finance_admin, system_admin.

## Belangrijk om de oude valkuil te vermijden
- Genereer inloglinks **alleen** op `https://bubbles.koniq.app`. Links die ooit op
  localhost zijn gemaakt blijven naar localhost wijzen — gooi die mails weg.
- Run nooit de lokale app naast de cloud; dat introduceert localhost-links opnieuw.
