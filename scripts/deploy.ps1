# ============================================================
# Zwemschool Bubbles - deploy naar Hetzner (Windows / PowerShell)
# ------------------------------------------------------------
# Bubbles is een Next.js-app (SSR), dus we BOUWEN OP DE SERVER en herstarten
# de systemd-service - anders dan de statische MensSana-build.
# Vereist: OpenSSH (ssh) - standaard aanwezig op Windows 10/11.
#
# Eenmalige voorbereiding op de server: zie docs/8-deploy-hetzner.md.
# Pas $Server aan en draai vanuit de projectmap:  .\scripts\deploy.ps1
# ============================================================
$ErrorActionPreference = 'Stop'

# --- Instellingen (aanpassen) ---
$Server  = 'root@<SERVER_IP>'          # Hetzner server
$AppDir  = '/var/www/bubbles'
$Service = 'bubbles'
$Domain  = 'https://bubbles.koniq.app'

$remote = @"
set -e
cd '$AppDir'
git pull --ff-only
npm ci
npm run build
systemctl restart '$Service'
sleep 2
systemctl --no-pager status '$Service' | head -n 5
"@

Write-Host "Deployen naar $Server ..." -ForegroundColor Cyan
ssh $Server $remote
if ($LASTEXITCODE -ne 0) { throw "Deploy mislukt (server/SSH/build ok?)." }

Write-Host "Klaar. Controleer $Domain" -ForegroundColor Green
