# ✅ v13 — CARTE-CALENDRIER A6 : face noire = toutes les infos, verso = calendrier 2027 (16/11/2026) — VERSION À IMPRIMER
Retour d'Ilan : garder le calendrier, améliorer la face noire (« à l'avant pas de calendrier, juste toutes les infos bien présentées »).
- **Face noire (recto)** : logo il4n. + « Faites bonne impression. », nom/métier, pastille « Calendrier 2027 au dos », QR « Mes tarifs » (16,5 mm) ;
  **Imprimés** (Flyer Start 21 €, Pro 35 €, Prestige 49 €, carte de visite 25 €, menu 39 €, affiche A3/A2 39 €, plaquette 45 €) ;
  **Réseaux & identité** (visuel 15 € · 5 pour 59 €, Pack Lancement 360° 97 €, Pack Artisan 129 €, Social Media Kit / Identité de marque sur devis) ;
  carte claire **Site internet 290 €** + option tranquillité 100 €/an ; méthode en 3 étapes ; bandeau contact ; mention « tarifs à confirmer ».
  Fond : cercles ton sur ton à peine visibles (bas-droite et coin haut-gauche).
- **Verso** : calendrier 2027 lisible (A6), jours fériés en or (identique v10).
- Tarifs copiés du site le 16/11/2026 (prix normaux, hors offre de Noël). Si un prix change : `SOURCES/infos_recto_v13.html` puis `bash SOURCES/build_v13.sh`.
- Contrôles : CMJN, encre max 240 %, petits textes sur une seule encre, 100 % vectoriel, polices incorporées, QR testé, zone de sécurité OK, aucun liseré.

| Fichier | Usage |
|---|---|
| `IL4N_carte-calendrier-A6_v13_print_CMJN.pdf` | **Imprimeur en ligne** : flyer A6 recto-verso, 148 × 105 mm paysage, fond perdu 3 mm. |
| `IL4N_carte-calendrier-A6_v13_apercu.png` | Aperçu fidèle des couleurs imprimées. |

Les v10 à v12 restent dans le dossier comme étapes de travail (non conseillées).

---
# ⭐ v12 — A6 « 365 points » + verso INFOS & TARIFS (16/11/2026) — remplace v10/v11
Demande d'Ilan : au verso, plus de calendrier, juste toutes les infos bien présentées.
- Recto (inchangé, v11) : fond nuit = l'année 2027 en 365 points, jours fériés en or ; légende « 2027 en 365 points · ● jours fériés ».
- Verso (papier) : logo + nom/métier ; **Imprimés** (Flyer Start 21 €, Pro 35 €, Prestige 49 €, carte de visite 25 €, menu 39 €, affiche A3/A2 39 €,
  plaquette 45 €) ; **Réseaux & identité** (visuel réseaux 15 € · 5 pour 59 €, Pack Lancement 360° 97 €, Pack Artisan 129 €, Social Media Kit
  et Identité de marque sur devis) ; bloc noir **Site internet 290 €** + option tranquillité 100 €/an ; méthode en 3 étapes (textes du site) ;
  bandeau contact ; mention « Tarifs affichés sur il4nstudio.netlify.app en novembre 2026, à confirmer selon votre demande avant commande ».
- Tarifs **copiés du site le 16/11/2026** (prix normaux, sans l'offre de Noël temporaire). ⚠️ Si un prix change sur le site, modifier
  `SOURCES/infos_verso_v12.html` puis `bash SOURCES/build_v12.sh`.
- Contrôles : CMJN, encre max 240 %, petits textes sur une seule encre, 100 % vectoriel, polices incorporées, QR testé, zone de sécurité OK.

| Fichier | Usage |
|---|---|
| `IL4N_carte-A6_v12_print_CMJN.pdf` | **Imprimeur en ligne** : flyer A6 recto-verso, 148 × 105 mm paysage, fond perdu 3 mm. |
| `IL4N_carte-A6_v12_apercu.png` | Aperçu fidèle des couleurs imprimées. |

---
# ⭐ v11 « CALENDRIER 2027 » A6 — recto « l'année en 365 points » (16/11/2026) — remplace la v10
Demande d'Ilan : retravailler la partie noire pour qu'elle soit plus originale.
- **Le fond nuit = l'année 2027 entière en 365 points** : 1 rangée = 1 mois (janvier en haut, décembre en bas), 1 point = 1 jour.
  Points ton sur ton (presque invisibles de loin), dimanches un peu plus clairs, **les 11 jours fériés en or** (comme le point du logo il4n.).
  Les fins de mois « dentelées » (28, 30, 31 jours) trahissent le calendrier quand on regarde de près.
- Chaque ligne de texte est posée **entre deux rangées de points** ; les points qui touchent une lettre sont retirés (mesure au pixel),
  et un contrôle bloque l'export si un jour férié était caché.
- Légende discrète en bas : « 2027 en 365 points · ● jours fériés · calendrier au dos ». Verso inchangé (calendrier lisible A6).
- Contrôles : CMJN, encre max 240 %, 100 % vectoriel, polices incorporées, QR testé, textes dans la zone de sécurité, aucun liseré.

| Fichier | Usage |
|---|---|
| `IL4N_calendrier-A6_v11_print_CMJN.pdf` | **Imprimeur en ligne** : flyer A6 recto-verso, 148 × 105 mm paysage, fond perdu 3 mm. |
| `IL4N_calendrier-A6_v11_apercu.png` | Aperçu fidèle des couleurs imprimées. |

Sources : `SOURCES/fond_points_v11.py` (génère le recto), `SOURCES/calendrier_v10.py` (verso) ; régénérer avec `bash SOURCES/build_v11.sh`.

---
# 📅 v10 « CALENDRIER 2027 » — FORMAT A6 (16/11/2026) — remplace la v9
Retour d'Ilan sur la v9 (85 × 55) : **calendrier trop petit, illisible** (chiffres de 1,5 mm) et fond noir trop plat.
- **Format A6 paysage 148 × 105 mm** (format standard « flyer A6 » / « carte postale » chez les imprimeurs) : chiffres ≈ 2,6 mm de haut, 1,8 × plus gros.
- **Fond noir travaillé** : cercles concentriques ton sur ton (nuit à peine éclaircie) centrés derrière le QR code, presque invisibles, qui donnent de la profondeur.
- Recto : logo, « Faites bonne impression. », nom, métier, téléphone, Instagram, e-mail, site, QR « Mes tarifs », pastille « 2027 — calendrier au dos ».
- Verso : calendrier 2027 (lundi → dimanche, dimanches en gris, 11 jours fériés en or), téléphone en haut.
- Contrôles : CMJN, encre max 240 %, chiffres en noir pur, 100 % vectoriel, polices incorporées, QR testé, zone de sécurité 5 mm respectée, aucun liseré blanc.

| Fichier | Usage |
|---|---|
| `IL4N_calendrier-A6_v10_print_CMJN.pdf` | **Imprimeur en ligne** : 2 pages (recto, verso), 148 × 105 mm paysage, fond perdu 3 mm. |
| `IL4N_calendrier-A6_v10_apercu.png` | Aperçu fidèle des couleurs imprimées. |

À la commande : **flyer A6 recto-verso** (ou « carte postale A6 »), orientation **paysage**, papier **mat 350 g** (rigide, on peut écrire dessus).
Sources : `SOURCES/cal_recto_v10.html`, `SOURCES/calendrier_v10.py` ; régénérer avec `bash SOURCES/build_v10.sh`.
La v9 (85 × 55) reste dans le dossier mais **n'est pas conseillée** (trop petite).

---
# 📅 NOUVELLE — v9 « CALENDRIER 2027 » (16/11/2026)
Statut : **BAT à valider par Ilan**. 85 × 55 mm horizontal, CMJN, 100 % vectoriel, polices TrueType incorporées,
QR code testé → il4nstudio.netlify.app, tout dans la zone de sécurité (4 mm).

**L'idée :** une carte qu'on garde toute l'année à côté de la caisse.
- Recto (fond nuit) : logo, « Faites bonne impression. », nom, métier, téléphone, Instagram, e-mail, site, QR « Mes tarifs », pastille « 2027 — calendrier au dos ».
- Verso (papier) : calendrier 2027 complet, semaines du lundi au dimanche, dimanches en gris, **11 jours fériés** (France métropolitaine) en pastilles or :
  1/01, lundi de Pâques 29/03, 1/05, 8/05, Ascension 6/05, lundi de Pentecôte 17/05, 14/07, 15/08, 1/11, 11/11, 25/12. Téléphone rappelé en haut.
- Chiffres du calendrier en **noir pur** (corps 4,2 pt, nets à l'impression) ; noir riche 240 % uniquement pour le fond du recto.
- Idéal à distribuer de **début décembre à fin janvier**. Après janvier 2027, revenir à la v8 ou faire une v2028.

| Fichier | Usage |
|---|---|
| `IL4N_calendrier_v9_print_CMJN.pdf` | **Imprimeur en ligne** : 2 pages (recto, verso), 85 × 55 **horizontal**, fond perdu 3 mm. |
| `IL4N_calendrier_v9_apercu.png` | Aperçu fidèle des couleurs imprimées. |

À la commande : carte de visite recto-verso, **85 × 55 paysage**, papier **mat 350 g** (on écrit dessus au stylo si besoin), quantité à ton choix.
Sources : `SOURCES/cal_recto_v9.html`, `SOURCES/calendrier_v9.py` (génère le verso) ; régénérer avec `bash SOURCES/build_v9.sh`.

---
# ⭐ NOUVELLE — v8 « LE BAT » (16/11/2026) — concept unique
Statut : **BAT à valider par Ilan**. 85 × 55 mm horizontal, CMJN (encre max 240 %), 100 % vectoriel, polices TrueType incorporées,
QR code testé → il4nstudio.netlify.app, tout dans la zone de sécurité (4 mm).

**L'idée :** la carte raconte ta méthode. Recto = un « premier jet » (BAT n°1) corrigé au stylo rouge (« + GROS ! », « Trop sage. On ose ? »,
« graphiste ~~→~~ & sites web ! », « appelle-moi »), avec repères de mise en page cyan et « TOURNE LA CARTE → ».
Verso = la version finale sur fond nuit, tampon « VALIDÉ ✓ », accroche **« Vous validez avant de payer. »** (ton argument du site), coordonnées, QR.
On retourne la carte = on voit l'avant/après. Aucun « tu as gagné », aucune promesse à tenir, aucun prix (rien à mettre à jour).
Charte du site (nuit, papier, or) + rouge correction. Police manuscrite : Permanent Marker (licence Apache 2.0, usage commercial libre).

| Fichier | Usage |
|---|---|
| `IL4N_bat_v8_print_CMJN.pdf` | **Imprimeur en ligne** : 2 pages (recto, verso), 85 × 55 **horizontal**, fond perdu 3 mm. |
| `IL4N_bat_v8_apercu.png` | Aperçu fidèle des couleurs imprimées. |

À la commande : carte de visite recto-verso, **85 × 55 paysage**, papier **mat 350 g** (le mat donne l'effet « papier de BAT »).
Sources : `SOURCES/bat_recto_v8.html`, `SOURCES/bat_verso_v8.html` ; régénérer avec `bash SOURCES/build_v8.sh`.

---
# ✅ CARTE CHOISIE — v7 « MAXI MAQUETTE » (16/11/2026)
Choix : la v7, celle qui se démarque le plus (aucun graphiste du coin ne fait une carte « ticket gagnant »),
tout en restant une vraie carte de visite lisible (pas de grattage, pas de règlement). Limite de l'offre : **aucune**
(chaque carte présentée = 1 maquette gratuite, sans obligation d'achat — à tenir pour chaque carte).

**Fichier à envoyer à l'imprimeur en ligne : `IL4N_maxi-maquette_v7_carte_print_CMJN.pdf`**
- 2 pages : page 1 = recto, page 2 = verso. Format fini **55 × 85 mm, portrait (vertical)**, fond perdu 3 mm inclus (61 × 91 mm).
- Couleurs **CMJN** (taux d'encre max 240 %), textes fins du verso en noir pur (100 % K) pour rester nets, 100 % vectoriel,
  polices incorporées, QR code testé → il4nstudio.netlify.app. Numéro affiché : « N° IL4N » (identique sur toutes les cartes).
- Le violet est un peu moins vif en CMJN qu'à l'écran : c'est normal (aperçu fidèle : `IL4N_maxi-maquette_v7_CMJN_apercu.png`).
- Si l'imprimeur accepte le RGB et que tu veux le violet le plus vif possible : `IL4N_maxi-maquette_v7_carte_print.pdf`.

**À la commande, choisir :** carte de visite **recto-verso**, format **55 × 85 portrait** (parfois appelé « 85 × 55 vertical »),
papier **mat 350 g** conseillé, quantité à ton choix. Vérifier sur sa fiche technique : fond perdu 3 mm et pas de traits de coupe (il n'y en a pas).
Je n'ai pas de prix vérifié : compare 2-3 devis avant de payer. Rien n'est commandé.

---
# Livraison — IL4N STUDIO / Cartes de visite — v7 « MAXI MAQUETTE » carte de visite — 15/11/2026
Statut : **BAT à valider par Ilan**. Preflight conforme (0 erreur, 0 avertissement), 100 % vectoriel, polices TrueType incorporées,
QR code décodé = https://il4nstudio.netlify.app. Aucun chevauchement, rien hors zone de sécurité.

Version simplifiée de la v6 : **plus rien à gratter, plus de règlement**. Ça reste une carte de visite.
- Recto : « TICKET N° … · PRIX : OFFERT », titre « MAXI MAQUETTE » en relief, pastille « OFFERT », rangée « 3 SUR 3 ! » de 3 pièces « il4n. »,
  « TU AS GAGNÉ 1 MAQUETTE GRATUITE — flyer · site · visuel », « Une asso, une fête samedi prochain ? 06 10 55 71 25 ».
- Verso : vraie carte de visite — logo, « Faites bonne impression. », QR « Mes tarifs », Ilan Da Silva, « Graphiste & sites web · Sarrians »,
  téléphone, Instagram, e-mail, site. Une seule mention : « Maquette offerte, sans obligation d'achat. Tu valides avant de payer. »
  (obligatoire dès qu'on écrit « tu as gagné » : la maquette doit rester réellement gratuite pour chaque carte présentée).

| Fichier | Usage |
|---|---|
| `IL4N_maxi-maquette_v7_carte_print.pdf` | **Imprimeur** : 55×85 vertical, recto puis verso, fond perdu 3 mm. |
| `IL4N_maxi-maquette_v7_planches_A4_0115-0141.pdf` | **Chez toi** : 3 feuilles recto-verso, 27 cartes numérotées 0115 → 0141. |
| `IL4N_maxi-maquette_v7_apercu.png` | Aperçu recto-verso. |

---
## Version 6 « MAXI MAQUETTE » ticket à gratter
Statut : **BAT à valider par Ilan**. Preflight conforme (0 erreur, 0 avertissement) pour les 2 versions, 100 % vectoriel,
polices TrueType incorporées, QR code décodé = https://il4nstudio.netlify.app.

## Le concept
Inspiré des codes des tickets à gratter (titre en relief incliné, rayons, pastille étoilée, 6 cases, règlement au dos, code-barres),
avec un **nom et un dessin 100 % originaux** : « MAXI MAQUETTE ». Aucun nom ni logo de jeu existant (Banco, Jackpot, Cash… sont des
marques de la FDJ : ne pas les utiliser). Couleurs : violet et or de la charte du site, rouge et jaune « jeu ».
Recto : « TICKET N° … · PRIX : OFFERT », 6 cases dont 3 « il4n. », lot « 1 MAQUETTE GRATUITE — flyer · site · visuel », téléphone.
Verso : « Comment jouer ? », « Règlement (court) : 100 % des tickets sont gagnants. Maquette offerte, sans obligation d'achat »,
QR, coordonnées, faux code-barres décoratif (ne code rien), « NE PAS JETER ».

| Fichier | Usage |
|---|---|
| `IL4N_maxi-maquette_v6_print.pdf` | **Imprimeur** — version « argent imprimé » (cases déjà grattées). |
| `IL4N_maxi-maquette_planches_A4_0079-0105.pdf` | **Chez toi** — 3 feuilles recto-verso, 27 tickets numérotés 0079 → 0105. |
| `IL4N_maxi-maquette_v6_a-gratter_print.pdf` | **Version vraiment à gratter** (imprimeur) : cases imprimées découvertes, à recouvrir. |
| `IL4N_maxi-maquette_a-gratter_planche_A4_0106-0114.pdf` | **Essai maison** de la version à gratter : 1 feuille, 9 tickets 0106 → 0114. |
| `IL4N_maxi-maquette_v6_apercu.png` | Aperçu : recto, verso, recto « à gratter ». |

## Version vraiment à gratter
Coller des **étiquettes à gratter argentées** (autocollants vendus en rouleau, en papeterie ou en ligne) sur la grille des 6 cases :
une grande étiquette rectangulaire d'environ 42 × 20 mm, ou 6 petites (cases ≈ 13 × 9 mm). Aucun achat fait : à toi de décider.
Vérifier que l'étiquette couvre bien les symboles et laisse lisible « GRATTE LES 6 CASES ».

## Règles à tenir
- Le lot est réel : **chaque ticket présenté donne droit à sa maquette gratuite**, sans obligation d'achat (sinon : pratique trompeuse).
- Une limite (une maquette par commerce, date de validité) doit être écrite sur le ticket : me la donner pour l'ajouter.
- Ne pas déposer les tickets par terre dans la rue (dépôt sauvage) : main propre ou comptoir avec accord.

---
## Version 5 « Ticket gagnant »
Statut : **BAT à valider par Ilan**. Preflight conforme (0 erreur, 0 avertissement), 100 % vectoriel, polices TrueType incorporées,
QR code décodé = https://il4nstudio.netlify.app. Contrôle de mise en page : aucun chevauchement, rien hors zone de sécurité.

## Le concept
Format 55×85 vertical, fond doré à rayons de soleil (visible de loin), « C'EST TON JOUR DE CHANCE ! — TICKET GAGNANT »,
zone « grattée » avec 3 « il4n. » identiques et tampon rouge « GAGNÉ ! », lot « 1 MAQUETTE GRATUITE — flyer, site ou visuel »,
« Une activité, une asso, une fête samedi prochain ? », bandeau « CONTACTE-MOI DÈS MAINTENANT 06 10 55 71 25 ».
Verso nuit : « Récupère ton lot en 3 étapes » (écris-moi avec le n° · raconte ton projet · découvre ta maquette, tu valides avant de payer),
QR, coordonnées, mentions « Maquette offerte, sans obligation d'achat. Ne pas jeter sur la voie publique. »

## Pourquoi ces mentions
- Annoncer à quelqu'un qu'il a « gagné » est une pratique commerciale trompeuse si le lot n'existe pas ou s'il faut payer pour l'avoir.
  Ici le lot est réel (maquette gratuite, sans engagement) : **il faut tenir cette promesse** pour chaque ticket présenté.
- Si tu veux limiter l'offre (une maquette par commerce, date de validité…), il faut l'écrire sur le ticket : dis-le-moi, je l'ajoute.
- Ne pas déposer les tickets par terre dans la rue (dépôt sauvage, verbalisable) : les donner en main propre ou les laisser sur un comptoir avec accord.
- Design 100 % original : n'imite aucun jeu existant (pas de logo ni de nom de jeu de grattage).

| Fichier | Usage |
|---|---|
| `IL4N_ticket-gagnant_v5_print.pdf` | **Imprimeur** : carte 55×85 **verticale**, recto puis verso, fond perdu 3 mm (numéro affiché : « N° IL4N »). |
| `IL4N_tickets-gagnants_planches_A4_0052-0078.pdf` | **Chez toi** : 3 feuilles recto-verso, 27 tickets numérotés **0052 → 0078** (suite des billets et tickets). |
| `IL4N_ticket-gagnant_v5_apercu_recto-verso.png` | Aperçu. |

Impression maison : 100 % / taille réelle, recto-verso bord long, papier 250–300 g, couper sur les traits.

---
## Version 4 « Ticket découpé »
Statut : **BAT à valider par Ilan**. Preflight conforme (0 erreur, 0 avertissement), 100 % vectoriel, polices TrueType incorporées,
QR code décodé = https://il4nstudio.netlify.app.

## Le concept
La carte **est** un ticket de caisse : 55×85 mm vertical, **découpée en zigzag en haut et en bas**, recto ET verso en style ticket.
Recto : tes tarifs du site (hors offres), « MAQUETTE 0,00 € », « TOTAL : BONNE IMPRESSION », coordonnées.
Verso : « *** EXEMPLAIRE CLIENT *** », « Conservez votre ticket. », QR code « Scannez : mes tarifs », « À bientôt ! ».

| Fichier | Usage |
|---|---|
| `IL4N_ticket_v4_decoupe-forme_print.pdf` | **Imprimeur avec découpe à la forme** : 2 pages (recto, verso), 55×85 + fond perdu 3 mm, tracé de découpe vectoriel en couleur d'accompagnement **« CutContour »** (100 % magenta, surimpression), le standard demandé par les imprimeurs. |
| `IL4N_tickets_v4_planches_A4_0025-0051.pdf` | **Chez toi** : 3 feuilles recto-verso, 9 tickets numérotés par feuille (0025 → 0051), contour gris à suivre. |
| `IL4N_ticket_v4_apercu_recto-verso.png` | Aperçu du rendu découpé. |

## Option 1 — imprimeur (rendu parfait)
Chercher l'option **« découpe à la forme »** / « forme personnalisée » / « contour cut » chez un imprimeur en ligne, et envoyer le PDF tel quel.
Plus cher qu'une carte rectangulaire (compare les devis ; je n'ai pas de prix vérifié à te donner).
Vérifier sur sa fiche technique : nom du calque de découpe attendu (souvent « CutContour »), fond perdu (3 mm), RGB accepté ou non.

## Option 2 — chez toi
1. Imprimer à **100 %**, recto-verso **bord long**, papier 250–300 g (test sur papier normal d'abord).
2. Découper : côtés droits au cutter + règle ; haut et bas en suivant le zigzag gris, au cutter ou, plus vite, aux
   **ciseaux cranteurs** (ciseaux à denture qui font le zigzag tout seuls). Une marge de papier de 0,8 mm dépasse le contour :
   un petit écart ne laisse pas de blanc.

---
## Version 3 « Ticket de caisse » sur fond nuit
Statut : **BAT à valider par Ilan**. Preflight conforme (0 erreur, 0 avertissement), 100 % vectoriel, polices TrueType incorporées
(Inter, Gelasio, JetBrains Mono — licences libres), QR code décodé = https://il4nstudio.netlify.app.

## Le concept
Format **vertical 55×85 mm**. Recto : un ticket de caisse (bords déchirés) posé sur fond nuit, avec tes **vrais tarifs affichés sur le site**
(Flyer Start 21 €, carte de visite 25 €, menu 39 €, visuel réseaux 15 €, site 290 €), la ligne dorée **« MAQUETTE 0,00 € »**,
« TOTAL : BONNE IMPRESSION », tes coordonnées. Verso : logo, « Conservez votre ticket. », QR code vers tes tarifs.
Mention « Prix à confirmer au devis » (le site précise que les tarifs sont à confirmer avant commande).
⚠️ Si tu changes un prix sur le site, la carte doit être mise à jour (`SOURCES/ticket_recto_v3.html`).

| Fichier | Usage |
|---|---|
| `IL4N_ticket_v3_print.pdf` | **Imprimeur** : carte **55×85 verticale**, recto puis verso, + fond perdu 3 mm. Numéro affiché : « N° IL4N ». |
| `IL4N_tickets_planches_A4_0025-0051.pdf` | **Chez toi** : 3 feuilles recto-verso, 27 tickets numérotés **0025 à 0051** (suite des billets 0001-0024). |
| `IL4N_ticket_recto_v3_HD.png` / `…_verso_v3_HD.png` | Aperçus 600 ppp. |

Impression maison : 100 % / taille réelle, recto-verso **bord long**, papier 250–300 g, couper sur les traits.
Chez un imprimeur : choisir « carte de visite format portrait » ; papier offset/naturel non couché = effet ticket réussi.

---
## Version 2 « Billet de bonne impression »
Statut : **BAT à valider par Ilan**. Preflight conforme (0 erreur, 0 avertissement), 100 % vectoriel, polices TrueType incorporées,
QR code décodé = https://il4nstudio.netlify.app.

## Le concept
Une carte qu'on garde dans son portefeuille : un **billet de « 1 maquette gratuite »** (ton offre réelle : maquette gratuite et sans
engagement, validée avant paiement). Rosace guillochée, cadre doré, numéro de série, signature au verso.
**Dessin 100 % original** : aucun élément d'un vrai billet (ni €, ni symbole européen, ni format de billet) et la mention « Sans valeur
monétaire ». La reproduction des billets en euros est réglementée : ne pas ajouter d'éléments qui y ressemblent.

| Fichier | Usage |
|---|---|
| `IL4N_billet_v2_print.pdf` | **Imprimeur** (recto puis verso, sans numéro : « IL4N · 2026 »). 85×55 + fond perdu 3 mm. |
| `IL4N_billets_planches_A4_0001-0024.pdf` | **Chez toi** : 3 feuilles recto-verso (6 pages), 24 billets numérotés **0001 à 0024**. |
| `IL4N_billet_recto_v2_HD.png` / `…_verso_v2_HD.png` | Aperçus 600 ppp. |

## Le numéro de série = ton suivi
Au dos : « Écrivez-moi avec le n° du billet ». Note dans ton tableau de suivi à qui tu as donné chaque numéro
(ex. 0007 = boulangerie X, Aubignan). Quand quelqu'un t'écrit en citant son numéro, tu sais quelle visite a marché.

## Imprimer chez toi
Imprimer à **100 % / taille réelle**, recto-verso **bord long** (le verso est déjà inversé pour tomber derrière chaque billet),
papier 250–300 g. Faire un test sur papier normal pour vérifier l'alignement. Couper sur les traits.
Le cadre doré est à 4 mm du bord : une coupe imprécise (± 1 mm) se verrait un peu ; couper au massicot ou à la règle.

## Imprimeur
Envoyer `IL4N_billet_v2_print.pdf` (carte de visite recto-verso, papier mat 350 g, ou « soft touch » pour l'effet premium).
PDF en RGB (accepté par la plupart des imprimeurs en ligne ; conversion CMJN si exigée).

---
## Version 1 (sobre), toujours disponible
Statut : **BAT à valider par Ilan**. Preflight conforme (0 erreur, 0 avertissement), QR code décodé = https://il4nstudio.netlify.app.

Coordonnées utilisées (toutes publiques sur il4nstudio.netlify.app) : Ilan Da Silva · 06 10 55 71 25 · ilandasilva028@gmail.com · @il4n_studio · il4nstudio.netlify.app · Sarrians (84).

| Fichier | Usage |
|---|---|
| `IL4N_carte_v1_print.pdf` | **Pour un imprimeur** (2 pages : recto puis verso). 85×55 mm + fond perdu 3 mm, polices incorporées, RGB. |
| `IL4N_planche_A4_recto-verso.pdf` | **Pour imprimer chez toi** : 8 cartes par feuille A4, traits de coupe. |
| `IL4N_carte_recto_v1_HD.png` / `…_verso_v1_HD.png` | Aperçus 600 ppp (WhatsApp, validation, réseaux). |

## Option 1 — imprimeur en ligne (le plus pro)
Envoyer `IL4N_carte_v1_print.pdf` en « carte de visite 85×55, recto-verso ». Papier mat 350 g conseillé.
Le PDF est en RGB : la plupart des imprimeurs en ligne l'acceptent. Si l'un d'eux exige du CMJN, il faut une conversion (Ghostscript ou Acrobat) avant envoi.
Vérifier sur le site de l'imprimeur que le fond perdu demandé est bien 3 mm.

## Option 2 — imprimer chez toi (0 € de plus si tu as l'imprimante)
1. Papier épais 250–300 g (vérifier ce que ton imprimante accepte).
2. Imprimer `IL4N_planche_A4_recto-verso.pdf` **à 100 % / taille réelle** (surtout pas « ajuster à la page »).
3. Recto-verso : impression recto, puis remettre la feuille pour le verso (bord long). Faire un test sur papier normal d'abord pour vérifier l'alignement.
4. Couper au massicot ou au cutter + règle, en suivant les traits de coupe.

## Points à valider
- Le titre « Graphiste & sites internet » et le texte « Mes tarifs » sous le QR code (il mène à l'accueil du site).
- Ton e-mail Gmail est affiché tel quel ; si tu crées une adresse au nom du studio plus tard, il suffira de modifier `SOURCES/verso_v1.html`.
