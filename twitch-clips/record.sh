#!/usr/bin/env bash
# Usage:
#   ./record.sh live <chaine>                       -> enregistre le live en cours
#   ./record.sh vod  <url_ou_id_vod> [debut] [duree] -> télécharge un VOD (ou un extrait)
#   ./record.sh cut  <fichier> <debut> <duree>       -> découpe un clip vertical 9:16
set -euo pipefail
OUT="$(dirname "$0")/output"; mkdir -p "$OUT"
case "${1:-}" in
  live) streamlink "twitch.tv/$2" best -o "$OUT/${2}_$(date +%Y%m%d_%H%M%S).mp4" ;;
  vod)  url="$2"; [[ "$url" =~ ^[0-9]+$ ]] && url="https://www.twitch.tv/videos/$url"
        args=(); [[ -n "${3:-}" ]] && args+=(--hls-start-offset "$3"); [[ -n "${4:-}" ]] && args+=(--stream-segmented-duration "$4")
        streamlink "${args[@]}" "$url" best -o "$OUT/vod_$(date +%Y%m%d_%H%M%S).mp4" ;;
  cut)  ffmpeg -ss "$3" -i "$2" -t "$4" -vf "crop=ih*9/16:ih,scale=1080:1920" -c:a copy "$OUT/clip_$(date +%H%M%S).mp4" ;;
  *) sed -n '2,5p' "$0"; exit 1 ;;
esac
