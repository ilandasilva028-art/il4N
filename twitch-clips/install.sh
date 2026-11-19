#!/usr/bin/env bash
# Installation (Linux serveur ou Mac). Python 3.10+, Node 20+, ffmpeg requis.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
PY="${SUB_PYTHON:-/home/user/tts-env/bin/python}"
if [ ! -x "$PY" ]; then                      # machine sans l'environnement cloud : venv local
  python3 -m venv "$D/.venv"; PY="$D/.venv/bin/python"
  "$PY" -m pip install -q --upgrade pip
  "$PY" -m pip install -q faster-whisper transformers sentencepiece torch --extra-index-url https://download.pytorch.org/whl/cpu
fi
"$PY" -m pip install -q streamlink -r "$D/requirements-extra.txt" 2>/dev/null || uv pip install -q --python "$PY" streamlink -r "$D/requirements-extra.txt"
command -v ffmpeg >/dev/null || { echo "ffmpeg manquant : installez-le (apt install ffmpeg / brew install ffmpeg)"; exit 1; }
cd "$D/studio-web" && npm install --no-audit --no-fund && NEXT_TELEMETRY_DISABLED=1 npx next build
echo "Installation terminée. Démarrage : ./start_all.sh"
