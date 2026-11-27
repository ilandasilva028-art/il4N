# Site de commande — Alex Pellegrino (MAQUETTE)
Page unique : accueil, catalogue de gâteaux, panier, formulaire de commande (retrait au marché ou envoi par la poste), marchés.

## Ce qui est un exemple (à remplacer avec Alex)
- Les 6 gâteaux, leurs prix et leurs descriptions.
- Les marchés, jours et horaires.
- L'e-mail de secours `alex@exemple.fr` (dans le script, fonction d'envoi).
- Téléphone, réseaux sociaux, liste des allergènes.

## Règle d'envoi par la poste
Un gâteau est « Voyage » (peut être posté) ou « Frais · retrait ». Si la commande contient un gâteau frais, l'envoi par la poste est désactivé et l'adresse n'est pas demandée.

## Réception des commandes
Le formulaire utilise Netlify Forms (`data-netlify`). Une fois le site déployé sur Netlify, les commandes arrivent dans l'onglet Forms du site, avec notification e-mail à activer. Hors Netlify, un e-mail pré-rempli s'ouvre à la place.

## Mise en ligne
Netlify → Add new site → Deploy manually → glisser le dossier `alex-pellegrino`. Pas de paiement en ligne dans cette version : paiement au retrait ou par virement.
