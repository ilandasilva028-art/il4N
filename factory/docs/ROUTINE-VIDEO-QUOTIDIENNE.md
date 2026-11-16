# Routine : 1 vidéo TikTok « mentality » par jour

Exécutée chaque jour par une tâche planifiée Claude Code (session cloud). **Ne publie jamais rien.**
Le style de référence est mesuré dans `references/style-mentality.json` : enregistrement du fil TikTok de l'utilisateur,
5 vidéos « mentality / discipline » d'autres créateurs. On copie la **technique**, jamais leurs scènes, textes ou musique.

## 0. Préparer la machine (session cloud)
```bash
cd factory
npm ci                                   # dépendances Node (node_modules n'est pas versionné)
npm run setup:python                     # Whisper : vérifie l'absence de voix (sinon point « non vérifiable »)
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

## 1 ter. Règles de rétention (obligatoires depuis le 16/11/2026)
Exemple de référence : `films/j20261116-systeme3.js`. Le contrôle qualité mesure désormais ces points grâce au journal des textes du rendu.
1. **Accroche choc** :
   - mouvement fort dès l'image 0 : caméra qui « claque » (zoom 1,35 → 1), objet qui explose, chute, flash ;
   - **6 mots maximum** dans la 1,5 s, en deux lignes, avec le mot clé en rouge sur le 2ᵉ temps.
2. **Texte** :
   - **12 mots maximum visibles en même temps** ;
   - chaque texte affiché **au moins 0,3 s + 0,3 s par mot** ;
   - titres de règle sur **une seule ligne** de 4 mots maximum.
3. **Promesse de structure** dans l'accroche (« 4 RÈGLES POUR T'EN PASSER ») : on reste pour voir la suite.
4. **Personnage vivant** :
   - `eyes: true, t` (yeux qui clignent), `mouth` pour l'émotion ;
   - `squash` à chaque atterrissage ;
   - caméra qui bouge (`camera()`), pas de plan figé.
5. **Série** :
   - `seriesTag(ctx, 'LES RÈGLES · #N')` dans l'accroche, en numérotant à partir du journal ;
   - autre nom de série pour les métaphores, par exemple « TOI CONTRE TOI · #N ».
6. **Carte de fin** : `endCard()` sur les 5 derniers temps (« ABONNE-TOI POUR LA RÈGLE DE DEMAIN »), avec le @ seulement quand `compte/compte.json` le marque confirmé. Le tout dernier temps reprend l'image d'ouverture (boucle).
7. **Test A/B** :
   - écrire une 2ᵉ accroche (variable `VARIANT === 'b'`, champ `accrocheB` de la vision) ;
   - après `deliver`, lancer `npx tsx engine/daily.ts variant <film> <visionId>`.
8. Durée cible : 24 à 32 s.

## 1 quater. Son : bruitages seulement (demande d'Ilan, 16/11/2026)
- **Pas de musique** : `export const MUSIC = null;`. Ilan ajoute lui-même son son dans TikTok. La piste de bruitages est mixée à **−16 LUFS** pour laisser la place à sa musique.
- **Chaque action a son bruit** (`HITS`) :
  - `step` : pas, avec `stepHits(t0, t1, cadence)` calé sur le cycle de marche ;
  - `thud` : chute, objet posé ;
  - `impact` : coupe, choc ;
  - `whoosh` / `swish` : mouvement rapide ;
  - `pop` / `click` : apparition, case cochée ;
  - `shatter` : éclat, explosion ;
  - `door` : porte ;
  - `alarm` : réveil ;
  - `type` : machine à écrire ;
  - `boing` : rebond ;
  - `ding` : réussite ;
  - `riser` : montée.
- **Les coupes restent sur une grille de BPM** (124 dans les exemples). Indiquer le BPM dans le message de livraison : Ilan pourra choisir un son au même tempo (ou à la moitié).

## 1 quinquies. Animation (demande d'Ilan, 16/11/2026)
Utiliser systématiquement (modèle : **`films/j20261116-systeme4.js`**) :
- **ombre au sol** (`ground: y` dans `drawStick`) dès qu'un personnage touche le sol ;
- **poussière** (`dust`) à chaque atterrissage, chute ou objet posé ;
- **anneau d'impact** (`impactRing`) sur les chocs et les moments clés ;
- **lignes de vitesse** (`speedLines`) quand un personnage court ;
- **écrasement et étirement** (`squash`) à l'atterrissage et en l'air, **yeux qui clignent** (`eyes`, `t`), bouche (`mouth`) pour l'émotion, respiration (`breathe`) sur les poses fixes ;
- **texte cinétique** (`kinetic`) : les mots arrivent un par un, au lieu d'un bloc qui apparaît d'un coup ;
- **caméra** (`camera`) : légère poussée sur les plans longs, claquement à l'image 0.

## 1 sexies. Outils d'animation avancés (installés le 16/11/2026, `lib/anim.js`)
Modèle à suivre : **`films/j20261116-systeme4.js`**.
- **GSAP 3.14** : `choreo(etatInitial, (tl, s) => tl.to(s, {...}, temps))`. Chorégraphies avec easings pro (`expo.out`, `back.out(2)`, `elastic.out`…), à « seeker » au temps de chaque image. À utiliser pour les mouvements de caméra, les objets clés et les entrées en scène.
  - Licence : GreenSock « no charge », gratuite, usage commercial autorisé.
- **Matter.js 0.20 (MIT)** : physique précalculée, donc déterministe.
  - `shatterBake` : éclatement en débris qui rebondissent ;
  - `wallBake` : mur de briques qui s'effondre ;
  - `bake()` : tout autre objet qui tombe, roule ou s'empile ;
  - `drawBaked` : affichage des objets précalculés.
  - Au moins **un moment physique par vidéo** : explosion, chute d'objets, effondrement.
- **Cinématique inverse** :
  - `gait(t, {x0, speed, ground})` : marche ou course avec **pieds plantés**, sans glissement (vérifié par test) ;
  - `gaitSteps()` : bruits de pas exactement au contact du pied ;
  - `ik2()` : poser une main ou un pied sur une cible (barreau, objet, bouton).
  - **Toujours `gait` au lieu de `walk`** pour un personnage qui se déplace au sol.

## 1 septies. Niveau « production » (`lib/world.js`, 16/11/2026)
Modèle vitrine : **`films/j20261116-foule.js`**. Chaque vidéo doit avoir **au moins 3 décors différents**, et **jamais de fond noir vide** sauf pour la carte définition et le mot géant.
- **Décors** :
  - `street(ctx, camX, t)` : ville de nuit en parallaxe, avec réverbères et brouillard ;
  - `bedroom(ctx, t, {alarm})` : chambre, fenêtre, lune, réveil à LED ;
  - `gym(ctx, t)` : salle de sport avec projecteurs ;
  - `stage(ctx, t)` : scène avec 3 projecteurs.
  - **Nouveau décor** : le construire dans `world.js`, sur le même principe (canvas en cache + lumières dynamiques).
- **Lumière et atmosphère** :
  - `lightCone` (projecteur, réverbère), `glow` (halo), `fog` (brouillard) ;
  - `rain` (pluie) + `reflect` (reflets sur sol mouillé) ;
  - `parallax` + `blurred` : profondeur de champ (arrière-plans flous).
- **Foules** :
  - `makeCrowd(n, seed)` crée des personnages variés (taille, teinte, décalage de temps) ;
  - `drawCrowd(ctx, foule, t, 'laugh' | 'point' | 'phone' | 'clap' | 'watch' | 'sit', { blur })` les anime. Une foule floue au premier plan donne de la profondeur.
- **Expressions** :
  - `brows(ctx, x, y, pose, { mood: 'determined' | 'angry' | 'sad' })` : sourcils ;
  - `sweat()` : sueur pendant l'effort.
- **Transitions** : `whip()` (panoramique filé avec flou de bougé, `samples` à 4) entre les scènes d'une même progression. Coupe franche + flash pour les ruptures.
- **Cadence** : `export const FPS = 60` (comme la référence). Le rendu est environ 2 fois plus long : compter 15 à 25 min dans le cloud.
- **Sons d'ambiance** : `rain` (pluie, `len`) et `applause` (applaudissements, `len`), en plus des bruitages d'action.

## 1 octies. Personnage, décors, scénario (demande d'Ilan, 16/11/2026)
Modèle : **`films/j20261116-foule2.js`**.
- **Le héros a une identité fixe** : `band: COLORS.red` (bandeau rouge), mains et chaussures, liseré de lumière (`rim: ±1`) du côté de la source. Il porte ce bandeau dans **toutes** les vidéos : c'est la mascotte du compte.
- **Expressions** :
  - `mouth` : `grit` (effort), `smirk` (sûr de lui), `open` (surprise), `sad`, `happy` ;
  - `brows` : sourcils.
- **Décors vivants**, jamais statiques :
  - rue : néon qui grésille, voitures qui passent, flaques, vapeur ;
  - chambre : pluie sur la vitre, poussière dans le rayon de lune, plante, cadre ;
  - salle : sac de frappe qui se balance, miroir, poussière dans les projecteurs ;
  - scène : rideaux, plancher, brume dans les faisceaux.
- **Scénario** : écrire d'abord le `SCRIPT`, en suivant **`docs/SCENARIO.md`** (7 temps, dialogues en bulles avec `bubble()`, obstacle, retournement, chute qui rappelle l'accroche). `produce` affiche les points de méthode à revoir (champ `scenario`) : les corriger avant de livrer.

## 2. Écrire le film
Créer `engine/render/player/films/<film>.js`. Exemples validés, à lire avant d'écrire :
- **`films/j20261116-foule2.js`** : le modèle actuel (scénario 7 temps, héros au bandeau, décors vivants, bulles), à suivre en priorité ;
- `films/j20261116-foule.js` : décors, lumière, foules, 60 i/s ;
- `films/j20261116-systeme4.js` : modèle « règles numérotées » ;
- `films/discipline.js` ;
- `films/j20261116-telephone.js`.

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
- **Musique** : aucune, voir la section 1 quater. Les coupes restent calées sur une grille de 118 à 130 BPM.
- **Sons** : un bruitage par accent visuel (`HITS` : impact, whoosh, pop, tick, riser, ding).
- **Zone sûre** : rien d'important au-dessus de y = 250, sous y = 1490, ni à droite de x = 930.
- **Textes** : en français, courts, sans fautes, sans chiffres inventés présentés comme des faits. Les compteurs de jours sont de la narration.
- **Aperçu rapide** pendant l'écriture : `stills()` dans `engine/render/render.ts`, à regarder avant le rendu complet.

## 3. Produire et contrôler (3 itérations au maximum)
`npx tsx engine/daily.ts produce <film> <visionId>`

Cette commande enchaîne : rendu 1080×1920 30 i/s, bruitages, mixage −16 LUFS (sans musique), analyse, puis contrôle qualité (grille sur 100).
1. Lire les défauts et **regarder la planche contact** (`planche`) : lisibilité, chevauchements, personnages coupés, plans vides.
2. Corriger dans le film et relancer `produce`.
3. **Objectif : ≥ 90 % des points mesurables, et une planche contact propre.**
4. Arrêter après 3 versions : la commande refuse une 4ᵉ. Ne jamais modifier les règles du contrôle qualité pour gagner des points.

## 4. Livrer
`npx tsx engine/daily.ts deliver <film> <visionId>`

Lancer ensuite `npx tsx engine/daily.ts variant <film> <visionId>` (accroche B).

`deliver` crée `livraisons/AAAA-MM-JJ-<vision>/` : MP4 léger, couverture, contrôle qualité, `LISEZMOI.md` (légende et hashtags). Elle met aussi à jour `livraisons/journal.json`.

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
