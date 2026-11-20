# Contrôle qualité — j20261120-diamant

**Score mesuré : 91.3 / 96** (95.1 %) · 4 points à évaluer par vous (non attribués).

> Score = estimation interne sur les seuls critères mesurables ; il ne garantit pas une qualité équivalente à la référence.

| Critère | Point de contrôle | Points | Mesure | Règle |
|---|---|---|---|---|
| Qualité visuelle | Résolution 1080×1920 | 5 / 5 | 1080×1920 | exactement 1080×1920 |
| Qualité visuelle | Netteté vs référence | 5 / 5 | 391 (réf. 376) | ≥ 60 % de la netteté de la référence |
| Qualité visuelle | Exposition vs référence | 5 / 5 | luminosité 34.8 (réf. 27.8) | écart ≤ 12/255 |
| Qualité visuelle | Contraste et saturation vs référence | 3.4 / 5 | contraste 39.8 / sat. 0.36 (réf. 40.6 / 0.109) | contraste ±8, saturation ±0,08 |
| Qualité visuelle | Pas d’image noire / figée > 1,2 s | 5 / 5 | 0 noir(s), 0 figé(s) > 1,2 s | aucun |
| Cohérence artistique | Palette proche de la référence | 10 / 10 | distance 2 | distance ≤ 8 (0 = identique) |
| Cohérence artistique | Homogénéité lumineuse entre plans | 5 / 5 | 14.5 (réf. 25.8) | ≤ référence + 5 |
| Montage et fluidité | Cadence ≥ 30 i/s constante | 3 / 3 | 60 i/s | ≥ 30 i/s |
| Montage et fluidité | Changements de plan/min vs référence | 4.6 / 6 | 14/min (réf. 26.34) | entre 70 % et 150 % de la référence |
| Montage et fluidité | Durée moyenne des plans vs référence | 2.8 / 3 | 3.75 s (réf. 2.23) | entre 60 % et 160 % |
| Montage et fluidité | Coupes calées sur la musique | 3 / 3 | 42.9 % (réf. 27.3 %) | ≥ max(40 %, référence) |
| Audio et voix | Loudness -16 LUFS ±1 | 5 / 5 | -16.4 LUFS | -17 à -15 LUFS |
| Audio et voix | Crête vraie ≤ −1 dBTP | 3 / 3 | -2.9 dBTP | ≤ −1 dBTP |
| Audio et voix | Bruitages réguliers (sans musique) | 4 / 4 | 2.27 attaques/s | ≥ 0,67 attaque/s |
| Audio et voix | Pas de voix (comme la référence) | 3 / 3 | aucune voix (Whisper) | aucune voix attendue |
| Narration et accroche | Ouverture au moins aussi animée que le reste | 2.9 / 4 | ×0.72 | ≥ ×1,0 |
| Narration et accroche | Accroche ≤ 6 mots dans la 1,5 s | 2 / 2 | 5 mots | ≤ 6 mots |
| Narration et accroche | Durée proche de la cible | 2 / 2 | 30 s (cible 30) | ±10 % |
| Narration et accroche | Fin qui boucle sur le début | 3 / 3 | similarité 0.94 | ≥ 0,88 |
| Narration et accroche | Force du message et de la chute | — / 4 | jugement humain | à noter par vous |
| Sous-titres | Mots visibles en même temps ≤ 12 | 2.5 / 2.5 | max 11 mots (à 5.433 s) | ≤ 12 mots à l’écran |
| Sous-titres | Temps de lecture suffisant | 2.1 / 2.5 | 2 texte(s) trop court(s) : « IL CREUSE POUR LA PHOTO. » 1.68/1.8 s, « À 30 CM. » 0.77/1.2 s | ≥ 0,3 s + 0,3 s par mot |
| Qualité technique | H.264 High, yuv420p | 3 / 3 | h264 High yuv420p | h264 / yuv420p |
| Qualité technique | Audio AAC présent | 2 / 2 | aac 48000 Hz | AAC |
| Qualité technique | Débit vidéo ≥ 4 Mb/s | 3 / 3 | 22014 kb/s | ≥ 4 000 kb/s |
| Qualité technique | Durée vidéo = durée audio | 2 / 2 | 30.00 s | cohérente |

## Défauts classés

- **mineur** — Contraste et saturation vs référence : contraste 39.8 / sat. 0.36 (réf. 40.6 / 0.109) (règle : contraste ±8, saturation ±0,08) → correction : ajuster l’étalonnage
- **mineur** — Ouverture au moins aussi animée que le reste : ×0.72 (règle : ≥ ×1,0) → correction : plus de mouvement dans les 3 premières secondes

## Scénario (contrôle indicatif, non noté)

12/12 points de la méthode respectés (docs/SCENARIO.md).

| Point | | Détail |
|---|---|---|
| Action dans la 1re seconde (son d’action) | ✅ | 3 bruitage(s) d’action avant 1 s |
| Première seconde = chute, raté, perte de temps ou obstacle | ✅ | type : raté |
| Accroche ≤ 6 mots | ✅ | 5 mots : « 4 MINEURS. 1 SEUL DIAMANT. » |
| Accroche qui crée une question (contradiction, chiffre, provocation) | ✅ | oui |
| Temps « conflit » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « obstacle » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « chute » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| 2 à 4 conseils applicables | ✅ | 3 : CREUSE UN SEUL TROU. | UN BARREAU PAR JOUR. | NE LÂCHE PAS AU MILIEU. |
| Conseils ≤ 6 mots | ✅ | ok |
| Dialogues (2 à 4 bulles, ≤ 5 mots) | ✅ | REGARDEZ MA PELLE EN OR ! | JE CREUSE AILLEURS ! | BIP ! UN DIAMANT ! | PERSONNE NE REGARDE ? |
| Au moins 3 détails concrets (heure, jour, objet) | ✅ | JOUR 1, JOUR 90, JOUR 180, pelle en or, détecteur, règle en mètres, à 30 cm |
| La chute rappelle l’accroche | ✅ | mot repris : diamant |
