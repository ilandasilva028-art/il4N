// Détection de la langue d'un texte, orientée « est-ce du français ? ».
import { franc } from 'franc-min';

const LANGUES = ['fra', 'eng', 'spa', 'deu', 'ita', 'por', 'nld'];
export const LONGUEUR_MIN_FRANC = 30;

// Mots fréquents pour juger les textes courts (boutons, menus), où franc n'est pas fiable.
const MOTS_ANGLAIS = new Set(`
the and of to in for with on your you our we is are be this that it from by at or as
home about contact us shop cart checkout sign login log out logout register account
search menu close open more read learn view all see buy now add order orders new
subscribe newsletter email password submit send next previous back continue
privacy policy terms conditions cookies accept decline settings help support
free shipping sale price quantity size color colour details description reviews
my wishlist share follow store stores find get started click here download
products product services service shipping returns faq careers blog news team
welcome cancel save delete edit update yes no today shop now best sellers
`.split(/\s+/).filter(Boolean));

const MOTS_FRANCAIS = new Set(`
le la les de des du un une et en au aux pour avec sur dans par votre vos notre nos
nous vous est sont ce cette qui que à accueil propos nous contactez contact boutique
panier commande commander connexion connecter déconnexion inscription compte
rechercher recherche menu fermer ouvrir plus lire voir tout tous acheter maintenant
ajouter suivant précédent retour continuer envoyer valider confidentialité
politique conditions générales accepter refuser paramètres aide livraison gratuite
prix quantité taille couleur détails avis partager suivre magasin trouver
télécharger ici cliquez mot passe courriel abonnez infolettre
produits produit services retours carrières actualités équipe bienvenue
annuler enregistrer supprimer modifier oui non
`.split(/\s+/).filter(Boolean));

function mots(texte) {
  return texte.toLowerCase().normalize('NFC').match(/[\p{L}']+/gu) ?? [];
}

/**
 * Renvoie 'fra', 'eng', un autre code ISO 639-3, ou 'und' (indéterminé).
 */
export function detecterLangue(texte) {
  const propre = texte.replace(/\s+/g, ' ').trim();
  if (!/\p{L}{2,}/u.test(propre)) return 'und';

  if (propre.length >= LONGUEUR_MIN_FRANC) {
    const code = franc(propre, { only: LANGUES, minLength: LONGUEUR_MIN_FRANC });
    if (code !== 'und') return code;
  }

  // Texte court : comparaison de mots fréquents.
  let en = 0;
  let fr = 0;
  for (const m of mots(propre)) {
    if (MOTS_ANGLAIS.has(m)) en++;
    if (MOTS_FRANCAIS.has(m)) fr++;
  }
  // Les accents français sont un indice fort.
  if (/[éèêàùçôîœ]/i.test(propre)) fr++;
  if (en > fr) return 'eng';
  if (fr > en) return 'fra';
  return 'und';
}

export function estNonFrancais(texte) {
  const code = detecterLangue(texte);
  return code !== 'fra' && code !== 'und';
}
