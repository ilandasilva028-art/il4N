# GTA 6 → TikTok : montage automatique

Tu prends une capture de gameplay, l'outil trouve les meilleurs moments et les monte en vidéo verticale (accroche, titre, sous-titres auto, appel à commenter, son à -14 LUFS). Il prépare aussi la légende. **Rien n'est publié sans ta validation.**

Source : **tes propres captures uniquement.**

## 1. Installation (une fois, sur le Mac)

```bash
cd il4N/gta6
./install.sh
```
Le script installe ffmpeg (Homebrew), Python, Whisper (la transcription) et crée `~/GTA6_TikTok/`.
Les polices Anton et Archivo Black sont fournies dans `fonts/` : plus besoin de changer les chemins Ubuntu.
Pour vérifier l'installation : `./.venv/bin/python make_tiktok.py --doctor`, puis `./tests/test_rapide.sh` (1 min, vidéo de synthèse).

## 2. Utilisation au quotidien

**Méthode simple : le dossier « à traiter »**
```bash
./.venv/bin/python watch.py
```
1. Glisse une capture dans `~/GTA6_TikTok/a_traiter/`.
2. Quelques minutes plus tard, tout est dans `~/GTA6_TikTok/a_valider/<nom>/` :
   - `<nom>_TikTok.mp4` : la vidéo
   - `<nom>_legende.txt` : la légende proposée
   - `<nom>_couverture.jpg` : la couverture
   - `<nom>_planche.jpg` : 8 images du montage pour vérifier d'un coup d'œil
   - `<nom>_rapport.md` : quels passages ont été gardés et pourquoi, la transcription, les contrôles
3. Si la vidéo te va, déplace le dossier dans `valide/`. Sinon, corrige (voir §3) et relance.

**Une seule vidéo :**
```bash
./.venv/bin/python make_tiktok.py ~/Movies/capture.mp4 \
  --hook "CETTE SCÈNE DE GTA 6|M'A MIS UNE CLAQUE" \
  --title "GTA 6|JASON & LUCIA" \
  --cta "JASON OU LUCIA ?|TON PERSO PRÉFÉRÉ EN COMMENTAIRE"
```
Le `|` sépare les deux lignes.

**Réglages par vidéo** : pose un `capture.json` à côté de `capture.mp4` (il marche aussi dans `a_traiter/`). Voir `exemples/jason_lucia.json`, qui refait la découpe de la vidéo 1 :
```json
{ "hook": "…|…", "title": "GTA 6|JASON & LUCIA", "cta": "…|…",
  "segments": "30.2-33.0,3.6-21.8,33.0-39.6,44.0-47.5,52.0-55.2",
  "exclude": "40-44,48-52", "tags": "#gta6 #gta #jasonetlucia", "caption": "…" }
```

**Deux modes :**
- `--mode plans` : **montage des plus beaux plans en musique**. C'est le mode qu'Ilan préfère pour les cinématiques et les bandes-annonces. L'outil trouve seul les plans, écarte les génériques (plein écran ou incrustés, lus par OCR) et les sous-titres du jeu, garde une musique continue sans dialogue, cale les coupes sur la musique et finit sur le plus beau plan long.
  ```bash
  ./.venv/bin/python make_tiktok.py ~/Movies/capture.mov --mode plans
  ```
  Dans `a_traiter/`, ajoute un `capture.json` contenant `{"mode": "plans"}`.
- mode normal (par défaut) : moments forts et dialogues, avec sous-titres Whisper.

Lis aussi `PREFERENCES.md` : tes goûts, les textes déjà testés, les chiffres TikTok.

**Effets de montage (par morceau, dans `--segments`)** :
```
--segments "62.0-63.4:full:slow,2.0-4.0,20.2-22.0:full,36.0-40.0:x2,84.0-92.0:x4"
```
- `full` : plein écran vertical, pour les gros plans (visage, objet, rouleau). Alterner avec la bande crée du rythme.
- `x1.5`, `x2`, `x3`, `x4` : accéléré, pour les passages répétitifs (au lieu de couper).
- `censor` : image pixelisée + tampon « CENSURÉ » (contenu qu'on ne peut pas montrer sur TikTok).
- `slow` : ralenti ×0,5, pour le moment clé (souvent l'accroche).
- `--rehook "ELLE VA APPUYER ?"` : texte choc au milieu (≈ 45 %, calé sur une coupe), avec souffle + impact. `--rehook-at 0.5` pour le déplacer.
- Automatique : accroche **mot par mot** (un petit coup sonore par mot), **début sans image noire**, **boucle invisible** (la fin se fond dans la première image), section **Rétention** du rapport (✅/⚠️).
- `--meme "LIGNE 1|LIGNE 2|LIGNE 3"` : format mème (bandeau blanc en haut, texte noir), à la place de l'accroche et du titre.
- Ajoutés automatiquement : **impact** sonore sur l'accroche, **souffle** à chaque coupe franche (sons synthétisés, sans droits), **étalonnage** (contraste et saturation). Pour les retirer : `--no-sfx`, `--no-grade`.

**Depuis un lien (YouTube, TikTok…) : sur le Mac**
```bash
./lien.sh https://www.youtube.com/watch?v=XXXX          # mode normal
./lien.sh https://www.youtube.com/watch?v=XXXX plans    # beaux plans en musique
```
Le téléchargement passe par ta connexion (YouTube bloque les serveurs cloud). Le résultat arrive dans `~/GTA6_TikTok/a_valider/`. Uniquement pour tes propres vidéos.

**Plusieurs captures dans un même clip** : `assemble.py plan.json` (voir `clips/compilations/`). Chaque passage garde son propre recadrage d'interface et ses sous-titres. Avec `"musique"`, piste continue et coupes sur les temps forts. Avec `"label": "#3|TEXTE"`, liste numérotée (option `--labels` de make_tiktok).

**Voix off française (femme)** : `--voix narration.txt`, une ligne par réplique « temps | texte » (temps dans la vidéo finale). Exemple : `clips/compilations/narration_promis.txt`.
- Moteur Piper (github.com/rhasspy/piper, MIT), voix « fr_FR-siwis-medium », gratuite, hors ligne. Licence de la voix CC-BY 4.0 : **mettre « Voix : Piper siwis (CC-BY 4.0) » dans la description ou la bio**.
- Le son du jeu baisse tout seul quand elle parle. Les sous-titres suivent la voix au mot près.
- Noms anglais : `Jason[Djéïssonne]` (le sous-titre affiche Jason, la voix dit Djéïssonne). `--voix-db 2` pour la monter.

## 3. Corriger une vidéo

| Problème | Solution |
|---|---|
| Mauvais passages gardés | Modifie `<nom>_montage.json` puis `--segments-file <nom>_montage.json`, ou `--segments "a-b,a-b"` (le premier morceau sert d'accroche) |
| Le générique ou un écran de chargement apparaît | `--exclude "40-44"` |
| Mauvaise accroche | `--hook-at "31-33.5"` (temps dans la source) |
| Faute dans les sous-titres | Corrige `<nom>_sous-titres.srt` puis relance avec `--subs <nom>_sous-titres.srt` |
| La voix est en anglais | Le rapport le signale. Traduis le `.srt` (ou demande à Claude de le faire), puis `--subs` |
| Vidéo trop longue ou trop courte | `--target 25` |
| Cadrage décentré | `--crop-shift -0.5` (vers la gauche) ou `0.5` (vers la droite) |
| Un générique est passé quand même | `--exclude "a-b"`, et signale-le pour qu'on ajuste `plans.py` |
| Sous-titres du jeu dans l'image | `--crop-bottom 260` |
| Tu préfères l'ancien style | `--subs-mode classic --ending fade --punch 0 --no-progress` |

La transcription est gardée en cache : relancer avec d'autres réglages prend peu de temps.

## 4. Ce que fait l'outil pour la rétention

**Accroche**
1. Le passage le plus fort est joué en premier (cold open), sans image noire au début.
2. Texte révélé **mot par mot** dès l'image 0, avec un petit coup sonore par mot et un impact au départ.

**Rythme**
3. Petit zoom à chaque coupe, et au moins toutes les 3,5 s (ralentis compris).
4. Gros plans en plein écran (`:full`), accéléré (`:x2`…), ralenti (`:slow`), souffle sonore à chaque coupe.
5. Relance au milieu (`--rehook`), là où les gens décrochent.
6. Couleurs plus vives (contraste, saturation).

**Lisibilité**
7. Sous-titres karaoké (le mot prononcé passe en jaune). Beaucoup de gens regardent sans le son.
8. Zones sûres TikTok : rien d'important au-dessus de 250 px, en dessous de 1490 px ni dans la colonne des boutons. Les textes trop longs rétrécissent tout seuls.

**Fin**
9. Barre de progression rose : on voit que la vidéo est courte.
10. Boucle invisible : la fin se fond dans la première image, la vidéo repart sans coupure.
11. Question facile à commenter, sans « abonne-toi ».

**Son et contrôle**
12. Son à -14 LUFS (deux passes) + limiteur.
13. Rapport avec une section « Rétention » (✅/⚠️) pour chaque clip.

## 5. Conseils pour les prochains clips

- **Durée** : vise 20 à 35 s. Une vidéo courte regardée jusqu'au bout fait mieux qu'une longue abandonnée à la moitié.
- **Accroche** : 7 mots maximum, une seule idée, une promesse ou une surprise. Pistes :
  « PERSONNE NE PARLE DE CE DÉTAIL », « GTA 6 VA TROP LOIN », « REGARDE SES YEUX À LA FIN »,
  « LUCIA A RAISON OU PAS ? », « ROCKSTAR A CACHÉ ÇA ». N'annonce jamais quelque chose que la vidéo ne montre pas.
- **Question de fin** : deux choix simples (« JASON OU LUCIA ? », « VICE CITY OU LEONIDA ? »), ou une opinion (« 10/10 OU SURCOTÉ ? »).
- **Tests A/B** : sors la même capture avec deux accroches différentes (`--hook`) et publie-les à quelques jours d'écart. Garde celle qui retient le mieux dans les statistiques TikTok : courbe de rétention et % de vues complètes.
- **Régularité** : un clip par jour aide plus qu'un « gros » clip par semaine.
- **Couverture** : `<nom>_couverture.jpg` montre l'accroche. Choisis-la comme couverture dans TikTok.

## 6. Publication (après ta validation)

1. Ouvre le dossier dans `valide/`.
2. Publie la vidéo sur TikTok avec la légende du fichier `_legende.txt`.
3. Pour programmer à l'avance : Postiz, So-me Studio ou Zapier vers TikTok. Ces connecteurs ne sont pas joignables depuis cette session cloud (le réseau les bloque). Depuis une session Claude sur le Mac, on pourra les brancher sur le dossier `valide/`.
