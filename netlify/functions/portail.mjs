// POST /api/portail : ouvre le portail client Stripe (factures, carte, résiliation).
import { json, stripe, lireJeton, siteUrl } from '../lib/commun.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405);
  try {
    const { jeton } = await req.json();
    const client = lireJeton(jeton);
    if (!client) return json({ erreur: 'Accès expiré : reconnectez-vous.', code: 'auth' }, 401);
    const s = await stripe('billing_portal/sessions', {
      method: 'POST',
      body: { customer: client, return_url: siteUrl(req) + '/outil/' }
    });
    return json({ url: s.url });
  } catch (e) {
    return json({ erreur: e.message }, 500);
  }
};

export const config = { path: '/api/portail' };
