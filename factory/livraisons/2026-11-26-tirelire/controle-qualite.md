# Contrôle qualité — j20261126-tirelire

**Score mesuré : 93 / 96** (96.9 %) · 4 points à évaluer par vous (non attribués).

> Score = estimation interne sur les seuls critères mesurables ; il ne garantit pas une qualité équivalente à la référence.

| Critère | Point de contrôle | Points | Mesure | Règle |
|---|---|---|---|---|
| Qualité visuelle | Résolution 1080×1920 | 5 / 5 | 1080×1920 | exactement 1080×1920 |
| Qualité visuelle | Netteté vs référence | 5 / 5 | 515 (réf. 376) | ≥ 60 % de la netteté de la référence |
| Qualité visuelle | Exposition vs référence | 4.6 / 5 | luminosité 42.7 (réf. 27.8) | écart ≤ 12/255 |
| Qualité visuelle | Contraste et saturation vs référence | 4 / 5 | contraste 55.2 / sat. 0.217 (réf. 40.6 / 0.109) | contraste ±8, saturation ±0,08 |
| Qualité visuelle | Pas d’image noire / figée > 1,2 s | 5 / 5 | 0 noir(s), 0 figé(s) > 1,2 s | aucun |
| Cohérence artistique | Palette proche de la référence | 10 / 10 | distance 2.6 | distance ≤ 8 (0 = identique) |
| Cohérence artistique | Homogénéité lumineuse entre plans | 5 / 5 | 14.1 (réf. 25.8) | ≤ référence + 5 |
| Montage et fluidité | Cadence ≥ 30 i/s constante | 3 / 3 | 60 i/s | ≥ 30 i/s |
| Montage et fluidité | Changements de plan/min vs référence | 6 / 6 | 18.37/min (réf. 26.34) | entre 70 % et 150 % de la référence |
| Montage et fluidité | Durée moyenne des plans vs référence | 3 / 3 | 2.9 s (réf. 2.23) | entre 60 % et 160 % |
| Montage et fluidité | Coupes calées sur la musique | 3 / 3 | 62.5 % (réf. 27.3 %) | ≥ max(40 %, référence) |
| Audio et voix | Loudness -16 LUFS ±1 | 5 / 5 | -16.5 LUFS | -17 à -15 LUFS |
| Audio et voix | Crête vraie ≤ −1 dBTP | 3 / 3 | -1.6 dBTP | ≤ −1 dBTP |
| Audio et voix | Bruitages réguliers (sans musique) | 4 / 4 | 3.33 attaques/s | ≥ 0,67 attaque/s |
| Audio et voix | Pas de voix (comme la référence) | 3 / 3 | aucune voix (Whisper) | aucune voix attendue |
| Narration et accroche | Ouverture au moins aussi animée que le reste | 3.2 / 4 | ×0.81 | ≥ ×1,0 |
| Narration et accroche | Accroche ≤ 6 mots dans la 1,5 s | 2 / 2 | 5 mots | ≤ 6 mots |
| Narration et accroche | Durée proche de la cible | 2 / 2 | 26.13 s (cible 26.129032258064516) | ±10 % |
| Narration et accroche | Fin qui boucle sur le début | 2.6 / 3 | similarité 0.84 | ≥ 0,88 |
| Narration et accroche | Force du message et de la chute | — / 4 | jugement humain | à noter par vous |
| Sous-titres | Mots visibles en même temps ≤ 12 | 2.5 / 2.5 | max 10 mots (à 11.517 s) | ≤ 12 mots à l’écran |
| Sous-titres | Temps de lecture suffisant | 2.1 / 2.5 | 2 texte(s) trop court(s) : « CETTE FOIS, C’EST BON ! » 1.4/1.5 s, « 10 €, COMME HIER. » 1.17/1.2 s | ≥ 0,3 s + 0,3 s par mot |
| Qualité technique | H.264 High, yuv420p | 3 / 3 | h264 High yuv420p | h264 / yuv420p |
| Qualité technique | Audio AAC présent | 2 / 2 | aac 48000 Hz | AAC |
| Qualité technique | Débit vidéo ≥ 4 Mb/s | 3 / 3 | 19089 kb/s | ≥ 4 000 kb/s |
| Qualité technique | Durée vidéo = durée audio | 2 / 2 | 26.13 s | cohérente |

## Scénario (contrôle indicatif, non noté)

12/12 points de la méthode respectés (docs/SCENARIO.md).

| Point | | Détail |
|---|---|---|
| Action dans la 1re seconde (son d’action) | ✅ | 7 bruitage(s) d’action avant 1 s |
| Première seconde = chute, raté, perte de temps ou obstacle | ✅ | type : raté |
| Accroche ≤ 6 mots | ✅ | 5 mots : « 10 € PAR JOUR. 4 TIRELIRES. » |
| Accroche qui crée une question (contradiction, chiffre, provocation) | ✅ | oui |
| Temps « conflit » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « obstacle » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| Temps « chute » présent | ✅ | ouverture → conflit → effort → progression → obstacle → retournement → chute |
| 2 à 4 conseils applicables | ✅ | 3 : MET DE CÔTÉ, CHAQUE JOUR. | AUTOMATISE LE VIREMENT. | ÉVITE LES ACHATS D’IMAGE. |
| Conseils ≤ 6 mots | ✅ | ok |
| Dialogues (2 à 4 bulles, ≤ 5 mots) | ✅ | C’EST UN INVESTISSEMENT ! | ENCORE UN JOB ! | CETTE FOIS, C’EST BON ! | 10 €, COMME HIER. |
| Au moins 3 détails concrets (heure, jour, objet) | ✅ | JOUR 1, JOUR 90, JOUR 180, 10 € par jour, 1 800 €, ticket de loto, 3 jobs, carte refusée |
| La chute rappelle l’accroche | ✅ | mot repris : par |
