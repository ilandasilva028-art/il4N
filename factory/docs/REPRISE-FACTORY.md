# Reprise — TikTok AI Video Factory (état au 17/11/2026)

## Prompt à coller dans une nouvelle conversation
> Tu reprends la « TikTok AI Video Factory » d'Ilan.
> - Dépôt : `ilandasilva028-art/il4N`, branche `claude/tiktok-ai-video-factory-b4nmd9`, dossier `factory/`.
> - Lis d'abord `factory/docs/REPRISE-FACTORY.md`, puis `factory/docs/ROUTINE-VIDEO-QUOTIDIENNE.md` et `factory/docs/SCENARIO.md`.
> - Réponds en français. Ne publie rien, n'engage aucune dépense, budget 0 €.
> - Jamais de copie de vidéos, musiques ou personnages existants. Jamais de chiffre ou d'étude inventés.

## Ce qui existe et fonctionne
- **Série « Toi contre toi »** :
  - format : vidéos TikTok verticales 1080×1920, **60 i/s**, 24-32 s ;
  - style « mentality » : bonshommes épais, fond nocturne, un seul accent rouge ;
  - **héros au bandeau rouge** (mascotte) ;
  - **sans musique** : bruitages et ambiances seuls à −16 LUFS, Ilan ajoute son son dans TikTok ; coupes calées sur 124 BPM.
- **Moteur** (`factory/engine/`) :
  - films canvas en fonction pure du temps (`render/player/films/*.js`), rendus image par image avec Playwright puis FFmpeg ;
  - bibliothèques de dessin :
    - `lib/stick.js` : rig du personnage (poses, yeux, bouches, mains, chaussures, bandeau, liseré de lumière) ;
    - `lib/kit.js` : texte cinétique, carte de fin, étiquette de série, variante d'accroche B ;
    - `lib/anim.js` : GSAP 3.14 pour les chorégraphies, Matter.js 0.20 pour la physique précalculée, cinématique inverse (pieds plantés) ;
    - `lib/world.js` : décors (rue, chambre, salle, scène), lumière, pluie et reflets, foules, bulles, rembobinage, confettis, **arrière-plans animés**, passant flou au premier plan ;
  - son : `audio/sfx.ts` (bruitages synthétisés : pas, chute, porte, réveil, pluie, applaudissements…) et `audio/mix.ts` ;
  - analyse vidéo (`analysis/`, Agent 1) : plans et transitions, couleurs, netteté, mouvement, audio EBU R128, tempo, Whisper ;
  - contrôle qualité (`agents/qc.ts`, grille sur 100) : points mesurés (dont la lisibilité via le journal des textes), le reste à noter par Ilan ;
  - contrôle de scénario (`agents/scriptCheck.ts`).
- **Commandes** (depuis `factory/`) :
  - installation : `npm ci && npm run setup:python` ;
  - variable : `export FACTORY_CHROMIUM=/opt/pw-browsers/chromium` (dans le cloud) ;
  - production : `npx tsx engine/daily.ts next | produce <film> <vision> | deliver <film> <vision> [vN] | variant <film> <vision>` (3 versions au maximum par film) ;
  - vérifications : `npm test` (8 tests), `npx tsc --noEmit`.
- **Tâche planifiée** `trig_01GYU9SrRxr5j5TWrG6xbrCR` (13 h 47 Paris, chaque jour, notification push) :
  - choisit la vision suivante dans `themes/visions.json` ;
  - écrit le film, le produit puis le livre dans `livraisons/AAAA-MM-JJ-<vision>/` (MP4 A et B, couverture, légende, hashtags) ;
  - fait un commit et un push.
  - Premier passage réel : **17/11**. Vision attendue : « Les deux toi » (`miroir`). À vérifier.
- **Livraisons** (essais du 16/11, `livraisons/`) :
  - `discipline` ;
  - `2026-11-16-telephone` ;
  - `2026-11-16-systeme` (4 règles) ;
  - `2026-11-16-foule` (« Ceux qui rient », **modèle actuel**, film `j20261116-foule3.js`, scénario en 7 temps, arrière-plans animés).
  - Journal : `livraisons/journal.json`.
- **Compte** (`compte/PROFIL.md`) :
  - nom : « Toi contre toi » ; @ : `@toicontretoi` (disponibilité **non vérifiée**) ;
  - bio et photos de profil A, B (recommandée) et C, épingles, ordre de publication.

## Décisions d'Ilan (à respecter)
1. Pas de musique : bruitages seulement.
2. Scénarios pertinents, avec 2 à 4 conseils concrets montrés en images.
3. Accroche de 6 mots au maximum, en mouvement dès l'image 0.
4. Décors vivants avec un arrière-plan animé.
5. Personnage au bandeau rouge.
6. Accroche B pour faire des tests A/B.
7. Publication manuelle par Ilan.

## Mises à jour du 17-18/11
- **Règle de la première seconde** : une action dès l'image 0, sans intro ni logo. Champ `premiere` du SCRIPT, contrôlé par `produce`.
- **Décor sous-marin original** (`lib/ocean.js`) + film « La profondeur » (`films/j20261118-profondeur.js`, 95,1 %) : la concentration se trouve en profondeur ; conseils : couper les notifs, 25 min une tâche, téléphone ailleurs. Livré dans `livraisons/2026-11-18-profondeur/` (A + B).
- **Refusé** : la copie plan par plan d'une vidéo d'un autre créateur (4 plongeurs nommés MOTIVATION / EGO / TALENT / OBSESSION). Seule la technique s'en inspire ; le kit `reference_nutriclip/` n'a jamais été fourni.
- **Routine** : le lancement du 18/11 (« Les deux toi », 97,6 %) n'a **pas pu pousser**, car le dépôt n'est pas une source de la session de la routine. Ses 3 commits sont dans `miroir-20261118.bundle`, envoyé à Ilan : à récupérer avec `git fetch <bundle> claude/tiktok-ai-video-factory-b4nmd9 && git merge FETCH_HEAD`. **À corriger par Ilan** : ajouter `ilandasilva028-art/il4N` (écriture) aux sources de la routine sur claude.ai. Une étape `add_repo` a été ajoutée aux instructions, mais elle n'a pas suffi à cette session.

- **Distribution « traits de caractère »** (`lib/cast.js`, `drawMember`) : DISCIPLINE (bandeau rouge), L'EGO (couronne, lunettes), L'OBSESSION (cernes, cheveux en bataille), LA CHANCE (trèfle). Film « Les quatre » (`films/j20261118-quatre.js`) : course, salle, mur, nuit 23 h / 3 h, sommet ; seul Discipline arrive.

- **Lumière** (`lib/light.js`, WebGL2 + `glsl-noise` MIT) : bloom sur les sources colorées, rayons, brouillard animé, étalonnage. À utiliser dans tous les nouveaux films via `post = cinema(...)`.

- **Blender** (`engine/blender/bureaux.py`, bpy 5.3 en module Python, Cycles CPU) : décors 3D rendus en plaques + `anchors.json` (positions à l'écran). Plaques du bureau dans `player/plates/business/`, réutilisables. Installation : `uv venv .venv-blender --python 3.13 && VIRTUAL_ENV=.venv-blender uv pip install bpy==5.3.0` (~1 Go). Environ 6 min par plaque à 1080×1920.
- **Rétention / transitions / son** : voir ROUTINE § 1 quaterdecies (film modèle : `j20261118-business2.js`).

## Pièges connus
- `deliver` date la livraison **du jour**. Refaire un essai un autre jour crée une entrée qui bloque la routine du jour : la ranger avec les essais du 16/11 et corriger `journal.json`.
- Le rendu prend environ 20-25 min par version à 60 i/s (plus encore sur le Mac Intel 8 Go d'Ilan). Le lancer en arrière-plan.
- `rm` sur des chemins avec motif est bloqué par la sécurité : déplacer ou écraser plutôt.
- `data/` (projets, modèles, références) n'est pas versionné ; seules les livraisons légères le sont.

- Avant d'ajouter une vision, vérifier que son `id` n'existe pas déjà dans `themes/visions.json` : sinon `deliver` reprend la légende de l'ancienne vision et la marque comme utilisée (arrivé avec « tempete » → renommé « maisons »).

## Pas encore fait
- L'interface web (tableau de bord, import, comparaison, TikTok Studio), demandée au départ.
- L'installation testée sur le Mac d'Ilan.
- La lecture des statistiques TikTok. Ilan doit envoyer des captures après 7 jours de publication.
- La confirmation du @ pour la carte de fin (`HANDLE`).
- Écouter le son : Claude ne peut que le mesurer.
