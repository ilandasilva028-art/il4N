# Kit de test : idées 2 et 3

But : savoir en 30 jours si des clients **paient**, avant de construire plus.

L'outil est prêt : `outils/scanner` (voir son README).

---

## Idée 2 — Accessibilité (France, Belgique)

**Qui contacter :** 30 boutiques en ligne (Shopify, WooCommerce, PrestaShop) qui ne sont pas des micro-entreprises. Indices : plus de 10 salariés sur LinkedIn ou la page « À propos ».

**Étapes :**
1. Lancer `node scan.mjs https://laboutique.fr --mode accessibilite --pages 5`.
2. Choisir 3 problèmes concrets et faciles à comprendre.
3. Envoyer le message ci-dessous à l'adresse de contact **professionnelle** de la boutique.

**Message :**

> Objet : 3 points d'accessibilité repérés sur [nom de la boutique]
>
> Bonjour,
>
> Depuis juin 2025, les boutiques en ligne doivent être accessibles aux personnes handicapées (loi européenne EAA). J'ai fait un pré-contrôle automatique de quelques pages publiques de votre site et j'ai repéré par exemple :
>
> 1. [problème 1, en une phrase simple]
> 2. [problème 2]
> 3. [problème 3]
>
> Je peux vous envoyer le rapport complet, avec les corrections à faire pour [Shopify / WooCommerce], pour [prix] €.
>
> Ce pré-contrôle ne remplace pas un audit complet.
>
> [Prénom Nom] — [moyen de contact]
> Si vous ne souhaitez plus recevoir de message de ma part, répondez simplement « stop ».

**Prix à tester :** 49 € pour la moitié des envois, 99 € pour l'autre moitié.

**C'est réussi si :** au moins 3 rapports payés, ou au moins 3 réponses intéressées sur 30.

---

## Idée 3 — Français au Québec (Loi 96)

**Qui contacter :**
- Des entreprises qui vendent au Québec et dont le site est en partie en anglais.
- Des **traducteurs indépendants** : ils peuvent revendre le rapport à leurs clients.

**Étapes :**
1. Lancer `node scan.mjs https://entreprise.ca --mode langue --pages 30`.
2. Noter le nombre de textes non français et 3 exemples visibles (bouton, menu, page produit).
3. Envoyer le message.

**Message (entreprise) :**

> Objet : textes en anglais sur [nom du site]
>
> Bonjour,
>
> J'ai analysé [N] pages publiques de votre site : environ [X] textes semblent ne pas être en français, par exemple :
>
> - « [exemple 1] » ([page])
> - « [exemple 2] »
> - « [exemple 3] »
>
> Je peux vous envoyer la liste complète, page par page, prête à transmettre à un traducteur, pour [prix] $.
>
> Cette liste n'est pas un avis juridique sur la Loi 96.
>
> [Prénom Nom] — [moyen de contact]
> Pour ne plus recevoir de message de ma part, répondez « stop ».

**Message (traducteur) :**

> Bonjour, je propose un outil qui liste automatiquement les textes non traduits d'un site. Ça peut vous aider à chiffrer un devis ou à trouver des clients touchés par la Loi 96. Voulez-vous un essai gratuit sur le site d'un de vos clients ?

**Prix à tester :** 49 $ CA et 99 $ CA.

**C'est réussi si :** au moins 3 listes payées, ou au moins 2 traducteurs qui l'utilisent pour de vrais clients.

---

## Règles à respecter (à vérifier)

- **Ne jamais écrire** « votre site est conforme » ou « non conforme ».
- **Prospection par e-mail :**
  - en France et en Belgique, l'envoi à une adresse professionnelle est en général permis si le message concerne l'activité de l'entreprise, avec un moyen simple de refuser ;
  - au Canada, la loi anti-pourriel est plus stricte : n'écrire qu'à une adresse **affichée publiquement**, sans mention qui refuse les messages, avec un message lié à l'activité.
  - À vérifier avant de lancer.
- Analyser seulement les pages publiques, et peu de pages à la fois.

## Tableau de suivi

| Site | Idée | Date d'envoi | Réponse | Payé ? | Prix |
|---|---|---|---|---|---|
| | | | | | |
