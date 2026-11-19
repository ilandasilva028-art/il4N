#!/usr/bin/env bash
# Installation sur Mac (Intel ou Apple Silicon) ou Linux. Idempotent : peut être relancé sans risque.
set -uo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
say() { printf "\n\033[1;35m▶ %s\033[0m\n" "$1"; }

if [ "$(uname)" = "Darwin" ]; then
  if ! command -v brew >/dev/null; then
    echo "Homebrew est nécessaire : https://brew.sh (copiez la commande d'installation dans le Terminal), puis relancez."; exit 1
  fi
  for t in ffmpeg node python@3.11; do
    brew list "$t" >/dev/null 2>&1 || { say "Installation de $t (Homebrew)"; brew install "$t" || exit 1; }
  done
  PYBASE="$(brew --prefix python@3.11)/bin/python3.11"
else
  command -v ffmpeg >/dev/null || { echo "ffmpeg manquant : sudo apt install ffmpeg"; exit 1; }
  command -v node >/dev/null || { echo "Node.js 20+ manquant : https://nodejs.org"; exit 1; }
  PYBASE="$(command -v python3.11 || command -v python3)"
fi

source "$D/pyfind.sh"
if [ "$PY" = "python3" ]; then
  say "Création de l'environnement Python (.venv)"
  "$PYBASE" -m venv "$D/.venv" || exit 1
  PY="$D/.venv/bin/python"
fi
say "Dépendances Python"
"$PY" -m pip install -q --upgrade pip
"$PY" -m pip install -q streamlink faster-whisper -r "$D/requirements-extra.txt" || exit 1
# torch/transformers : détecteur de rires + traduction EN→FR. Facultatif (le reste fonctionne sans).
if ! "$PY" -c "import torch, transformers" 2>/dev/null; then
  say "Modèles facultatifs (rires, traduction) — peut prendre quelques minutes"
  if [ "$(uname)-$(uname -m)" = "Darwin-x86_64" ]; then
    "$PY" -m pip install -q "torch==2.2.2" "numpy<2" transformers sentencepiece || echo "  (facultatif) installation échouée : rires/traduction désactivés"
  else
    "$PY" -m pip install -q torch transformers sentencepiece --extra-index-url https://download.pytorch.org/whl/cpu || echo "  (facultatif) installation échouée : rires/traduction désactivés"
  fi
fi
say "Tableau de bord (npm + build)"
cd "$D/studio-web" && npm install --no-audit --no-fund --loglevel=error && NEXT_TELEMETRY_DISABLED=1 npx next build >/dev/null || exit 1
touch "$D/output/.installed" 2>/dev/null || { mkdir -p "$D/output"; touch "$D/output/.installed"; }
say "Installation terminée"
