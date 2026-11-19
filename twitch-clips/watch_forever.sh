#!/usr/bin/env bash
# Keeps hype_watch.py running for one channel: restarts it whenever it exits.
C="$1"; OUT="$(dirname "$0")/output/hype/$C"; mkdir -p "$OUT"
while true; do
  echo "[$(date +%H:%M:%S)] starting $C" >> "$OUT/supervisor.log"
  python3 -I "$(dirname "$0")/hype_watch.py" "$C" "$OUT" >> "$OUT/$C.log" 2>&1
  echo "[$(date +%H:%M:%S)] $C exited, restarting in 20 s" >> "$OUT/supervisor.log"
  sleep 20
done
