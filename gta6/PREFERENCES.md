# Préférences d'Ilan : clips GTA 6 pour TikTok

À lire au début de chaque session avant de toucher à un clip. À compléter après chaque retour d'Ilan ou chaque chiffre TikTok.

## Règles fixes
- **Sources : uniquement les captures d'Ilan.** Pas de clips de streamers ni de vidéos d'autres personnes (lien Xbox d'un tiers refusé le 18/11).
- Posts en **français**. La légende finit par une question facile à commenter. Jamais de « abonne-toi ».
- **Rien n'est publié sans la validation d'Ilan.**
- **Aucun écran de générique** (noms de l'équipe Rockstar), ni plein écran ni incrusté sur l'image.
- Aucune trace de **sous-titres incrustés par le jeu** dans le cadre.

## Ce qu'Ilan aime (retours du 18/11/2026)
- ✅ **Les beaux plans de la bande-annonce montés en musique** : ville au crépuscule, voiture de nuit, resort, néons, club, hydravion, fonds marins, phare, Lucia. Réponse d'Ilan : « ça m'a l'air pas mal ».
  → `make_tiktok.py capture.mov --mode plans`
- ❌ **Un clip centré sur une scène de dialogue** (le chauffeur Ryde suspendu) : « pas ouf ». Les dialogues en anglais demandent une traduction et l'image est moins spectaculaire.
- Musique **continue** sous le montage, jamais recollée plan par plan.
- Image au premier plan agrandie (860 px) quand il n'y a pas de sous-titres.
- Durée visée : 22 à 30 s. Coupes courtes (1 à 2,5 s), calées sur la musique. Le dernier plan est plus long (jusqu'à 4,5 s) pour laisser lire la question.

## Textes qui ont servi
| Clip | Accroche | Question | Retour |
|---|---|---|---|
| Jason & Lucia (v1) | CETTE SCÈNE DE GTA 6 / M'A MIS UNE CLAQUE | JASON OU LUCIA ? | publié ? (à compléter) |
| Chauffeur Ryde | CE CHAUFFEUR SE FAIT VIRER / PAR SES CLIENTS | TU LUI AURAIS MIS QUELLE NOTE ? | « pas ouf » |
| Beaux plans | C'EST PAS UN FILM. / C'EST GTA 6. | TU FAIS QUOI EN PREMIER ? PLAGE, BOÎTE OU OCÉAN ? | « pas mal » |
| Pas assez payés (gameplay) | ILS DEVAIENT JUSTE / SURVEILLER… | TU Y VAS OU TU RENTRES ? | à recevoir |
| L'eau de Leonida (muet) | L'EAU DE GTA 6 / EST IRRÉELLE | PLUS BEAU QUE LA VRAIE VIE ? | à recevoir |

## Hashtags
5 maximum : `#gta6 #gtavi #vicecity` + 1 sur le sujet (`#gta6trailer`, `#jasonetlucia`…) + `#gamingfr` pour le public français.
Pas encore comparés aux tendances : vidIQ n'a presque plus de crédits.

## Captures : conseils à Ilan
- Couper les sous-titres du jeu avant d'enregistrer : l'image reste entière.
- 60 i/s si possible.

## Chiffres TikTok (à remplir)
| Clip | Date | Vues | Rétention moy. | % vues complètes | Décrochage à |
|---|---|---|---|---|---|
| | | | | | |

## Captures de gameplay (pas de cinématique) : ce qu'on a appris le 18/11
- Pas de musique dans le jeu : le mode `plans` en musique ne s'applique pas. Deux clips possibles :
  1. **Les répliques drôles** de la mission, sous-titrées en français, avec l'action en image. La chute en accroche, la seconde chute à la fin. `--cta-top` met la question en haut pour que le dernier sous-titre reste visible.
  2. **Les beaux plans sans le son** (`--mute`), pour publier avec un son TikTok tendance ajouté dans l'appli.
- Masquer l'interface du jeu : `--crop-top 45` (boussole, en 720p) et `--crop-bottom 110` (sous-titres). Le cadrage centré enlève déjà la mini-carte en bas à gauche.
- À éviter : menus pause et mode photo (image floue), notifications en haut à gauche, plans aux jumelles trop longs.

## Réglages techniques retenus
- Détection des génériques : plus de 33 % de l'image d'une seule couleur + luminosité ≥ 0,18 (`plans.py`, mesuré sur la capture du 18/11).
- Textes incrustés : OCR (`rapidocr`). On écarte un texte en bas de l'image, centré et lisible (sous-titre du jeu), ou un nom déjà vu sur un écran de générique. Le texte du décor (panneaux, « INMATE ») est gardé.
- Accroche : texte visible dès l'image 0, pendant 3 s.

## Checklist avant chaque prochaine vidéo
Mise à jour le 18/11/2026, à partir de la recherche sur la rétention TikTok et le montage gaming. Les chiffres externes sont des blogs : on les vérifie avec nos propres stats.

### Accroche (3 premières secondes)
- [ ] La promesse ou la chute est dans l'accroche, pas la mise en place (« Salut tout le monde » et intros de marque : jamais).
- [ ] 7 mots maximum, une seule idée, texte visible dès l'image 0.
- [ ] Les 2 premières secondes sont en mouvement (pas de fondu, pas de plan fixe).
- [ ] Deux accroches candidates notées avant le rendu, pour un test A/B (voir « Tests » plus bas).

### Rythme
- [ ] Un changement visuel toutes les 2 s environ (coupe ou zoom).
- [ ] Aucun plan de dialogue ou de conduite de plus de 4 s sans coupe : le découper.
- [ ] Le moment fort n'est jamais au milieu d'une phrase coupée.

### Fin et rétention
- [ ] Durée 20 à 30 s pour du gameplay, 22 à 30 s pour les beaux plans.
- [ ] La question arrive quand la chute tombe, pas seulement en fin de clip (`--cta-top` si les sous-titres doivent rester visibles).
- [ ] Si possible, la dernière image rejoint la première (boucle).
- [ ] La question est une question facile à répondre (« oui ou non », « plage ou boîte », « tu y vas ou tu rentres »).

### Sous-titres et son
- [ ] Sous-titres relus à la main : noms propres (Donnie, Brian, Lucia, Carol), argot, traduction.
- [ ] Aucune trace de sous-titres ou d'interface du jeu dans le cadre (`--crop-bottom`, `--crop-top`).
- [ ] Si le son du jeu est peu intéressant ou parlé en anglais : `--mute` et son TikTok ajouté dans l'appli.
- [ ] Son du clip vérifié (-14 LUFS, pas de clip).

### Détection des moments
- [ ] Un moment fort = pic audio + changement de plan + (si possible) texte à l'écran. Les moments sans rien de ça sont écartés.
- [ ] Les génériques, menus pause, mode photo, notifications et plans flous sont écartés, même s'ils sont beaux.
- [ ] Ne jamais garder un contenu que la capture n'a pas filmé soi-même (sources : captures d'Ilan uniquement).

### Tests
- [ ] Pour chaque capture, deux accroches différentes sur la même vidéo, publiées à quelques jours d'écart.
- [ ] Une seule variable change à la fois : l'accroche, ou la question, ou le son.
- [ ] Résultat noté dans le tableau « Chiffres TikTok » ci-dessus : vues, rétention moyenne, % de vues complètes, moment où les gens décrochent.
- [ ] Un test est concluant seulement à partir de quelques milliers de vues. En dessous, on ne tire aucune conclusion.

### Ce qu'on ne sait pas encore
- Le seuil de vues complètes qui fait pousser une vidéo : les sources vont de 35 à 70 %, aucune n'est officielle. On le calera sur nos propres chiffres.
- Quelle méthode de détection marche le mieux sur GTA : pas de benchmark indépendant trouvé. Une comparaison se fera sur nos captures.
- Si les relectures comptent vraiment : à vérifier avec les stats (la part de revisionnage est visible dans TikTok Analytics).
