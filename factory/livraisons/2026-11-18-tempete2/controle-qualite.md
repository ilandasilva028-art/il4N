# Contrôle qualité — j20261118-tempete2

**Score mesuré : 92.9 / 96** (96.8 %) · 4 points à évaluer par vous (non attribués).

> Score = estimation interne sur les seuls critères mesurables ; il ne garantit pas une qualité équivalente à la référence.

| Critère | Point de contrôle | Points | Mesure | Règle |
|---|---|---|---|---|
| Qualité visuelle | Résolution 1080×1920 | 5 / 5 | 1080×1920 | exactement 1080×1920 |
| Qualité visuelle | Netteté vs référence | 5 / 5 | 463 (réf. 376) | ≥ 60 % de la netteté de la référence |
| Qualité visuelle | Exposition vs référence | 5 / 5 | luminosité 32 (réf. 27.8) | écart ≤ 12/255 |
| Qualité visuelle | Contraste et saturation vs référence | 3.2 / 5 | contraste 47.1 / sat. 0.385 (réf. 40.6 / 0.109) | contraste ±8, saturation ±0,08 |
| Qualité visuelle | Pas d’image noire / figée > 1,2 s | 5 / 5 | 0 noir(s), 0 figé(s) > 1,2 s | aucun |
| Cohérence artistique | Palette proche de la référence | 10 / 10 | distance 3.7 | distance ≤ 8 (0 = identique) |
| Cohérence artistique | Homogénéité lumineuse entre plans | 5 / 5 | 10.7 (réf. 25.8) | ≤ référence + 5 |
| Montage et fluidité | Cadence ≥ 30 i/s constante | 3 / 3 | 60 i/s | ≥ 30 i/s |
| Montage et fluidité | Changements de plan/min vs référence | 6 / 6 | 30.06/min (réf. 26.34) | entre 70 % et 150 % de la référence |
| Montage et fluidité | Durée moyenne des plans vs référence | 3 / 3 | 1.88 s (réf. 2.23) | entre 60 % et 160 % |
| Montage et fluidité | Coupes calées sur la musique | 1.9 / 3 | 25 % (réf. 27.3 %) | ≥ max(40 %, référence) |
| Audio et voix | Loudness -16 LUFS ±1 | 5 / 5 | -16.5 LUFS | -17 à -15 LUFS |
| Audio et voix | Crête vraie ≤ −1 dBTP | 3 / 3 | -1.5 dBTP | ≤ −1 dBTP |
| Audio et voix | Bruitages réguliers (sans musique) | 4 / 4 | 1.78 attaques/s | ≥ 0,67 attaque/s |
| Audio et voix | Pas de voix (comme la référence) | 3 / 3 | aucune voix (Whisper) | aucune voix attendue |
| Narration et accroche | Ouverture au moins aussi animée que le reste | 4 / 4 | ×1.05 | ≥ ×1,0 |
| Narration et accroche | Accroche ≤ 6 mots dans la 1,5 s | 2 / 2 | 4 mots | ≤ 6 mots |
| Narration et accroche | Durée proche de la cible | 2 / 2 | 31.93 s (cible 31.93548387096774) | ±10 % |
| Narration et accroche | Fin qui boucle sur le début | 3 / 3 | similarité 0.97 | ≥ 0,88 |
| Narration et accroche | Force du message et de la chute | — / 4 | jugement humain | à noter par vous |
| Sous-titres | Mots visibles en même temps ≤ 12 | 2.5 / 2.5 | max 11 mots (à 10.033 s) | ≤ 12 mots à l’écran |
| Sous-titres | Temps de lecture suffisant | 2.3 / 2.5 | 1 texte(s) trop court(s) : « POUR LA SUITE » 0.98/1.2 s | ≥ 0,3 s + 0,3 s par mot |
| Qualité technique | H.264 High, yuv420p | 3 / 3 | h264 High yuv420p | h264 / yuv420p |
| Qualité technique | Audio AAC présent | 2 / 2 | aac 48000 Hz | AAC |
| Qualité technique | Débit vidéo ≥ 4 Mb/s | 3 / 3 | 17084 kb/s | ≥ 4 000 kb/s |
| Qualité technique | Durée vidéo = durée audio | 2 / 2 | 31.93 s | cohérente |

## Défauts classés

- **mineur** — Contraste et saturation vs référence : contraste 47.1 / sat. 0.385 (réf. 40.6 / 0.109) (règle : contraste ±8, saturation ±0,08) → correction : ajuster l’étalonnage
- **mineur** — Coupes calées sur la musique : 25 % (réf. 27.3 %) (règle : ≥ max(40 %, référence)) → correction : caler les coupes sur les temps

## Scénario (contrôle indicatif, non noté)

12/12 points de la méthode respectés (docs/SCENARIO.md).

| Point | | Détail |
|---|---|---|
| Action dans la 1re seconde (son d’action) | ✅ | 5 bruitage(s) d’action avant 1 s |
| Première seconde = chute, raté, perte de temps ou obstacle | ✅ | type : chute |
| Accroche ≤ 6 mots | ✅ | 4 mots : « UNE TEMPÊTE. 4 MAISONS. » |
| Accroche qui crée une question (contradiction, chiffre, provocation) | ✅ | oui |
| Temps « conflit » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « obstacle » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « chute » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| 2 à 4 conseils applicables | ✅ | 3 : UNE BRIQUE PAR JOUR. | LES FONDATIONS AVANT LA DÉCO. | RÉPARE LES FISSURES TÔT. |
| Conseils ≤ 6 mots | ✅ | ok |
| Dialogues (2 à 4 bulles, ≤ 5 mots) | ✅ | ÇA FAIT RICHE, NON ? | PAS LE TEMPS DE DORMIR ! | J’AI TROUVÉ UNE TENTE ! | C’ÉTAIT DU CARTON… |
| Au moins 3 détails concrets (heure, jour, objet) | ✅ | JOUR 1, JOUR 60, 22 H, ALERTE ORAGE, tente, façade en carton |
| La chute rappelle l’accroche | ✅ | mot repris : tempete |
