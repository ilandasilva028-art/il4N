// POST /api/connexion : un abonné qui change d'appareil saisit son e-mail ; s'il a un abonnement actif,
// il reçoit par e-mail un lien de connexion (envoi via Resend). La réponse est toujours la même,
// pour ne pas révéler qui est abonné.
import { json, stripe, abonnementActif, creerJeton, siteUrl } from '../lib/commun.mjs';

const MSG = { ok: true, message: 'Si un abonnement actif correspond à cette adresse, un lien de connexion vient d\'être envoyé.' };

export default async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405);
  let email = '';
  try { email = String((await req.json()).email || '').trim().toLowerCase(); } catch {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json({ erreur: 'Adresse e-mail invalide.' }, 400);

  const cle = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!cle || !from) return json({ erreur: 'La connexion par e-mail n\'est pas encore configurée. Contactez il4n Studio.' }, 503);

  try {
    const clients = await stripe('customers?limit=10&email=' + encodeURIComponent(email));
    for (const c of clients.data) {
      if (!(await abonnementActif(c.id))) continue;
      const lien = siteUrl(req) + '/outil/#t=' + creerJeton(c.id);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: email,
          subject: 'Ton accès à l\'outil Annonce IA — il4n Studio',
          html: `<p>Bonjour,</p><p>Clique sur ce lien pour accéder à l'outil Annonce IA :</p><p><a href="${lien}">Ouvrir l'outil</a></p><p>Si tu n'as rien demandé, ignore cet e-mail.</p><p>il4n Studio</p>`
        })
      });
      break;
    }
  } catch (e) {
    console.error(e);
  }
  return json(MSG);
};

export const config = { path: '/api/connexion' };
