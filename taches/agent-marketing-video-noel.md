# Tâche — Agent artistique / marketing : vidéos Noël −20 % (15/11/2026)

**Objectif** : 2 vidéos verticales 9:16 (Reels / TikTok / Facebook) qui amènent des messages privés pendant l'offre Noël (16/11 → 31/12).
**Mesure** : nombre de messages entrants et de maquettes demandées, noté dans `reports/suivi-contacts.md`.

## Vidéo 1 — « Noël −20 % sur les flyers » (15-17 s)
- Accroche (0-1,5 s, mot qui claque sur le beat 0) : « Noël approche. Votre flyer, lui ? »
- Plans : problème (carte/flyer qui passe inaperçu) → les 3 flyers → prix barrés 21→16,80 / 35→28 / 49→39,20 → « −20 % jusqu'au 31/12 » → CTA « Écrivez-moi en privé ↗ ».
- Un plan de 2 s stable avec les vraies captures du site (section prestations avec prix barrés).
- Sous-titres synchronisés, mot clé en or #d6a96a, boucle fin→début.

## Vidéo 2 — « Menus de fêtes » (15-17 s)
- Accroche : « Votre carte des fêtes donne-t-elle faim ? »
- Montrer la vraie réalisation « Pour un vrai client » + exemple de menu étiqueté « exemple · commerce imaginaire ».
- Offre : menu 39 € + maquette gratuite sans engagement.

## Cahier des charges
- Suivre `docs/REFERENCE-REEL.md` et `docs/ROUTINE-QUOTIDIENNE.md` (charte nuit/papier/or, Inter + Gelasio, 1080×1920, 60 i/s, musique synthétisée, mix −14 LUFS).
- Décors Noël sobres : rouge #b0482f (déjà sur le site), or, touches de vert #3f8a62, flocons. Rien de kitsch.
- Images : vraies captures de `site-noel/index.html` (rendu avec la date simulée du 17/11) ; badge Netlify recadré.
- Voix : clone validé (`voix/ref22.wav`, 3 prises, vérif Whisper), texte ≤ 32 mots, chiffres écrits en lettres.
- Interdits : faux avis, faux client, promesse de résultat, remise autre que −20 % flyers.
- Livrables : `final.mp4`, `poster.png`, texte de la voix, légende Facebook (2-3 lignes + 3-5 hashtags locaux), points à améliorer.
- Cadence : 2 vidéos, pas de série quotidienne (économie de calcul tant que les retours ne sont pas mesurés).

## Dépendances
Le site Noël doit être en ligne (ou capturé depuis `site-noel/index.html`) avant le tournage des captures.
**Statut : tâche rédigée par le Directeur IA. Aucun agent lancé.**
