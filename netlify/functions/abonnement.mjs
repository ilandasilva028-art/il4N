// POST /api/abonnement : crée une session Stripe Checkout (abonnement 9 €/mois) et renvoie son URL.
import { json, stripe, siteUrl } from '../lib/commun.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405);
  try {
    const price = process.env.STRIPE_PRICE_ID;
    if (!price) throw new Error('STRIPE_PRICE_ID manquant dans Netlify.');
    const base = siteUrl(req);
    const s = await stripe('checkout/sessions', {
      method: 'POST',
      body: {
        mode: 'subscription',
        line_items: { 0: { price, quantity: 1 } },
        success_url: base + '/outil/?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: base + '/outil/',
        locale: 'fr',
        allow_promotion_codes: 'true',
        billing_address_collection: 'auto'
      }
    });
    return json({ url: s.url });
  } catch (e) {
    return json({ erreur: e.message }, 500);
  }
};

export const config = { path: '/api/abonnement' };
