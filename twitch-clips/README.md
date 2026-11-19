# Clip Factory 2.0 — Twitch / YouTube → TikTok

Repère les moments drôles, étranges ou surprenants et produit des TikTok 9:16 prêts à poster
(accroche, sous-titres FR, description), **sans jamais rien publier**.

## Démarrer
```bash
cd twitch-clips
./start.sh                                   # lance (ou relance après un redémarrage) tout le système
/home/user/tts-env/bin/python healthcheck.py # état : workers, buffers, clips par état, erreurs
/home/user/tts-env/bin/python delivery/deliver.py pending        # clips prêts non livrés
/home/user/tts-env/bin/python delivery/deliver.py mark-sent 12   # marquer le clip 12 comme livré
```
Vidéo à toi ou autorisée (ex. YouTube que tu possèdes) :
```bash
/home/user/tts-env/bin/python main.py local video.mp4 --creator nom --rights owned --url https://... --max 5
```
Tests (sans live) : `CLIP_OUT=/tmp/cliptest /home/user/tts-env/bin/python tests/run_tests.py`

## Droits (config.yaml)
| rights | Ce que fait le système |
|---|---|
| `discovered` | lit seulement le chat, enregistre le moment (lien + heure) dans la base. **Aucun téléchargement.** |
| `authorized` | tu as l'accord du créateur : enregistrement, découpe, rendu. |
| `owned` | ton contenu : idem. |

Un crédit ne remplace pas une autorisation. Par défaut les 3 chaînes sont en `discovered`.

## Pipeline
`watch` (1 par chaîne) → chat : rires / surprise / fail / volume, comparés à la base de la chaîne →
`CANDIDATE` → fenêtre vidéo copiée du buffer circulaire (sans réencodage) → `process` (un seul job lourd à
la fois) : audio léger (volume, pics, silence→cri) + modèle de rire AST **uniquement sur la fenêtre** +
Whisper **une seule fois** → score 0-100 (heuristique, pas une probabilité) → découpe 15-35 s sur les
phrases → rendu 1080×1920 avec sous-titres mot à mot + accroche → validation ffprobe + décodage →
`output/ready/<id>_<créateur>_<date>/` = `clip_final.mp4`, `description_tiktok.txt`, `metadata.json`.

États SQLite (`output/state.db`) : DISCOVERED → CANDIDATE → ANALYZED → RENDERING → VALIDATED → READY → SENT
(+ REJECTED, FAILED). Écritures en `.part` puis renommage atomique ; `recover.py` (lancé à chaque démarrage)
supprime les fichiers partiels et reprend les rendus interrompus. Un clip SENT n'est jamais renvoyé.

## Fichiers
- `main.py` (watch / process / local), `supervisor.py`, `recover.py`, `healthcheck.py`, `start.sh`, `config.yaml`
- `sources/` twitch_live (statut, enregistreur, chat), twitch_clips (API Helix), youtube_source (API Data v3)
- `detection/` chat_detector, audio_detector, transcript_detector, viral_scorer
- `editing/` smart_cut, layout_detector, subtitles, hook_generator, caption_generator, render
- `delivery/` validate, deliver — `database/state.py`
- Anciens scripts conservés (remplacés par le pipeline ci-dessus) : hype_watch.py, laughchat_forever.sh,
  watch_forever.sh, laugh_watch.py, laugh_forever.sh, make_clip.py, subtitle_fr.py, analyze.py, record.sh

## Limites connues
- Conteneur cloud éphémère : tout s'arrête à chaque redémarrage → relancer `./start.sh`.
  Pour du 24 h/24 : machine permanente + `@reboot cd …/twitch-clips && ./start.sh` (cron) ou un service systemd.
- Proxy : chaque nouveau serveur vidéo Twitch `*.j.cloudfront.hls.ttvnw.net` doit être autorisé.
- API Twitch Helix (clips existants) : nécessite TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET + hôtes id/api.twitch.tv.
- API YouTube : nécessite YOUTUBE_API_KEY + hôte www.googleapis.com. Découverte uniquement, aucun téléchargement.
- Mise en page `cam` (webcam en haut) seulement si `cam_box` est renseigné ; sinon fond flouté (sûr).
