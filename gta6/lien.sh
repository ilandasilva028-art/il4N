#!/usr/bin/env bash
# lien.sh : un lien de TA vidéo (YouTube, TikTok…) -> clips TikTok à valider.
#   ./lien.sh https://www.youtube.com/watch?v=XXXX            (mode normal)
#   ./lien.sh https://www.youtube.com/watch?v=XXXX plans      (beaux plans en musique)
# Télécharge depuis TA connexion (marche là où les serveurs cloud sont bloqués),
# en 1080p max, puis lance make_tiktok.py. Résultat : ~/GTA6_TikTok/a_valider/<nom>/
# UNIQUEMENT pour tes propres vidéos.
set -e
cd "$(dirname "$0")"
URL="$1"
MODE="${2:-auto}"
if [ -z "$URL" ]; then
  echo "Usage : ./lien.sh <lien de ta vidéo> [plans]"; exit 1
fi

read -r -p "C'est bien TA vidéo (ta chaîne, ta capture) ? [o/N] " OK
case "$OK" in o|O|oui|OUI) ;; *) echo "Annulé : uniquement tes propres vidéos."; exit 1 ;; esac

PY=./.venv/bin/python
[ -x "$PY" ] || { echo "Lance d'abord ./install.sh"; exit 1; }
"$PY" -m pip install -q --upgrade yt-dlp

ROOT="${GTA6_DIR:-$HOME/GTA6_TikTok}"
DL="$ROOT/telechargements"
mkdir -p "$DL" "$ROOT/a_valider"

echo "Téléchargement…"
FILE=$("$PY" -m yt_dlp --no-playlist --no-progress \
  -f 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/b' \
  --merge-output-format mp4 --restrict-filenames \
  -o "$DL/%(title).60s_%(id)s.%(ext)s" --print after_move:filepath "$URL" | tail -1)
[ -f "$FILE" ] || { echo "Échec du téléchargement."; exit 1; }
echo "OK : $FILE"

ARGS=("$FILE" --out "$ROOT/a_valider")
[ "$MODE" = "plans" ] && ARGS+=(--mode plans)
"$PY" make_tiktok.py "${ARGS[@]}"

NAME=$(basename "$FILE" .mp4)
echo
echo "Clips prêts : $ROOT/a_valider/"
echo "Pour des clips plus fins (plusieurs formats, A/B) : envoie le rapport *_rapport.md à Claude."
open "$ROOT/a_valider" 2>/dev/null || true
