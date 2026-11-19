#!/usr/bin/env bash
# Laugh mode on chat: clip when viewers spam mdr/ptdr/😂/KEKW. Restarts if it exits.
C="$1"; D="$(cd "$(dirname "$0")" && pwd)"; OUT="$D/output/laugh/$C"; mkdir -p "$OUT"
while true; do
  python3 -I "$D/hype_watch.py" "$C" "$OUT" --laugh ${LAUGHCHAT_ARGS:---min-msgs 5 --ratio 3} >> "$OUT/$C.chat.log" 2>&1
  echo "[$(date +%H:%M:%S)] exited, restarting in 20 s" >> "$OUT/$C.chat.log"
  sleep 20
done
