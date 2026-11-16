# Routine : 1 vidéo TikTok « mentality » par jour

Exécutée chaque jour par une tâche planifiée Claude Code (session cloud). **Ne publie jamais rien.**
Le style de référence est mesuré dans `references/style-mentality.json` : enregistrement du fil TikTok de l'utilisateur,
5 vidéos « mentality / discipline » d'autres créateurs. On copie la **technique**, jamais leurs scènes, textes ou musique.

## 0. Préparer la machine (session cloud)
```bash
cd factory
npm ci                                   # dépendances Node (node_modules n'est pas versionné)
export FACTORY_CHROMIUM=/opt/pw-browsers/chromium FACTORY_QUIET=1   # Chromium préinstallé du conteneur
```
Sur le Mac : `npm run setup` (installe Chromium pour Playwright), puis la variable `FACTORY_CHROMIUM` est inutile.

## 1. Choisir la vision du jour
`npx tsx engine/daily.ts next`. Le script renvoie la première vision non utilisée de `themes/visions.json`, ainsi que le nom du film et le fichier à créer.
- **Banque épuisée** (`vision: null`) : inventer 10 nouvelles visions dans le même format, puis les ajouter au fichier. Chacune doit avoir une métaphore visuelle originale, une accroche de 2 lignes et une chute.
- **Jamais deux fois la même métaphore.** Lire le journal `livraisons/journal.json` pour vérifier.

## 1 bis. Pertinence (demande d'Ilan, 16/11/2026)
Chaque vidéo doit **apprendre quelque chose de concret et applicable** : pas seulement une métaphore ou un slogan.
- Exemple validé : `films/j20261116-systeme.js`. Message : « Tu n'as pas un problème de motivation, tu as un problème de système », suivi de 4 règles numérotées (RÈGLE 1…4).
- Chaque règle est rendue **visible par une image**, pas seulement écrite : graphique envie/habitude, mur contre petites marches, sac prêt la veille, calendrier avec un seul raté.
- Avant d'écrire, formuler la **leçon** en une phrase (champ `lecon` de la vision ; l'ajouter s'il manque). Si la vision n'a qu'un slogan, y ajouter 2 à 4 conseils pratiques précis : quoi faire, quand, comment.
- Conseils de bon sens et reconnus (petites actions, préparation la veille, environnement, sommeil, ne pas rater deux fois…). **Jamais de statistiques ni d'« études » inventées.**
- Alterner les formats : « N règles », « l'erreur que tout le monde fait », « avant / après », métaphore pure. Le format « règles » est le plus enregistré et partagé : au moins 3 vidéos sur 7.

## 2. Écrire le film
Créer `engine/render/player/films/<film>.js`. Exemples validés, à lire avant d'écrire :
- `films/discipline.js` ;
- `films/j20261116-telephone.js` (utilise le kit).

Outils disponibles :
- **`lib/kit.js`** :
  - décors : bg, floor, bricks, ledge, ladder, city, road, flag, spotlight, box, phone, bed, door, hourglass, crowd ;
  - textes : caption, topBand, definition, bigWord ;
  - assemblage : timeline, compose, grainVignette.
- **`lib/stick.js`** :
  - poses : stand, sad, hang, sit, push, fall, victory, punch, kneel, phone, carry, think, crouch, lie, pull ;
  - cycles : walk, run, climb.

Le module exporte `W, H, BPM, DURATION, MUSIC, draw, samples, post, HITS`.

Règles de style (mesurées sur la référence) :
- **Couleurs** : fond noir (luminosité moyenne ≈ 28/255), gris, blanc, **un seul accent : rouge `COLORS.red`**.
- **Personnages** : bonshommes épais (le rig par défaut) ; étiquettes en CAPITALES espacées au-dessus d'eux (`label`).
- **Structure, 22 à 30 s** :
  1. accroche animée dès l'image 0, texte en haut (y 380-470) sur `topBand` ;
  2. scène métaphore ;
  3. carte définition (police à empattements) ou mot géant flou ;
  4. montage serré : un plan par temps, 6 à 8 plans, flash et zoom ;
  5. résolution plus la chute en 2 lignes, le mot clé en rouge ;
  6. dernier temps = image d'ouverture (la vidéo boucle).
- **Musique** : `mood: 'sombre'`, BPM entre 118 et 130 (plage de la référence : 83-125 BPM, octave tolérée). Drop à la fin de l'accroche.
- **Sons** : un bruitage par accent visuel (`HITS` : impact, whoosh, pop, tick, riser, ding).
- **Zone sûre** : rien d'important au-dessus de y = 250, sous y = 1490, ni à droite de x = 930.
- **Textes** : en français, courts, sans fautes, sans chiffres inventés présentés comme des faits. Les compteurs de jours sont de la narration.
- **Aperçu rapide** pendant l'écriture : `stills()` dans `engine/render/render.ts`, à regarder avant le rendu complet.

## 3. Produire et contrôler (3 itérations au maximum)
`npx tsx engine/daily.ts produce <film> <visionId>`

Cette commande enchaîne : rendu 1080×1920 30 i/s, musique originale, bruitages, mixage −14 LUFS, analyse, puis contrôle qualité (grille sur 100).
1. Lire les défauts et **regarder la planche contact** (`planche`) : lisibilité, chevauchements, personnages coupés, plans vides.
2. Corriger dans le film et relancer `produce`.
3. **Objectif : ≥ 90 % des points mesurables, et une planche contact propre.**
4. Arrêter après 3 versions : la commande refuse une 4ᵉ. Ne jamais modifier les règles du contrôle qualité pour gagner des points.

## 4. Livrer
`npx tsx engine/daily.ts deliver <film> <visionId>`

Cette commande crée `livraisons/AAAA-MM-JJ-<vision>/` : MP4 léger, couverture, contrôle qualité, `LISEZMOI.md` (légende et hashtags). Elle met aussi à jour `livraisons/journal.json`.

Ensuite, commiter :
- le film `.js` ;
- le dossier de livraison ;
- le journal ;
- `themes/visions.json`, s'il a été modifié.

Pousser sur la branche de travail.

**Message final**, en 5 lignes au plus :
- la vision ;
- l'accroche ;
- le score ;
- les défauts restants ;
- le chemin du MP4.

Rappeler que rien n'est publié.

## Ce que la routine ne fait pas
- Elle ne publie pas sur TikTok et ne crée pas de compte : l'utilisateur publie lui-même après validation.
- Elle ne garantit pas la viralité. Elle applique ce qui retient l'attention (accroche dès la 1ʳᵉ seconde, rythme sur le beat, contraste, boucle, une seule idée forte) et varie les métaphores chaque jour.
- Elle n'écoute pas le son : la musique est vérifiée par mesures uniquement.
