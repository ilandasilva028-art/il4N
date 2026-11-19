#!/usr/bin/env bash
# Installe tout ce qu'il faut pour make_tiktok.py (Mac ou Linux).
#   cd gta6 && ./install.sh
set -e
cd "$(dirname "$0")"

if [[ "$(uname)" == "Darwin" ]]; then
  if ! command -v brew >/dev/null; then
    echo "Homebrew manque : https://brew.sh (copier la commande d'installation dans le Terminal)"; exit 1
  fi
  command -v ffmpeg >/dev/null || brew install ffmpeg
  command -v python3 >/dev/null || brew install python
else
  if ! command -v ffmpeg >/dev/null; then sudo apt-get update && sudo apt-get install -y ffmpeg python3-venv; fi
fi

python3 -m venv .venv
./.venv/bin/pip install -q --upgrade pip
./.venv/bin/pip install -q -r requirements.txt

echo "Téléchargement du modèle Whisper (≈ 500 Mo, une seule fois)…"
echo "(la voix off Kokoro, ≈ 350 Mo, se télécharge au premier --voix)"
./.venv/bin/python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')"

if [[ "$1" == "--chatterbox" ]]; then
  echo "Voix Chatterbox (plus expressive, ≈ 3 Go) dans .venv-chatterbox…"
  python3 -m venv .venv-chatterbox
  ./.venv-chatterbox/bin/pip install -q --upgrade pip
  ./.venv-chatterbox/bin/pip install -q chatterbox-tts
fi

mkdir -p ~/GTA6_TikTok/{a_traiter,a_valider,valide,sources,erreurs}
./.venv/bin/python make_tiktok.py --doctor
cat <<EOF

Prêt. Utilisation :
  ./.venv/bin/python make_tiktok.py ~/Movies/capture.mp4
  ./.venv/bin/python watch.py        # surveille ~/GTA6_TikTok/a_traiter
EOF
