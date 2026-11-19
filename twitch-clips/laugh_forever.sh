#!/usr/bin/env bash
# Keeps laugh_watch.py running for one channel (restarts it if it exits).
C="$1"; D="$(cd "$(dirname "$0")" && pwd)"; OUT="$D/output/laugh/$C"; mkdir -p "$OUT"
PY="${SUB_PYTHON:-/home/user/tts-env/bin/python}"
while true; do
  "$PY" -I "$D/laugh_watch.py" "$C" "$OUT" >> "$OUT/$C.log" 2>&1
  echo "[$(date +%H:%M:%S)] exited, restarting in 30 s" >> "$OUT/$C.log"
  sleep 30
done
