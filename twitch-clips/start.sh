#!/usr/bin/env bash
# Start (or resume after a restart) the clip engine in the background. Safe to run twice.
D="$(cd "$(dirname "$0")" && pwd)"
source "$D/pyfind.sh"
mkdir -p "$D/output/logs"
detach "$D/output/logs/supervisor.log" "$PY" -u "$D/supervisor.py"
sleep 3
"$PY" "$D/healthcheck.py" || true
