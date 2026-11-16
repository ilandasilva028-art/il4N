# Contrôle qualité — discipline

**Score mesuré : 79.6 / 91** (87.5 %) · 9 points à évaluer par vous (non attribués).

> Score = estimation interne sur les seuls critères mesurables ; il ne garantit pas une qualité équivalente à la référence.

| Critère | Point de contrôle | Points | Mesure | Règle |
|---|---|---|---|---|
| Qualité visuelle | Résolution 1080×1920 | 5 / 5 | 1080×1920 | exactement 1080×1920 |
| Qualité visuelle | Netteté vs référence | 5 / 5 | 434 (réf. 376) | ≥ 60 % de la netteté de la référence |
| Qualité visuelle | Exposition vs référence | 5 / 5 | luminosité 22.5 (réf. 27.8) | écart ≤ 12/255 |
| Qualité visuelle | Contraste et saturation vs référence | 2.5 / 5 | contraste 34.8 / sat. 0.034 (réf. 40.6 / 0.564) | contraste ±8, saturation ±0,08 |
| Qualité visuelle | Pas d’image noire / figée > 1,2 s | 0 / 5 | 1 noir(s), 0 figé(s) > 1,2 s | aucun |
| Cohérence artistique | Palette proche de la référence | 10 / 10 | distance 1.5 | distance ≤ 8 (0 = identique) |
| Cohérence artistique | Homogénéité lumineuse entre plans | 5 / 5 | 11.2 (réf. 25.8) | ≤ référence + 5 |
| Montage et fluidité | Cadence ≥ 30 i/s constante | 3 / 3 | 30 i/s | ≥ 30 i/s |
| Montage et fluidité | Changements de plan/min vs référence | 6 / 6 | 30/min (réf. 26.34) | entre 70 % et 150 % de la référence |
| Montage et fluidité | Durée moyenne des plans vs référence | 3 / 3 | 1.85 s (réf. 2.23) | entre 60 % et 160 % |
| Montage et fluidité | Coupes calées sur la musique | 3 / 3 | 41.7 % (réf. 27.3 %) | ≥ max(40 %, référence) |
| Audio et voix | Loudness −14 LUFS ±1 | 5 / 5 | -14.1 LUFS | −15 à −13 LUFS |
| Audio et voix | Crête vraie ≤ −1 dBTP | 3 / 3 | -3.9 dBTP | ≤ −1 dBTP |
| Audio et voix | Tempo compatible avec la référence | 2.3 / 4 | 75 BPM (réf. 98.7) | ±6 % (ou double/moitié) |
| Audio et voix | Pas de voix (comme la référence) | 3 / 3 | aucune voix | aucune voix attendue |
| Narration et accroche | Ouverture au moins aussi animée que le reste | 3.2 / 4 | ×0.81 | ≥ ×1,0 |
| Narration et accroche | Durée proche de la cible | 4 / 4 | 24 s (cible 24) | ±10 % |
| Narration et accroche | Fin qui boucle sur le début | 2.9 / 3 | similarité 0.87 | ≥ 0,88 |
| Narration et accroche | Force du message et de la chute | — / 4 | jugement humain | à noter par vous |
| Sous-titres | Lisibilité et synchronisation du texte | — / 5 | pas d’OCR : à vérifier sur la planche contact | à noter par vous |
| Qualité technique | H.264 High, yuv420p | 3 / 3 | h264 High yuv420p | h264 / yuv420p |
| Qualité technique | Audio AAC présent | 2 / 2 | aac 48000 Hz | AAC |
| Qualité technique | Débit vidéo ≥ 4 Mb/s | 1.7 / 3 | 2671 kb/s | ≥ 4 000 kb/s |
| Qualité technique | Durée vidéo = durée audio | 2 / 2 | 24.00 s | cohérente |

## Défauts classés

- **majeur** — Pas d’image noire / figée > 1,2 s : 1 noir(s), 0 figé(s) > 1,2 s (règle : aucun) → correction : ajouter du mouvement aux plans fixes
- **mineur** — Contraste et saturation vs référence : contraste 34.8 / sat. 0.034 (réf. 40.6 / 0.564) (règle : contraste ±8, saturation ±0,08) → correction : ajuster l’étalonnage
- **mineur** — Tempo compatible avec la référence : 75 BPM (réf. 98.7) (règle : ±6 % (ou double/moitié)) → correction : changer le BPM
- **mineur** — Débit vidéo ≥ 4 Mb/s : 2671 kb/s (règle : ≥ 4 000 kb/s) → correction : CRF plus bas
