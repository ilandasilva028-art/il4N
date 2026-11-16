# Reprise de session — IL4N STUDIO (état au 16/11/2026)

À coller dans une nouvelle conversation Claude Code (dépôts `ilandasilva028-art/il4N` et `ilandasilva028-art/claude-code-ios`) :

> Tu reprends le travail d'IL4N STUDIO (Ilan Da Silva, graphiste à Sarrians, il4nstudio.netlify.app, budget 0 €).
> Lis d'abord `docs/REPRISE.md`, `docs/REFERENCE-REEL.md` et `docs/ROUTINE-QUOTIDIENNE.md` du dépôt il4N.
> Branche de travail : `claude/festive-gauss-x63hqm` (contient tout `claude/awesome-johnson-7m7st3`). Ne publie et n'envoie rien sans mon accord. Aucun prix ni chiffre inventé.

## Ce qui existe
| Sujet | Où | État |
|---|---|---|
| Agent « IL4N — Directeur artistique » + 7 Skills + outils (export PDF/PNG, preflight, QR) | dépôt claude-code-ios, branche `claude/il4n-directeur-artistique`, dossier `il4n-studio/` (`install.sh`) | prêt ; installation sur le Mac d'Ilan non confirmée |
| Plan de direction + analyse marché (site vitrine 290 €) | claude-code-ios `il4n-studio/direction/` | étape 1 faite (1 467 établissements, 0/16 indépendants avec site) |
| Démo site « Mistraline » (fictif) + générateur `build.py` + film HyperFrames | claude-code-ios `il4n-studio/offre-site-vitrine/` | prête, non publiée |
| Prospection : fiche 10 artisans, scripts d'appel par entreprise, `suivi.csv` | claude-code-ios `il4n-studio/offre-site-vitrine/prospection/` | **appels à faire par Ilan** |
| Vidéo prospection 10 s (musique, sans voix) + légendes | claude-code-ios `…/video-prospection/publication/` | prête, non publiée |
| Reels Noël : flyers −20 % et site 261 € (voix clonée ref22, sous-titres) | il4N `reels/2026-11-noel/*/livraison/final.mp4` + `LIVRAISON.md` | prêts ; **flyers à publier avant le 25/11** |
| Visuels fixes Noël (post + story : flyers, site, menu 39 €) | il4N `posts/2026-11-noel-20/` | prêts, non publiés |
| Cartes de visite v1 à v7 (sobre, billet, ticket, ticket découpé + CutContour, ticket gagnant, MAXI MAQUETTE à gratter, MAXI MAQUETTE carte) | il4N `studio/CLIENTS/IL4N-STUDIO/CARTES-VISITE/LIVRAISON/` (+ `LISEZMOI.md`) | prêtes ; **Ilan doit choisir et imprimer** |

Numéros de suivi des cartes déjà attribués : 0001-0024 (billet), 0025-0051 (tickets), 0052-0078 (gagnant), 0079-0114 (maxi à gratter), 0115-0141 (maxi carte). Prochain numéro libre : **0142**.

## À faire (par ordre)
1. ~~**Site** : corriger le tableau « Quel flyer choisir ? »~~ — **fait** : vérifié en ligne le 16/11/2026, le tableau affiche Start 21 € → 16 €, Pro 35 € → 28 €, Prestige 49 € → 39 €, comme les cartes.
2. Publier le reel « Noël −20 % flyers » (légende dans `reels/2026-11-noel/LIVRAISON.md`) avant le 25/11 ; variante « offre de décembre » à prévoir après.
3. ~~Choisir la carte de visite~~ — v7 « MAXI MAQUETTE » finalisée en CMJN, puis Ilan a demandé « quelque chose d'unique » → **v8 « LE BAT »** (recto premier jet corrigé au stylo rouge, verso version validée). Fichier : `studio/CLIENTS/IL4N-STUDIO/CARTES-VISITE/LIVRAISON/IL4N_bat_v8_print_CMJN.pdf`. Puis calendrier 2027 : v9 (85 × 55) jugée illisible → v10 A6 148 × 105 (cercles) → v11/v12 (essais) → **v13 VALIDABLE : face noire = toutes les infos + tarifs du site, verso = calendrier 2027** : `…/LIVRAISON/IL4N_carte-calendrier-A6_v13_print_CMJN.pdf`. **Reste : Ilan valide et commande chez un imprimeur en ligne (v10 pour déc.-janv., v8 le reste de l'année).**
4. Faire les 10 appels de prospection et remplir `suivi.csv` ; bilan après 10 jours (≥ 2 intéressés = on continue).

## Leçons techniques (à garder)
- PDF imprimeur depuis Chromium : polices **TTF** (pas OTF/CFF ni variables → Type3), pas de `text-stroke`, dégradés ou opacité (rasterisés).
- Voix clonée Chatterbox : accélération ≤ ×1,05 ; vérification Whisper avec le modèle **medium** (small se trompe).
- Mentions « tu as gagné » : le lot doit être réel et sans obligation d'achat ; pas de noms de jeux FDJ ; pas de dépôt dans la rue.
