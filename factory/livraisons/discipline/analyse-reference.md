# Fiche d'analyse — source.mp4

Analysé le 16/11/2026 17:10:01 en 99.6 s. Toutes les valeurs ci-dessous sont **mesurées** dans le fichier, sauf mention « estimation ».

## 1. Technique

| Élément | Valeur |
|---|---|
| Résolution | 1080×1814 (540:907, vertical) |
| Images/s | 60 (nominal 60) |
| Durée | 100.23 s |
| Codec vidéo | h264 (High), yuvj420p |
| Débit | vidéo 3957 kb/s · total 4099 kb/s |
| Audio | aac 44100 Hz, 2 canal(aux), 130 kb/s |

## 2. Image et réalisation

- **Ambiance** : image sombre (low-key) · contraste modéré · couleurs désaturées · balance neutre.
- **Luminosité moyenne** 27.8/255 · **contraste** (écart-type) 40.6 · **saturation** 10.9 % · noirs écrasés 70.8 % · blancs brûlés 2.2 %.
- **Palette dominante** : `#080508` noir (71.2 %), `#2f2e2f` gris foncé (19.7 %), `#757475` gris (4.7 %), `#eae8ea` gris clair (3.7 %).
- **Cohérence lumineuse entre plans** : variation de luminosité 25.8 (plus c'est bas, plus l'étalonnage est homogène).
- **Netteté** (variance du laplacien à 540 px) : moyenne 376, minimum 13 · densité de contours 4.8 %.
- **Mouvement** (estimation) : énergie moyenne 9.6, plans statiques 16.4 % du temps, mouvement dominant : panoramiques horizontaux.
  - zoom avant 0.2 % · zoom arrière 0.4 % · pano gauche/droite 5.6/4.3 % · vertical haut/bas 2.7/2 % · secousses 0.4 %
  - _Estimation par recherche de translation/zoom global sur images 96 px à 10 i/s : indicative, ne distingue pas un vrai mouvement de caméra d’un défilement d’écran ou d’une animation plein cadre._

## 3. Montage

- **45 plans** : 33 coupe(s) franche(s) + 11 transition(s) animée(s) (whip, fondu, volet…), soit 26.34 changements de plan/min.
- Durée des plans : moyenne 2.23 s, médiane 0.78 s, min 0.21 s, max 19.4 s.
- Premier changement de plan : 11.6 s · changements dans les 3 premières secondes : 0.
- Coupes calées sur une attaque audio (±70 ms) : 27.3 %.
- Défauts : 0 passage(s) noir(s), 1 passage(s) figé(s) ≥ 0,6 s (37.12-37.77 s — peut être volontaire sur un plan texte).

| Plan | Début | Fin | Durée |
|---|---|---|---|
| 1 | 0 | 11.6 | 11.6 |
| 2 | 11.6 | 12.93 | 1.33 |
| 3 | 12.93 | 13.37 | 0.44 |
| 4 | 13.37 | 13.87 | 0.5 |
| 5 | 13.87 | 14.37 | 0.5 |
| 6 | 14.37 | 14.87 | 0.5 |
| 7 | 14.87 | 15.27 | 0.4 |
| 8 | 15.27 | 15.48 | 0.21 |
| 9 | 15.48 | 15.77 | 0.29 |
| 10 | 15.77 | 16.6 | 0.83 |
| 11 | 16.6 | 25.9 | 9.3 |
| 12 | 25.9 | 31 | 5.1 |
| 13 | 31 | 33.55 | 2.55 |
| 14 | 33.55 | 34.33 | 0.78 |
| 15 | 34.33 | 34.95 | 0.62 |
| 16 | 34.95 | 35.68 | 0.73 |
| 17 | 35.68 | 36.7 | 1.02 |
| 18 | 36.7 | 56.1 | 19.4 |
| 19 | 56.1 | 56.88 | 0.78 |
| 20 | 56.88 | 58.5 | 1.62 |
| 21 | 58.5 | 63.2 | 4.7 |
| 22 | 63.2 | 68.8 | 5.6 |
| 23 | 68.8 | 72.37 | 3.57 |
| 24 | 72.37 | 73.9 | 1.53 |
| 25 | 73.9 | 75.13 | 1.23 |
| 26 | 75.13 | 76.9 | 1.77 |
| 27 | 76.9 | 78.67 | 1.77 |
| 28 | 78.67 | 79.03 | 0.36 |
| 29 | 79.03 | 79.37 | 0.34 |
| 30 | 79.37 | 79.77 | 0.4 |
| 31 | 79.77 | 80.23 | 0.46 |
| 32 | 80.23 | 80.87 | 0.64 |
| 33 | 80.87 | 81.33 | 0.46 |
| 34 | 81.33 | 81.77 | 0.44 |
| 35 | 81.77 | 82.37 | 0.6 |
| 36 | 82.37 | 82.67 | 0.3 |
| 37 | 82.67 | 82.97 | 0.3 |
| 38 | 82.97 | 83.3 | 0.33 |
| 39 | 83.3 | 83.83 | 0.53 |
| 40 | 83.83 | 87.83 | 4 |
| 41 | 87.83 | 88.13 | 0.3 |
| 42 | 88.13 | 89.97 | 1.84 |
| 43 | 89.97 | 95.87 | 5.9 |
| 44 | 95.87 | 98.7 | 2.83 |
| 45 | 98.7 | 100.23 | 1.53 |

## 4. Audio

- **Loudness intégrée** -10.3 LUFS (cible TikTok courante ≈ −14) · **plage** 5.1 LU · **crête vraie** 1.3 dBTP.
- Silences (< −40 dB, ≥ 0,3 s) : 0 % du temps · silence d'ouverture 0.00 s.
- Tempo estimé : 98.7 BPM (confiance 1) · 1.91 attaques/s.
- Équilibre spectral : graves 64.6 % · médiums 31.3 % · aigus 4.1 %.
- Hauteur de voix (estimation) : médiane 119 Hz (p10 79 / p90 400) — _Hauteur estimée sur tout le mixage (musique comprise) : indicative pour la voix seulement si la musique est discrète._
- Dynamique (p95 − p10 des niveaux) : 8.9 dB.

## 5. Voix et texte

- Transcription (small, langue fr) : 0 mots, **n/d mots/min** sur le temps parlé.

> (aucune parole)

## 6. Potentiel TikTok (indicateurs structurels)

**Accroche (0-3 s)** : « — »
- Aucune parole détectée : accroche purement visuelle/musicale.
- Aucune coupe dans les 3 premières secondes : l’accroche repose sur un seul plan (mouvement interne ou texte).
- Ouverture plus animée que la moyenne (×1.11).

**Progression** (par tiers) :

| Tiers | Coupes | Mots | Mouvement | Niveau audio |
|---|---|---|---|---|
| 1 (0-33.41 s) | 12 | 0 | 8.9 | -10.2 dB |
| 2 (33.41-66.82 s) | 9 | 0 | 6.1 | -12.2 dB |
| 3 (66.82-100.23 s) | 23 | 0 | 13.9 | -7.2 dB |

**Moments forts** : 79 s (coupe) · 80.9 s (coupe) · 83.3 s (coupe) · 90 s (coupe)

**Fin** : « — » · appel à l'action détecté : aucun · similarité première/dernière image 0.85 → pas de boucle visuelle.

## 7. Non mesuré automatiquement (à juger à l’œil)

- Émotion, ton et intention de la voix : non mesurables automatiquement (seuls débit, hauteur estimée et pauses sont mesurés).
- Séparation voix / musique / effets : pas de modèle de séparation installé (trop lourd pour 8 Go) ; volumes estimés sur le mixage complet.
- Texte à l’écran et sous-titres (contenu, police, animation) : pas d’OCR installé — à lire sur la planche contact et les images clés.
- Profondeur de champ, qualité des animations, style d’illustration : jugement visuel à faire sur la planche contact.
- Potentiel de partage / revisionnage : aucune donnée d’audience ; seuls des indicateurs structurels (accroche, rythme, boucle, appel à l’action) sont calculés.

## Fichiers

- Planche contact : `contact.jpg`
- Images clés : `keyframes/` (45)
- Données complètes : `analysis.json`
