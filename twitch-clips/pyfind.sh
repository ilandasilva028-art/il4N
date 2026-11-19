# sourced by the start scripts: picks the Python that has faster-whisper
D="${D:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
for c in "${SUB_PYTHON:-}" /home/user/tts-env/bin/python "$D/.venv/bin/python"; do
  if [ -n "$c" ] && [ -x "$c" ]; then PY="$c"; break; fi
done
PY="${PY:-python3}"

# run a command fully detached from this terminal (Linux: setsid -f, macOS: nohup + disown)
detach() {
  local log="$1"; shift
  if command -v setsid >/dev/null 2>&1; then setsid -f "$@" >> "$log" 2>&1 < /dev/null
  else nohup "$@" >> "$log" 2>&1 < /dev/null & disown; fi
}
