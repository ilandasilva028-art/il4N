# Routine : 1 reel IL4N par jour (livré vers 13h, heure de Paris)

Lis d'abord `docs/REFERENCE-REEL.md` (le modèle validé) et `reel/` (le film de référence).

## 1. Thème du jour
Numéro du jour dans l'année modulo 14 → ligne ci-dessous. Si `reels/` contient déjà ce thème
récemment, prends le suivant. Chaque thème = une accroche + 3-4 idées + CTA.

| # | Thème | Accroche (point de départ, à améliorer) |
|---|-------|------------------------------------------|
| 0 | Le service complet A → Z | « Votre site web, de A à Z. » |
| 1 | Pas de site = clients perdus | « Pas de site ? Vos clients vont ailleurs. » |
| 2 | La gestion, zéro souci | « Votre site… sans jamais y toucher. » |
| 3 | Visible sur Google | « On vous cherche sur Google. On vous trouve ? » |
| 4 | Parfait sur mobile | « Votre site sur téléphone, il ressemble à quoi ? » |
| 5 | Les étapes, simplement | « Un site pro en quatre étapes. » |
| 6 | Avant / après (vieux site) | « Votre site a dix ans ? Ça se voit. » |
| 7 | Commerce local (Vaucluse) | « Commerçants du Vaucluse, ce message est pour vous. » |
| 8 | Questions fréquentes | « La question qu'on me pose tout le temps. » |
| 9 | Vitrine ouverte 24h/24 | « Votre boutique ferme. Votre site, jamais. » |
| 10 | Image de marque | « Faites bonne impression, dès le premier clic. » |
| 11 | Mises à jour & sécurité | « Un site oublié, c'est un site qui coule. » |
| 12 | Témoignage du studio (son propre site) | « Ce site, je l'ai fait. Le vôtre, c'est quand ? » |
| 13 | Appel direct | « Vous avez une idée ? Parlons-en. » |

Règles de contenu : aucun faux client, faux avis, faux chiffre, faux prix. Les seules réalisations
montrables sont celles du site il4nstudio.netlify.app (captures dans `reel/assets/shots/`).

## 2. Production (dossier `reels/AAAA-MM-JJ/`)
1. `node <skill motion-reel>/scripts/scaffold.mjs reels/AAAA-MM-JJ --title "..." --duration 15 --formats 9x16`
   puis copier `reel/index.html`, `reel/fonts/`, `reel/assets/` et partir de `reel/film.js`
   (garder les helpers, la charte, les transitions ; changer les scènes et les textes).
2. Musique : `beats.py --synth --flavor house --bpm 128 --mode minor --tonic <varier> --drop 2
   --seed <jour>` (varier la tonalité/graine pour ne pas répéter la même boucle).
3. Texte voix ≤ 32 mots, oral, punchy. Voix : `voix/ref.wav`, Chatterbox multilingue,
   texte entier d'une traite, 3 graines, `exaggeration 0.8`, `cfg_weight 0.3`, vérif Whisper,
   régénérer seulement la phrase fautive. Montage avec un `audio/vo_edit.py` adapté de `reel/`.
4. Critique : planches contact + téléphone, au moins 2 tours, corriger les 3 pires défauts.
5. `sfx.mjs`, `render.mjs --video-only`, `mix.mjs --music-db -4 --sfx-db -2 --vo-db 4`, `render.mjs --poster`, vérif ffprobe +
   transcription Whisper du mix.

## 3. Livraison
- Envoyer `out/reels/AAAA-MM-JJ/final.mp4` + `poster.png` au client (SendUserFile, status proactive)
  avec : le thème, l'accroche, le texte de la voix, une légende Facebook prête à coller
  (2-3 lignes + 3-5 hashtags locaux), et ce qui pourrait être amélioré.
- Commit sur la branche de travail et push.
- Ne rien publier sur les réseaux sans accord explicite du client.

## Environnement nécessaire
- Hôtes autorisés : il4nstudio.netlify.app, huggingface.co + CDN hf, download(-r2).pytorch.org.
- Python 3.11 venv `/home/user/tts-env` : torch/torchaudio 2.6.0+cpu, chatterbox-tts,
  faster-whisper, setuptools<81 (installé par le script de démarrage de l'environnement « il4n »).
