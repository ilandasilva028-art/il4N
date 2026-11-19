#!/usr/bin/env bash
# Démarre moteur + API FastAPI + tableau de bord. Sans DASHBOARD_TOKEN : accès local uniquement (127.0.0.1).
# Avec DASHBOARD_TOKEN=... : accessible sur le réseau (iPhone) via http://<ip>:3000, jeton demandé.
D="$(cd "$(dirname "$0")" && pwd)"
source "$D/pyfind.sh"
HOST=127.0.0.1; [ -n "${DASHBOARD_TOKEN:-}" ] && HOST=0.0.0.0
mkdir -p "$D/output/logs"
"$D/start.sh" > /dev/null 2>&1
if ! pgrep -f "uvicorn api.server" >/dev/null; then
  (cd "$D" && detach "$D/output/logs/api.log" "$PY" -m uvicorn api.server:app --host 127.0.0.1 --port 8000)
fi
[ -d "$D/studio-web/.next" ] || (cd "$D/studio-web" && NEXT_TELEMETRY_DISABLED=1 npx next build)
if ! pgrep -f "next-server" >/dev/null; then
  (cd "$D/studio-web" && detach "$D/output/logs/web.log" npx next start -p 3000 -H "$HOST")
fi
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:3000/ && break; sleep 1; done
curl -s -o /dev/null -w "Tableau de bord : http://$HOST:3000 (HTTP %{http_code})\n" "http://127.0.0.1:3000/" || true
curl -s "http://127.0.0.1:8000/api/health" && echo
