#!/usr/bin/env bash
# Test rapide de l'outil : vidéo de synthèse (aucune capture nécessaire), toutes les options
# principales, puis contrôle du résultat. À lancer après chaque modification de make_tiktok.py.
#   ./tests/test_rapide.sh
set -e
cd "$(dirname "$0")/.."
PY=python3; [ -x .venv/bin/python ] && PY=.venv/bin/python
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
echo "· vidéo de synthèse…"
ffmpeg -v error -y -f lavfi -i testsrc2=s=1280x720:r=30:d=12 -f lavfi -i mandelbrot=s=1280x720:r=30 \
  -f lavfi -i "sine=f=330:d=24" -filter_complex "[1]trim=0:12,setpts=PTS-STARTPTS[m];[0][m]concat=n=2:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset ultrafast -c:a aac -t 24 "$T/test.mp4"
echo "· montage (plein écran, accéléré, ralenti, relance, mème)…"
$PY make_tiktok.py "$T/test.mp4" --out "$T/out" --no-subs \
  --segments "13.0-14.5:full:slow,1.0-4.0,5.0-9.0:x2,15.0-17.0:full,18.0-23.0" \
  --hook "TEST DE L'OUTIL|ACCROCHE MOT PAR MOT" --title "GTA 6|TEST" --cta "ÇA MARCHE ?|OUI OU NON" \
  --rehook "ÇA RELANCE ?" > "$T/log.txt" 2>&1 || { cat "$T/log.txt"; exit 1; }
cp "$T/test.mp4" "$T/meme.mp4"
$PY make_tiktok.py "$T/meme.mp4" --out "$T/out" --no-subs --segments "2.0-6.0,14.0-18.0" \
  --meme "FORMAT MÈME|EN TEST" --cta "" --cta-dur 0 > "$T/log2.txt" 2>&1 || { cat "$T/log2.txt"; exit 1; }
F="$T/out/test/test_TikTok.mp4"
R=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$F")
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
[ "$R" = "1080,1920" ] || { echo "✗ format $R"; exit 1; }
grep -q "✓" "$T/log.txt" || { echo "✗ rendu"; cat "$T/log.txt"; exit 1; }
[ -f "$T/out/meme/meme_TikTok.mp4" ] || { echo "✗ format mème"; exit 1; }
grep -E "LUFS" "$T/out/test/test_rapport.md" | head -1
echo "✓ tout marche ($R, ${D%.*} s)"
