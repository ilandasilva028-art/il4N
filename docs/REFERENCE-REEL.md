# Reel de référence IL4N — « Votre site web, de A à Z »

Validé par le client le 10/11/2026 (« parfait, le montage j'aime trop »). Toute nouvelle vidéo
reprend cette recette. Source : `reel/` (film.js, audio/vo_edit.py, docs/shotlist.md).
Rendu : `out/reel/final.mp4` (non versionné, se régénère).

## Ce qui marche (à garder)
- **Format** : 9:16, 1080×1920, 60 i/s, ~15-17 s, musique house synthétisée 128 bpm, drop au beat 8.
- **Charte du site** il4nstudio.netlify.app : nuit `#111018` / `#1b1825`, papier `#f4f0e8`,
  blanc `#fffdf8`, **or `#d6a96a` = seul accent**, vert `#3f8a62` réservé à « En ligne ».
  Polices : Inter (900 titres, 500-700 UI) + Gelasio italique (= Georgia du site) pour le mot doré.
- **Structure** (beats) : accroche typo 0-4 → téléphone qui défile le vrai site 4-8 →
  DROP plan fort 8-12 → plans « lettre + phrase dorée » toutes les ~4 beats (A / W / L / Z) →
  carte de fin 29-36 avec pastille or « Écrivez-moi en privé ↗ » (tenue ≥ 1,5 s après la voix).
- **Transitions motivées** : whip vertical (titre sort, téléphone monte), whip horizontal,
  plongée dans une carte, morph navigateur → navigateur, volet papier, papier → pastille CTA.
- **Chaque accent visuel a son son** (liste HITS dans film.js → sfx.mjs), mix -14 LUFS.
- **Uniquement de vraies captures** du site ; badge « Powered by Netlify » toujours recadré.
  Mention « EXEMPLE : MON PROPRE SITE ».

## Voix off (clone Chatterbox de la voix du client)
- Référence : `voix/ref.wav` (12 s extraites de `voix/ma-voix.m4a`, voix du client, avec son accord,
  réservée à ses propres vidéos).
- **Toujours générer le texte entier d'une traite** (intonation continue), puis couper aux pauses.
  Phrase par phrase = voix saccadée (retour client).
- Réglages dynamiques : `exaggeration=0.8, cfg_weight=0.3`, 3 graines par texte.
- **Vérifier chaque prise avec Whisper** (faster-whisper small, mots horodatés) : la transcription doit
  correspondre mot pour mot. Les lettres (« A à Z ») et les débuts en voyelle (« Écrivez ») ratent
  souvent → régénérer seulement la phrase fautive, garder la meilleure.
- Couper les queues parasites après la dernière syllabe (bruit à -30 dB après un blanc).
- Traitement : passe-haut 90 Hz, +3 dB à 3,2 kHz, -2 dB à 220 Hz, compresseur 3,5:1, limiteur.
- Mix : `mix.mjs <film> --music-db -4 --sfx-db -2 --vo-db 4` (voix devant la musique, vérifié Whisper).
- Pour le réalisme : phrases courtes et orales, ponctuation expressive (« ! », « … »), ≤ 32 mots
  pour 15 s, jamais de chiffres écrits (les écrire en lettres), noms propres testés à l'oreille (Whisper).

## Accroche (à améliorer à chaque vidéo)
Les 1,5 premières secondes décident de tout. Règles :
1. Commencer **en mouvement à l'image 0** (pas de fondu), mot qui claque sur le beat 0.
2. Parler à un problème ou une envie précise du commerçant, en ≤ 7 mots.
3. Une seule idée, lisible sur téléphone à bout de bras.
Pistes testées / à tester :
- « Votre site web, de A à Z. » (référence)
- « Pas de site ? Vous perdez des clients. »
- « Votre site… sans rien gérer. »
- « Combien de clients vous cherchent sur Google ? »
- « Un site pro, sans prise de tête. »
- « Votre vitrine ouverte 24h sur 24. »
- « Fini le site jamais mis à jour. »

## Images
Si un plan a besoin d'une image qui n'existe pas : la **dessiner en code** (typo, formes, icônes
vectorielles, compteurs, cartes de couleurs de la charte) — jamais un faux écran de site présenté
comme réel, jamais un faux client, faux avis ou faux chiffre.

## Contrôle qualité avant livraison
Planche contact (1 image par beat) + planche « téléphone » demi-taille : tout texte lisible,
rien d'important dans les 250 px du haut ni les 430 px du bas (interface story), un événement
nouveau toutes les 2-4 s, transcription Whisper du mix = texte exact, mix -14 LUFS / -1 dBTP,
ffprobe : 1080×1920, 60 i/s, yuv420p, audio présent.
