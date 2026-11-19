#!/usr/bin/env bash
# Double-cliquez pour lancer Clip Factory (Mac). Fonctionne aussi sous Linux : ./"Clip Factory.command"
D="$(cd "$(dirname "$0")" && pwd)"; cd "$D"
[ -f output/.installed ] || ./install.sh || { echo "Installation échouée."; read -r -p "Entrée pour fermer"; exit 1; }
source "$D/pyfind.sh"
mkdir -p output
[ -s output/.dashboard_token ] || "$PY" -c "import secrets;print(secrets.token_urlsafe(24))" > output/.dashboard_token
chmod 600 output/.dashboard_token
export DASHBOARD_TOKEN="$(cat output/.dashboard_token)"
./stop_all.sh >/dev/null 2>&1; sleep 1
./start_all.sh >/dev/null
IP="$("$PY" -c "import socket;s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.connect(('192.168.1.1',9));print(s.getsockname()[0])" 2>/dev/null || echo 127.0.0.1)"
LOCAL="http://127.0.0.1:3000/?token=$DASHBOARD_TOKEN"
PHONE="http://$IP:3000/?token=$DASHBOARD_TOKEN"
clear
printf "\n\033[1;35m  CLIP FACTORY STUDIO est lancé\033[0m\n\n"
printf "  Sur cet ordinateur : %s\n" "http://127.0.0.1:3000"
printf "  Sur l'iPhone (même Wi-Fi) : scannez ce QR code avec l'appareil photo\n\n"
"$PY" -c "import qrcode,sys;q=qrcode.QRCode(border=1);q.add_data(sys.argv[1]);q.print_ascii(invert=True)" "$PHONE" 2>/dev/null \
  || printf "  %s\n" "$PHONE"
printf "\n  Lien iPhone : %s\n\n  Pour arrêter : double-cliquez sur « Arrêter Clip Factory ».\n\n" "$PHONE"
if command -v open >/dev/null; then open "$LOCAL"; elif command -v xdg-open >/dev/null; then xdg-open "$LOCAL" >/dev/null 2>&1; fi
