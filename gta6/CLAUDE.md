# GTA 6 → TikTok : fiche de démarrage (pour Claude)

Lire `PREFERENCES.md` avant tout clip (règles, goûts d'Ilan, checklist, formats, textes déjà utilisés).

## Règles
- Sources : **uniquement les captures d'Ilan**. Jamais de vidéo d'un tiers. YouTube et Drive sont bloqués dans le cloud : Ilan envoie le fichier dans le chat (< 25 Mo par morceau) ou utilise `lien.sh` sur son Mac.
- Rien n'est publié sans la validation d'Ilan.
- Réponses à Ilan : style court, « homme des cavernes ». Légendes et textes à publier : normaux.
- Sous-titres français relus à la main (traduction faite par Claude depuis Whisper).

## Méthode pour une nouvelle capture
1. `ffprobe`, puis planche d'images (1 image / 2-4 s, avec le temps affiché) et transcription :
   `make_tiktok.py capture.mp4 --analyse-only` (transcription en cache dans `sorties/.cache/`).
2. Repérer : interface du jeu (sous-titres en bas → `--crop-bottom`, boussole en haut → `--crop-top`), menus, fondus, génériques.
3. Choisir **plusieurs clips de formats différents** (comédie, romance, mème, satisfaisant, beaux plans : voir PREFERENCES).
4. Écrire les `.srt` français (temps de la source), puis rendre avec `--segments "a-b:full:slow,…"`, `--hook`, `--rehook`, `--cta`.
5. Vérifier : planche, section « Rétention » du rapport tout en ✅, lisibilité de l'accroche (≤ 20 caractères pour la 2ᵉ ligne).
6. Archiver commande + .srt dans `clips/<nom>/`, ajouter le clip au tableau de PREFERENCES, commit + push.
7. Envoyer les MP4 à Ilan avec légendes et hashtags.

## Skills utiles (déjà actifs)
`social-media-skills:hook-writer`, `tiktok-growth`, `captions-and-clipping`, `short-form-video-script` : pour les accroches, légendes, scripts de voix off.

## Qualité
Plein écran net seulement avec une source ≥ 1080p. Sources 720p : `:full` = cadre 4:5. Toujours comparer avant/après sur une image zoomée avant de dire que la qualité est bonne.

## Fichiers
- `make_tiktok.py` : l'outil (découpe, effets, textes, sons, son -14 LUFS, rapport).
- `plans.py` : mode `--mode plans` (beaux plans, génériques écartés par OCR).
- `ab_hooks.py` : deux accroches pour un test A/B.
- `traversee.py` : vidéo « combien de temps pour traverser la carte » avec les vrais temps d'Ilan (`clips/traversee/`).
- `voix.py` : voix off française (Kokoro ff_siwis par défaut, Piper en secours ; voix SIWIS CC-BY 4.0 → créditer). Vérifier chaque narration en la relisant avec Whisper dans le mix final.
- `assemble.py` : un clip à partir de plusieurs captures (plan JSON, étiquettes numérotées, musique).
- `watch.py` : dossier « à traiter » sur le Mac. `lien.sh` : lien de sa vidéo → clips (Mac).
- `tests/test_rapide.sh` : **à lancer après toute modification du code**.
- `clips/` : réglages et sous-titres de chaque clip déjà livré.
