# Scanner de site

Analyse un site et produit un **rapport en français** :

- **Accessibilité** (idée 2) : problèmes détectés automatiquement (images sans texte, contrastes, formulaires…).
- **Contenus non français** (idée 3) : textes qui semblent en anglais ou dans une autre langue.

## Installation

Il faut Node.js 20 ou plus.

```bash
cd outils/scanner
npm install
npx playwright install chromium   # une seule fois, si Chromium n'est pas déjà installé
```

## Utilisation

```bash
node scan.mjs https://exemple.com
```

Options :

| Option | Valeurs | Par défaut |
|---|---|---|
| `--mode` | `tout`, `accessibilite`, `langue` | `tout` |
| `--pages` | nombre de pages à analyser | `10` |
| `--sortie` | dossier du rapport | `rapports/<site>-<date>` |

Exemples :

```bash
node scan.mjs https://boutique.fr --mode accessibilite --pages 5
node scan.mjs https://entreprise.ca --mode langue --pages 30
```

Le dossier de sortie contient `rapport.html` (à ouvrir dans un navigateur) et `donnees.json`.

## Limites à connaître

- **Le rapport ne prouve jamais qu'un site est « conforme ».** Un outil automatique ne voit qu'une partie des problèmes d'accessibilité, et la détection de langue se trompe parfois sur les mots courts et les noms de marque.
- Seules les pages publiques du même site sont analysées. Les pages interdites par `robots.txt` sont ignorées.
- Pas de connexion, pas de remplissage de formulaires, pas de paiement.

## Tests

```bash
npm test
```
