---
description: Trouver les scripts de vidéos (file de la routine, idées classées, déjà produites)
argument-hint: [mot-clé | « nouveau » | numéro]
---

Tu aides Ilan à trouver et choisir les scripts de sa série « Toi contre toi ». Réponds en français, de façon courte et lisible.

Argument reçu : `$ARGUMENTS`

1. Lis `factory/themes/visions.json`, `factory/livraisons/journal.json`, `factory/docs/SCRIPTS-IDEES.md` et `factory/docs/CALENDRIER.md` (calendrier jour par jour : montre la date de chaque vision).
2. Selon l'argument :
   - **vide** : affiche un tableau en trois blocs : **déjà produits** (date, vision, score du journal), **file de la routine** (dans l'ordre, la 1re non utilisée = demain, sa leçon et son accroche A / B), **autres idées** (non utilisées, plus loin dans la liste).
   - **un mot-clé** (ex. `argent`, `examen`, `sport`) : cherche ce mot dans `id`, `titre`, `accroche`, `metaphore`, `lecon` et `hashtags` de chaque vision, et affiche les résultats avec accroche, leçon, scènes clés et statut (produit / dans la file).
   - **un numéro ou un id** : affiche la fiche complète de cette vision (accroches A et B, métaphore, leçon, scènes, chute, hashtags, série).
   - **`nouveau`** : propose 5 nouveaux scripts originaux dans le format gagnant (les 4 personnages Discipline, l'Ego, l'Obsession, la Chance vivent la même épreuve ; accroche ≤ 6 mots avec une action à l'image 0 ; 3 conseils ≤ 6 mots ; une chute qui reprend l'accroche ; un retournement). Évite les doublons avec les visions existantes. N'invente aucun chiffre ni étude. Donne à chacun une note estimée de 1 à 5 (identification, accroche, retournement, nouveauté visuelle, coût de production) en précisant que c'est une estimation, pas une mesure.
3. Termine en demandant lequel produire (ou « le suivant de la file »). Ne produis rien et ne modifie aucun fichier sans que l'utilisateur le demande. Ne publie rien.
