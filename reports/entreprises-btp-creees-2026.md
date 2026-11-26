# Entreprises du bâtiment créées en 2026 (piste 1)

Date de la collecte : 2026-11-26. Fichier : `reports/entreprises-btp-creees-2026.csv` (séparateur `;`).

## Ce que contient la liste

- **Source :** API Recherche d'entreprises (data.gouv.fr / Insee), établissement siège, état actif.
- **Métiers :** installation électrique (43.21A), plomberie et chauffage (43.22A), menuiserie (43.32A), couverture (43.91A).
- **Zones :** 3 départements seulement (75 Paris, 69 Rhône, 13 Bouches-du-Rhône).
- **Critère :** date de création du siège entre le 1er janvier 2026 et aujourd'hui.

## Limites importantes

- **Liste incomplète.** La collecte est plafonnée à 40 pages par combinaison métier et département, et l'API est instable : plusieurs requêtes ont été abandonnées. Ce n'est pas un recensement.
- **« Créée en 2026 » ne veut pas toujours dire nouvelle activité.** Un nouveau SIREN peut venir d'une reprise ou d'une restructuration.
- **Pas de téléphone, de site ni de décideur.** Ces données ne sont pas dans la source. Les colonnes `telephone`, `site`, `decideur` sont vides et doivent être complétées à la main, en vérifiant chaque fiche.
- **Présence en ligne non vérifiée.** Je n'ai pas pu visiter les sites ni les fiches Google.
- **Une date future a été retirée.** Une entrée portait une date de décembre 2026, après la date du jour.

## Répartition (783 lignes avant filtre des dates futures)

| Métier | Nombre |
|---|---|
| Installation électrique | 442 |
| Menuiserie | 152 |
| Plomberie / chauffage | 114 |
| Couverture | 75 |

Paris : 305 · Marseille : 71 · Lyon : 39.

## Prochaine étape conseillée

1. Trier par métier et par ville, en commençant par les entreprises de moins de 5 établissements (plus susceptibles de n'avoir ni site ni fiche solide).
2. Pour chaque entreprise retenue, chercher nom + ville sur Google, et noter si un site existe.
3. Garder seulement celles sans site, puis compléter les colonnes de contact à la main (site officiel ou fiche Google, pas d'extraction automatique).
4. Lancer le premier kit de test : une maquette gratuite pour 10 entreprises.
