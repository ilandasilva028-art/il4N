# Clip Factory — contexte complet pour une autre IA (ChatGPT, Claude…)

Dépôt GitHub `ilandasilva028-art/il4N`, branche `claude/pensive-maxwell-nxlmw9`, dossier `twitch-clips/`.
À jour au 20/11/2026. Lis aussi `README.md` (commandes) et `DEMARRAGE.md` / `deploy/GUIDE_ORACLE.md`.

## 1. L'utilisateur et son objectif
- Francophone, **clippeur autorisé** pour les streamers Twitch **Anyme (anyme023), Squeezie, Michou, JL Tomy (jltomy)**.
- Il veut : repérer automatiquement les moments **drôles, surprenants ou étranges** des lives, les transformer en
  **TikTok prêts à poster** (9:16, accroche, sous-titres FR, description), et les recevoir pour validation.
- Préférences : réponses **courtes en français**, descriptions **TikTok uniquement** (1 phrase d'accroche spécifique
  + `Crédit : @chaine` + **exactement 5 hashtags**), toujours créditer, **jamais de publication automatique**,
  budget **0 €**, pas d'API payante, ne jamais inventer de données ni de citations.
- Matériel : Mac Intel 8 Go + iPhone. Le système tourne aujourd'hui dans un conteneur cloud Linux (4 CPU, 15 Go,
  sans GPU) qui **s'endort quand la conversation est inactive** ⇒ pas de surveillance 24 h/24 tant qu'il n'est pas
  installé sur un serveur permanent (guide Oracle Cloud gratuit fourni, pas encore fait par l'utilisateur).

## 2. Architecture
```
Twitch (streamlink + chat IRC) ─► main.py watch <chaîne>  ─► SQLite output/state.db ◄─ api/server.py (FastAPI :8000)
                                   main.py process (1 job lourd à la fois)                ▲
                                   supervisor.py (relance tout, relit config.yaml)      studio-web (Next.js :3000)
```
- **Moteur** (Python, env `/home/user/tts-env/bin/python` ou `.venv`) :
  - `sources/twitch_live.py` : statut live, enregistrement en tampon circulaire (segments TS de 30 s, 20 min, sans réencodage), chat anonyme.
  - `detection/chat_detector.py` : pics de rires / surprise / fail / volume, comparés à la base de chaque chaîne.
  - `detection/audio_detector.py` (volume, pics, modèle de rire AST **seulement sur les fenêtres candidates**),
    `transcript_detector.py` (faster-whisper small, transcrit **une fois**), `visual_detector.py` (webcam via YuNet, coupes de scène),
    `viral_scorer.py` (score 0-100 heuristique ; seuils 80 prioritaire / 65 à examiner).
  - `editing/` : `smart_cut.py` (15-35 s calés sur les phrases, décalage du chat), `layout_detector.py` (webcam en haut + jeu, sinon fond flouté),
    `subtitles.py` (mot à mot, 2 lignes max), `hook_generator.py`, `caption_generator.py`, `render.py` (FFmpeg 1080×1920, progression, annulation).
  - `delivery/validate.py` (ffprobe + décodage), `deliver.py` ; `recover.py` (reprise après crash) ; `healthcheck.py`.
  - `sources/vod_backfill.py` : récupère un moment repéré **dans la rediffusion** (segments HLS téléchargés en Python via le proxy).
  - États SQLite : DISCOVERED → CANDIDATE → ANALYZED → RENDERING → VALIDATED → READY → SENT (+ REJECTED, FAILED). Écritures atomiques (`.part`).
- **API** `api/server.py` (docs `/api/docs`) : chaînes, clips, rendu studio, file, vidéos prêtes, stats, réglages, import, SSE `/api/stream`.
  Jeton `DASHBOARD_TOKEN` obligatoire en accès distant. Aucune route de publication. Export MP4 seulement si droits établis **et** clip accepté.
- **Tableau de bord** `studio-web/` (Next.js 15, Tailwind, 9 pages en français) : vue d'ensemble, surveillance Twitch, YouTube, clips, studio, production, prêtes, stats, paramètres.

## 3. Configuration actuelle (`config.yaml`)
- Chaînes : squeezie, anyme023, michou, jltomy — toutes `rights: authorized` (accord de clippeur déclaré par l'utilisateur).
  `discovered` = on lit seulement le chat, aucun téléchargement.
- Détection : ≥ 5 messages de rire/surprise en 10 s et ≥ 3× la base de la chaîne ; délai 90 s ; retard du chat 6 s.
- Les moments sans parole exploitable (stream endormi, hallucinations de Whisper) sont rejetés automatiquement.

## 4. Lancer
```bash
cd twitch-clips
./start_all.sh              # moteur + API + tableau de bord (DASHBOARD_TOKEN=… pour l'accès réseau/iPhone)
./stop_all.sh
"$PY" healthcheck.py        # état
"$PY" sources/vod_backfill.py <vod_id> <vod_start_unix> <clip_id>…   # rattrapage depuis une rediffusion publique
"$PY" delivery/deliver.py pending | mark-sent <ids>
```
Tests : `tests/run_tests.py` (moteur, 19/19), `tests/test_api.py` (API de bout en bout, 27/27).

## 5. Contraintes et pièges connus
- Proxy du conteneur : chaque nouveau serveur vidéo Twitch (`*.j.cloudfront.hls.ttvnw.net`, VOD `d*.cloudfront.net`) doit être autorisé dans l'environnement.
- **Rediffusions de Squeezie et JL Tomy : réservées aux abonnés** ⇒ impossible à récupérer sans compte abonné. Anyme et Michou : publiques.
- YouTube bloque le téléchargement depuis le cloud ; la recherche YouTube nécessite `YOUTUBE_API_KEY` (absente). Avatars Twitch : `TWITCH_CLIENT_ID/SECRET` (absents).
- Le score est souvent bas (30-60) sur de vrais moments : il sous-estime les discussions « Just Chatting ». Le bon tri reste la lecture de la transcription.
- Les sous-titres et citations viennent de Whisper : à relire (noms propres souvent mal transcrits).
- Ne pas envoyer : contenus haineux/offensants, sexuels explicites, ou sans parole.

## 6. Clips produits et envoyés (rediffusions du 19/11 au soir)
| # | Créateur | Heure | Sujet | Description proposée |
|---|---|---|---|---|
| 9 | Anyme | 20h54 | débat de taille (88/100) | Le débat qui a cassé le chat : Anyme jure qu'il fait 1,79 m, pas 1,82 📏😂 Vous lui donnez combien ? — #Anyme #Twitch #Mdr #Taille #Clip |
| 17 | Anyme | 21h01 | « grosse tête » | « T'as une bouche, on pourrait garer un véhicule le long » 💀 … — #Anyme #Twitch #Mdr #Clash #Clip |
| 19 | Anyme | 21h05 | commissariat | Anyme raconte le commissariat le plus improbable… 🚔😭 — #Anyme #Storytime #Twitch #Mdr #Clip |
| 22 | Anyme | 21h09 | Cyprien sur le live | « Que des W dans le chat pour Cyprien » 🫶 — #Anyme #Cyprien #Twitch #Collab #Clip |
| 24 | Anyme | 21h10 | surnom « sif » | Le chat surnomme Anyme « sif » depuis son épilation… 😭 — #Anyme #Twitch #Mdr #Epilation #Clip |
| 15 | Anyme | 20h58 | taille des streamers | … Squeezie et HugoDécrypte en prennent pour leur grade 😭📏 (transcription à vérifier) |
| 40 | Anyme | 22h39 | le gosse et la scène GTA 6 | « Je suis désolé que t'aies pu voir ça » 😭 — #Anyme #GTA6 #Twitch #Mdr #Storytime |
| 27 | Michou | 21h15 | Jason & Lucia virés du VIP | … et Michou commente tout 😂🍾 — #Michou #GTA6 #GTAVI #JasonEtLucia #Twitch |
| 18 | Michou | 21h04 | défilé de robes de Lucia | « Les trois robes, un 360, et je choisis » 👗 Team marron ou noir ? |
| 5 | Michou | 20h48 | rage, caisse démontée | (insulte forte dans le clip : à couper/bipper) |
| 33 | Michou | 21h26 | version pacifiste | « J'essaye de tuer le moins de monde possible » 😇🔫 |
Les vidéos sont dans `output/ready/<id>_<créateur>_<date>/` (`clip_final.mp4`, `description_tiktok.txt`, `metadata.json`) — pas sur GitHub.

## 7. Prochaines améliorations utiles
1. Installer sur un serveur permanent (Oracle Free, `deploy/setup_server.sh`) pour une surveillance 24 h/24.
2. Accès abonné (Squeezie, JL Tomy) pour rattraper leurs rediffusions, ou import manuel de leurs fichiers.
3. Recalibrer le score sur les clips acceptés/refusés par l'utilisateur (le tableau de bord enregistre ces décisions).
4. Génération des descriptions à partir de la transcription (aujourd'hui réécrites à la main : modèle local léger ou règles).
5. Bip automatique des insultes, recadrage webcam plus fin, sous-titres avec correction des noms propres.
