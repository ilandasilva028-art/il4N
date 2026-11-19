#!/usr/bin/env bash
# Démarre moteur + API FastAPI + tableau de bord. Sans DASHBOARD_TOKEN : accès local uniquement (127.0.0.1).
# Avec DASHBOARD_TOKEN=... : accessible sur le réseau (iPhone) via http://<ip>:3000, jeton demandé.
D="$(cd "$(dirname "$0")" && pwd)"
PY="${SUB_PYTHON:-/home/user/tts-env/bin/python}"; [ -x "$PY" ] || PY="$D/.venv/bin/python"
HOST=127.0.0.1; [ -n "${DASHBOARD_TOKEN:-}" ] && HOST=0.0.0.0
mkdir -p "$D/output/logs"
"$D/start.sh" > /dev/null 2>&1
pgrep -f "uvicorn api.server" >/dev/null || (cd "$D" && setsid -f "$PY" -m uvicorn api.server:app --host 127.0.0.1 --port 8000 \
  >> "$D/output/logs/api.log" 2>&1 < /dev/null)
[ -d "$D/studio-web/.next" ] || (cd "$D/studio-web" && NEXT_TELEMETRY_DISABLED=1 npx next build)
pgrep -f "next-server" >/dev/null || (cd "$D/studio-web" && setsid -f npx next start -p 3000 -H "$HOST" \
  >> "$D/output/logs/web.log" 2>&1 < /dev/null)
sleep 5
curl -s -o /dev/null -w "Tableau de bord : http://$HOST:3000 (HTTP %{http_code})\n" "http://127.0.0.1:3000/" || true
curl -s "http://127.0.0.1:8000/api/health" && echo
