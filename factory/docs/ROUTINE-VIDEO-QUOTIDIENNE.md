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

## 1 undecies. Décor sous-marin (`lib/ocean.js`, 18/11/2026)
Modèle : **`films/j20261118-profondeur.js`**. `ocean(ctx, t, camD)` dessine l'eau à la profondeur de caméra `camD`, en mètres :
- surface au coucher du soleil vue d'en dessous, rayons de lumière, caustiques ;
- bancs de poissons, algues, parois de canyon en parallaxe, méduses violettes, neige marine ;
- assombrissement progressif jusqu'à l'abîme.
Autres outils :
- `yOf(profondeur, camD)` convertit une profondeur en position à l'écran ;
- `diver()` dessine le héros qui nage, avec `angle: Math.PI` pour plonger tête la première ;
- `bubbles()` fait monter des bulles, `jellyfish()` dessine une méduse ;
- sons : `splash` (éclaboussure), `blub` (bulle), `underwater` (ambiance).
Ce décor est une création originale. Ne jamais reprendre le scénario, les personnages ou les textes d'une vidéo existante (par exemple la vidéo de plongeurs nommés MOTIVATION / EGO / TALENT / OBSESSION d'un autre créateur).

## 1 decies. Première seconde = action (règle d'Ilan, 17/11/2026)
- **Dès l'image 0 et dans la 1re seconde** : une action. Le personnage tombe, rate une occasion, perd son temps ou affronte un obstacle. **Pas d'introduction, pas de logo, pas de titre seul, pas de fondu d'ouverture.**
- Dans `SCRIPT`, le champ **`premiere`** doit valoir `'chute'`, `'raté'`, `'perte de temps'` ou `'obstacle'`.
- Dans `HITS`, au moins un bruitage d'action (`impact`, `thud`, `swish`, `whoosh`, `shatter`, `step`, `door`, `alarm`) avant 1 s.
- `produce` vérifie les deux points (« Action dans la 1re seconde », « Première seconde = … »). Les corriger avant de livrer.
- La marque (série, bandeau, titre) arrive **après** l'action, jamais avant.

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

## 1 nonies. Arrière-plans animés (demande d'Ilan, 17/11/2026)
Le fond ne doit **jamais être immobile** : au moins 3 éléments qui bougent en permanence derrière l'action, discrets (sombres, peu contrastés) pour ne pas voler la vedette au héros. Ils sont déjà intégrés aux décors de `world.js` :
- **rue** :
  - passants lointains (`passersby`), circulation au loin (`farTraffic`), train aérien (`farTrain`) ;
  - fenêtres qui s'allument (`blinkingWindows`), avion (`airplane`), éclairs (`lightning`) ;
  - en plus : néon, voitures, flaques, vapeur.
- **chambre** : phares qui balaient le plafond, rideaux qui ondulent, téléphone qui s'allume (notifications), ombres des gouttes au sol.
- **salle** : ventilateur, télé, deux sportifs en silhouette (tapis de course, haltère), sac de frappe.
- **scène** : mur LED qui pulse, brume qui dérive, téléphones levés et flashs photo dans le public.

- **Premier plan** : `foregroundPasser(ctx, t, { period, offset, dir })`, dessiné APRÈS les personnages. Une grande silhouette floue traverse devant la caméra dans les scènes de rue, environ une fois par scène. C'est l'effet de profondeur le plus fort.

Pour un nouveau décor : utiliser ces fonctions, ou en écrire d'autres sur le même principe (fonction pure du temps, silhouettes sombres, cycles décalés avec `hash`).

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


## 1 duodecies. Distribution de personnages
- `lib/cast.js` : `drawMember(ctx, 'discipline'|'ego'|'obsession'|'chance', x, y, pose, opts)` dessine un trait de caractère avec son accessoire et son nom.
- Garder 150 px minimum entre deux personnages et décaler les noms voisins (`labelDy`).
- Chaque personnage a un comportement constant : l'Ego cherche le regard, l'Obsession s'épuise, la Chance profite puis tombe, Discipline avance au même rythme.

## 1 terdecies. Lumière (WebGL2, gratuit)
- `lib/light.js` : passe appliquée à l'image finie. Dans le film : `import { cinema } from '../lib/light.js'; export const post = cinema((t) => ({ ... }));` (remplace `grainVignette`, qu'elle inclut).
- Réglages par scène (pixels 1080 × 1920) :
  - `bloom` (0,6-1,1) et `threshold` : seules les sources **colorées** brillent (néons, phares, accent rouge) ; les personnages blancs et les bulles restent nets ;
  - `rays: { x, y, strength, color, radius }` : rayons de lumière depuis une lampe, la lune, un projecteur ; les formes claires les coupent ;
  - `fog: { density, height, color, speed }` : brume animée (bruit simplex GLSL, paquet `glsl-noise`, MIT), plus dense en bas ;
  - `contrast`, `sat`, `warm` (ombres froides / lumières chaudes), `exposure`, `ca` (aberration chromatique des bords).
- Coût : environ +0,2 s par image dans le cloud (WebGL logiciel), beaucoup moins sur une vraie carte graphique.
- Avant / après : `docs/lumiere-avant-apres.jpg`.

## 1 quaterdecies. Rétention, transitions, son (demande d'Ilan : « super important »)
**Rétention**
- Une **question visible à l'écran pendant toute la vidéo** : par exemple un compteur d'élimination (4 têtes, une croix rouge et un buzzer à chaque échec) qui répond à l'accroche (« 4 business. 1 seul survit. »).
- **Pas de carte de fin longue.** Les dernières secondes rejouent le moment juste avant l'image 0 (« boucle parfaite ») : la vidéo repart sans coupure visible. Un « ABONNE-TOI » bref (moins de 1,5 s) peut s'y glisser.
- Un plan nouveau toutes les **2 secondes environ**, une caméra qui bouge toujours (travelling, poussée), aucun plan figé de plus de 1,2 s.
- Durée cible : **24 à 27 s**.

**Transitions** (`lib/trans.js`) : `transition(ctx, t, renderAt, CUTS)` dans `draw()`. Les types :
- `whip` : balayage avec flou, à alterner gauche / droite ;
- `zoom` : traversée, pour le héros et les temps forts ;
- `glitch` : saut dans le temps ;
- `drop` : noir bref.

À chaque coupe son bruitage : `whip`, `glitch`, ou `whoosh` + `sub`.

**Son** (`audio/sfx.ts`)
- Toujours une ambiance continue `room` sur toute la durée : le silence entre deux bruits fait décrocher.
- Les temps forts reçoivent un `sub` (boum grave).
- Bruitages qui racontent :
  - `notif` : notifications en cascade (le paramètre `len` règle la hauteur, à faire monter) ;
  - `cash` : vente ;
  - `heart` : tension ;
  - `buzz` : élimination.
- Le mixeur limite la crête à −4 dBFS (−1,5 à −2 dBTP après AAC).
