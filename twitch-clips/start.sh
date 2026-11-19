#!/usr/bin/env bash
# Start (or resume after a restart) the clip factory in the background. Safe to run twice.
D="$(cd "$(dirname "$0")" && pwd)"
PY="${SUB_PYTHON:-/home/user/tts-env/bin/python}"
mkdir -p "$D/output/logs"
setsid nohup "$PY" -u "$D/supervisor.py" >> "$D/output/logs/supervisor.log" 2>&1 < /dev/null &
sleep 3
"$PY" "$D/healthcheck.py" || true
