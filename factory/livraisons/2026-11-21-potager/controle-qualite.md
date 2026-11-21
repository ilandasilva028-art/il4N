# Contrôle qualité — j20261121-potager3d

**Score mesuré : 91.2 / 96** (95 %) · 4 points à évaluer par vous (non attribués).

> Score = estimation interne sur les seuls critères mesurables ; il ne garantit pas une qualité équivalente à la référence.

| Critère | Point de contrôle | Points | Mesure | Règle |
|---|---|---|---|---|
| Qualité visuelle | Résolution 1080×1920 | 5 / 5 | 1080×1920 | exactement 1080×1920 |
| Qualité visuelle | Netteté vs référence | 5 / 5 | 465 (réf. 376) | ≥ 60 % de la netteté de la référence |
| Qualité visuelle | Exposition vs référence | 4.3 / 5 | luminosité 45.1 (réf. 27.8) | écart ≤ 12/255 |
| Qualité visuelle | Contraste et saturation vs référence | 4.2 / 5 | contraste 46.6 / sat. 0.28 (réf. 40.6 / 0.109) | contraste ±8, saturation ±0,08 |
| Qualité visuelle | Pas d’image noire / figée > 1,2 s | 5 / 5 | 0 noir(s), 0 figé(s) > 1,2 s | aucun |
| Cohérence artistique | Palette proche de la référence | 10 / 10 | distance 5.1 | distance ≤ 8 (0 = identique) |
| Cohérence artistique | Homogénéité lumineuse entre plans | 5 / 5 | 10.9 (réf. 25.8) | ≤ référence + 5 |
| Montage et fluidité | Cadence ≥ 30 i/s constante | 3 / 3 | 60 i/s | ≥ 30 i/s |
| Montage et fluidité | Changements de plan/min vs référence | 6 / 6 | 19.93/min (réf. 26.34) | entre 70 % et 150 % de la référence |
| Montage et fluidité | Durée moyenne des plans vs référence | 3 / 3 | 2.71 s (réf. 2.23) | entre 60 % et 160 % |
| Montage et fluidité | Coupes calées sur la musique | 1.7 / 3 | 22.2 % (réf. 27.3 %) | ≥ max(40 %, référence) |
| Audio et voix | Loudness -16 LUFS ±1 | 5 / 5 | -16.3 LUFS | -17 à -15 LUFS |
| Audio et voix | Crête vraie ≤ −1 dBTP | 3 / 3 | -2.8 dBTP | ≤ −1 dBTP |
| Audio et voix | Bruitages réguliers (sans musique) | 4 / 4 | 2.62 attaques/s | ≥ 0,67 attaque/s |
| Audio et voix | Pas de voix (comme la référence) | 3 / 3 | aucune voix (Whisper) | aucune voix attendue |
| Narration et accroche | Ouverture au moins aussi animée que le reste | 2.6 / 4 | ×0.65 | ≥ ×1,0 |
| Narration et accroche | Accroche ≤ 6 mots dans la 1,5 s | 2 / 2 | 5 mots | ≤ 6 mots |
| Narration et accroche | Durée proche de la cible | 2 / 2 | 27.1 s (cible 27.096774193548384) | ±10 % |
| Narration et accroche | Fin qui boucle sur le début | 3 / 3 | similarité 0.92 | ≥ 0,88 |
| Narration et accroche | Force du message et de la chute | — / 4 | jugement humain | à noter par vous |
| Sous-titres | Mots visibles en même temps ≤ 12 | 2.5 / 2.5 | max 10 mots (à 4.783 s) | ≤ 12 mots à l’écran |
| Sous-titres | Temps de lecture suffisant | 1.9 / 2.5 | 3 texte(s) trop court(s) : « J’ATTENDS LA PLUIE. » 0.82/1.2 s, « LES RACINES AVANT LES FEUILLES. » 1.77/1.8 s, « FINIT PAR SE VOIR. » 1.42/1.5 s | ≥ 0,3 s + 0,3 s par mot |
| Qualité technique | H.264 High, yuv420p | 3 / 3 | h264 High yuv420p | h264 / yuv420p |
| Qualité technique | Audio AAC présent | 2 / 2 | aac 48000 Hz | AAC |
| Qualité technique | Débit vidéo ≥ 4 Mb/s | 3 / 3 | 25753 kb/s | ≥ 4 000 kb/s |
| Qualité technique | Durée vidéo = durée audio | 2 / 2 | 27.10 s | cohérente |

## Défauts classés

- **mineur** — Coupes calées sur la musique : 22.2 % (réf. 27.3 %) (règle : ≥ max(40 %, référence)) → correction : caler les coupes sur les temps
- **mineur** — Ouverture au moins aussi animée que le reste : ×0.65 (règle : ≥ ×1,0) → correction : plus de mouvement dans les 3 premières secondes

## Scénario (contrôle indicatif, non noté)

12/12 points de la méthode respectés (docs/SCENARIO.md).

| Point | | Détail |
|---|---|---|
| Action dans la 1re seconde (son d’action) | ✅ | 5 bruitage(s) d’action avant 1 s |
| Première seconde = chute, raté, perte de temps ou obstacle | ✅ | type : raté |
| Accroche ≤ 6 mots | ✅ | 5 mots : « 4 GRAINES. 1 SEULE RÉCOLTE. » |
| Accroche qui crée une question (contradiction, chiffre, provocation) | ✅ | oui |
| Temps « conflit » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « obstacle » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « chute » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| 2 à 4 conseils applicables | ✅ | 3 : ARROSE UN PEU, CHAQUE JOUR. | LES RACINES AVANT LES FEUILLES. | NE DÉTERRE PAS POUR VÉRIFIER. |
| Conseils ≤ 6 mots | ✅ | ok |
| Dialogues (2 à 4 bulles, ≤ 5 mots) | ✅ | REGARDEZ MES FLEURS ! | J’ARROSE DIX FOIS ! | BIENTÔT, LA PLUIE ! | ENFIN LA PLUIE ! |
| Au moins 3 détails concrets (heure, jour, objet) | ✅ | JOUR 1, JOUR 60, JOUR 180, fleurs en plastique, 10 arrosages, arrosoir, racines |
| La chute rappelle l’accroche | ✅ | boucle par l’image (ouverture in medias res) |
