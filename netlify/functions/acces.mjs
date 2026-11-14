// GET /api/acces?session_id=… : après le paiement, vérifie la session Stripe et remet un jeton d'accès.
import { json, stripe, abonnementActif, creerJeton } from '../lib/commun.mjs';

export default async (req) => {
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ erreur: 'Session de paiement invalide.' }, 400);
  try {
    const s = await stripe('checkout/sessions/' + id);
    if (s.status !== 'complete' || !s.customer) return json({ erreur: 'Paiement non finalisé.' }, 402);
    if (!(await abonnementActif(s.customer))) return json({ erreur: 'Abonnement inactif.' }, 402);
    return json({ jeton: creerJeton(s.customer) });
  } catch (e) {
    return json({ erreur: e.message }, 500);
  }
};

export const config = { path: '/api/acces' };
