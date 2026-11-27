# Contrôle qualité — j20261127-gta6

**Score mesuré : 91.7 / 96** (95.5 %) · 4 points à évaluer par vous (non attribués).

> Score = estimation interne sur les seuls critères mesurables ; il ne garantit pas une qualité équivalente à la référence.

| Critère | Point de contrôle | Points | Mesure | Règle |
|---|---|---|---|---|
| Qualité visuelle | Résolution 1080×1920 | 5 / 5 | 1080×1920 | exactement 1080×1920 |
| Qualité visuelle | Netteté vs référence | 5 / 5 | 563 (réf. 376) | ≥ 60 % de la netteté de la référence |
| Qualité visuelle | Exposition vs référence | 5 / 5 | luminosité 37.3 (réf. 27.8) | écart ≤ 12/255 |
| Qualité visuelle | Contraste et saturation vs référence | 4.7 / 5 | contraste 48.1 / sat. 0.22 (réf. 40.6 / 0.109) | contraste ±8, saturation ±0,08 |
| Qualité visuelle | Pas d’image noire / figée > 1,2 s | 5 / 5 | 0 noir(s), 0 figé(s) > 1,2 s | aucun |
| Cohérence artistique | Palette proche de la référence | 10 / 10 | distance 2.7 | distance ≤ 8 (0 = identique) |
| Cohérence artistique | Homogénéité lumineuse entre plans | 5 / 5 | 9.1 (réf. 25.8) | ≤ référence + 5 |
| Montage et fluidité | Cadence ≥ 30 i/s constante | 3 / 3 | 60 i/s | ≥ 30 i/s |
| Montage et fluidité | Changements de plan/min vs référence | 4.5 / 6 | 13.78/min (réf. 26.34) | entre 70 % et 150 % de la référence |
| Montage et fluidité | Durée moyenne des plans vs référence | 3 / 3 | 3.48 s (réf. 2.23) | entre 60 % et 160 % |
| Montage et fluidité | Coupes calées sur la musique | 1.9 / 3 | 25 % (réf. 27.3 %) | ≥ max(40 %, référence) |
| Audio et voix | Loudness -16 LUFS ±1 | 5 / 5 | -16.7 LUFS | -17 à -15 LUFS |
| Audio et voix | Crête vraie ≤ −1 dBTP | 3 / 3 | -2.4 dBTP | ≤ −1 dBTP |
| Audio et voix | Bruitages réguliers (sans musique) | 4 / 4 | 3.27 attaques/s | ≥ 0,67 attaque/s |
| Audio et voix | Pas de voix (comme la référence) | 3 / 3 | aucune voix (Whisper) | aucune voix attendue |
| Narration et accroche | Ouverture au moins aussi animée que le reste | 4 / 4 | ×1.16 | ≥ ×1,0 |
| Narration et accroche | Accroche ≤ 6 mots dans la 1,5 s | 1 / 2 | 7 mots | ≤ 6 mots |
| Narration et accroche | Durée proche de la cible | 2 / 2 | 17.42 s (cible 17.419354838709676) | ±10 % |
| Narration et accroche | Fin qui boucle sur le début | 2.9 / 3 | similarité 0.87 | ≥ 0,88 |
| Narration et accroche | Force du message et de la chute | — / 4 | jugement humain | à noter par vous |
| Sous-titres | Mots visibles en même temps ≤ 12 | 2.5 / 2.5 | max 9 mots (à 2.433 s) | ≤ 12 mots à l’écran |
| Sous-titres | Temps de lecture suffisant | 2.2 / 2.5 | 1 texte(s) trop court(s) : « ET TOI, TU ATTENDS ? » 0.8/1.5 s | ≥ 0,3 s + 0,3 s par mot |
| Qualité technique | H.264 High, yuv420p | 3 / 3 | h264 High yuv420p | h264 / yuv420p |
| Qualité technique | Audio AAC présent | 2 / 2 | aac 48000 Hz | AAC |
| Qualité technique | Débit vidéo ≥ 4 Mb/s | 3 / 3 | 18819 kb/s | ≥ 4 000 kb/s |
| Qualité technique | Durée vidéo = durée audio | 2 / 2 | 17.42 s | cohérente |

## Défauts classés

- **mineur** — Coupes calées sur la musique : 25 % (réf. 27.3 %) (règle : ≥ max(40 %, référence)) → correction : caler les coupes sur les temps
- **mineur** — Accroche ≤ 6 mots dans la 1,5 s : 7 mots (règle : ≤ 6 mots) → correction : raccourcir l’accroche

## Scénario (contrôle indicatif, non noté)

10/12 points de la méthode respectés (docs/SCENARIO.md).

| Point | | Détail |
|---|---|---|
| Action dans la 1re seconde (son d’action) | ✅ | 4 bruitage(s) d’action avant 1 s |
| Première seconde = chute, raté, perte de temps ou obstacle | ✅ | type : chute |
| Accroche ≤ 6 mots | ❌ | 7 mots : « GTA 6 ARRIVE. ET TOI, TU ATTENDS ? » |
| Accroche qui crée une question (contradiction, chiffre, provocation) | ✅ | oui |
| Temps « conflit » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « obstacle » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « chute » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| 2 à 4 conseils applicables | ❌ | 0 :  |
| Conseils ≤ 6 mots | ✅ | ok |
| Dialogues (2 à 4 bulles, ≤ 5 mots) | ✅ | JE L’AI PRÉCOMMANDÉ ! | ENCORE UNE BANDE-ANNONCE ! | ÇA SORT QUAND ? | TOUJOURS PAS LÀ. |
| Au moins 3 détails concrets (heure, jour, objet) | ✅ | couronne, lampe à selfies, 10 onglets, ticket de loto, calendrier |
| La chute rappelle l’accroche | ✅ | mot repris : attends |
