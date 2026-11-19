#!/bin/bash
# Session start: install the clip factory's extra Python deps (only when they changed) and
# (re)start the clip factory after a container restart. Never blocks the session on failure.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
PY=/home/user/tts-env/bin/python
if [ ! -x "$PY" ]; then
  echo "session-start: $PY missing (environment setup script not run), clip factory not started" >&2
  exit 0
fi

# Extra deps into tts-env, only if requirements-extra.txt or this script changed since last success
site="$("$PY" -I -c 'import sysconfig; print(sysconfig.get_path("purelib"))')"
hashes="$site/.clip-factory-session-start.sha256"
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  UV="$(command -v uv || echo /root/.local/bin/uv)"
  if "$UV" pip install -q --python "$PY" -r twitch-clips/requirements-extra.txt; then
    sha256sum .claude/hooks/session-start.sh twitch-clips/requirements-extra.txt > "$hashes" || rm -f "$hashes"
  else
    echo "session-start: dependency install failed" >&2
  fi
fi

# Start / resume the clip factory (single instance: start.sh is safe to run twice)
twitch-clips/start.sh > /dev/null 2>&1 || echo "session-start: start.sh failed" >&2
exit 0
