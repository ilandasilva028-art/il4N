# Passation — Pipeline clips GTA 6 → TikTok (Ilan)

## Objectif
Outil qui prend des captures de gameplay GTA 6, en sort les meilleurs moments, les monte en format TikTok vertical et prépare la publication avec un minimum d'intervention. Ilan valide chaque vidéo avant qu'elle parte.

## Décisions déjà prises
- **Plateforme prioritaire : TikTok.**
- **Source des clips : les propres captures d'Ilan uniquement.** Récupérer automatiquement des clips de streamers (jl Tomy, IShowSpeed) a été abandonné : il faudrait une autorisation écrite de chaque streamer, et le téléchargement depuis Twitch a échoué techniquement (réseau bloqué côté cloud, accès au dossier du Mac refusé).
- Les posts sont en français. La légende finit par une question facile à commenter. Pas de « abonne-toi » mécanique.
- vidIQ est connecté mais n'a presque plus de crédits (4 restants). Ne pas compter dessus pour la découpe automatique.

## Premier montage livré
`GTA6_Jason_Lucia_TikTok.mp4` : 34 s, 1080×1920, 30 fps, son normalisé à -14 LUFS.
Source : une capture de 58,8 s en 1080p60 (cinématique Jason & Lucia dans la voiture, puis le générique d'ouverture).

**Style à réutiliser pour les prochains clips :**
- Fond : la vidéo floutée et assombrie. Au premier plan, l'image recadrée en 1500×1080 (centre), redimensionnée en 1080×778 et placée à y=571.
- Hook de 0 à 2,8 s : « CETTE SCÈNE DE GTA 6 » en blanc et « M'A MIS UNE CLAQUE » en rose #FF4FA3, police Anton.
- Ensuite, titre fixe en haut : « GTA 6 » en rose et « JASON & LUCIA » en blanc.
- Sous-titres en grand, police Archivo Black, blanc avec la dernière ligne en jaune #FFC94A, à y=1395.
- Appel à commenter sur les 6,7 dernières secondes : « JASON OU LUCIA ? » et « TON PERSO PRÉFÉRÉ EN COMMENTAIRE ».
- Fondu de fin sur l'image et le son.

**Découpe (temps dans la source) :** 30.2–33.0 (hook), 3.6–21.8, 33.0–39.6, 44.0–47.5 (plage), 52.0–55.2 (bar).
Les écrans de générique avec les noms de l'équipe Rockstar sont coupés.

## Fichiers fournis
- `build2.sh` : découpe chaque segment séparément puis les assemble (`joined.mp4`). Rendre tout en une seule passe saturait la mémoire.
- `compose.txt` : le filtre ffmpeg final (fond, titres, sous-titres, appel à commenter, son). Commande utilisée :
  `ffmpeg -i joined.mp4 -filter_complex_script compose.txt -map "[v]" -map "[au]" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart sortie.mp4`
- `subs_filter.txt` : les sous-titres avec leur minutage.
- `txt/` : les textes affichés, un fichier par ligne. Ça évite les problèmes d'apostrophes avec drawtext.
- Les chemins des polices sont ceux d'Ubuntu (`/usr/share/fonts/truetype/google-fonts/ofl/...`). Sur Mac, il faut les remplacer.

## Prochaines étapes pour Claude Code
1. Transformer le montage en script réutilisable `make_tiktok.py <video> [--hook "..."]` qui :
   - repère les coupes de plan (`select='gt(scene,0.3)'`) et les passages bruyants ou parlés ;
   - transcrit la voix avec Whisper pour générer les sous-titres automatiquement, au lieu de les relever à la main ;
   - applique le style ci-dessus.
2. Créer un dossier « à traiter » : chaque nouvelle capture déposée dedans sort un MP4 TikTok et un fichier texte avec la légende proposée.
3. Publication : programmer via un outil connecté (Postiz, So-me Studio ou Zapier vers TikTok), seulement après validation d'Ilan.

## Légende proposée pour la vidéo 1
Rockstar a pas fait un jeu, ils ont fait un film 🎬 Team Jason ou team Lucia ? 👇
#gta6 #gta #jasonetlucia #gaming #rockstargames
