#!/usr/bin/env bash
# Clip Factory — installation complète sur un serveur Ubuntu 22.04/24.04 (Oracle Cloud Free Tier, ARM ou x86).
# À lancer UNE fois, en tant qu'utilisateur "ubuntu", depuis le dossier twitch-clips :
#     bash deploy/setup_server.sh
# Résultat : moteur + API + tableau de bord démarrés automatiquement (systemd), servis en HTTPS par Caddy
# sur https://<ip-avec-tirets>.sslip.io (certificat Let's Encrypt gratuit), protégés par un jeton.
set -euo pipefail
D="$(cd "$(dirname "$0")/.." && pwd)"
U="$(id -un)"
say() { printf "\n\033[1;35m▶ %s\033[0m\n" "$1"; }

say "Paquets système (ffmpeg, Python, outils)"
sudo apt-get update -y
sudo apt-get install -y ffmpeg python3 python3-venv python3-pip git curl iptables-persistent debian-keyring \
  debian-archive-keyring apt-transport-https fonts-dejavu-core

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  say "Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  say "Caddy (HTTPS automatique)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y && sudo apt-get install -y caddy
fi

say "Dépendances Python et tableau de bord (5-15 min)"
SUB_PYTHON= bash "$D/install.sh"
PY="$D/.venv/bin/python"

say "Jeton d'accès et adresse publique"
sudo mkdir -p /etc/clipfactory
if [ ! -s /etc/clipfactory/env ]; then
  TOKEN="$("$PY" -c 'import secrets;print(secrets.token_urlsafe(24))')"
  printf 'DASHBOARD_TOKEN=%s\nSUB_PYTHON=%s\n' "$TOKEN" "$PY" | sudo tee /etc/clipfactory/env >/dev/null
  sudo chmod 600 /etc/clipfactory/env
fi
TOKEN="$(sudo grep DASHBOARD_TOKEN /etc/clipfactory/env | cut -d= -f2)"
IP="$(curl -fsS https://api.ipify.org || curl -fsS https://ifconfig.me)"
HOSTNAME_PUBLIC="$(echo "$IP" | tr . -).sslip.io"

say "Services (démarrage automatique au boot)"
mk() {  # name, workdir, command
  sudo tee "/etc/systemd/system/clipfactory-$1.service" >/dev/null <<EOF
[Unit]
Description=Clip Factory $1
After=network-online.target
Wants=network-online.target
[Service]
User=$U
WorkingDirectory=$2
EnvironmentFile=/etc/clipfactory/env
ExecStart=$3
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF
}
mk engine "$D" "$PY -u $D/supervisor.py"
mk api "$D" "$PY -m uvicorn api.server:app --host 127.0.0.1 --port 8000"
mk web "$D/studio-web" "$(command -v npx) next start -p 3000 -H 127.0.0.1"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$HOSTNAME_PUBLIC {
    @compress not path /api/stream
    encode @compress zstd gzip
    reverse_proxy 127.0.0.1:3000 {
        flush_interval -1
    }
}
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now clipfactory-engine clipfactory-api clipfactory-web
sudo systemctl restart caddy

say "Pare-feu de la machine (ports 80 et 443)"
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport $p -j ACCEPT
done
sudo netfilter-persistent save >/dev/null 2>&1 || true

say "Vérification"
sleep 15
curl -fsS http://127.0.0.1:8000/api/health && echo
curl -fsS -o /dev/null -w "Tableau de bord local : HTTP %{http_code}\n" http://127.0.0.1:3000/
URL="https://$HOSTNAME_PUBLIC/?token=$TOKEN"
printf "\n\033[1;32mInstallation terminée.\033[0m\n\nOuvre ce lien (ordinateur ou iPhone) :\n  %s\n\n" "$URL"
"$PY" -c "import qrcode,sys;q=qrcode.QRCode(border=1);q.add_data(sys.argv[1]);q.print_ascii(invert=True)" "$URL" || true
printf "\nSi la page ne s'ouvre pas : vérifie l'étape « ouvrir les ports 80 et 443 » du guide (règles Oracle).\n"
printf "Le lien contient ton jeton : ne le partage pas. Le jeton est dans /etc/clipfactory/env.\n"
