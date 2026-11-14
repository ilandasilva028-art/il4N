# Mettre en ligne l'outil Annonce IA (abonnement 9 €/mois)

Le site complet (accueil + outil + fonctions serveur) est maintenant dans ce dépôt :

- `site/` : les pages publiques (copie du site actuel + `outil/` + `conditions-abonnement.html`)
- `netlify/functions/` : le serveur (paiement Stripe, vérification de l'abonnement, appel à Mistral)
- `netlify.toml` : la configuration Netlify

## 1. Créer le compte Stripe (≈ 15 min)
1. Crée un compte sur stripe.com et active-le (pièce d'identité + IBAN pour recevoir l'argent).
2. **Catalogue de produits → Ajouter un produit** : « Annonce IA », prix **9,00 € récurrent mensuel**. Copie l'identifiant du prix (`price_…`).
3. **Développeurs → Clés API** : copie la **clé secrète** (`sk_live_…`, ou `sk_test_…` pour tester d'abord).
4. **Paramètres → Facturation → Portail client** : clique sur « Enregistrer » pour activer le portail (résiliation, factures).

## 2. Créer la clé Mistral
console.mistral.ai → API Keys → créer une clé.

## 3. Relier Netlify à ce dépôt
Ton site actuel a été déposé à la main. Pour garder la même adresse `il4nstudio.netlify.app` :
1. Netlify → ton site → **Site configuration → Build & deploy → Link repository** → GitHub → `il4N`.
2. Branche à publier : `claude/magical-wright-9huf2f` (ou `main` après fusion). Netlify lit `netlify.toml` tout seul.

## 4. Variables d'environnement (Netlify → Site configuration → Environment variables)
| Nom | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` | clé secrète Stripe |
| `STRIPE_PRICE_ID` | identifiant du prix 9 €/mois (`price_…`) |
| `MISTRAL_API_KEY` | clé Mistral |
| `ACCESS_SECRET` | une longue phrase aléatoire (40 caractères ou plus), à ne jamais partager |
| `RESEND_API_KEY` *(optionnel)* | clé resend.com pour envoyer les liens de connexion par e-mail |
| `EMAIL_FROM` *(optionnel)* | ex. `il4n Studio <outil@ton-domaine.fr>` (domaine vérifié sur Resend) |

Puis **Deploys → Trigger deploy**.

## 5. Tester
Avec les clés `sk_test_…`, va sur `/outil/`, abonne-toi avec la carte de test `4242 4242 4242 4242` (date future, n'importe quel code), puis génère une annonce. Passe ensuite aux clés `sk_live_…`.

## Comment ça marche
1. Le client clique sur « S'abonner » → page de paiement Stripe.
2. Après paiement, il revient sur `/outil/` : le serveur vérifie le paiement et lui remet un jeton d'accès (gardé dans son navigateur).
3. À chaque annonce, le serveur vérifie que l'abonnement Stripe est toujours actif, puis appelle Mistral avec **ta** clé (jamais visible par le client).
4. S'il résilie, l'accès s'arrête à la fin de la période payée.

## À vérifier de ton côté
- **Conditions d'abonnement** : j'ai indiqué « TVA non applicable, art. 293 B du CGI » (micro-entreprise en franchise). Corrige si ce n'est pas ton cas.
- **Médiateur de la consommation** : la loi impose d'en nommer un ; ajoute son nom dans `conditions-abonnement.html`.
- **Coût Mistral** : chaque annonce consomme un peu de crédit Mistral. Surveille ta consommation sur console.mistral.ai ; il n'y a pas encore de limite d'annonces par abonné.
